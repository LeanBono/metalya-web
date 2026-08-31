import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  realSale: z.coerce.number().min(0),
  realCost: z.coerce.number().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const data = schema.parse(await req.json());

    const realProfit = data.realSale - data.realCost;

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        realSale: data.realSale,
        realCost: data.realCost,
        realProfit,
        status: 'ACCEPTED',
        lot: {
          update: {
            status: 'CLOSED',
          },
        },
      },
    });

    return NextResponse.json(quote);
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cerrar la operación.' },
      { status: 400 }
    );
  }
}
