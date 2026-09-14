export function dimensionAttribute(
  element: Element,
  name: string,
): number | undefined {
  const value = element.getAttribute(name)?.trim();
  if (!value || !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(value))
    return undefined;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function hasIntrinsicSizeOverride(element: Element): boolean {
  return ['data-layout-width', 'data-layout-height'].every(name => {
    const value = element.getAttribute(name);
    return !!value && Number.isFinite(Number(value));
  });
}
