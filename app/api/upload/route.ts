import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const leadId = String(form.get('leadId') || '');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Falta leadId' },
        { status: 400 }
      );
    }

    const files = form
      .getAll('photos')
      .filter((x): x is File => x instanceof File && x.size > 0);

    if (files.length > 6) {
      return NextResponse.json(
        { error: 'Máximo 6 fotos.' },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(dir, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      ) {
        continue;
      }

      const ext =
        file.type === 'image/jpeg'
          ? 'jpg'
          : file.type.split('/')[1];

      const name = `${randomUUID()}.${ext}`;

      await writeFile(
        path.join(dir, name),
        Buffer.from(await file.arrayBuffer())
      );

      urls.push(`/uploads/${name}`);
    }

    return NextResponse.json({
      ok: true,
      leadId,
      urls,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: 'No se pudieron guardar las fotos.' },
      { status: 500 }
    );
  }
}
