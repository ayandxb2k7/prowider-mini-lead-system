export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { selectProviders } from '@/lib/allocation';
import { broadcast } from '@/lib/sse';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, city, serviceId, description } = body;

    if (!name || !phone || !city || !serviceId || !description) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
    });

    if (!service) {
      return Response.json({ error: 'Invalid service' }, { status: 400 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.lead.findUnique({
          where: {
            phone_serviceId: {
              phone,
              serviceId: service.id,
            },
          },
        });

        if (existing) {
          throw new Error('DUPLICATE');
        }

        const lead = await tx.lead.create({
          data: {
            name,
            phone,
            city,
            description,
            serviceId: service.id,
          },
        });

        const providerIds = await selectProviders(tx, service.name, service.id);

        if (providerIds.length === 0) {
          throw new Error('NO_PROVIDERS');
        }

        for (const providerId of providerIds) {
          await tx.leadAssignment.create({
            data: {
              leadId: lead.id,
              providerId,
            },
          });

          await tx.provider.update({
            where: { id: providerId },
            data: {
              leadsReceived: {
                increment: 1,
              },
            },
          });
        }

        return { lead, providerIds };
      },
      { isolationLevel: 'Serializable' }
    );

    broadcast({ type: 'NEW_LEAD', leadId: result.lead.id });

    return Response.json({
      success: true,
      leadId: result.lead.id,
      assignedProviders: result.providerIds.length,
    });
  } catch (error) {
    if (error.message === 'DUPLICATE' || error.code === 'P2002') {
      return Response.json(
        { error: 'This phone number already submitted a lead for this service.' },
        { status: 409 }
      );
    }

    console.error('Lead creation error:', error);

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}