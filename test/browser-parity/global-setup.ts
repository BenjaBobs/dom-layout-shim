import { chromium, type BrowserServer } from '@playwright/test'
import type { TestProject } from 'vitest/node'

let browserServer: BrowserServer | undefined

export async function setup(project: TestProject): Promise<void> {
  const launchOptions = {
    args: ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox'],
    chromiumSandbox: false,
    headless: true,
    _sharedBrowser: true,
  }

  browserServer = await chromium.launchServer(launchOptions)

  project.provide('browserParityChromiumWsEndpoint', browserServer.wsEndpoint())
}

export async function teardown(): Promise<void> {
  await browserServer?.close()
}
