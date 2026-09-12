import type {
  TextMeasureResult,
  TextMeasurer,
} from '../../api/text-measurer.ts';
import { BoundedCache } from '../bounded-cache.ts';

// Built-in measurers are pure for their lifetime. Do not wrap injected consumer
// measurers: they can depend on external state and have no revision contract.
export function cacheTextMeasurer(measurer: TextMeasurer): TextMeasurer {
  const cache = new BoundedCache<TextMeasureResult>();
  return {
    measure(input) {
      const key = JSON.stringify([
        input.text,
        input.fontFamily,
        String(input.fontSize),
        String(input.fontWeight),
        String(input.letterSpacing),
        String(input.wordSpacing),
        String(input.maxWidth),
        String(input.lineHeight),
        input.whiteSpace,
      ]);
      let result = cache.get(key);
      if (!result) {
        result = { ...measurer.measure(input) };
        cache.set(key, result);
      }
      return { ...result };
    },
  };
}
