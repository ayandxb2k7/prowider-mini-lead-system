import { prisma } from '@/lib/prisma';
import { selectProviders } from '@/lib/allocation';
import { broadcast } from '@/lib/sse';

export const dynamic = 'force-dynamic';

// Generate 10 leads simultaneously to test concurrency
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'GENERATE_LEADS') {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    const services = await prisma.service.findMany();
    if (services.length === 0) {
      return Response.json({ error: 'No services found. Please seed first.' }, { status: 400 });
    }

    // Generate 10 leads concurrently
    const promises = Array.from({ length: 10 }, (_, i) => {
      const service = services[i % services.length];
      const phone = `TEST${Date.now()}${i}`;
      return createLeadWithAssignment({
        name: `Test User ${i + 1}`,
        phone,
        city: 'Test City',
        description: `Concurrency test lead #${i + 1}`,
        serviceId: service.id,
        serviceName: service.name,
      });
    });

    const results = await Promise.allSettled(promises);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    broadcast({ type: 'NEW_LEAD', bulk: true });

    return Response.json({
      success: true,
      message: `Generated ${succeeded} leads (${failed} failed due to quota/concurrency).`,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error('Test generate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function createLeadWithAssignment({ name, phone, city, description, serviceId, serviceName }) {
  return prisma.$transaction(
    async (tx) => {
      const lead = await tx.lead.create({
        data: { name, phone, city, description, serviceId },
      });

      const providerIds = await selectProviders(tx, serviceName, serviceId);

      for (const providerId of providerIds) {
        await tx.leadAssignment.create({ data: { leadId: lead.id, providerId } });
        await tx.provider.update({
          where: { id: providerId },
          data: { leadsReceived: { increment: 1 } },
        });
      }

      return lead;
    },
    { isolationLevel: 'Serializable' }
  );
}
