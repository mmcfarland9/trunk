import type { DerivedLeaf } from '../../events'

/**
 * Populates the leaf select dropdown with current leaves for the twig.
 * Preserves the first two static options (placeholder + "create new").
 */
export function populateLeafSelect(
  leafSelect: HTMLSelectElement,
  getLeaves: () => DerivedLeaf[],
): void {
  while (leafSelect.options.length > 2) {
    leafSelect.remove(2)
  }
  const leaves = getLeaves()
  leaves.forEach((leaf: DerivedLeaf) => {
    const option = document.createElement('option')
    option.value = leaf.id
    option.textContent = leaf.name
    leafSelect.appendChild(option)
  })
  leafSelect.selectedIndex = 0
}

/**
 * Sets up the leaf select change handler.
 * Shows/hides the new leaf name input when "create new" is selected.
 */
export function setupLeafSelect(
  leafSelect: HTMLSelectElement,
  newLeafNameInput: HTMLInputElement,
  onUpdate: () => void,
): void {
  leafSelect.addEventListener('change', () => {
    if (leafSelect.value === '__new__') {
      newLeafNameInput.classList.remove('hidden')
      newLeafNameInput.focus()
    } else {
      newLeafNameInput.classList.add('hidden')
      newLeafNameInput.value = ''
    }
    onUpdate()
  })
}
