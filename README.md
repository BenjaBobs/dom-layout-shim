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

See [docs/css-support-status.html](docs/css-support-status.html) for a
filterable CSS support overview. The underlying source of truth is
[src/css/css-support-inventory.ts](src/css/css-support-inventory.ts).

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.

See [docs/taffy-pipeline-roadmap.md](docs/taffy-pipeline-roadmap.md) for the
Taffy pipeline contract and migration roadmap.

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

For example, a parity commit covering several distinct behaviors should
enumerate them:

```text
test(css): Expand grid and aspect-ratio parity coverage

- Cover grid track content alignment
- Cover grid item stretching and self-alignment
- Cover inverse and constrained aspect-ratio sizing
```

If a change genuinely requires another scope, add that scope to the list above
in the same change. Do not introduce unlisted scopes only in commit subjects.

Agents may create focused commits for their own changes after relevant checks
pass. They must preserve unrelated changes, exclude generated output, and must
not amend existing commits or push unless explicitly requested.
