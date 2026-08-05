---
"dom-layout-shim": minor
---

Implement `Element.scrollIntoView()` against the layout snapshot so calls
consistently affect layout-backed geometry instead of relying on the host DOM
implementation.

The method scrolls nested containers and the configured viewport using boolean
or `block`/`inline` alignment options. Smooth behavior is applied immediately
to keep test layout deterministic.
