# CSS support inventory

The JSON records in `css/` are the source of truth for CSS and HTML support.
They are intentionally split by coherent support topic so unrelated work usually
changes different files. As an area becomes more detailed, split its claims or
record further rather than adding ambiguity to a broad claim.

Each claim independently records the properties it covers, implementation
support, Chromium parity evidence, supported syntax or conditions, and
explanatory notes. Omit `properties` only when a claim applies to the whole
record or describes behavior without a declaration of its own. Do not infer
that missing coverage means unsupported behavior: use `unknown` or `unverified`
when the behavior has not been established.

Every topic must contain at least two stable, behavior-specific claims with
descriptions. Keep evidence and limitations on the narrowest claim they
describe. In descriptions and note text, wrap CSS syntax, DOM APIs, HTML element
names, attributes, and literal implementation identifiers in backticks so the
support explorer renders them as inline code.

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

A useful claim should let a reader determine the supported syntax, relevant
layout context, verification state, and evidence without interpreting a
topic-wide paragraph.
