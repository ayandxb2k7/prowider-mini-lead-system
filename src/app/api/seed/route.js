import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Upsert Services
    const s1 = await prisma.service.upsert({ where: { name: 'Service 1' }, update: {}, create: { name: 'Service 1' } });
    const s2 = await prisma.service.upsert({ where: { name: 'Service 2' }, update: {}, create: { name: 'Service 2' } });
    const s3 = await prisma.service.upsert({ where: { name: 'Service 3' }, update: {}, create: { name: 'Service 3' } });

    for (let i = 1; i <= 8; i++) {
      await prisma.provider.upsert({
        where: { name: `Provider ${i}` },
        update: {},
        create: { name: `Provider ${i}`, monthlyQuota: 10, leadsReceived: 0, allocationIndex: 0 },
      });
    }

    for (const service of [s1, s2, s3]) {
      await prisma.allocationState.upsert({
        where: { serviceId: service.id },
        update: {},
        create: { serviceId: service.id, pointer: 0 },
      });
    }

    return Response.json({ success: true, message: 'Database seeded successfully.' });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
