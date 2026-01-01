export type BranchGroup = {
  group: HTMLDivElement
  branch: HTMLButtonElement
  leaves: HTMLButtonElement[]
}

export type NodeData = {
  label: string
  note: string
}

export type EditorApi = {
  container: HTMLDivElement
  open: (target: HTMLButtonElement, placeholder: string) => void
  reposition: (target: HTMLButtonElement) => void
  close: () => void
}

export type BranchProgressItem = {
  button: HTMLButtonElement
  label: HTMLSpanElement
  count: HTMLSpanElement
  index: number
}

export type ViewMode = 'overview' | 'branch'

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
  progressCount: HTMLParagraphElement
  progressFill: HTMLSpanElement
  nextButton: HTMLButtonElement
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
}
