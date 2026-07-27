# CSS support inventory

The JSON records in `css/` are the source of truth for CSS and HTML support.
They are intentionally split by coherent feature area so unrelated work usually
changes different files. As an area becomes more detailed, split its claims or
record further rather than adding ambiguity to a broad claim.

Each claim independently records implementation support, Chromium parity
evidence, supported syntax or conditions, and explanatory notes. Do not infer
that missing coverage means unsupported behavior: use `unknown` or `unverified`
when the behavior has not been established.

After editing records, run:

```sh
pnpm run css:validate
pnpm run css:generate
pnpm run css:check
pnpm run css:query -- flex-basis
pnpm run css:query -- 'flex-basis: 50%'
pnpm run css:query -- --json flex-basis
```

`css:generate` writes the ignored package-facing TypeScript inventory and the
static JSON consumed by the documentation page. Generated files must not be
edited or committed. Package commands generate them automatically. CI should
use `css:check` to reject invalid records and missing parity fixtures and to
prove that all outputs can be generated.

The initial JSON migration preserves the granularity of the former TypeScript
inventory. Refine broad `current-supported-scope` claims into stable, atomic
claims whenever related behavior is changed or investigated. A useful claim
should let a reader determine the supported syntax, relevant layout context,
verification state, and evidence without interpreting an area-wide paragraph.
