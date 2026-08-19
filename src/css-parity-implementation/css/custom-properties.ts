export type CustomProperties = ReadonlyMap<string, string>;
const emptyCustomProperties: CustomProperties = new Map();

export function applyCustomPropertyDeclaration(
  properties: Map<string, string>,
  inherited: CustomProperties,
  property: string,
  value: string,
): void {
  if (!property.startsWith('--')) {
    return;
  }

  const keyword = value.trim().toLowerCase();

  if (keyword === 'initial') {
    properties.delete(property);
    return;
  }

  if (keyword === 'inherit' || keyword === 'unset') {
    const inheritedValue = inherited.get(property);

    if (inheritedValue === undefined) {
      properties.delete(property);
    } else {
      properties.set(property, inheritedValue);
    }
    return;
  }

  properties.set(property, value.trim());
}

export function resolveCustomPropertyValue(
  value: string,
  properties: CustomProperties = emptyCustomProperties,
): string | undefined {
  if (!value.toLowerCase().includes('var(')) {
    return value;
  }

  const cyclic = new Set<string>();
  const resolved = new Map<string, string | undefined>();

  return resolveValue(value, properties, [], cyclic, resolved);
}

function resolveValue(
  value: string,
  properties: CustomProperties,
  stack: string[],
  cyclic: Set<string>,
  resolved: Map<string, string | undefined>,
): string | undefined {
  let output = '';
  let index = 0;

  while (index < value.length) {
    const variable = findNextVariable(value, index);

    if (!variable) {
      output += value.slice(index);
      break;
    }

    output += value.slice(index, variable.start);
    if (!variable.closed) {
      return undefined;
    }

    const replacement = resolveVariable(
      variable.contents,
      properties,
      stack,
      cyclic,
      resolved,
    );

    if (replacement === undefined) {
      return undefined;
    }

    output += replacement;
    index = variable.end;
  }

  return output;
}

function resolveVariable(
  contents: string,
  properties: CustomProperties,
  stack: string[],
  cyclic: Set<string>,
  resolved: Map<string, string | undefined>,
): string | undefined {
  const comma = findTopLevelComma(contents);
  const name = contents.slice(0, comma ?? contents.length).trim();
  const fallback = comma === undefined ? undefined : contents.slice(comma + 1);

  if (!name.startsWith('--')) {
    return undefined;
  }

  const replacement = resolveProperty(
    name,
    properties,
    stack,
    cyclic,
    resolved,
  );

  if (replacement !== undefined) {
    return replacement;
  }

  if (stack.some(entry => cyclic.has(entry))) {
    return undefined;
  }

  return fallback === undefined
    ? undefined
    : resolveValue(fallback, properties, stack, cyclic, resolved);
}

function resolveProperty(
  name: string,
  properties: CustomProperties,
  stack: string[],
  cyclic: Set<string>,
  resolved: Map<string, string | undefined>,
): string | undefined {
  if (resolved.has(name)) {
    return resolved.get(name);
  }

  const cycleStart = stack.indexOf(name);

  if (cycleStart !== -1) {
    for (const entry of stack.slice(cycleStart)) {
      cyclic.add(entry);
    }
    return undefined;
  }

  const authoredValue = properties.get(name);

  if (authoredValue === undefined) {
    return undefined;
  }

  stack.push(name);
  const value = resolveValue(
    authoredValue,
    properties,
    stack,
    cyclic,
    resolved,
  );
  stack.pop();
  const result = cyclic.has(name) ? undefined : value;
  resolved.set(name, result);
  return result;
}

function findNextVariable(
  value: string,
  from: number,
):
  | { start: number; end: number; contents: string; closed: boolean }
  | undefined {
  let quote: string | undefined;

  for (let index = from; index < value.length; index += 1) {
    const character = value[index];

    if (character === '\\') {
      index += 1;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    const preceding = value[index - 1];

    if (
      value.slice(index, index + 4).toLowerCase() !== 'var(' ||
      (preceding !== undefined && /[\w-]/.test(preceding))
    ) {
      continue;
    }

    const end = findClosingParenthesis(value, index + 4);

    if (end === undefined) {
      return {
        start: index,
        end: value.length,
        contents: value.slice(index + 4),
        closed: false,
      };
    }

    return {
      start: index,
      end: end + 1,
      contents: value.slice(index + 4, end),
      closed: true,
    };
  }

  return undefined;
}

function findClosingParenthesis(
  value: string,
  from: number,
): number | undefined {
  let depth = 1;
  let quote: string | undefined;

  for (let index = from; index < value.length; index += 1) {
    const character = value[index];

    if (character === '\\') {
      index += 1;
    } else if (quote) {
      if (character === quote) {
        quote = undefined;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return undefined;
}

function findTopLevelComma(value: string): number | undefined {
  let depth = 0;
  let quote: string | undefined;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '\\') {
      index += 1;
    } else if (quote) {
      if (character === quote) {
        quote = undefined;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      return index;
    }
  }

  return undefined;
}
