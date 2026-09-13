import { expect, it } from 'vitest';
import {
  applyInlineCustomProperties,
  parseDeclarationBlock,
} from '../../src/css-parity-implementation/css/inline-style-source.ts';

it('uses CSS token boundaries for comments, strings, functions, and recovery', () => {
  expect(
    parseDeclarationBlock(
      '--label: "a;b:c"; /* ; */ width:var(--size, calc(20px + 2px)); broken; height:10px',
    ).map(({ property, value }) => ({ property, value })),
  ).toEqual([
    { property: '--label', value: '"a;b:c"' },
    { property: 'width', value: 'var(--size, calc(20px + 2px))' },
    { property: 'height', value: '10px' },
  ]);
});

it('separates inline priority metadata while retaining invalid values for policy routing', () => {
  const declarations = parseDeclarationBlock(
    'width: unsupported ! ImPoRtAnT; height: 20px; color: "!important"',
  );
  expect(
    declarations.map(({ property, value }) => ({ property, value })),
  ).toEqual([
    { property: 'height', value: '20px' },
    { property: 'color', value: '"!important"' },
    { property: 'width', value: 'unsupported' },
  ]);
});

it('removes priority from custom property values and preserves important source order', () => {
  const element = document.createElement('div');
  element.setAttribute(
    'style',
    '--size: 10px !important; --size: 20px !important; --size: 30px',
  );
  const properties = new Map<string, string>();
  applyInlineCustomProperties(properties, new Map(), element);
  expect(properties.get('--size')).toBe('20px');
});
