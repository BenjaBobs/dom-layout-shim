# Examples

Examples are private pnpm workspace packages that exercise `dom-layout-shim`
through its public package exports. Each example owns its application and
framework dependencies and declares the root package as a development
dependency:

```json
{
  "private": true,
  "devDependencies": {
    "dom-layout-shim": "workspace:*"
  }
}
```

Run every example from the repository root with:

```sh
pnpm run examples:check
pnpm run examples:compatibility
```

An example should provide `build`, `typecheck`, and `test` scripts. Keep
library-specific setup and compatibility expectations in the example that owns
them. Examples must not import from the root package's `src/` directory.

## UI-library compatibility scenario

Material UI and Ant Design implement the same task-workspace workflow without
sharing application components. Each application uses its library idiomatically
and covers a scrollable task list, portalled action menu, confirmation dialog and
backdrop, working status filters, task creation and deletion, and
coordinate-derived hit testing.

Example tests own realistic consumer workflows. Exact browser-observable CSS
semantics remain in `test/browser-parity/`; examples should not duplicate those
fixtures. Known compatibility gaps must use narrow expectations and explain their
behavioral impact rather than disabling an entire example.

Hosted examples are built into `.site/examples/<name>/` by `pnpm run
docs:generate`. The browser-hosted pages demonstrate the interaction, while the
happy-dom tests are the evidence that DOM Layout Shim supports it.

The compatibility command runs each app's named interaction checkpoints in
Chromium and in happy-dom with the shim attached. It writes a structured
`compatibility-report.json` beside each app and prints coverage and agreement
summaries. Differences are reporting data and do not fail the command; execution
or capture failures do. Run one app with its local `pnpm run compatibility`
script. Reports are ignored build artifacts; documentation CI regenerates them
before rendering the site and linking to the scenario files that produced them.
