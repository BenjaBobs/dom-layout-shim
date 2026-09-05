// CSS Text applies word spacing to surviving word separators, not every gap
// between glyphs. This Latin-text subset covers spaces and no-break spaces;
// script-specific separators require the shaping support we do not yet model.
export function wordSpacingWidth(text: string, spacing: number): number {
  if (spacing === 0) return 0;
  let separators = 0;
  for (const character of text) {
    if (character === ' ' || character === '\u00a0') separators += 1;
  }
  return separators * spacing;
}
