import init, {
  initSync,
  TaffyTree as WasmTaffyTree,
} from './generated/taffy_wasm.js';

export type Size<T> = { width: T; height: T };
export type Rect<T> = { top: T; right: T; bottom: T; left: T };
export type AvailableSpace = number | 'min-content' | 'max-content';
export type Dimension =
  | number
  | `${number}%`
  | 'auto'
  | 'min-content'
  | 'max-content'
  | 'fit-content';
export type LengthPercentage = number | `${number}%`;
export type LengthPercentageAuto = LengthPercentage | 'auto';
export type MinTrackSizingFunction =
  | LengthPercentage
  | 'auto'
  | 'min-content'
  | 'max-content';
export type MaxTrackSizingFunction =
  | MinTrackSizingFunction
  | `${number}fr`
  | { fitContent: LengthPercentage };
export type TrackSizingFunction = {
  min: MinTrackSizingFunction;
  max: MaxTrackSizingFunction;
};
export type GridTemplateComponent =
  | TrackSizingFunction
  | { count: number; tracks: TrackSizingFunction[] };
export type GridPlacement =
  | 'auto'
  | number
  | { span: number }
  | { area: string };
export type GridTemplateArea = {
  name: string;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};

type Values<T> = T[keyof T];

export const Display = {
  Block: 'block',
  FlowRoot: 'flow-root',
  Flex: 'flex',
  Grid: 'grid',
  None: 'none',
} as const;
export type Display = Values<typeof Display>;

export const Position = {
  Relative: 'relative',
  Absolute: 'absolute',
} as const;
export type Position = Values<typeof Position>;

export const BoxSizing = {
  BorderBox: 'border-box',
  ContentBox: 'content-box',
} as const;
export type BoxSizing = Values<typeof BoxSizing>;

export const FlexDirection = {
  Row: 'row',
  Column: 'column',
  RowReverse: 'row-reverse',
  ColumnReverse: 'column-reverse',
} as const;
export type FlexDirection = Values<typeof FlexDirection>;

export const FlexWrap = {
  NoWrap: 'nowrap',
  Wrap: 'wrap',
  WrapReverse: 'wrap-reverse',
} as const;
export type FlexWrap = Values<typeof FlexWrap>;

export const GridAutoFlow = {
  Row: 'row',
  Column: 'column',
  RowDense: 'row-dense',
  ColumnDense: 'column-dense',
} as const;
export type GridAutoFlow = Values<typeof GridAutoFlow>;

const itemAlignment = {
  Start: 'start',
  End: 'end',
  FlexStart: 'flex-start',
  FlexEnd: 'flex-end',
  Center: 'center',
  Stretch: 'stretch',
} as const;
export const AlignItems = itemAlignment;
export const AlignSelf = { ...itemAlignment, Auto: 'auto' } as const;
export type AlignItems = Values<typeof AlignItems>;
export type AlignSelf = Values<typeof AlignSelf>;

const contentAlignment = {
  Start: 'start',
  End: 'end',
  FlexStart: 'flex-start',
  FlexEnd: 'flex-end',
  Center: 'center',
  Stretch: 'stretch',
  SpaceBetween: 'space-between',
  SpaceAround: 'space-around',
  SpaceEvenly: 'space-evenly',
} as const;
export const AlignContent = contentAlignment;
export const JustifyContent = contentAlignment;
export type AlignContent = Values<typeof AlignContent>;
export type JustifyContent = Values<typeof JustifyContent>;

export class Style {
  display: Display = Display.Flex;
  position: Position = Position.Relative;
  boxSizing: BoxSizing = BoxSizing.BorderBox;
  flexDirection: FlexDirection = FlexDirection.Row;
  flexWrap: FlexWrap = FlexWrap.NoWrap;
  alignItems: AlignItems | undefined;
  alignSelf: AlignSelf | undefined;
  alignContent: AlignContent | undefined;
  justifyContent: JustifyContent | undefined;
  justifyItems: AlignItems | undefined;
  justifySelf: AlignSelf | undefined;
  flexGrow = 0;
  flexShrink = 1;
  flexBasis: Dimension = 'auto';
  aspectRatio: number | undefined;
  gridAutoFlow: GridAutoFlow = GridAutoFlow.Row;
  gridTemplateColumns: GridTemplateComponent[] = [];
  gridTemplateRows: GridTemplateComponent[] = [];
  gridAutoColumns: TrackSizingFunction[] = [];
  gridAutoRows: TrackSizingFunction[] = [];
  gridTemplateAreas?: {
    areas: GridTemplateArea[];
    rowCount: number;
    columnCount: number;
  };
  gridColumn: { start: GridPlacement; end: GridPlacement } = {
    start: 'auto',
    end: 'auto',
  };
  gridRow: { start: GridPlacement; end: GridPlacement } = {
    start: 'auto',
    end: 'auto',
  };
  size: Size<Dimension> = { width: 'auto', height: 'auto' };
  minSize: Size<Dimension> = { width: 'auto', height: 'auto' };
  maxSize: Size<Dimension> = { width: 'auto', height: 'auto' };
  margin: Rect<LengthPercentageAuto> = zeroRect();
  padding: Rect<LengthPercentage> = zeroRect();
  border: Rect<LengthPercentage> = zeroRect();
  gap: Size<LengthPercentage> = { width: 0, height: 0 };
  inset: Rect<LengthPercentageAuto> = autoRect();
}

export type Layout = Readonly<{
  border: Readonly<Rect<number>>;
  padding: Readonly<Rect<number>>;
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
}>;

export type MeasureFunction = (
  knownDimensions: Size<number | undefined>,
  availableSpace: Size<AvailableSpace>,
  node: bigint,
  context: unknown,
  style: unknown,
) => Size<number>;

interface TaffyBackend {
  disableRounding(): void;
  newLeafWithContext(style: Style, context: unknown): bigint;
  newWithChildren(style: Style, children: bigint[]): bigint;
  setStyle(node: bigint, style: Style): void;
  computeLayoutWithMeasure(
    node: bigint,
    availableSpace: Size<AvailableSpace>,
    measure: MeasureFunction,
  ): void;
  getLayout(node: bigint): Layout;
}

const NativeTaffyTree = WasmTaffyTree as unknown as {
  new (): TaffyBackend;
};

/** Each completed backend computation owns one immutable set of layout reads. */
export class TaffyTree implements TaffyBackend {
  private readonly backend = new NativeTaffyTree();
  private readonly layouts = new Map<bigint, Layout>();

  disableRounding(): void {
    this.backend.disableRounding();
  }

  newLeafWithContext(style: Style, context: unknown): bigint {
    return this.backend.newLeafWithContext(style, context);
  }

  newWithChildren(style: Style, children: bigint[]): bigint {
    return this.backend.newWithChildren(style, children);
  }

  setStyle(node: bigint, style: Style): void {
    this.backend.setStyle(node, style);
  }

  computeLayoutWithMeasure(
    node: bigint,
    available: Size<AvailableSpace>,
    measure: MeasureFunction,
  ): void {
    // The binding alone owns invalidation: callers cannot compute while leaving
    // a cache of old metrics attached to a new result. Scroll reuses these reads.
    this.layouts.clear();
    this.backend.computeLayoutWithMeasure(node, available, measure);
  }

  getLayout(node: bigint): Layout {
    const cached = this.layouts.get(node);
    if (cached) return cached;
    const layout = this.backend.getLayout(node);
    this.layouts.set(node, layout);
    return layout;
  }
}

let loadPromise: Promise<unknown> | undefined;

export function loadTaffy(): Promise<unknown> {
  loadPromise ??= loadWasm();
  return loadPromise;
}

async function loadWasm(): Promise<unknown> {
  let fs: typeof import('node:fs');
  let path: typeof import('node:path');
  try {
    fs = await import('node:fs');
    path = await import('node:path');
  } catch {
    return init();
  }

  const wasmUrl = new URL('./generated/taffy_wasm_bg.wasm', import.meta.url);
  let wasmPath: URL | string = wasmUrl;
  if (wasmUrl.protocol !== 'file:' || !fs.existsSync(wasmUrl)) {
    let directory = process.cwd();
    while (true) {
      const candidate = path.resolve(
        directory,
        'src/css-parity-implementation/layout/taffy/generated/taffy_wasm_bg.wasm',
      );
      if (fs.existsSync(candidate)) {
        wasmPath = candidate;
        break;
      }

      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  return initSync({ module: fs.readFileSync(wasmPath) });
}

function zeroRect<T extends number>(): Rect<T> {
  return { top: 0 as T, right: 0 as T, bottom: 0 as T, left: 0 as T };
}

function autoRect(): Rect<LengthPercentageAuto> {
  return { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' };
}
