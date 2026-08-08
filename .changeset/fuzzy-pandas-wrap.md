---
'dom-layout-shim': patch
---

Improve browser-compatible wrapping in canvas-capable runtimes by updating
Pretext to 0.0.8. Text such as `foo!bar`, `foo/bar`, and `foo♂bar` now keeps
symbols that browsers treat as part of the word within the same breakable run.
When wrapping at a soft hyphen, the line now ends at the rendered hyphen instead
of incorrectly pulling letters from after the break onto the preceding line.

For example, at a constrained width, a soft-hyphen break changes from:

```text
trans-a | tlantic
```

to the browser-compatible break:

```text
trans- | atlantic
```

Runtimes without Canvas 2D text measurement continue to use the deterministic
fallback measurer and are unaffected by these Pretext-specific corrections.
