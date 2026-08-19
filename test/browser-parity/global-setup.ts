import { type BrowserServer, chromium } from '@playwright/test';
import type { TestProject } from 'vitest/node';

let browserServer: BrowserServer | undefined;

export async function setup(project: TestProject): Promise<void> {
  const launchOptions = {
    args: ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox'],
    chromiumSandbox: false,
    headless: true,
    _sharedBrowser: true,
  };

  browserServer = await chromium.launchServer(launchOptions);
  const browserPid = browserServer.process().pid;

  if (browserPid === undefined) {
    throw new Error(
      'Playwright did not expose the launched Chromium process ID.',
    );
  }

  project.provide(
    'browserParityChromiumWsEndpoint',
    browserServer.wsEndpoint(),
  );
  project.provide('browserParityChromiumPid', browserPid);
}

export async function teardown(): Promise<void> {
  await browserServer?.close();
}
