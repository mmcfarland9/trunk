export type BranchGroup = {
  group: HTMLDivElement
  branch: HTMLButtonElement
  twigs: HTMLButtonElement[]
}

// Sprout types (replacing goal system)
export type SproutSeason = '1w' | '2w' | '1m' | '3m' | '6m' | '1y'
export type SproutType = 'seed' | 'sapling'
export type SproutState = 'draft' | 'active' | 'completed' | 'failed'

export type Sprout = {
  id: string
  type: SproutType
  title: string
  season: SproutSeason
  state: SproutState
  createdAt: string
  activatedAt?: string
  endDate?: string
  result?: number // 0-100 for seed, 0-5 for sapling
  reflection?: string
  completedAt?: string
  // Growth conditions
  water?: string    // How to check in regularly
  environment?: string // What growth looks like
  soil?: string     // What ensures growth
}

// Legacy goal type (for migration)
export type GoalType = 'binary' | 'continuous'

export type NodeData = {
  label: string
  note: string
  // New sprout data
  sprouts?: Sprout[]
  // Legacy fields (for migration, will be converted to sprouts)
  goalType?: GoalType
  goalValue?: number
  goalTitle?: string
}

export type EditorApi = {
  container: HTMLDivElement
  open: (target: HTMLButtonElement, placeholder: string) => void
  reposition: (target: HTMLButtonElement) => void
  close: () => void
}

export type TwigViewApi = {
  container: HTMLDivElement
  open: (twigNode: HTMLButtonElement) => void
  close: () => void
  isOpen: () => boolean
}

export type BranchProgressItem = {
  button: HTMLButtonElement
  label: HTMLSpanElement
  count: HTMLSpanElement
  index: number
}

export type ViewMode = 'overview' | 'branch' | 'twig'

export type AppElements = {
  shell: HTMLDivElement
  header: HTMLElement
  canvas: HTMLDivElement
  trunk: HTMLButtonElement
  guideLayer: HTMLDivElement
  sidePanel: HTMLElement
  focusMeta: HTMLParagraphElement
  focusTitle: HTMLParagraphElement
  focusNote: HTMLParagraphElement
  focusGoal: HTMLParagraphElement
  progressCount: HTMLParagraphElement
  progressFill: HTMLSpanElement
  backToTrunkButton: HTMLButtonElement
  branchProgress: HTMLDivElement
  statusMessage: HTMLParagraphElement
  statusMeta: HTMLParagraphElement
  importInput: HTMLInputElement
  debugCheckbox: HTMLInputElement
}

export type AppContext = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
  branchProgressItems: BranchProgressItem[]
  editor: EditorApi
  twigView?: TwigViewApi
}
