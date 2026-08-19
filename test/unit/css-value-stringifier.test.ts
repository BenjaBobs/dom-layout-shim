import { transform } from 'lightningcss';
import { describe, expect, it } from 'vitest';
import { readDeclaration } from '../../src/css-parity-implementation/css/lightningcss-value-stringifier.ts';

describe('Lightning CSS value stringification', () => {
  it('preserves nested calculated custom-property values as authored CSS', () => {
    const declarations: Array<{ property: string; value: string }> = [];

    transform({
      filename: 'calculated-values.css',
      code: Buffer.from(`
        .subject {
          padding-inline: calc(var(--padding) - 1px);
          max-width: calc(100vw - calc(var(--margin) * 2));
        }
      `),
      visitor: {
        Declaration(declaration) {
          declarations.push(readDeclaration(declaration));
        },
      },
    });

    expect(declarations).toEqual([
      { property: 'padding-inline', value: 'calc(var(--padding) - 1px)' },
      { property: 'max-width', value: 'calc(100vw - calc(var(--margin) * 2))' },
    ]);
  });
});
