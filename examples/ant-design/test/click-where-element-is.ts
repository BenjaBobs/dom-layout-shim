// docs:start click-where-element-is
export function clickWhereElementIs(element: HTMLElement): void {
  const rect = element.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const hitTarget = element.ownerDocument.elementFromPoint(x, y)

  if (!hitTarget || (hitTarget !== element && !element.contains(hitTarget))) {
    throw new Error(`Expected ${element.tagName.toLowerCase()} to receive the click at (${x}, ${y})`)
  }

  hitTarget.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  }))
}
// docs:end click-where-element-is
