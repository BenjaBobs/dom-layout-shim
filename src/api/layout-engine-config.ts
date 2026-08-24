import {
  getNativeControlMetrics,
  type NativeControlMetrics,
  type NativeControlOptions,
} from './native-control-profile.ts';
import {
  createDefaultTextMeasurer,
  type TextMeasurer,
} from './text-measurer.ts';
import type { UnsupportedCssPolicy } from './unsupported-css-policy.ts';

export type Viewport = {
  width: number;
  height: number;
};

export type UserAgentStyleProfile = 'portable' | 'none';

export type UserAgentStyleOptions = {
  profile?: UserAgentStyleProfile;
  /** CSS applied at the user-agent origin, below document and inline styles. */
  overrides?: string;
};

export type ObserverDelivery = 'auto' | 'manual';

export type ObserverOptions = {
  /** Controls when layout-backed observer callbacks are delivered. */
  delivery?: ObserverDelivery;
};

export type LayoutEngineConfig = {
  /**
   * @deprecated Taffy is the only active backend. This option is accepted as a
   * compatibility no-op for callers that previously opted into Taffy.
   */
  layoutBackend?: 'taffy';
  viewport?: Viewport;
  unsupportedCss?: UnsupportedCssPolicy;
  textMeasurer?: TextMeasurer;
  stylesheets?: readonly string[];
  userAgentStyles?: UserAgentStyleOptions;
  nativeControls?: NativeControlOptions;
  observers?: ObserverOptions;
};

export type NormalizedLayoutEngineConfig = {
  viewport: Viewport;
  unsupportedCss: UnsupportedCssPolicy;
  textMeasurer: TextMeasurer;
  stylesheets: readonly string[];
  userAgentStyles: Required<UserAgentStyleOptions>;
  nativeControlMetrics: NativeControlMetrics;
  observers: Required<ObserverOptions>;
};

export function normalizeConfig(
  config: LayoutEngineConfig = {},
): NormalizedLayoutEngineConfig {
  const nativeControlProfile = config.nativeControls?.profile ?? 'portable';

  return {
    viewport: config.viewport ?? { width: 1280, height: 720 },
    unsupportedCss: { default: 'warn', ...config.unsupportedCss },
    textMeasurer: config.textMeasurer ?? createDefaultTextMeasurer(),
    stylesheets: config.stylesheets ?? [],
    userAgentStyles: {
      profile: config.userAgentStyles?.profile ?? 'portable',
      overrides: config.userAgentStyles?.overrides ?? '',
    },
    nativeControlMetrics: getNativeControlMetrics(
      nativeControlProfile,
      config.nativeControls?.overrides,
    ),
    observers: {
      delivery: config.observers?.delivery ?? 'auto',
    },
  };
}
