import { expect, expectTypeOf, it, vi } from 'vitest';
import { createStyleResolver } from '../../src/css-parity-implementation/css/style-resolver.ts';
import { readCssTextRules } from '../../src/css-parity-implementation/css/stylesheet-source.ts';

it('resolves variables and ordinary declarations from one cached source selection', () => {
  const element = document.createElement('div');
  element.setAttribute('style', '--size:30px;font-size:var(--size);width:2em');
  document.body.replaceChildren(element);
  const attributes = vi.spyOn(element, 'getAttribute');
  const resolver = createStyleResolver({
    rules: [],
    userAgentRules: [],
    profile: 'none',
    policy: undefined,
    viewport: { width: 400, height: 300 },
  });
  expect(resolver.get(element)).toBeUndefined();
  expect(attributes).not.toHaveBeenCalled();
  const style = resolver.element(element);
  expect(style.fontSize).toBe(30);
  expect(style.width).toBe(60);
  expect(resolver.element(element)).toBe(style);
  expect(resolver.get(element)).toBe(style);
  expect(
    attributes.mock.calls.filter(([name]) => name === 'style'),
  ).toHaveLength(1);
  expectTypeOf(style.transform).not.toHaveProperty('push');
  expectTypeOf(style.padding).toEqualTypeOf<Readonly<typeof style.padding>>();
  attributes.mockRestore();
});

it('keeps pseudo and anonymous initialization inside the same resolution session', () => {
  const element = document.createElement('div');
  element.id = 'host';
  element.setAttribute('style', '--word:"host";font-size:20px');
  document.body.replaceChildren(element);
  const resolver = createStyleResolver({
    rules: readCssTextRules(
      '#host::before{--word:"pseudo";content:var(--word)}',
      'resolver-test.css',
      undefined,
    ),
    userAgentRules: [],
    profile: 'none',
    policy: undefined,
    viewport: { width: 400, height: 300 },
  });
  const pseudo = resolver.pseudo(element, 'before');
  expect(pseudo.content).toBe('pseudo');
  expect(pseudo.fontSize).toBe(20);
  expect(resolver.pseudo(element, 'before')).toBe(pseudo);
  const host = resolver.element(element);
  const anonymous = resolver.anonymous(host);
  expect(anonymous.fontSize).toBe(host.fontSize);
  expect(anonymous.content).toBeUndefined();
  expect(host.content).toBeUndefined();
  expect(anonymous).not.toBe(host);
});

it.each(['portable', 'none'] as const)(
  'cascades HTML sizing hints between normal user-agent and author declarations with the %s profile',
  profile => {
    const element = document.createElement('img');
    element.setAttribute('width', '100');
    element.setAttribute('height', '50');
    document.body.replaceChildren(element);
    const resolver = (userAgent: string, author = '') =>
      createStyleResolver({
        rules: readCssTextRules(author, 'author.css', undefined),
        userAgentRules: readCssTextRules(userAgent, 'ua.css', undefined),
        profile,
        policy: undefined,
        viewport: { width: 400, height: 300 },
      }).element(element);
    expect(resolver('img{width:25px}').width).toBe(100);
    expect(resolver('img{width:25px}', 'img{width:75px}').width).toBe(75);
    expect(
      resolver('img{width:25px!important}', 'img{width:75px!important}').width,
    ).toBe(25);
    expect(resolver('').aspectRatioIsHint).toBe(true);
    expect(resolver('', 'img{aspect-ratio:3}').aspectRatioIsHint).toBe(false);
  },
);
