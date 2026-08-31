import { prisma } from '@/lib/prisma';

const materials = [
  ['Hierro y acero', 180, 240],
  ['Cobre', 9000, 10500],
  ['Aluminio', 2200, 3000],
  ['Bronce', 6000, 7200],
  ['Acero inoxidable', 2500, 3400],
  ['Motores eléctricos', 700, 1200],
  ['Cable de cobre', 6000, 7800],
  ['Chapa', 180, 260],
] as const;

export async function seedMaterials() {
  for (const [name, buyPriceKg, sellPriceKg] of materials) {
    await prisma.material.upsert({
      where: { name },
      update: {
        buyPriceKg,
        sellPriceKg,
        active: true,
      },
      create: {
        name,
        buyPriceKg,
        sellPriceKg,
        active: true,
      },
    });
  }
}
