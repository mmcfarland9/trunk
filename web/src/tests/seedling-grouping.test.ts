import { describe, expect, it } from 'vitest'
import { groupSeedlingsByBranch } from '../features/seedling-grouping'

describe('groupSeedlingsByBranch', () => {
  it('buckets items by branchIndex, preserving order', () => {
    const items = [
      { branchIndex: 2, id: 'a' },
      { branchIndex: 0, id: 'b' },
      { branchIndex: 2, id: 'c' },
    ]
    const grouped = groupSeedlingsByBranch(items)
    expect(grouped.get(2)?.map((i) => i.id)).toEqual(['a', 'c'])
    expect(grouped.get(0)?.map((i) => i.id)).toEqual(['b'])
  })

  it('skips invalid (negative) branch indices', () => {
    const grouped = groupSeedlingsByBranch([{ branchIndex: -1, id: 'x' }])
    expect(grouped.size).toBe(0)
  })

  it('returns an empty map for empty input', () => {
    expect(groupSeedlingsByBranch([]).size).toBe(0)
  })

  it('preserves order within a branch across interleaving', () => {
    const grouped = groupSeedlingsByBranch([
      { branchIndex: 1, id: 'p' },
      { branchIndex: 2, id: 'r' },
      { branchIndex: 1, id: 'q' },
    ])
    expect(grouped.get(1)?.map((i) => i.id)).toEqual(['p', 'q'])
  })

  it('treats branchIndex 0 as valid (not negative)', () => {
    const grouped = groupSeedlingsByBranch([{ branchIndex: 0, id: 'z' }])
    expect(grouped.get(0)?.map((i) => i.id)).toEqual(['z'])
  })
})
