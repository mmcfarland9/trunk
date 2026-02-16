export function requireElement<T extends Element>(
  parent: Element | Document,
  selector: string,
  description: string
): T {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(
      `Required element not found: ${description} (selector: "${selector}")`
    )
  }
  return element
}
