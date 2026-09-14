import { transformStyleAttribute } from 'lightningcss';

// The native printer cannot accept every AST it produces (notably var() and
// tuple-shaped values). Recover diagnostic text from the source instead of
// passing those ASTs back through the binding, which can abort the process.
const readers = new WeakMap<object, () => Map<string, string>>();

export function createDeclarationSourceRecorder(
  text: string,
): (declaration: object) => void {
  let values: Map<string, string> | undefined;
  const read = () => {
    if (values) return values;
    values = new Map();
    for (const candidate of declarationCandidates(text)) {
      const colon = candidate.indexOf(':');
      if (colon < 0 || !/^\s*[-\w]+\s*$/.test(candidate.slice(0, colon)))
        continue;
      const value = candidate
        .slice(colon + 1)
        .trim()
        .replace(/!\s*important\s*$/i, '')
        .trim();
      transformStyleAttribute({
        code: Buffer.from(candidate),
        errorRecovery: true,
        visitor: {
          Declaration(declaration) {
            values?.set(declarationKey(declaration), value);
          },
        },
      });
    }
    return values;
  };
  return declaration => readers.set(declaration, read);
}

export function authoredDeclarationValue(
  declaration: object,
): string | undefined {
  return readers.get(declaration)?.().get(declarationKey(declaration));
}

function declarationKey(declaration: object): string {
  // URLs include parser source positions, which change in an isolated value.
  return JSON.stringify(declaration, (key, value) =>
    key === 'loc' ? undefined : value,
  );
}

function declarationCandidates(text: string): string[] {
  const candidates: string[] = [];
  let segment = '';
  let quote = '';
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    if (character === '\\') {
      segment += character + (text[++index] ?? '');
      continue;
    }
    if (quote) {
      segment += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2);
      index = end < 0 ? text.length : end + 1;
      segment += ' ';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') depth -= 1;
    if (
      depth === 0 &&
      (character === ';' || character === '{' || character === '}')
    ) {
      if (character !== '{') candidates.push(segment);
      segment = '';
    } else {
      segment += character;
    }
  }
  candidates.push(segment);
  return candidates;
}
