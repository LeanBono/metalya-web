import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  phone: z.string().trim().min(6).max(40),
  location: z.string().trim().max(160).optional().or(z.literal('')),
  service: z.string().trim().min(2).max(80),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  consent: z.literal(true),
  estimatedKg: z.coerce
    .number()
    .min(0)
    .max(10000000)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        company: data.company || null,
        email: data.email || null,
        phone: data.phone,
        location: data.location || null,
        service: data.service,
        message: data.message || null,
        consent: data.consent,

        lots: {
          create: {
            description:
              data.message ||
              `Solicitud de ${data.service}`,
            estimatedKg:
              data.estimatedKg ?? null,
          },
        },
      },

      include: {
        lots: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        id: lead.id,
        lotId: lead.lots[0]?.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Revisá los datos ingresados.' },
        { status: 400 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: 'No pudimos guardar la solicitud.' },
      { status: 500 }
    );
  }
}
