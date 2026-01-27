/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this when inserting user-generated content into the DOM via innerHTML.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
