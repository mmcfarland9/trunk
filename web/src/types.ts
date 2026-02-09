export type BranchGroup = {
  group: HTMLDivElement
  branch: HTMLButtonElement
  twigs: HTMLButtonElement[]
}

// Sprout types (replacing goal system)
export type SproutSeason = '2w' | '1m' | '3m' | '6m' | '1y'
// Simplified state machine: active → completed (no draft, no failed)
// "Showing up counts" - all harvests are completions, result (1-5) indicates outcome
export type SproutState = 'active' | 'completed'
export type SproutEnvironment = 'fertile' | 'firm' | 'barren'

// Water entry - journal entries when watering a sprout
export type WaterEntry = {
  timestamp: string
  content: string
  prompt?: string
}

// Sun entry - global philosophical reflection log
// Randomly selects a twig to reflect on
export type SunEntry = {
  timestamp: string
  content: string
  prompt?: string
  // Context: which twig was randomly selected
  context: {
    twigId: string
    twigLabel: string
  }
}

// Leaf - a saga/trajectory of related sprouts (identity derived from its sprouts)
export type Leaf = {
  id: string
  name: string
  createdAt: string
}

export type Sprout = {
  id: string
  title: string
  season: SproutSeason
  environment: SproutEnvironment
  state: SproutState
  soilCost: number
  createdAt: string
  activatedAt?: string
  plantedAt?: string      // Alias for activatedAt (gardening metaphor)
  endDate?: string
  result?: number // 1-5 scale
  reflection?: string
  completedAt?: string
  harvestedAt?: string    // Alias for completedAt (gardening metaphor)
  // Bloom: describes what each outcome looks like (60 char max each)
  bloomWither?: string    // 1/5 - failure
  bloomBudding?: string   // 3/5 - moderate success
  bloomFlourish?: string  // 5/5 - full success
  // Leaf association
  leafId?: string
  waterEntries?: WaterEntry[]
}

// Legacy goal type (for migration)
export type GoalType = 'binary' | 'continuous'

export type NodeData = {
  label: string
  note: string
  // Sprout and leaf data
  sprouts?: Sprout[]
  leaves?: Leaf[]
  // Legacy fields (for migration, will be converted to sprouts)
  goalType?: GoalType
  goalValue?: number
  goalTitle?: string
}

export type TwigViewApi = {
  container: HTMLDivElement
  open: (twigNode: HTMLButtonElement) => void
  close: () => void
  isOpen: () => boolean
  refresh: () => void
}

export type LeafViewApi = {
  container: HTMLDivElement
  open: (leafId: string, twigId: string, branchIndex: number) => void
  close: () => void
  isOpen: () => boolean
}

export type ViewMode = 'overview' | 'branch' | 'twig' | 'leaf'

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
  backToBranchButton: HTMLButtonElement
  activeSproutsToggle: HTMLButtonElement
  activeSproutsList: HTMLDivElement
  cultivatedSproutsToggle: HTMLButtonElement
  cultivatedSproutsList: HTMLDivElement
  profileBadge: HTMLDivElement
  profileEmail: HTMLSpanElement
  syncIndicator: HTMLSpanElement
  syncText: HTMLSpanElement
  sproutsDialog: HTMLDivElement
  sproutsDialogContent: HTMLDivElement
  sproutsDialogClose: HTMLButtonElement
  waterDialog: HTMLDivElement
  waterDialogTitle: HTMLParagraphElement
  waterDialogMeta: HTMLParagraphElement
  waterDialogJournal: HTMLTextAreaElement
  waterDialogClose: HTMLButtonElement
  waterDialogCancel: HTMLButtonElement
  waterDialogSave: HTMLButtonElement
  harvestDialog: HTMLDivElement
  harvestDialogTitle: HTMLParagraphElement
  harvestDialogMeta: HTMLParagraphElement
  harvestDialogSlider: HTMLInputElement
  harvestDialogResultEmoji: HTMLSpanElement
  harvestDialogBloomHints: NodeListOf<HTMLParagraphElement>
  harvestDialogReflection: HTMLTextAreaElement
  harvestDialogClose: HTMLButtonElement
  harvestDialogCancel: HTMLButtonElement
  harvestDialogSave: HTMLButtonElement
  soilMeterFill: HTMLDivElement
  soilMeterValue: HTMLSpanElement
  waterCircles: HTMLSpanElement[]
  sunCircle: HTMLSpanElement
  waterCanDialog: HTMLDivElement
  waterCanDialogClose: HTMLButtonElement
  waterCanStatusText: HTMLParagraphElement
  waterCanStatusReset: HTMLParagraphElement
  waterCanEmptyLog: HTMLParagraphElement
  waterCanLogEntries: HTMLDivElement
  waterMeter: HTMLDivElement
  sunLogDialog: HTMLDivElement
  sunLogDialogClose: HTMLButtonElement
  sunLogShineSection: HTMLDivElement
  sunLogShineTitle: HTMLParagraphElement
  sunLogShineMeta: HTMLParagraphElement
  sunLogShineJournal: HTMLTextAreaElement
  sunLogShineBtn: HTMLButtonElement
  sunLogShineShone: HTMLDivElement
  sunLogShineShoneReset: HTMLParagraphElement
  sunLogDialogEmpty: HTMLParagraphElement
  sunLogDialogEntries: HTMLDivElement
  sunMeter: HTMLDivElement
  soilBagDialog: HTMLDivElement
  soilBagDialogClose: HTMLButtonElement
  soilBagDialogEmpty: HTMLParagraphElement
  soilBagDialogEntries: HTMLDivElement
  soilMeter: HTMLDivElement
  accountDialog: HTMLDivElement
  accountDialogClose: HTMLButtonElement
  accountDialogEmail: HTMLParagraphElement
  accountDialogNameInput: HTMLInputElement
  accountDialogPhoneInput: HTMLInputElement
  accountDialogTimezoneSelect: HTMLSelectElement
  accountDialogChannelInputs: NodeListOf<HTMLInputElement>
  accountDialogFrequencyInputs: NodeListOf<HTMLInputElement>
  accountDialogTimeInputs: NodeListOf<HTMLInputElement>
  accountDialogHarvestCheckbox: HTMLInputElement
  accountDialogShineCheckbox: HTMLInputElement
  accountDialogSignOut: HTMLButtonElement
  accountDialogSave: HTMLButtonElement
  accountDialogResetData: HTMLButtonElement
  accountDialogForceSync: HTMLButtonElement
}

export type AppContext = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
  twigView?: TwigViewApi
  leafView?: LeafViewApi
}
