import { expect, it, vi } from 'vitest';
import { createStyleResolver } from '../../src/css-parity-implementation/css/style-resolver.ts';
import { readCssTextRules } from '../../src/css-parity-implementation/css/stylesheet-source.ts';
import { createFormattingTree } from '../../src/css-parity-implementation/layout/formatting-tree.ts';

it('captures rendering participation once across inline, rule, generated, and table sources', () => {
  document.body.innerHTML = `
    <div id="host"><span id="inline" style="display:inline">text</span><div id="contents" style="display:contents"><div id="cell"></div></div></div>
    <details><summary>summary</summary><div id="closed"><span id="descendant"></span></div></details>`;
  const resolver = createStyleResolver({
    rules: readCssTextRules(
      '#cell{display:table-cell} #host::before{content:"generated";display:block}',
      'classification.css',
      undefined,
    ),
    userAgentRules: [],
    profile: 'portable',
    policy: undefined,
    viewport: { width: 400, height: 300 },
  });
  const tree = createFormattingTree(document, resolver);
  const get = (id: string) => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing fixture element: ${id}`);
    return tree.element(element);
  };
  expect(get('inline').kind).toBe('inline');
  expect(get('contents').kind).toBe('contents');
  expect(get('cell').kind).toBe('table-cell');
  expect(get('closed').kind).toBe('suppressed');
  expect(get('descendant').kind).toBe('suppressed');
  expect(get('host').before).toMatchObject({
    kind: 'generated',
    output: 'box',
    pseudo: 'before',
  });
  const attributes = vi.spyOn(get('host').element, 'getAttribute');
  const styles = vi.spyOn(resolver, 'element');
  const original = get('host');
  expect(get('host')).toBe(original);
  expect(attributes).not.toHaveBeenCalled();
  expect(styles).not.toHaveBeenCalled();
});
