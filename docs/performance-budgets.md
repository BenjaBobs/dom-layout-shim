# Performance budgets

Run `pnpm run bench` to measure the layout and hit-testing budgets. The command
exits unsuccessfully when a budget is exceeded, so it can also be used as a
regression check in CI or before performance-sensitive changes are merged.

The benchmark uses documents containing 50, 200, and 800 elements. Each size
measures attachment, first layout, cached geometry reads, a single-element
style mutation followed by layout, full stylesheet invalidation, and both point
query APIs. It also measures retained heap growth after 200 mutation-driven
invalidations of the 200-element document.

State-changing mutation and stylesheet timings are medians. Cached reads and
point queries use Tinybench's warmup and corrected mean latency; attachment and
first layout are one-time measurements. The Taffy WebAssembly backend is primed
before attachment timing starts, because module loading is a process-wide
startup cost rather than a per-document attachment cost. Memory is measured
before and after explicit garbage collection; the benchmark script therefore
runs Node.js with `--expose-gc`.

## Baseline and intent

The initial budgets were established on Linux x86-64 with Node.js 25.6.1. They are
intentionally several times slower than the observed baseline and increase with
document size. This makes the check insensitive to ordinary scheduler and host
performance variation while still detecting substantial algorithmic or cache
invalidation regressions. They are regression ceilings, not package performance
claims or targets for micro-optimization.

The initial retained-heap baseline was approximately 21.5 MiB after 200 warmed
invalidations, with a 32 MiB ceiling. Timing baselines are printed by the command
and remain visible in CI logs for comparison.

When intentionally changing a budget, record measurements from at least one
supported Node.js version and explain why the old ceiling no longer represents
a regression. Do not increase a ceiling solely to make a noisy run pass; first
repeat the benchmark on an otherwise idle host and inspect the affected
scenario.
