import { debugLayout } from './attachment/patch-dom-apis.ts';

export type PointerAssertionOptions = {
  message?: string;
};

export function expectReceivesPointer(
  element: Element,
  options: PointerAssertionOptions = {},
): void {
  const result = queryCenterPointer(element);

  if (result.receivesPointer) {
    return;
  }

  throw new Error(
    formatPointerFailure(
      options.message ??
        `Expected ${describeElement(element)} to receive pointer events at its center.`,
      element,
      result,
    ),
  );
}

export function expectBlockedBy(
  element: Element,
  blocker?: Element,
  options: PointerAssertionOptions = {},
): Element {
  const result = queryCenterPointer(element);

  if (result.receivesPointer) {
    throw new Error(
      formatPointerFailure(
        options.message ??
          `Expected ${describeElement(element)} to be blocked at its center.`,
        element,
        result,
      ),
    );
  }

  if (!result.topElement) {
    throw new Error(
      formatPointerFailure(
        options.message ??
          `Expected ${describeElement(element)} to be blocked by another element, but no element was hit.`,
        element,
        result,
      ),
    );
  }

  if (
    blocker &&
    result.topElement !== blocker &&
    !blocker.contains(result.topElement)
  ) {
    throw new Error(
      formatPointerFailure(
        options.message ??
          `Expected ${describeElement(element)} to be blocked by ${describeElement(blocker)}, but ${describeElement(result.topElement)} was on top.`,
        element,
        result,
      ),
    );
  }

  return result.topElement;
}

export function guardedClick(
  element: HTMLElement,
  options: PointerAssertionOptions = {},
): void {
  expectReceivesPointer(element, options);
  element.click();
}

type CenterPointerResult = {
  x: number;
  y: number;
  topElement: Element | null;
  receivesPointer: boolean;
};

function queryCenterPointer(element: Element): CenterPointerResult {
  const document = element.ownerDocument;
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const topElement = document.elementFromPoint(x, y);

  return {
    x,
    y,
    topElement,
    receivesPointer:
      topElement === element ||
      Boolean(topElement && element.contains(topElement)),
  };
}

function formatPointerFailure(
  message: string,
  element: Element,
  result: CenterPointerResult,
): string {
  const lines = [
    message,
    `Target: ${describeElement(element)}`,
    `Center: x=${formatNumber(result.x)} y=${formatNumber(result.y)}`,
    `Top element: ${result.topElement ? describeElement(result.topElement) : 'none'}`,
    '',
    'Layout debug:',
    debugLayout({ document: element.ownerDocument }),
  ];

  return lines.join('\n');
}

function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const className =
    typeof element.className === 'string' && element.className
      ? `.${element.className.trim().replace(/\s+/g, '.')}`
      : '';

  return `${element.tagName.toLowerCase()}${id}${className}`;
}

function formatNumber(value: number): string {
  return Object.is(value, -0) ? '0' : String(Number(value.toFixed(4)));
}
