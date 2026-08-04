import { expect, test } from '@playwright/test'

/**
 * Continuing a leaf directly from a completed sprout card in the twig view's
 * Cultivated column — without detouring through the leaf log view.
 */

const TWIG_ID = 'branch-0-twig-0'
const LEAF_ID = 'test-leaf-continue'

async function seedCompletedSprout(page: import('@playwright/test').Page) {
  await page.evaluate(
    ({ twigId, leafId }) => {
      const planted = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const harvested = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()

      localStorage.setItem(
        'trunk-events-v1',
        JSON.stringify([
          {
            type: 'leaf_created',
            timestamp: planted,
            leafId,
            twigId,
            name: 'Step Count',
          },
          {
            type: 'sprout_planted',
            timestamp: planted,
            sproutId: 'sprout-completed-1',
            twigId,
            leafId,
            title: '10,000 steps a month',
            season: '2w',
            environment: 'fertile',
            soilCost: 2,
            bloomWither: 'Missed most days',
            bloomBudding: 'Hit it half the time',
            bloomFlourish: 'Every single day',
          },
          {
            type: 'sprout_harvested',
            timestamp: harvested,
            sproutId: 'sprout-completed-1',
            result: 4,
            capacityGained: 0.2,
          },
        ]),
      )
    },
    { twigId: TWIG_ID, leafId: LEAF_ID },
  )

  await page.reload()
  await page.waitForSelector('.canvas')

  await page.click('.node.branch', { force: true })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.canvas')
    return canvas?.classList.contains('is-zoomed')
  })
  await page.evaluate(() => {
    const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
    twig?.click()
  })
  await page.waitForSelector('.twig-view:not(.hidden)')
}

test.describe('Continue from a cultivated sprout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.canvas')
  })

  test('completed card exposes a continue action', async ({ page }) => {
    await seedCompletedSprout(page)

    const card = page.locator('.sprout-history-card').first()
    await expect(card).toBeVisible()
    await expect(card.locator('.sprout-continue-btn')).toHaveCount(1)
  })

  test('continue prefills the plant form from the completed sprout', async ({ page }) => {
    await seedCompletedSprout(page)

    // Form starts collapsed and empty.
    await expect(page.locator('.sprout-draft-form')).toHaveClass(/is-collapsed/)

    await page.locator('.sprout-history-card .sprout-continue-btn').first().click()

    // Expands, preselects the leaf, and carries the previous sprout's shape.
    await expect(page.locator('.sprout-draft-form')).not.toHaveClass(/is-collapsed/)
    await expect(page.locator('.sprout-leaf-select')).toHaveValue(LEAF_ID)
    await expect(page.locator('.sprout-title-input')).toHaveValue('10,000 steps a month')
    await expect(page.locator('.sprout-wither-input')).toHaveValue('Missed most days')
    await expect(page.locator('.sprout-flourish-input')).toHaveValue('Every single day')
    await expect(page.locator('.sprout-season-btn[data-season="2w"]')).toHaveClass(/is-active/)
    await expect(page.locator('.sprout-env-btn[data-env="fertile"]')).toHaveClass(/is-active/)
  })

  test('continue does not also open the leaf log view', async ({ page }) => {
    await seedCompletedSprout(page)

    // The card itself carries data-action="open-leaf", so the button must stop
    // propagation or the log would cover the form the user is meant to fill in.
    await page.locator('.sprout-history-card .sprout-continue-btn').first().click()

    await expect(page.locator('.leaf-view')).not.toHaveClass(/is-open/)
    await expect(page.locator('.sprout-title-input')).toBeFocused()
  })
})
