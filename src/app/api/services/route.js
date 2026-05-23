import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  return Response.json(services);
}
