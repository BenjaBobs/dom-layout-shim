import { expect, it, vi } from 'vitest';
import { attachLayoutEngine } from '../../src/index.ts';
import {
  requiredElement,
  waitForObserverDelivery,
} from './layout-engine-helpers.ts';

it('delivers initial and changed layout-backed sizes in auto mode', async () => {
  document.body.innerHTML = `
    <div id="box" style="box-sizing:content-box;width:100px;height:40px;padding:10px;border:2px solid"></div>
  `;
  await attachLayoutEngine({ window });
  const callback = vi.fn<ResizeObserverCallback>();
  const observer = new window.ResizeObserver(callback);
  const box = requiredElement('#box');

  observer.observe(box);
  await waitForObserverDelivery();

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback.mock.calls[0]?.[0][0]).toMatchObject({
    target: box,
    contentRect: { width: 100, height: 40, x: 10, y: 10 },
    contentBoxSize: [{ inlineSize: 100, blockSize: 40 }],
    borderBoxSize: [{ inlineSize: 124, blockSize: 64 }],
  });

  box.setAttribute(
    'style',
    'box-sizing:content-box;width:120px;height:40px;padding:10px;border:2px solid',
  );
  await waitForObserverDelivery();

  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback.mock.calls[1]?.[0][0]?.contentRect.width).toBe(120);
});

it('batches observer delivery across mutation microtasks', async () => {
  document.body.innerHTML =
    '<div id="box" style="width:100px;height:40px"></div>';
  const layout = await attachLayoutEngine({ window });
  const callback = vi.fn<ResizeObserverCallback>();
  const box = requiredElement('#box');
  new window.ResizeObserver(callback).observe(box);

  await Promise.resolve();
  box.setAttribute('style', 'width:120px;height:40px');
  await Promise.resolve();
  box.setAttribute('style', 'width:140px;height:40px');
  layout.flushLayout();

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback.mock.calls[0]?.[0][0]?.contentRect.width).toBe(140);
  await waitForObserverDelivery();
  expect(callback).toHaveBeenCalledTimes(1);
});

it('keeps delivery deterministic in manual mode', () => {
  document.body.innerHTML =
    '<div id="box" style="width:100px;height:40px"></div>';
  return attachLayoutEngine({
    window,
    observers: { delivery: 'manual' },
  }).then(layout => {
    const callback = vi.fn<ResizeObserverCallback>();
    const observer = new window.ResizeObserver(callback);
    const box = requiredElement('#box');
    observer.observe(box, { box: 'border-box' });

    expect(callback).not.toHaveBeenCalled();
    layout.flushLayout();
    expect(callback).toHaveBeenCalledTimes(1);

    box.setAttribute('style', 'width:140px;height:40px');
    layout.flushLayout();
    expect(callback.mock.calls[1]?.[0][0]?.borderBoxSize[0]?.inlineSize).toBe(
      140,
    );

    layout.flushLayout();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

it('supports unobserve, disconnect, and observation box replacement', async () => {
  document.body.innerHTML =
    '<div id="box" style="box-sizing:content-box;width:100px;height:40px;padding:10px"></div>';
  const layout = await attachLayoutEngine({
    window,
    observers: { delivery: 'manual' },
  });
  const callback = vi.fn<ResizeObserverCallback>();
  const observer = new window.ResizeObserver(callback);
  const box = requiredElement('#box');

  observer.observe(box);
  observer.observe(box, { box: 'border-box' });
  layout.flushLayout();
  expect(callback).toHaveBeenCalledTimes(1);

  observer.unobserve(box);
  box.setAttribute('style', 'width:120px;height:40px;padding:10px');
  layout.flushLayout();
  expect(callback).toHaveBeenCalledTimes(1);

  observer.observe(box);
  layout.flushLayout();
  expect(callback).toHaveBeenCalledTimes(2);
  observer.disconnect();
});

it('does not notify for position-only changes', async () => {
  document.body.innerHTML =
    '<div id="box" style="position:absolute;left:0;width:100px;height:40px"></div>';
  const layout = await attachLayoutEngine({
    window,
    observers: { delivery: 'manual' },
  });
  const callback = vi.fn<ResizeObserverCallback>();
  const observer = new window.ResizeObserver(callback);
  const box = requiredElement('#box');
  observer.observe(box);
  layout.flushLayout();

  box.setAttribute(
    'style',
    'position:absolute;left:50px;width:100px;height:40px',
  );
  layout.flushLayout();
  expect(callback).toHaveBeenCalledTimes(1);
});
