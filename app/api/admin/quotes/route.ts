import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  lotId: z.string().min(1),
  items: z
    .array(
      z.object({
        materialId: z.string(),
        kg: z.coerce.number().positive(),
      })
    )
    .min(1),
  transportCost: z.coerce.number().min(0).default(0),
  laborCost: z.coerce.number().min(0).default(0),
  otherCosts: z.coerce.number().min(0).default(0),
  targetMargin: z.coerce.number().min(0).max(1).default(0.25),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const quotes = await prisma.quote.findMany({
    include: {
      lot: {
        include: {
          lead: true,
          items: {
            include: {
              material: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  return NextResponse.json(quotes);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const data = schema.parse(await req.json());

    const lot = await prisma.lot.findUnique({
      where: {
        id: data.lotId,
      },
    });

    if (!lot) {
      return NextResponse.json(
        { error: 'Lote no encontrado.' },
        { status: 404 }
      );
    }

    const materials = await prisma.material.findMany({
      where: {
        id: {
          in: data.items.map((item) => item.materialId),
        },
        active: true,
      },
    });

    let materialValue = 0;

    const rows = data.items.map((item) => {
      const material = materials.find(
        (m) => m.id === item.materialId
      );

      if (!material) {
        throw new Error('Material no encontrado');
      }

      const buyPriceKg = Number(material.buyPriceKg);
      const sellPriceKg = Number(material.sellPriceKg);

      materialValue += item.kg * sellPriceKg;

      return {
        materialId: item.materialId,
        kg: item.kg,
        buyPriceKg,
        sellPriceKg,
      };
    });

    const totalCosts =
      data.transportCost +
      data.laborCost +
      data.otherCosts;

    const maxOffer =
      materialValue -
      totalCosts -
      materialValue * data.targetMargin;

    const estimatedProfit =
      materialValue -
      Math.max(0, maxOffer) -
      totalCosts;

    const estimatedMargin =
      materialValue > 0
        ? estimatedProfit / materialValue
        : 0;

    await prisma.lot.update({
      where: {
        id: data.lotId,
      },
      data: {
        status: 'QUOTED',
        items: {
          deleteMany: {},
          create: rows,
        },
      },
    });

    const quote = await prisma.quote.create({
      data: {
        lotId: data.lotId,
        materialValue,
        transportCost: data.transportCost,
        laborCost: data.laborCost,
        otherCosts: data.otherCosts,
        targetMargin: data.targetMargin,
        maxOffer: Math.max(0, maxOffer),
        customerOffer: Math.max(0, maxOffer),
        estimatedProfit,
        estimatedMargin,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(
      {
        quote,
        calculated: {
          materialValue,
          totalCosts,
          maxOffer: Math.max(0, maxOffer),
          estimatedProfit,
          estimatedMargin,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'No se pudo crear la cotización.' },
      { status: 400 }
    );
  }
}
