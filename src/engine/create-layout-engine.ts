import { LayoutEngine } from './layout-engine.ts'
import type { LayoutEngineConfig } from './layout-engine-config.ts'

export function createLayoutEngine(config: LayoutEngineConfig = {}): LayoutEngine {
  return new LayoutEngine(config)
}
