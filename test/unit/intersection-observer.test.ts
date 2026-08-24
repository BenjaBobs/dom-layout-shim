import { expect, it, vi } from 'vitest';
import { attachLayoutEngine } from '../../src/index.ts';
import {
  requiredElement,
  waitForObserverDelivery,
} from './layout-engine-helpers.ts';

it('reports viewport intersections and threshold crossings', async () => {
  document.body.innerHTML = `
    <div id="box" style="position:absolute;left:150px;top:0;width:100px;height:40px"></div>
  `;
  const layout = await attachLayoutEngine({
    window,
    viewport: { width: 200, height: 100 },
    observers: { delivery: 'manual' },
  });
  const callback = vi.fn<IntersectionObserverCallback>();
  const observer = new window.IntersectionObserver(callback, {
    threshold: [0, 0.5, 1],
  });
  const box = requiredElement('#box');
  observer.observe(box);
  layout.flushLayout();

  expect(callback.mock.calls[0]?.[0][0]).toMatchObject({
    target: box,
    isIntersecting: true,
    intersectionRatio: 0.5,
    boundingClientRect: { x: 150, width: 100 },
    intersectionRect: { x: 150, width: 50 },
    rootBounds: { x: 0, width: 200 },
  });

  box.setAttribute(
    'style',
    'position:absolute;left:175px;top:0;width:100px;height:40px',
  );
  layout.flushLayout();
  expect(callback.mock.calls[1]?.[0][0]?.intersectionRatio).toBe(0.25);

  box.setAttribute(
    'style',
    'position:absolute;left:180px;top:0;width:100px;height:40px',
  );
  layout.flushLayout();
  expect(callback).toHaveBeenCalledTimes(2);
});

it('supports element roots, root margins, and normalized options', async () => {
  document.body.innerHTML = `
    <div id="root" style="position:absolute;left:20px;top:20px;width:100px;height:100px">
      <div id="box" style="position:absolute;left:90px;top:0;width:20px;height:20px"></div>
    </div>
  `;
  const layout = await attachLayoutEngine({
    window,
    viewport: { width: 300, height: 200 },
    observers: { delivery: 'manual' },
  });
  const callback = vi.fn<IntersectionObserverCallback>();
  const root = requiredElement('#root');
  const observer = new window.IntersectionObserver(callback, {
    root,
    rootMargin: '0px 10px',
    threshold: [1, 0, 0.5, 0.5],
  });
  observer.observe(requiredElement('#box'));
  layout.flushLayout();

  expect(observer.rootMargin).toBe('0px 10px 0px 10px');
  expect(observer.thresholds).toEqual([0, 0.5, 1]);
  expect(callback.mock.calls[0]?.[0][0]).toMatchObject({
    isIntersecting: true,
    intersectionRatio: 1,
  });
});

it('delivers automatically and honors unobserve and disconnect', async () => {
  document.body.innerHTML =
    '<div id="box" style="position:absolute;left:0;width:20px;height:20px"></div>';
  await attachLayoutEngine({ window, viewport: { width: 100, height: 100 } });
  const callback = vi.fn<IntersectionObserverCallback>();
  const observer = new window.IntersectionObserver(callback);
  const box = requiredElement('#box');
  observer.observe(box);
  await waitForObserverDelivery();
  expect(callback).toHaveBeenCalledTimes(1);

  observer.unobserve(box);
  box.setAttribute(
    'style',
    'position:absolute;left:200px;width:20px;height:20px',
  );
  await waitForObserverDelivery();
  expect(callback).toHaveBeenCalledTimes(1);
  observer.disconnect();
});

it('validates thresholds and root margins', async () => {
  await attachLayoutEngine({ window });
  expect(
    () => new window.IntersectionObserver(() => {}, { threshold: 2 }),
  ).toThrow(RangeError);
  expect(
    () => new window.IntersectionObserver(() => {}, { rootMargin: '1em' }),
  ).toThrow(SyntaxError);
});

it('calculates intersections after resize callbacks settle layout', async () => {
  document.body.innerHTML =
    '<div id="box" style="position:absolute;left:0;width:100px;height:20px"></div>';
  const layout = await attachLayoutEngine({
    window,
    viewport: { width: 200, height: 100 },
    observers: { delivery: 'manual' },
  });
  const box = requiredElement('#box');
  new window.ResizeObserver(() => {
    box.setAttribute(
      'style',
      'position:absolute;left:150px;width:100px;height:20px',
    );
  }).observe(box);
  const intersectionCallback = vi.fn<IntersectionObserverCallback>();
  new window.IntersectionObserver(intersectionCallback).observe(box);

  layout.flushLayout();

  expect(intersectionCallback.mock.calls[0]?.[0][0]?.intersectionRatio).toBe(
    0.5,
  );
});
