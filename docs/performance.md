# Cache performance

Measured on 2026-09-12 using Node.js v26.7.0 on Linux x64. The baseline is
`origin/main` at `a04d69dd0fe9f1cde68adbde8183681ed4b0c12d`; the comparison
includes the pending fixes for #147 and #153 and the subsequent cache work.
Both source trees used the same installed dependencies and generated WASM.
The processes ran sequentially on the same machine.

## Results

Times are median milliseconds per operation, including the runner's async-call
overhead. These are workload-specific measurements, not a promised speedup for
every test suite. Very small cached-read timings are particularly sensitive to
runtime overhead.

| Elements | Operation | origin/main ms | Updated ms | Speedup |
| --- | --- | ---: | ---: | ---: |
| 200 | cached read | 0.80295 | 0.00326 | 246.3× |
| 200 | point hit | 0.78133 | 0.00300 | 260.4× |
| 200 | scroll | 18.47685 | 2.07231 | 8.9× |
| 200 | DOM edit | 16.68296 | 7.92153 | 2.1× |
| 200 | one sheet edit | 20.95966 | 8.15468 | 2.6× |
| 800 | cached read | 0.80930 | 0.00283 | 286.0× |
| 800 | point hit | 0.79309 | 0.00295 | 268.8× |
| 800 | scroll | 61.30712 | 5.75863 | 10.6× |
| 800 | DOM edit | 57.57839 | 30.93118 | 1.9× |
| 800 | one sheet edit | 61.54467 | 31.45243 | 2.0× |

The fixture has eight stylesheets with 30 class rules each, a 300×100 scroll
container, and 200 or 800 children with ten repeated text labels. It warms the
first layout before sampling 100 cached reads, 100 point hits, 20 scroll/read
pairs, 15 DOM-edit/read pairs, and 15 single-sheet CSSOM-edit/read pairs.

The large steady-state improvement includes #147's removal of repeated CSS
serialization. Relative to the already-fixed #147/#153 implementation, the
initial comparison of this additional cache work measured roughly 9× faster
cached reads, 10× faster scroll reads, and 2× faster edits at 800 elements.
Dirty DOM reads still rebuild the style/layout tree and run flow layout.

The regular benchmark also checks 0–300 KB of stylesheet text independently of
DOM size and checks heap growth after 200 invalidations. Its timing and memory
budgets passed; the measured heap growth was 10.6 MiB against a 32 MiB limit.

## Reproduce

The comparison runner is `test/bench/cache-scenarios.ts`. The regular
`pnpm run bench` command runs these same scenarios with regression budgets.

```sh
pnpm run build
pnpm run bench
pnpm exec node test/bench/cache-scenarios.ts
```

To compare against the source baseline without changing the working tree:

```sh
mkdir -p .tmp/performance-origin
git archive a04d69dd0fe9f1cde68adbde8183681ed4b0c12d src | tar -x -C .tmp/performance-origin
cp -a src/css-parity-implementation/layout/taffy/generated .tmp/performance-origin/src/css-parity-implementation/layout/taffy/
cp src/api/css-support-inventory.generated.ts .tmp/performance-origin/src/api/
pnpm exec node test/bench/cache-scenarios.ts .tmp/performance-origin/src/index.ts > .tmp/cache-before.json
pnpm exec node test/bench/cache-scenarios.ts > .tmp/cache-after.json
```

The direct comparison runner emits JSON without enforcing current performance
budgets on the old implementation. Generated artifacts are needed to execute
both source trees; they are not committed.
