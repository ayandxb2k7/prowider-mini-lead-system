import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = await prisma.provider.findMany({
    orderBy: { id: 'asc' },
    include: {
      assignments: {
        include: {
          lead: {
            include: { service: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return Response.json(providers);
}
