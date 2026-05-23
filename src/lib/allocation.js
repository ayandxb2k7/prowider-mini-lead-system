/**
 * ALLOCATION LOGIC
 *
 * Mandatory rules (per service):
 *   Service 1 → Provider 1 always
 *   Service 2 → Provider 5 always
 *   Service 3 → Provider 1 AND Provider 4 always
 *
 * Fair pool (round-robin via persisted pointer):
 *   Service 1 pool → Providers 2, 3, 4
 *   Service 2 pool → Providers 6, 7, 8
 *   Service 3 pool → Providers 2, 3, 5, 6, 7, 8
 *
 * Each lead gets exactly 3 providers total.
 * Providers over monthly quota (10) are skipped.
 */

// Mandatory provider names per service name
export const MANDATORY_PROVIDERS = {
  'Service 1': ['Provider 1'],
  'Service 2': ['Provider 5'],
  'Service 3': ['Provider 1', 'Provider 4'],
};

// Fair pool provider names per service name
export const POOL_PROVIDERS = {
  'Service 1': ['Provider 2', 'Provider 3', 'Provider 4'],
  'Service 2': ['Provider 6', 'Provider 7', 'Provider 8'],
  'Service 3': ['Provider 2', 'Provider 3', 'Provider 5', 'Provider 6', 'Provider 7', 'Provider 8'],
};

export const TOTAL_ASSIGNMENTS = 3;

/**
 * Selects providers for a lead within a transaction.
 * Returns array of provider IDs to assign.
 *
 * Uses SELECT ... FOR UPDATE on AllocationState to prevent
 * concurrent race conditions on the pointer.
 */
export async function selectProviders(prisma, serviceName, serviceId) {
  const mandatoryNames = MANDATORY_PROVIDERS[serviceName] || [];
  const poolNames = POOL_PROVIDERS[serviceName] || [];

  // Fetch all providers at once
  const allProviderNames = [...new Set([...mandatoryNames, ...poolNames])];
  const providers = await prisma.provider.findMany({
    where: { name: { in: allProviderNames } },
  });

  const byName = {};
  for (const p of providers) byName[p.name] = p;

  const selected = [];
  const selectedIds = new Set();

  // 1. Assign mandatory providers (skip if over quota)
  for (const name of mandatoryNames) {
    const p = byName[name];
    if (!p) continue;
    if (p.leadsReceived >= p.monthlyQuota) continue;
    if (!selectedIds.has(p.id)) {
      selected.push(p.id);
      selectedIds.add(p.id);
    }
  }

  // 2. Fill remaining slots from pool using round-robin
  const slotsNeeded = TOTAL_ASSIGNMENTS - selected.length;
  if (slotsNeeded > 0 && poolNames.length > 0) {
    // Lock the allocation state row for this service
    const stateRows = await prisma.$queryRaw`
      SELECT id, pointer FROM "AllocationState"
      WHERE "serviceId" = ${serviceId}
      FOR UPDATE
    `;

    let pointer = stateRows.length > 0 ? Number(stateRows[0].pointer) : 0;
    let filled = 0;
    let attempts = 0;

    while (filled < slotsNeeded && attempts < poolNames.length * 2) {
      const name = poolNames[pointer % poolNames.length];
      pointer = (pointer + 1) % poolNames.length;
      attempts++;

      const p = byName[name];
      if (!p) continue;
      if (p.leadsReceived >= p.monthlyQuota) continue;
      if (selectedIds.has(p.id)) continue;

      selected.push(p.id);
      selectedIds.add(p.id);
      filled++;
    }

    // Persist updated pointer
    await prisma.allocationState.update({
      where: { serviceId },
      data: { pointer },
    });
  }

  return selected;
}
