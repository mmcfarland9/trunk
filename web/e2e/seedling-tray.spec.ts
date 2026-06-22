/**
 * E2E test: plant a seedling from the sidebar tray.
 *
 * Seeds a seedling_created event, expands the Seedlings sidebar section,
 * clicks the plant ("Set") action on the seedling card, and asserts that
 * the sprout-title input in the twig view is pre-filled with the seedling title.
 */

import { test, expect, resetAppState, seedEvents } from './fixtures'

const TWIG_ID = 'branch-0-twig-0'
const SEEDLING_TITLE = 'E2E Seedling Tray Test'

test('plant a seedling from the sidebar tray pre-fills the title input', async ({ page }) => {
  await page.goto('/')
  await resetAppState(page)

  // Seed a single seedling so we have a known card in the tray
  await seedEvents(page, [
    {
      type: 'seedling_created',
      timestamp: new Date().toISOString(),
      seedlingId: 'seedling-e2e-tray-test',
      twigId: TWIG_ID,
      title: SEEDLING_TITLE,
    },
  ])

  await page.reload()
  await page.waitForSelector('.canvas')

  // Expand the Seedlings section in the sidebar (starts collapsed)
  const seedlingsToggle = page.locator('.sprouts-toggle[data-section="seedlings"]')
  await expect(seedlingsToggle).toBeVisible()
  await seedlingsToggle.click()

  const seedlingsList = page.locator('.sprouts-list[data-section="seedlings"]')
  await expect(seedlingsList).not.toHaveClass(/is-collapsed/)

  // The seedling is inside a branch folder — expand it if collapsed
  const branchFolder = seedlingsList.locator('.branch-folder').first()
  await expect(branchFolder).toBeVisible()

  const isCollapsed = await branchFolder.evaluate((el) => el.classList.contains('is-collapsed'))
  if (isCollapsed) {
    await branchFolder.locator('.branch-folder-header').click()
    await expect(branchFolder).not.toHaveClass(/is-collapsed/)
  }

  // Find the seedling card and read its title
  const seedlingCard = seedlingsList.locator('.seedling-card').first()
  await expect(seedlingCard).toBeVisible()
  const cardTitle = await seedlingCard.locator('.seedling-title').innerText()
  expect(cardTitle).toBe(SEEDLING_TITLE)

  // Click the plant ("Set") action
  await seedlingCard.locator('[data-seedling-action="plant"]').click()

  // The app navigates to the seedling's twig and opens the twig view
  await page.waitForSelector('.twig-view:not(.hidden)')

  // Assert the sprout title input is pre-filled with the seedling title
  await expect(page.locator('.sprout-title-input')).toHaveValue(SEEDLING_TITLE)
})
