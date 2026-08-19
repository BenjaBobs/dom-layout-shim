import { attachLayoutEngine } from 'dom-layout-shim';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../src/app.ts';

describe('basic workspace consumer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('computes geometry and hit tests through the public package API', async () => {
    const root = document.querySelector('#app');

    if (!root) {
      throw new Error('Missing example application root');
    }

    mountApp(root);
    await attachLayoutEngine({ window });

    const save = document.querySelector('#save');

    if (!save) {
      throw new Error('Missing save button');
    }

    const rect = save.getBoundingClientRect();

    expect({ width: rect.width, height: rect.height }).toEqual({
      width: 120,
      height: 40,
    });
    expect(
      document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      ),
    ).toBe(save);
  });
});
