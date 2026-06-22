/**
 * Group sidebar seedlings (anything carrying a branchIndex) into per-branch
 * buckets. Invalid branch indices (< 0) are skipped. Insertion order within a
 * branch is preserved.
 */
export function groupSeedlingsByBranch<T extends { branchIndex: number }>(
  items: T[],
): Map<number, T[]> {
  const grouped = new Map<number, T[]>()
  for (const item of items) {
    if (item.branchIndex < 0) continue
    const list = grouped.get(item.branchIndex) ?? []
    list.push(item)
    grouped.set(item.branchIndex, list)
  }
  return grouped
}
