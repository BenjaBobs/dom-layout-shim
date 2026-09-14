import { expect, it } from 'vitest';
import {
  loadTaffy,
  Style,
  TaffyTree,
} from '../../src/css-parity-implementation/layout/taffy/taffy-bindings.ts';

it('retains backend read results until computation and preserves earlier results afterward', async () => {
  await loadTaffy();
  const tree = new TaffyTree();
  const style = new Style();
  style.size = { width: 40, height: 20 };
  const node = tree.newWithChildren(style, []);
  const compute = () =>
    tree.computeLayoutWithMeasure(node, { width: 200, height: 200 }, () => ({
      width: 0,
      height: 0,
    }));
  compute();
  const first = tree.getLayout(node);
  const saved = JSON.stringify(first);
  expect(tree.getLayout(node)).toBe(first);
  style.size = { width: 80, height: 30 };
  tree.setStyle(node, style);
  compute();
  const second = tree.getLayout(node);
  expect(second).not.toBe(first);
  expect(second).not.toEqual(first);
  expect(tree.getLayout(node)).toBe(second);
  expect(JSON.stringify(first)).toBe(saved);
});

it('recomputes normalized percentage inputs from their source after a parent changes', async () => {
  await loadTaffy();
  const parentStyle = new Style();
  parentStyle.size = { width: 100, height: 100 };
  const childStyle = new Style();
  childStyle.size = { width: 40, height: 20 };
  childStyle.padding = { top: '10%', right: '10%', bottom: '10%', left: '10%' };
  const create = () => {
    const tree = new TaffyTree();
    const child = tree.newWithChildren(childStyle, []);
    const parent = tree.newWithChildren(parentStyle, [child]);
    const compute = () =>
      tree.computeLayoutWithMeasure(
        parent,
        { width: 400, height: 400 },
        () => ({ width: 0, height: 0 }),
      );
    compute();
    return { tree, parent, child, compute };
  };
  const retained = create();
  const initial = retained.tree.getLayout(retained.child);
  parentStyle.size = { width: 200, height: 100 };
  retained.tree.setStyle(retained.parent, parentStyle);
  retained.compute();
  const fresh = create();
  expect(retained.tree.getLayout(retained.child)).toEqual(
    fresh.tree.getLayout(fresh.child),
  );
  expect(retained.tree.getLayout(retained.child).padding).not.toEqual(
    initial.padding,
  );
});
