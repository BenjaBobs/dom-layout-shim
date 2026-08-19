import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachLayoutEngine } from '../../src/index.ts';
import {
  attach,
  expectRect,
  receivesPointerAtCenter,
  requiredElement,
  waitForMutationDelivery,
} from './layout-engine-helpers.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('layout invalidation and isolation', () => {
  it('marks layout dirty when inline styles change', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `;

    await attach();
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));

    requiredElement('#box').setAttribute(
      'style',
      'position:absolute; left:100px; top:0; width:100px; height:100px',
    );
    await waitForMutationDelivery();

    expect(document.elementFromPoint(50, 50)).toBe(null);
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));
  });

  it('marks layout dirty when hidden attributes change', async () => {
    document.body.innerHTML = `
      <div id="box" hidden style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `;

    await attach();
    expect(document.elementFromPoint(50, 50)).toBe(null);

    requiredElement('#box').removeAttribute('hidden');
    await waitForMutationDelivery();

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));
  });

  it('marks layout dirty when class attributes change against configured stylesheets', async () => {
    document.body.innerHTML = `
      <div id="box" class="left"></div>
    `;

    await attach({
      stylesheets: [
        `
          .left,
          .right {
            position: absolute;
            top: 0;
            width: 100px;
            height: 100px;
          }

          .left {
            left: 0;
          }

          .right {
            left: 100px;
          }
        `,
      ],
    });
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));

    requiredElement('#box').setAttribute('class', 'right');
    await waitForMutationDelivery();

    expect(document.elementFromPoint(50, 50)).toBe(null);
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));
  });

  it('recomputes layout when a rule is inserted through the stylesheet CSSOM', async () => {
    document.body.innerHTML = `
      <style id="styles">
        .box {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `;

    await attach();
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));

    const styleElement = requiredElement('#styles') as HTMLStyleElement;
    styleElement.sheet?.insertRule(
      '.box { left: 100px; }',
      styleElement.sheet.cssRules.length,
    );

    expect(document.elementFromPoint(50, 50)).toBe(null);
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));
  });

  it('recomputes layout when a stylesheet is added or its text changes', async () => {
    document.body.innerHTML = `
      <div id="box" class="box"></div>
    `;

    await attach({
      stylesheets: [
        `
          .box {
            position: absolute;
            left: 0;
            top: 0;
            width: 100px;
            height: 100px;
          }
        `,
      ],
    });
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));

    const styleElement = document.createElement('style');
    styleElement.textContent = '.box { left: 100px; }';
    document.head.append(styleElement);
    await waitForMutationDelivery();

    expect(document.elementFromPoint(50, 50)).toBe(null);
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));

    styleElement.textContent = '.box { left: 200px; }';
    await waitForMutationDelivery();

    expect(document.elementFromPoint(150, 50)).toBe(null);
    expect(document.elementFromPoint(250, 50)).toBe(requiredElement('#box'));

    styleElement.remove();
    await waitForMutationDelivery();

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));
    expect(document.elementFromPoint(250, 50)).toBe(null);
  });

  it('recomputes layout when an existing CSSOM declaration changes', async () => {
    document.body.innerHTML = `
      <style id="styles">
        .box {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `;

    await attach();
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));

    const styleElement = requiredElement('#styles') as HTMLStyleElement;
    const rule = styleElement.sheet?.cssRules[0] as CSSStyleRule | undefined;
    rule?.style.setProperty('left', '100px');

    expect(document.elementFromPoint(50, 50)).toBe(null);
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));
  });

  it('recomputes layout when an authored rule is deleted through the stylesheet CSSOM', async () => {
    document.body.innerHTML = `
      <style id="styles">
        .box {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `;

    await attach();
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'));

    const styleElement = requiredElement('#styles') as HTMLStyleElement;
    styleElement.sheet?.deleteRule(1);

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'));
    expect(document.elementFromPoint(150, 50)).toBe(null);
  });

  it('marks layout dirty when elements are inserted', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:0; top:0; width:100px; height:40px"></button>
    `;

    await attach();
    expect(receivesPointerAtCenter(requiredElement('#save'))).toBe(true);

    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="overlay" style="position:absolute; inset:0; z-index:10"></div>',
    );
    await waitForMutationDelivery();

    expect(receivesPointerAtCenter(requiredElement('#save'))).toBe(false);
  });

  it('recomputes viewport geometry when element scroll offsets change', async () => {
    document.body.innerHTML = `
      <div id="scroller" style="position:relative; left:10px; top:20px; width:100px; height:60px; overflow:auto">
        <div style="height:160px"></div>
        <div id="target" style="position:absolute; left:20px; top:70px; width:50px; height:30px"></div>
      </div>
    `;

    await attach({ viewport: { width: 260, height: 180 } });
    expectRect(requiredElement('#target').getBoundingClientRect(), {
      left: 30,
      top: 90,
      width: 50,
      height: 30,
    });

    requiredElement('#scroller').scrollTop = 40;

    expectRect(requiredElement('#target').getBoundingClientRect(), {
      left: 30,
      top: 50,
      width: 50,
      height: 30,
    });
  });

  it('marks layout dirty when details open state changes', async () => {
    document.body.innerHTML = `
      <details id="panel">
        <summary id="summary" style="width:100px; height:20px"></summary>
        <div id="content" style="width:80px; height:30px"></div>
      </details>
      <div id="after" style="width:50px; height:10px"></div>
    `;

    await attach({ viewport: { width: 300, height: 200 } });
    expectRect(requiredElement('#after').getBoundingClientRect(), {
      left: 0,
      top: 20,
      width: 50,
      height: 10,
    });

    requiredElement('#panel').setAttribute('open', '');
    await waitForMutationDelivery();

    expectRect(requiredElement('#after').getBoundingClientRect(), {
      left: 0,
      top: 50,
      width: 50,
      height: 10,
    });
  });

  it('marks layout dirty when dialog open state changes', async () => {
    document.body.innerHTML = `
      <dialog id="dialog" style="width:100px; height:40px; margin:0; padding:0; border-width:0; border-style:none"></dialog>
    `;

    await attach({ viewport: { width: 300, height: 200 } });
    expectRect(requiredElement('#dialog').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    });

    requiredElement('#dialog').setAttribute('open', '');
    await waitForMutationDelivery();

    expectRect(requiredElement('#dialog').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 100,
      height: 40,
    });
  });

  it('isolates layout attachments by happy-dom window', async () => {
    const narrowWindow = new Window({ width: 100, height: 100 });
    const wideWindow = new Window({ width: 300, height: 100 });

    try {
      narrowWindow.document.body.innerHTML =
        '<div id="box" style="position:fixed; inset:0"></div>';
      wideWindow.document.body.innerHTML =
        '<div id="box" style="position:fixed; inset:0"></div>';

      await attachLayoutEngine({
        window: narrowWindow,
        viewport: { width: 100, height: 100 },
      });
      await attachLayoutEngine({
        window: wideWindow,
        viewport: { width: 300, height: 100 },
      });

      expect(
        narrowWindow.document.getElementById('box')?.getBoundingClientRect()
          .width,
      ).toBe(100);
      expect(
        wideWindow.document.getElementById('box')?.getBoundingClientRect()
          .width,
      ).toBe(300);
    } finally {
      narrowWindow.close();
      wideWindow.close();
    }
  });

  it('updates viewport-backed layout and window dimensions without reattaching', async () => {
    document.body.innerHTML =
      '<div id="box" style="position:fixed; inset:0"></div>';
    const resize = vi.fn();
    window.addEventListener('resize', resize);
    const attachment = await attachLayoutEngine({
      window,
      viewport: { width: 320, height: 640 },
    });

    expect(window.innerWidth).toBe(320);
    expect(requiredElement('#box').getBoundingClientRect().width).toBe(320);
    expect(window.matchMedia('(orientation: portrait)').matches).toBe(true);

    attachment.setViewport({ width: 800, height: 600 });

    expect(window.innerWidth).toBe(800);
    expect(window.innerHeight).toBe(600);
    expect(requiredElement('#box').getBoundingClientRect().width).toBe(800);
    expect(window.matchMedia('(orientation: landscape)').matches).toBe(true);
    expect(resize).toHaveBeenCalledOnce();
  });
});
