import 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    browserParityChromiumWsEndpoint: string;
    browserParityChromiumPid: number;
  }
}
