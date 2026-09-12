import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

type Attach = typeof import('../../src/index.ts').attachLayoutEngine;
export type CacheTiming = { count: number; name: string; ms: number };

// A reusable comparison runner: the normal benchmark enforces budgets on these
// results; direct execution can load an older source tree for before/after data.
export async function runCacheScenarios(
  attach: Attach,
): Promise<CacheTiming[]> {
  const results: CacheTiming[] = [];
  for (const count of [200, 800]) {
    const window = new Window();
    try {
      window.document.head.innerHTML = Array.from(
        { length: 8 },
        (_, sheet) =>
          `<style>${Array.from({ length: 30 }, (_, index) => `.c${sheet * 30 + index}{padding-left:${index % 4}px}`).join('')}</style>`,
      ).join('');
      window.document.body.innerHTML = `<div id="scroller" style="width:300px;height:100px;overflow:auto">${Array.from({ length: count }, (_, index) => `<div class="c${index % 240}" style="height:20px">Repeated label ${index % 10}</div>`).join('')}</div>`;
      await attach({ window, unsupportedCss: { default: 'ignore' } });
      const scroller = window.document.querySelector('#scroller');
      if (!scroller) throw new Error('Missing benchmark scroller');
      scroller.getBoundingClientRect();
      const measure = async (
        name: string,
        iterations: number,
        operation: (index: number) => unknown,
      ) => {
        const samples: number[] = [];
        for (let index = 0; index < iterations; index += 1) {
          const start = performance.now();
          await operation(index);
          samples.push(performance.now() - start);
        }
        samples.sort((left, right) => left - right);
        results.push({
          count,
          name,
          ms: samples[Math.floor(iterations / 2)] ?? Number.POSITIVE_INFINITY,
        });
      };
      await measure('cached read', 100, () => scroller.getBoundingClientRect());
      await measure('point hit', 100, () =>
        window.document.elementFromPoint(5, 5),
      );
      await measure('scroll', 20, index => {
        scroller.scrollTop = index * 2;
        scroller.getBoundingClientRect();
      });
      const child = scroller.lastElementChild;
      if (!child) throw new Error('Missing benchmark child');
      await measure('DOM edit', 15, async index => {
        child.setAttribute('style', `height:${20 + (index % 2)}px`);
        await Promise.resolve();
        scroller.getBoundingClientRect();
      });
      const rule = window.document.querySelector('style')?.sheet?.cssRules[0];
      if (!rule || !('style' in rule))
        throw new Error('Missing benchmark rule');
      const declaration = rule.style as { paddingLeft: string };
      await measure('one sheet edit', 15, index => {
        declaration.paddingLeft = `${index % 2}px`;
        scroller.getBoundingClientRect();
      });
    } finally {
      window.close();
    }
  }
  return results;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const source = process.argv[2]
    ? pathToFileURL(resolve(process.argv[2])).href
    : new URL('../../src/index.ts', import.meta.url).href;
  const { attachLayoutEngine } = (await import(source)) as {
    attachLayoutEngine: Attach;
  };
  console.log(
    JSON.stringify(await runCacheScenarios(attachLayoutEngine), null, 2),
  );
}
