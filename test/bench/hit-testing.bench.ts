import { Window } from 'happy-dom';
import { Bench } from 'tinybench';
import { attachLayoutEngine } from '../../src/index.ts';
import { runCacheScenarios } from './cache-scenarios.ts';

type Scenario = {
  size: number;
  attachMs: number;
  firstLayoutMs: number;
  cachedReadMs: number;
  subtreeMutationMs: number;
  stylesheetInvalidationMs: number;
  elementFromPointMs: number;
  elementsFromPointMs: number;
};

type ScenarioBudgets = Omit<Scenario, 'size'>;
type BenchmarkDocument = InstanceType<typeof Window>['document'];
type BenchmarkElement = NonNullable<
  ReturnType<BenchmarkDocument['querySelector']>
>;

const sizes = [50, 200, 800] as const;
const budgets: Record<(typeof sizes)[number], ScenarioBudgets> = {
  50: {
    attachMs: 50,
    firstLayoutMs: 50,
    cachedReadMs: 0.5,
    subtreeMutationMs: 50,
    stylesheetInvalidationMs: 50,
    elementFromPointMs: 2,
    elementsFromPointMs: 2,
  },
  200: {
    attachMs: 100,
    firstLayoutMs: 150,
    cachedReadMs: 0.75,
    subtreeMutationMs: 150,
    stylesheetInvalidationMs: 150,
    elementFromPointMs: 4,
    elementsFromPointMs: 4,
  },
  800: {
    attachMs: 250,
    firstLayoutMs: 500,
    cachedReadMs: 1.5,
    subtreeMutationMs: 500,
    stylesheetInvalidationMs: 500,
    elementFromPointMs: 12,
    elementsFromPointMs: 12,
  },
};

const memoryInvalidations = 200;
const memoryGrowthBudgetBytes = 32 * 1024 * 1024;

// Prime the lazily loaded Taffy backend so attachment timings describe document
// attachment rather than one-time WebAssembly compilation and module loading.
const primer = new Window();
await attachLayoutEngine({
  window: primer,
  viewport: { width: 1024, height: 768 },
});
primer.close();

const scenarios: Scenario[] = [];
for (const size of sizes) {
  scenarios.push(await runScenario(size));
}

const memoryGrowthBytes = await measureMemoryGrowth(sizes[1]);
printResults(scenarios, memoryGrowthBytes);
assertBudgets(scenarios, memoryGrowthBytes);
await benchmarkStylesheetVolume();
await benchmarkCacheInvalidation();

async function runScenario(size: (typeof sizes)[number]): Promise<Scenario> {
  const window = createDocument(size);
  const { document } = window;
  const target = requiredElement(document, `#item-${size - 1}`);
  const stylesheet = requiredElement(document, '#benchmark-styles');

  const attachMs = await elapsed(async () => {
    await attachLayoutEngine({
      window,
      viewport: { width: 1024, height: 768 },
    });
  });
  const firstLayoutMs = await elapsed(() => target.getBoundingClientRect());

  const hotOperations = await benchmarkHotOperations(document, target);
  const cachedReadMs = hotOperations.cachedReadMs;

  let mutationWidth = 21;
  const subtreeMutationMs = await median(15, async () => {
    target.setAttribute(
      'style',
      `width: ${mutationWidth++ % 2 === 0 ? 20 : 21}px`,
    );
    await Promise.resolve();
    target.getBoundingClientRect();
  });

  let stylesheetWidth = 10;
  const stylesheetInvalidationMs = await median(10, () => {
    stylesheet.textContent = stylesheetText(
      stylesheetWidth++ % 2 === 0 ? 10 : 11,
    );
    target.getBoundingClientRect();
  });

  window.close();
  return {
    size,
    attachMs,
    firstLayoutMs,
    cachedReadMs,
    subtreeMutationMs,
    stylesheetInvalidationMs,
    elementFromPointMs: hotOperations.elementFromPointMs,
    elementsFromPointMs: hotOperations.elementsFromPointMs,
  };
}

async function benchmarkHotOperations(
  document: BenchmarkDocument,
  target: BenchmarkElement,
): Promise<
  Pick<Scenario, 'cachedReadMs' | 'elementFromPointMs' | 'elementsFromPointMs'>
> {
  const elementsFromPoint = document as unknown as {
    elementsFromPoint(x: number, y: number): Element[];
  };
  const bench = new Bench({ time: 100, warmupTime: 20 });
  bench
    .add('cachedReadMs', () => target.getBoundingClientRect())
    .add('elementFromPointMs', () => document.elementFromPoint(5, 5))
    .add('elementsFromPointMs', () =>
      elementsFromPoint.elementsFromPoint(5, 5),
    );
  await bench.run();

  return {
    cachedReadMs: taskLatency(bench, 'cachedReadMs'),
    elementFromPointMs: taskLatency(bench, 'elementFromPointMs'),
    elementsFromPointMs: taskLatency(bench, 'elementsFromPointMs'),
  };
}

function taskLatency(bench: Bench, name: string): number {
  const result = bench.tasks.find(task => task.name === name)?.result;
  if (!result || !('latency' in result)) {
    throw new Error(`Tinybench did not produce latency for ${name}`);
  }
  return result.latency.mean;
}

async function measureMemoryGrowth(size: number): Promise<number> {
  const window = createDocument(size);
  const { document } = window;
  const target = requiredElement(document, `#item-${size - 1}`);
  await attachLayoutEngine({ window, viewport: { width: 1024, height: 768 } });
  target.getBoundingClientRect();

  await runInvalidations(target, 10);
  collectGarbage();
  const before = process.memoryUsage().heapUsed;
  await runInvalidations(target, memoryInvalidations);
  collectGarbage();
  const growth = Math.max(0, process.memoryUsage().heapUsed - before);
  window.close();
  return growth;
}

async function runInvalidations(
  target: BenchmarkElement,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    target.setAttribute('style', `width: ${20 + (index % 2)}px`);
    await Promise.resolve();
    target.getBoundingClientRect();
  }
}

function createDocument(size: number): Window {
  const window = new Window();
  window.document.body.innerHTML = `
    <style id="benchmark-styles">${stylesheetText(10)}</style>
    <main class="document">
      ${Array.from(
        { length: size },
        (_, index) => `
        <section class="card">
          <span id="item-${index}" class="item">Item ${index}</span>
        </section>
      `,
      ).join('')}
    </main>
  `;
  return window;
}

function stylesheetText(gap: number): string {
  return `
    .document { display: flex; flex-wrap: wrap; gap: ${gap}px; width: 1000px; }
    .card { box-sizing: border-box; width: 100px; height: 40px; padding: 4px; }
    .item { display: block; width: 20px; height: 20px; }
  `;
}

async function median(
  iterations: number,
  operation: () => unknown | Promise<unknown>,
): Promise<number> {
  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    samples.push(await elapsed(operation));
  }
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)] ?? Number.POSITIVE_INFINITY;
}

async function elapsed(
  operation: () => unknown | Promise<unknown>,
): Promise<number> {
  const start = performance.now();
  await operation();
  return performance.now() - start;
}

function collectGarbage(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc) {
    throw new Error('Performance memory budgets require Node.js --expose-gc');
  }
  gc();
  gc();
}

function requiredElement(
  document: BenchmarkDocument,
  selector: string,
): BenchmarkElement {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing benchmark element: ${selector}`);
  }
  return element;
}

function printResults(
  scenarios: readonly Scenario[],
  memoryGrowthBytes: number,
): void {
  console.table(
    scenarios.map(scenario => ({
      elements: scenario.size,
      'attach ms': format(scenario.attachMs),
      'first layout ms': format(scenario.firstLayoutMs),
      'cached read ms': format(scenario.cachedReadMs),
      'subtree mutation ms': format(scenario.subtreeMutationMs),
      'stylesheet invalidation ms': format(scenario.stylesheetInvalidationMs),
      'elementFromPoint ms': format(scenario.elementFromPointMs),
      'elementsFromPoint ms': format(scenario.elementsFromPointMs),
    })),
  );
  console.log(
    `Heap growth after ${memoryInvalidations} invalidations: ${format(memoryGrowthBytes / 1024 / 1024)} MiB`,
  );
}

function assertBudgets(
  scenarios: readonly Scenario[],
  memoryGrowthBytes: number,
): void {
  const failures: string[] = [];
  for (const scenario of scenarios) {
    const scenarioBudgets = budgets[scenario.size as keyof typeof budgets];
    for (const name of Object.keys(
      scenarioBudgets,
    ) as (keyof ScenarioBudgets)[]) {
      if (scenario[name] > scenarioBudgets[name]) {
        failures.push(
          `${scenario.size} elements ${name}: ${format(scenario[name])} ms > ${scenarioBudgets[name]} ms`,
        );
      }
    }
  }
  if (memoryGrowthBytes > memoryGrowthBudgetBytes) {
    failures.push(
      `memory growth: ${format(memoryGrowthBytes / 1024 / 1024)} MiB > 32 MiB`,
    );
  }
  if (failures.length > 0) {
    throw new Error(`Performance budget exceeded:\n- ${failures.join('\n- ')}`);
  }
}

function format(value: number): string {
  return value.toFixed(3);
}

// Keep CSS volume independent of DOM size: this catches expensive stylesheet
// validity checks even when the layout snapshot itself is correctly cached.
async function benchmarkStylesheetVolume(): Promise<void> {
  const results: Array<{ cssBytes: number; cachedReadMs: number }> = [];
  for (const cssBytes of [0, 5_000, 100_000, 300_000]) {
    const window = new Window();
    try {
      const rules: string[] = [];
      let length = 0;
      while (length < cssBytes) {
        const rule = `.c${rules.length} { color: rgb(1,2,3); padding-left: ${rules.length % 40}px }`;
        rules.push(rule);
        length += rule.length;
      }
      window.document.head.innerHTML = `<style>${rules.join('\n')}</style>`;
      window.document.body.innerHTML =
        '<div id="target" style="width:100px;height:20px"></div>';
      await attachLayoutEngine({
        window,
        unsupportedCss: { default: 'ignore' },
      });
      const target = requiredElement(window.document, '#target');
      target.getBoundingClientRect();
      const start = performance.now();
      for (let index = 0; index < 200; index += 1)
        target.getBoundingClientRect();
      const cachedReadMs = (performance.now() - start) / 200;
      results.push({ cssBytes, cachedReadMs });
      if (cachedReadMs > 0.5)
        throw new Error(
          `Cached reads with ${cssBytes} CSS bytes exceeded 0.5 ms/read: ${cachedReadMs}`,
        );
    } finally {
      window.close();
    }
  }
  console.table(results);
}

async function benchmarkCacheInvalidation(): Promise<void> {
  const results = await runCacheScenarios(attachLayoutEngine);
  console.table(results);
  const limits: Record<string, number> = {
    'cached read': 0.1,
    'point hit': 0.1,
    scroll: 25,
    'DOM edit': 100,
    'one sheet edit': 100,
  };
  for (const result of results) {
    const limit = limits[result.name];
    if (limit !== undefined && result.ms > limit)
      throw new Error(
        `Cache benchmark ${result.name} exceeded ${limit} ms for ${result.count} elements: ${result.ms}`,
      );
  }
}
