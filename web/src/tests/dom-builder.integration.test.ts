/**
 * Integration tests for dom-builder.ts buildApp() function.
 * Verifies the full DOM tree is constructed with all expected elements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock state functions used by dom-builder
vi.mock('../state', () => ({
  getSoilAvailable: () => 10,
  getSoilCapacity: () => 10,
  getWaterAvailable: () => 3,
  getNodeState: () => ({}),
  getSunLog: () => [],
  getSoilLog: () => [],
}))

// Mock node-ui syncNode to avoid needing full state
vi.mock('../ui/node-ui', () => ({
  syncNode: () => {},
}))

// Mock image import
vi.mock('../../assets/tree_icon_circle.png', () => ({
  default: 'mock-image.png',
}))

import { buildApp } from '../ui/dom-builder'
import { BRANCH_COUNT, TWIG_COUNT } from '../constants'

describe('DOM Builder Integration', () => {
  let appRoot: HTMLDivElement
  let result: ReturnType<typeof buildApp>

  beforeEach(() => {
    appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.append(appRoot)

    const mockNodeClick = vi.fn()
    result = buildApp(appRoot, mockNodeClick)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ---------------------------------------------------------------------------
  // All fields non-null sweep
  // ---------------------------------------------------------------------------
  describe('AppElements completeness', () => {
    it('has no null or undefined fields', () => {
      for (const [key, value] of Object.entries(result.elements)) {
        expect(value, `elements.${key} should not be null`).not.toBeNull()
        expect(value, `elements.${key} should not be undefined`).toBeDefined()
      }
    })
  })

  describe('AppElements - Layout', () => {
    it('has shell, header, canvas, and side panel', () => {
      expect(result.elements.shell).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.header).toBeInstanceOf(HTMLElement)
      expect(result.elements.canvas).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sidePanel).toBeInstanceOf(HTMLElement)
    })

    it('has trunk button', () => {
      expect(result.elements.trunk).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.trunk.dataset.nodeId).toBe('trunk')
    })

    it('has guide layer', () => {
      expect(result.elements.guideLayer).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Side Panel', () => {
    it('has focus section elements', () => {
      expect(result.elements.focusMeta).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.focusTitle).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.focusNote).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.focusGoal).toBeInstanceOf(HTMLParagraphElement)
    })

    it('has progress section elements', () => {
      expect(result.elements.progressCount).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.progressFill).toBeInstanceOf(HTMLSpanElement)
    })

    it('has navigation buttons', () => {
      expect(result.elements.backToTrunkButton).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.backToBranchButton).toBeInstanceOf(HTMLButtonElement)
    })

    it('has sprout toggle and list elements', () => {
      expect(result.elements.activeSproutsToggle).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.activeSproutsList).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.cultivatedSproutsToggle).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.cultivatedSproutsList).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Profile', () => {
    it('has profile badge and email', () => {
      expect(result.elements.profileBadge).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.profileEmail).toBeInstanceOf(HTMLSpanElement)
    })

    it('has sync indicators', () => {
      expect(result.elements.syncTimestamp).toBeInstanceOf(HTMLSpanElement)
      expect(result.elements.syncState).toBeInstanceOf(HTMLSpanElement)
    })
  })

  describe('AppElements - Sprouts Dialog', () => {
    it('has sprouts dialog elements', () => {
      expect(result.elements.sproutsDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sproutsDialogContent).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sproutsDialogClose).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('AppElements - Water Dialog', () => {
    it('has water dialog elements', () => {
      expect(result.elements.waterDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.waterDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.waterDialogBody).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Harvest Dialog', () => {
    it('has harvest dialog elements', () => {
      expect(result.elements.harvestDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.harvestDialogTitle).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.harvestDialogMeta).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.harvestDialogSlider).toBeInstanceOf(HTMLInputElement)
      expect(result.elements.harvestDialogResultEmoji).toBeInstanceOf(HTMLSpanElement)
      expect(result.elements.harvestDialogBloomHints.length).toBe(3)
      expect(result.elements.harvestDialogReflection).toBeInstanceOf(HTMLTextAreaElement)
      expect(result.elements.harvestDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.harvestDialogCancel).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.harvestDialogSave).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('AppElements - Resource Meters', () => {
    it('has soil meter elements', () => {
      expect(result.elements.soilMeterFill).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.soilMeterValue).toBeInstanceOf(HTMLSpanElement)
      expect(result.elements.soilMeter).toBeInstanceOf(HTMLDivElement)
    })

    it('has water circles', () => {
      expect(result.elements.waterCircles).toHaveLength(3)
      result.elements.waterCircles.forEach(circle => {
        expect(circle).toBeInstanceOf(HTMLSpanElement)
      })
      expect(result.elements.waterMeter).toBeInstanceOf(HTMLDivElement)
    })

    it('has sun circle', () => {
      expect(result.elements.sunCircle).toBeInstanceOf(HTMLSpanElement)
      expect(result.elements.sunMeter).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Water Can Dialog', () => {
    it('has water can dialog elements', () => {
      expect(result.elements.waterCanDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.waterCanDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.waterCanStatusText).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.waterCanStatusReset).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.waterCanEmptyLog).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.waterCanLogEntries).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Sun Log Dialog', () => {
    it('has sun log dialog elements', () => {
      expect(result.elements.sunLogDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sunLogDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.sunLogShineSection).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sunLogShineTitle).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.sunLogShineMeta).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.sunLogShineJournal).toBeInstanceOf(HTMLTextAreaElement)
      expect(result.elements.sunLogShineBtn).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.sunLogShineShone).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.sunLogShineShoneReset).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.sunLogDialogEmpty).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.sunLogDialogEntries).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Soil Bag Dialog', () => {
    it('has soil bag dialog elements', () => {
      expect(result.elements.soilBagDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.soilBagDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.soilBagDialogEmpty).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.soilBagDialogEntries).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AppElements - Account Dialog', () => {
    it('has account dialog elements', () => {
      expect(result.elements.accountDialog).toBeInstanceOf(HTMLDivElement)
      expect(result.elements.accountDialogClose).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.accountDialogEmail).toBeInstanceOf(HTMLParagraphElement)
      expect(result.elements.accountDialogNameInput).toBeInstanceOf(HTMLInputElement)
      expect(result.elements.accountDialogPhoneInput).toBeInstanceOf(HTMLInputElement)
      expect(result.elements.accountDialogTimezoneSelect).toBeInstanceOf(HTMLSelectElement)
      expect(result.elements.accountDialogChannelInputs.length).toBe(3)
      expect(result.elements.accountDialogFrequencyInputs.length).toBe(4)
      expect(result.elements.accountDialogTimeInputs.length).toBe(3)
      expect(result.elements.accountDialogHarvestCheckbox).toBeInstanceOf(HTMLInputElement)
      expect(result.elements.accountDialogShineCheckbox).toBeInstanceOf(HTMLInputElement)
      expect(result.elements.accountDialogSignOut).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.accountDialogSave).toBeInstanceOf(HTMLButtonElement)
      expect(result.elements.accountDialogResetData).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('Branch Groups', () => {
    it('has 8 branch groups', () => {
      expect(result.branchGroups).toHaveLength(BRANCH_COUNT)
    })

    it('each group has correct structure', () => {
      result.branchGroups.forEach((group, i) => {
        expect(group.group).toBeInstanceOf(HTMLDivElement)
        expect(group.branch).toBeInstanceOf(HTMLButtonElement)
        expect(group.branch.dataset.nodeId).toBe(`branch-${i}`)
        expect(group.twigs).toHaveLength(TWIG_COUNT)
        group.twigs.forEach(twig => {
          expect(twig).toBeInstanceOf(HTMLButtonElement)
        })
      })
    })
  })

  describe('All Nodes', () => {
    const expectedNodeCount = 1 + BRANCH_COUNT + BRANCH_COUNT * TWIG_COUNT // trunk + branches + twigs

    it(`has ${1 + BRANCH_COUNT + BRANCH_COUNT * TWIG_COUNT} nodes (trunk + branches + twigs)`, () => {
      expect(result.allNodes).toHaveLength(expectedNodeCount)
    })

    it('all nodes are buttons', () => {
      result.allNodes.forEach(node => {
        expect(node).toBeInstanceOf(HTMLButtonElement)
      })
    })
  })

  describe('Node Lookup', () => {
    const expectedNodeCount = 1 + BRANCH_COUNT + BRANCH_COUNT * TWIG_COUNT

    it(`has ${1 + BRANCH_COUNT + BRANCH_COUNT * TWIG_COUNT} entries`, () => {
      expect(result.nodeLookup.size).toBe(expectedNodeCount)
    })

    it('contains trunk', () => {
      expect(result.nodeLookup.get('trunk')).toBeInstanceOf(HTMLButtonElement)
    })

    it('contains all branches', () => {
      for (let i = 0; i < BRANCH_COUNT; i++) {
        expect(result.nodeLookup.get(`branch-${i}`)).toBeInstanceOf(HTMLButtonElement)
      }
    })

    it('contains all twigs', () => {
      for (let i = 0; i < BRANCH_COUNT; i++) {
        for (let j = 0; j < TWIG_COUNT; j++) {
          expect(result.nodeLookup.get(`branch-${i}-twig-${j}`)).toBeInstanceOf(HTMLButtonElement)
        }
      }
    })
  })

  describe('Node Click Handler', () => {
    it('fires callback when a node is clicked', () => {
      const mockClick = vi.fn()
      const freshRoot = document.createElement('div')
      const freshResult = buildApp(freshRoot, mockClick)

      freshResult.elements.trunk.click()

      expect(mockClick).toHaveBeenCalledWith(
        freshResult.elements.trunk,
        'trunk',
        'Trunk'
      )
    })
  })
})
