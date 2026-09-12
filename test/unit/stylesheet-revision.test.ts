import { describe, expect, it, vi } from 'vitest';
import { documentStylesheetFingerprint } from '../../src/css-parity-implementation/css/stylesheet-source.ts';

// These tests exercise cache invalidation, not CSS layout semantics.
describe('stylesheet revision tracking', () => {
  it('tracks nested declarations, grouping rule edits, and media setters', () => {
    const document = window.document.implementation.createHTMLDocument();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('@media (min-width: 1px) { .box { width: 10px; } }');
    document.adoptedStyleSheets = [sheet];
    let fingerprint = documentStylesheetFingerprint(document);
    const group = sheet.cssRules[0] as CSSMediaRule;
    const rule = group.cssRules[0] as CSSStyleRule;
    for (const edit of [
      () => {
        rule.style.width = '20px';
      },
      () => {
        group.insertRule('.box { width: 30px; }', 1);
      },
      () => {
        (group.cssRules[1] as CSSStyleRule).style.width = '40px';
      },
      () => {
        group.deleteRule(1);
      },
      () => {
        group.media.mediaText = '(min-width: 2px)';
      },
    ]) {
      edit();
      const next = documentStylesheetFingerprint(document);
      expect(next).not.toBe(fingerprint);
      fingerprint = next;
      expect(documentStylesheetFingerprint(document)).toBe(fingerprint);
    }
  });

  it('isolates sheet revisions and detects in-place adopted-sheet reordering', () => {
    const document = window.document.implementation.createHTMLDocument();
    const first = new CSSStyleSheet();
    const second = new CSSStyleSheet();
    first.replaceSync('.a { width: 10px; }');
    second.replaceSync('.b { width: 20px; }');
    document.adoptedStyleSheets = [first, second];
    const before = documentStylesheetFingerprint(document).split('|');
    const serialize = vi.spyOn(
      second.cssRules[0] as CSSStyleRule,
      'cssText',
      'get',
    );
    (first.cssRules[0] as CSSStyleRule).style.width = '30px';
    const after = documentStylesheetFingerprint(document).split('|');
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(serialize).not.toHaveBeenCalled();
    document.adoptedStyleSheets.reverse();
    expect(documentStylesheetFingerprint(document).split('|')).toEqual(
      after.toReversed(),
    );
    serialize.mockRestore();
  });

  it('keeps tokens stable when a host exposes one sheet through multiple sources', () => {
    const document = window.document.implementation.createHTMLDocument();
    document.body.innerHTML = '<style>.a { width: 10px; }</style>';
    const sheet = document.querySelector('style')?.sheet;
    if (!sheet) throw new Error('Missing stylesheet');
    document.adoptedStyleSheets = [sheet];
    const before = documentStylesheetFingerprint(document);
    expect(documentStylesheetFingerprint(document)).toBe(before);
    (sheet.cssRules[0] as CSSStyleRule).style.width = '20px';
    const after = documentStylesheetFingerprint(document);
    expect(after).not.toBe(before);
    expect(documentStylesheetFingerprint(document)).toBe(after);
  });

  it('does not walk unchanged rule objects after a declaration-only edit', () => {
    const document = window.document.implementation.createHTMLDocument();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.a { width:10px } .b { height:20px }');
    document.adoptedStyleSheets = [sheet];
    documentStylesheetFingerprint(document);
    const untouchedStyle = vi.spyOn(
      sheet.cssRules[1] as CSSStyleRule,
      'style',
      'get',
    );
    (sheet.cssRules[0] as CSSStyleRule).style.width = '30px';
    documentStylesheetFingerprint(document);
    expect(untouchedStyle).not.toHaveBeenCalled();
    untouchedStyle.mockRestore();
  });

  it('falls back to serialization when a mutation method cannot be patched', () => {
    const document = window.document.implementation.createHTMLDocument();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.a { width: 10px; }');
    Object.defineProperty(sheet, 'insertRule', {
      configurable: false,
      writable: false,
      value: sheet.insertRule,
    });
    document.adoptedStyleSheets = [sheet];
    const before = documentStylesheetFingerprint(document);
    (sheet.cssRules[0] as CSSStyleRule).style.width = '20px';
    expect(documentStylesheetFingerprint(document)).not.toBe(before);
    const serialize = vi.spyOn(
      sheet.cssRules[0] as CSSStyleRule,
      'cssText',
      'get',
    );
    documentStylesheetFingerprint(document);
    expect(serialize).toHaveBeenCalled();
    serialize.mockRestore();
  });
});
