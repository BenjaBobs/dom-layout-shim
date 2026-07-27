# test-layout

Deterministic layout and hit testing for fast DOM test harnesses.

This package is an early proof of concept. The core is framework agnostic and
attaches to DOM-like documents such as happy-dom documents. Layout is computed
through a Taffy-backed pipeline, with text measurement supplied through Pretext
when the runtime supports canvas measurement. DOM API patching and hit testing
are derived from the resulting layout snapshot.

```ts
import { attachLayoutEngine, expectReceivesPointer, guardedClick } from 'test-layout'

await attachLayoutEngine({
  window,
  viewport: { width: 1280, height: 720 },
  unsupportedCss: { default: 'throw' },
  stylesheets: [appLayoutCss],
})

const button = document.getElementById('save')!
const rect = button.getBoundingClientRect()
const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
const clickable = top === button || Boolean(top && button.contains(top))

expectReceivesPointer(button)
guardedClick(button)
```

The current implementation uses Lightning CSS for `<style>` parsing and supports
a small CSS subset for proof-of-concept block, flex, absolute, and fixed
positioned fixtures. Unsupported CSS throws by default unless explicitly ignored
by policy. Text measurement falls back to a deterministic approximation in
Node-like runtimes without canvas text measurement.

See [docs/index.html](docs/index.html) for the documentation site and
[docs/css-support-status.html](docs/css-support-status.html) for its filterable
CSS support overview. The underlying source of truth is
the machine-readable records in [support/css](support/css). Each record follows
[support/css-support.schema.json](support/css-support.schema.json). Run
`pnpm run css:validate` to check the inventory, `pnpm run css:generate` after
editing it, or `pnpm run css:query -- flex-basis` to query it from a terminal.
Ignored, generated JSON for documentation and agent consumers is written to
`docs/data/`.

Run `pnpm run docs:serve` to generate the support data and serve the complete
documentation site locally. Pass a port when needed, for example
`pnpm run docs:serve -- 4174`.

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.

See [docs/taffy-pipeline-roadmap.md](docs/taffy-pipeline-roadmap.md) for the
Taffy pipeline contract and migration roadmap.

See [docs/releasing.md](docs/releasing.md) for the changeset, changelog, and
pre-1.0 versioning policy.

## Commit convention

Use `<type>(<scope>): <imperative summary>` for commit subjects. A scope is
required for every commit.

Allowed types:

- `feat`: add supported behavior or a public capability
- `fix`: correct existing behavior
- `test`: change tests without changing intended package behavior
- `refactor`: restructure code without an intended behavior change
- `docs`: change documentation only
- `perf`: improve performance

Allowed scopes:

- `css`: CSS parsing, layout behavior, hit testing, and browser parity
- `api`: the public API surface for package consumers
- `cfg`: dependencies, package metadata, build scripts, and tooling

Choose the type based on the effect of the change. For example, a dependency
update may be `feat(cfg)`, `fix(cfg)`, or `refactor(cfg)` depending on why it is
being made.

Keep the subject imperative and under 72 characters. Both uppercase and
lowercase letters are allowed. Keep commit bodies short and omit them when the
subject is sufficient. Use a body when it explains non-obvious reasoning or
provides a useful enumeration of changes. Commit bodies may use Markdown.
When applicable, include a minimal code example that makes the changed CSS,
API, or configuration behavior easy to see. Prefer a focused usage example
over reproducing implementation details or a large part of the diff. Add a
short code comment when it helps identify the newly supported or changed part
of the example.

For example, a parity commit covering several distinct behaviors should
enumerate them:

```text
test(css): Expand grid and aspect-ratio parity coverage

- Cover grid track content alignment
- Cover grid item stretching and self-alignment
- Cover inverse and constrained aspect-ratio sizing
```

For example, a commit adding CSS behavior may show the newly supported form:

````text
feat(css): Support percentage row gaps

```css
.items {
  display: flex;
  flex-wrap: wrap;
  height: 100px;
  row-gap: 10%; /* Percentage row gaps are now supported. */
}
```
````

If a change genuinely requires another scope, add that scope to the list above
in the same change. Do not introduce unlisted scopes only in commit subjects.

Agents may create focused commits for their own changes after relevant checks
pass. They must preserve unrelated changes, exclude generated output, and must
not amend existing commits or push unless explicitly requested.

## License

test-layout is released into the public domain under
[the Unlicense](LICENSE). You may use, copy, modify, publish, compile, sell, or
distribute the software for any commercial or non-commercial purpose.
