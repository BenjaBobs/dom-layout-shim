import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('native nesting preserves relationships, specificity, media and declaration order', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body { margin: 0; }
        .parent, #absent {
          --size: 60px;
          width: 200px;
          .child {
            width: var(--size);
            height: 10px;
            &.active { height: 20px; }
            > .grandchild { width: 15px; height: 5px; }
          }
          > .sibling { width: 30px; height: 10px; }
          & { width: 100px; }
          width: 150px;
          @media (min-width: 250px) {
            height: 90px;
            .sibling { width: 40px; }
          }
          @media (max-width: 250px) { height: 1px; }
        }
        .parent .child { width: 80px; }
      </style>
      <div class="parent">
        <div class="child active"><div class="grandchild"></div></div>
        <div class="sibling"></div>
      </div>
    `,
    queries: ['.parent', '.child', '.grandchild', '.sibling'].map(selector => ({
      type: 'rect' as const,
      selector,
    })),
  });
});
