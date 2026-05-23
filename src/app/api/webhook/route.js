import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook
 * Simulates a payment gateway confirming provider subscription.
 * Idempotency: each event has a unique `eventId`.
 * Calling with the same eventId multiple times has no duplicate effect.
 *
 * Body: { eventId: string, type: "QUOTA_RESET", payload: {} }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, type, payload } = body;

    if (!eventId || !type) {
      return Response.json({ error: 'eventId and type are required' }, { status: 400 });
    }

    if (type !== 'QUOTA_RESET') {
      return Response.json({ error: 'Unknown event type' }, { status: 400 });
    }

    // Idempotency check — use upsert with createOrSkip pattern
    const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (existing) {
      return Response.json({
        success: true,
        idempotent: true,
        message: 'Event already processed — no changes made.',
        processedAt: existing.processedAt,
      });
    }

    // Process: reset all provider quotas to 10 and leadsReceived to 0
    // Also reset allocation pointers
    await prisma.$transaction(async (tx) => {
      // Record the event first (prevents duplicate processing under concurrent calls)
      await tx.webhookEvent.create({
        data: {
          id: eventId,
          type,
          payload: JSON.stringify(payload || {}),
        },
      });

      // Reset all providers
      await tx.provider.updateMany({
        data: { monthlyQuota: 10, leadsReceived: 0 },
      });

      // Reset allocation pointers
      await tx.allocationState.updateMany({
        data: { pointer: 0 },
      });
    });

    return Response.json({
      success: true,
      idempotent: false,
      message: 'Quota reset successfully for all providers.',
    });
  } catch (error) {
    // P2002 = unique constraint violation → concurrent duplicate
    if (error.code === 'P2002') {
      return Response.json({
        success: true,
        idempotent: true,
        message: 'Event already processed (concurrent duplicate).',
      });
    }
    console.error('Webhook error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
