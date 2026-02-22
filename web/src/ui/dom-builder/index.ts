import type { AppElements, BranchGroup } from '../../types'
import { requireElement } from '../../utils/dom-helpers'
import { buildHeader, type HeaderElements } from './build-header'
import { buildSidebar } from './build-sidebar'
import { buildDialogs, type DialogElements } from './build-dialogs'
import { buildTreeNodes, type TreeNodesElements } from './build-tree-nodes'

type DomBuilderResult = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
}

type NodeClickHandler = (element: HTMLButtonElement, nodeId: string) => void

function assembleElements(
  shell: HTMLDivElement,
  headerResult: HeaderElements,
  sidePanel: HTMLElement,
  treeResult: TreeNodesElements,
  dialogsResult: DialogElements,
): AppElements {
  return {
    shell,
    header: headerResult.header,
    canvas: treeResult.canvas,
    trunk: treeResult.trunk,
    guideLayer: treeResult.guideLayer,
    sidePanel,
    focusMeta: requireElement<HTMLParagraphElement>(
      sidePanel,
      '.focus-meta',
      'focus metadata paragraph',
    ),
    focusTitle: requireElement<HTMLParagraphElement>(
      sidePanel,
      '.focus-title',
      'focus title paragraph',
    ),
    focusNote: requireElement<HTMLParagraphElement>(
      sidePanel,
      '.focus-note',
      'focus note paragraph',
    ),
    focusGoal: requireElement<HTMLParagraphElement>(
      sidePanel,
      '.focus-goal',
      'focus goal paragraph',
    ),
    progressCount: requireElement<HTMLParagraphElement>(
      sidePanel,
      '.progress-count',
      'progress count paragraph',
    ),
    progressFill: requireElement<HTMLSpanElement>(
      sidePanel,
      '.progress-fill',
      'progress fill span',
    ),
    backToTrunkButton: requireElement<HTMLButtonElement>(
      sidePanel,
      '.back-to-trunk',
      'back to trunk button',
    ),
    backToBranchButton: requireElement<HTMLButtonElement>(
      sidePanel,
      '.back-to-branch',
      'back to branch button',
    ),
    activeSproutsToggle: requireElement<HTMLButtonElement>(
      sidePanel,
      '.sprouts-toggle[data-section="active"]',
      'active sprouts toggle',
    ),
    activeSproutsList: requireElement<HTMLDivElement>(
      sidePanel,
      '.sprouts-list[data-section="active"]',
      'active sprouts list',
    ),
    cultivatedSproutsToggle: requireElement<HTMLButtonElement>(
      sidePanel,
      '.sprouts-toggle[data-section="cultivated"]',
      'cultivated sprouts toggle',
    ),
    cultivatedSproutsList: requireElement<HTMLDivElement>(
      sidePanel,
      '.sprouts-list[data-section="cultivated"]',
      'cultivated sprouts list',
    ),
    profileBadge: headerResult.profileBadge,
    profileEmail: headerResult.profileEmail,
    syncButton: headerResult.syncButton,
    syncTimestamp: requireElement<HTMLSpanElement>(
      dialogsResult.accountDialog,
      '.sync-timestamp',
      'sync timestamp span',
    ),
    syncState: requireElement<HTMLSpanElement>(
      dialogsResult.accountDialog,
      '.sync-state',
      'sync state span',
    ),
    sproutsDialog: dialogsResult.sproutsDialog,
    sproutsDialogContent: requireElement<HTMLDivElement>(
      dialogsResult.sproutsDialog,
      '.sprouts-dialog-content',
      'sprouts dialog content',
    ),
    sproutsDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.sproutsDialog,
      '.sprouts-dialog-close',
      'sprouts dialog close button',
    ),
    waterDialog: dialogsResult.waterDialog,
    waterDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.waterDialog,
      '.water-dialog-close',
      'water dialog close button',
    ),
    waterDialogBody: requireElement<HTMLDivElement>(
      dialogsResult.waterDialog,
      '.water-dialog-body',
      'water dialog body',
    ),
    harvestDialog: dialogsResult.harvestDialog,
    harvestDialogTitle: requireElement<HTMLParagraphElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-sprout-title',
      'harvest dialog sprout title',
    ),
    harvestDialogMeta: requireElement<HTMLParagraphElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-sprout-meta',
      'harvest dialog sprout meta',
    ),
    harvestDialogSlider: requireElement<HTMLInputElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-slider',
      'harvest dialog slider',
    ),
    harvestDialogResultEmoji: requireElement<HTMLSpanElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-result-emoji',
      'harvest dialog result emoji',
    ),
    harvestDialogBloomHints: dialogsResult.harvestDialog.querySelectorAll<HTMLParagraphElement>(
      '.harvest-dialog-bloom-hint',
    ),
    harvestDialogReflection: requireElement<HTMLTextAreaElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-reflection',
      'harvest dialog reflection textarea',
    ),
    harvestDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-close',
      'harvest dialog close button',
    ),
    harvestDialogCancel: requireElement<HTMLButtonElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-cancel',
      'harvest dialog cancel button',
    ),
    harvestDialogSave: requireElement<HTMLButtonElement>(
      dialogsResult.harvestDialog,
      '.harvest-dialog-save',
      'harvest dialog save button',
    ),
    soilMeterFill: headerResult.soilMeterFill,
    soilMeterValue: headerResult.soilMeterValue,
    waterCircles: headerResult.waterCircles,
    sunCircle: headerResult.sunCircle,
    waterCanDialog: dialogsResult.waterCanDialog,
    waterCanDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.waterCanDialog,
      '.water-can-dialog-close',
      'water can dialog close button',
    ),
    waterCanStatusText: requireElement<HTMLParagraphElement>(
      dialogsResult.waterCanDialog,
      '.water-can-status-text',
      'water can status text',
    ),
    waterCanStatusReset: requireElement<HTMLParagraphElement>(
      dialogsResult.waterCanDialog,
      '.water-can-status-reset',
      'water can status reset text',
    ),
    waterCanEmptyLog: requireElement<HTMLParagraphElement>(
      dialogsResult.waterCanDialog,
      '.water-can-empty-log',
      'water can empty log text',
    ),
    waterCanLogEntries: requireElement<HTMLDivElement>(
      dialogsResult.waterCanDialog,
      '.water-can-log-entries',
      'water can log entries container',
    ),
    waterMeter: headerResult.waterMeter,
    waterStreakValue: headerResult.waterStreakValue,
    sunLogDialog: dialogsResult.sunLogDialog,
    sunLogDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-dialog-close',
      'sun log dialog close button',
    ),
    sunLogShineSection: requireElement<HTMLDivElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-section',
      'sun log shine section',
    ),
    sunLogShineTitle: requireElement<HTMLParagraphElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-title',
      'sun log shine title',
    ),
    sunLogShineMeta: requireElement<HTMLParagraphElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-meta',
      'sun log shine meta',
    ),
    sunLogShineJournal: requireElement<HTMLTextAreaElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-journal',
      'sun log shine journal textarea',
    ),
    sunLogShineBtn: requireElement<HTMLButtonElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-btn',
      'sun log shine button',
    ),
    sunLogShineShone: requireElement<HTMLDivElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-shone',
      'sun log shine shone indicator',
    ),
    sunLogShineShoneReset: requireElement<HTMLParagraphElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-shine-shone-reset',
      'sun log shine shone reset text',
    ),
    sunLogDialogEmpty: requireElement<HTMLParagraphElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-empty',
      'sun log empty state text',
    ),
    sunLogDialogEntries: requireElement<HTMLDivElement>(
      dialogsResult.sunLogDialog,
      '.sun-log-entries',
      'sun log entries container',
    ),
    sunMeter: headerResult.sunMeter,
    soilBagDialog: dialogsResult.soilBagDialog,
    soilBagDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.soilBagDialog,
      '.soil-bag-dialog-close',
      'soil bag dialog close button',
    ),
    soilBagDialogEmpty: requireElement<HTMLParagraphElement>(
      dialogsResult.soilBagDialog,
      '.soil-bag-empty',
      'soil bag empty state text',
    ),
    soilBagDialogEntries: requireElement<HTMLDivElement>(
      dialogsResult.soilBagDialog,
      '.soil-bag-entries',
      'soil bag entries container',
    ),
    soilMeter: headerResult.soilMeter,
    accountDialog: dialogsResult.accountDialog,
    accountDialogClose: requireElement<HTMLButtonElement>(
      dialogsResult.accountDialog,
      '.account-dialog-close',
      'account dialog close button',
    ),
    accountDialogEmail: requireElement<HTMLParagraphElement>(
      dialogsResult.accountDialog,
      '.account-email',
      'account dialog email',
    ),
    accountDialogNameInput: requireElement<HTMLInputElement>(
      dialogsResult.accountDialog,
      '.account-name-input',
      'account dialog name input',
    ),
    accountDialogPhoneInput: requireElement<HTMLInputElement>(
      dialogsResult.accountDialog,
      '.account-phone-input',
      'account dialog phone input',
    ),
    accountDialogTimezoneSelect: requireElement<HTMLSelectElement>(
      dialogsResult.accountDialog,
      '.account-timezone-select',
      'account dialog timezone select',
    ),
    accountDialogChannelInputs: dialogsResult.accountDialog.querySelectorAll<HTMLInputElement>(
      'input[name="notify-channel"]',
    ),
    accountDialogFrequencyInputs: dialogsResult.accountDialog.querySelectorAll<HTMLInputElement>(
      'input[name="notify-frequency"]',
    ),
    accountDialogTimeInputs: dialogsResult.accountDialog.querySelectorAll<HTMLInputElement>(
      'input[name="notify-time"]',
    ),
    accountDialogHarvestCheckbox: requireElement<HTMLInputElement>(
      dialogsResult.accountDialog,
      '.account-notify-harvest',
      'account dialog harvest notification checkbox',
    ),
    accountDialogShineCheckbox: requireElement<HTMLInputElement>(
      dialogsResult.accountDialog,
      '.account-notify-shine',
      'account dialog shine notification checkbox',
    ),
    accountDialogSignOut: requireElement<HTMLButtonElement>(
      dialogsResult.accountDialog,
      '.account-sign-out-btn',
      'account dialog sign out button',
    ),
    accountDialogSave: requireElement<HTMLButtonElement>(
      dialogsResult.accountDialog,
      '.account-save-btn',
      'account dialog save button',
    ),
    accountDialogResetData: requireElement<HTMLButtonElement>(
      dialogsResult.accountDialog,
      '.account-reset-data-btn',
      'account dialog reset data button',
    ),
  }
}

export function buildApp(appRoot: HTMLDivElement, onNodeClick: NodeClickHandler): DomBuilderResult {
  // Shell
  const shell = document.createElement('div')
  shell.className = 'app-shell'

  // Build sections
  const headerResult = buildHeader()
  const sidePanel = buildSidebar()
  const treeResult = buildTreeNodes(onNodeClick)
  const dialogsResult = buildDialogs()

  // Body
  const body = document.createElement('div')
  body.className = 'app-body'
  body.append(treeResult.mapPanel, sidePanel)

  // Assemble shell
  shell.append(
    headerResult.header,
    body,
    dialogsResult.sproutsDialog,
    dialogsResult.waterDialog,
    dialogsResult.harvestDialog,
    dialogsResult.waterCanDialog,
    dialogsResult.sunLogDialog,
    dialogsResult.soilBagDialog,
    dialogsResult.accountDialog,
  )
  appRoot.append(shell)

  const elements = assembleElements(shell, headerResult, sidePanel, treeResult, dialogsResult)

  return {
    elements,
    branchGroups: treeResult.branchGroups,
    allNodes: treeResult.allNodes,
    nodeLookup: treeResult.nodeLookup,
  }
}
