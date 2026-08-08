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
```

An example should provide `build`, `typecheck`, and `test` scripts. Keep
library-specific setup and compatibility expectations in the example that owns
them. Examples must not import from the root package's `src/` directory.
