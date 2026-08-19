export type NativeControlProfile = 'portable';

export type NativeControlOptions = {
  /**
   * Selects deterministic intrinsic geometry for unstyled native controls.
   * Profiles never follow the runtime host automatically.
   */
  profile?: NativeControlProfile;
  /**
   * Replaces individual metrics from the selected profile. Supplying every
   * metric group defines a fully custom profile without host detection.
   */
  overrides?: NativeControlOverrides;
};

export type NativeControlMetrics = {
  button: {
    emptyWidth: number;
    emptyHeight: number;
    height: number;
    horizontalPadding: number;
  };
  checkboxRadio: { width: number; height: number };
  color: { width: number; height: number };
  file: { width: number; height: number };
  imageFallback: { width: number; height: number };
  meter: { width: number; height: number };
  progress: { width: number; height: number };
  range: { width: number; height: number };
  select: {
    minWidth: number;
    paddingWidth: number;
    height: number;
    listPaddingWidth: number;
    listRowHeight: number;
    listPaddingHeight: number;
  };
  textInput: {
    width: number;
    height: number;
    sizeCharacterWidth: number;
    sizePaddingWidth: number;
  };
  textarea: {
    columnWidth: number;
    paddingWidth: number;
    rowHeight: number;
    paddingHeight: number;
  };
  time: { width: number; height: number };
};

export type NativeControlOverrides = {
  [Group in keyof NativeControlMetrics]?: Partial<NativeControlMetrics[Group]>;
};

const portableMetrics: NativeControlMetrics = {
  button: { emptyWidth: 16, emptyHeight: 6, height: 23, horizontalPadding: 16 },
  checkboxRadio: { width: 13, height: 13 },
  color: { width: 50, height: 27 },
  file: { width: 272, height: 23 },
  imageFallback: { width: 64, height: 17 },
  meter: { width: 80, height: 16 },
  progress: { width: 160, height: 16 },
  range: { width: 129, height: 16 },
  select: {
    minWidth: 46,
    paddingWidth: 22,
    height: 21,
    listPaddingWidth: 6,
    listRowHeight: 17,
    listPaddingHeight: 6,
  },
  textInput: {
    width: 192,
    height: 23,
    sizeCharacterWidth: 8,
    sizePaddingWidth: 32,
  },
  textarea: {
    columnWidth: 8,
    paddingWidth: 21,
    rowHeight: 17,
    paddingHeight: 6,
  },
  time: { width: 103, height: 24 },
};

export function getNativeControlMetrics(
  profile: NativeControlProfile,
  overrides: NativeControlOverrides = {},
): NativeControlMetrics {
  let profileMetrics: NativeControlMetrics;

  switch (profile) {
    case 'portable':
      profileMetrics = portableMetrics;
  }

  return {
    button: { ...profileMetrics.button, ...overrides.button },
    checkboxRadio: {
      ...profileMetrics.checkboxRadio,
      ...overrides.checkboxRadio,
    },
    color: { ...profileMetrics.color, ...overrides.color },
    file: { ...profileMetrics.file, ...overrides.file },
    imageFallback: {
      ...profileMetrics.imageFallback,
      ...overrides.imageFallback,
    },
    meter: { ...profileMetrics.meter, ...overrides.meter },
    progress: { ...profileMetrics.progress, ...overrides.progress },
    range: { ...profileMetrics.range, ...overrides.range },
    select: { ...profileMetrics.select, ...overrides.select },
    textInput: { ...profileMetrics.textInput, ...overrides.textInput },
    textarea: { ...profileMetrics.textarea, ...overrides.textarea },
    time: { ...profileMetrics.time, ...overrides.time },
  };
}
