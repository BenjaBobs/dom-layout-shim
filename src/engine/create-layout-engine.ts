import { LayoutEngine } from './layout-engine'
import type { LayoutEngineConfig } from './layout-engine-config'

export function createLayoutEngine(config: LayoutEngineConfig = {}): LayoutEngine {
  return new LayoutEngine(config)
}
