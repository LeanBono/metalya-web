import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  buyPriceKg: z.coerce.number().min(0),
  sellPriceKg: z.coerce.number().min(0),
  active: z.boolean().default(true),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const materials = await prisma.material.findMany({
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(materials);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const material = await prisma.material.create({
      data,
    });

    return NextResponse.json(material, {
      status: 201,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Datos inválidos o material existente.',
      },
      { status: 400 }
    );
  }
}
