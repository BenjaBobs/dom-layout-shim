import { transform, transformStyleAttribute } from 'lightningcss';
import { BoundedCache } from '../bounded-cache.ts';
import { readDeclaration } from './lightningcss-value-stringifier.ts';

export type CssDeclaration = {
  property: string;
  value: string;
  important?: boolean;
};

export function readDeclarationList(block: {
  declarations?: unknown[];
  importantDeclarations?: unknown[];
}): CssDeclaration[] {
  return [
    ...(block.declarations ?? []).map(declaration => ({
      ...readDeclaration(declaration),
      important: false,
    })),
    ...(block.importantDeclarations ?? []).map(declaration => ({
      ...readDeclaration(declaration),
      important: true,
    })),
  ];
}

const cache = new BoundedCache<readonly CssDeclaration[]>();

export function parseDeclarationList(text: string): readonly CssDeclaration[] {
  const cached = cache.get(text);
  if (cached) return cached;
  const originals: unknown[] = [];
  // Collect before Lightning CSS optimizes shorthands or values, just as the
  // stylesheet nesting pass does. The attribute parser owns token boundaries
  // and recovery; the second pass only recovers priority from inert markers.
  const parsed = transformStyleAttribute({
    code: Buffer.from(text),
    errorRecovery: true,
    visitor: {
      Declaration(declaration) {
        const index = originals.push(declaration) - 1;
        return { property: `--layout-declaration-${index}`, raw: '0' };
      },
    },
  });
  let declarations: CssDeclaration[] = [];
  transform({
    filename: 'inline-style.css',
    code: Buffer.from(`x {${Buffer.from(parsed.code).toString()}}`),
    visitor: {
      Rule(rule) {
        if (rule.type === 'style') {
          declarations = readDeclarationList(rule.value.declarations).map(
            marker => ({
              ...readDeclaration(
                originals[
                  Number(marker.property.slice('--layout-declaration-'.length))
                ],
              ),
              important: marker.important,
            }),
          );
        }
        return [];
      },
    },
  });
  cache.set(text, declarations);
  return declarations;
}
