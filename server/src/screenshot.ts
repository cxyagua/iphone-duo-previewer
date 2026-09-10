import { chromium, type Browser } from 'playwright'
import { checkUrlSafety } from './ssrf.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_CONCURRENT_JOBS = 3
const NAVIGATION_TIMEOUT_MS = 8000

// 视口来自前端设备档位的逻辑分辨率（见 usePreviewSource/WebPreview 里的 logicalSize），
// 这里的上下限只是防止客户端传入异常值，正常取值范围在几百到一千出头。
const DEFAULT_WIDTH = 390
const DEFAULT_HEIGHT = 844
const DEFAULT_DPR = 2
const MIN_DIM = 200
const MAX_WIDTH = 1500
const MAX_HEIGHT = 1500
const MIN_DPR = 1
const MAX_DPR = 4

export interface Viewport {
  width: number
  height: number
  dpr: number
}

interface CacheEntry {
  buffer: Buffer
  expiresAt: number
}

export class ScreenshotError extends Error {
  constructor(
    public code: 'invalid_url' | 'too_many_requests' | 'navigation_failed',
    message: string,
  ) {
    super(message)
  }
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<Buffer>>()
let activeJobs = 0
let browserPromise: Promise<Browser> | null = null

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true })
  }
  return browserPromise
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function normalizeViewport(input: unknown): Viewport {
  const v = (input ?? {}) as Record<string, unknown>
  const width = Number.isFinite(v.width) ? Number(v.width) : DEFAULT_WIDTH
  const height = Number.isFinite(v.height) ? Number(v.height) : DEFAULT_HEIGHT
  const dpr = Number.isFinite(v.dpr) ? Number(v.dpr) : DEFAULT_DPR
  return {
    width: Math.round(clamp(width, MIN_DIM, MAX_WIDTH)),
    height: Math.round(clamp(height, MIN_DIM, MAX_HEIGHT)),
    dpr: clamp(dpr, MIN_DPR, MAX_DPR),
  }
}

function cacheKey(url: string, viewport: Viewport): string {
  return `${url}|${viewport.width}x${viewport.height}@${viewport.dpr}`
}

// 视口宽高用逻辑 CSS 尺寸（和 iframe 一致），deviceScaleFactor 负责按 dpr 放大到设备物理像素。
// 只截首屏：很多网站首页下半部分是异步/懒加载内容，load 事件触发时还没填充，
// fullPage 截全高会把这些还没渲染出来的空白区域也截进去，导致截图右侧/底部大段空白，
// 反而比只截首屏更不可靠，所以不用 fullPage。
async function captureScreenshot(url: string, viewport: Viewport): Promise<Buffer> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
  })
  try {
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS })
    await page.waitForTimeout(300)
    return await page.screenshot({ type: 'png' })
  } finally {
    await context.close()
  }
}

export async function getScreenshot(
  rawUrl: string,
  viewportInput: unknown,
): Promise<{ buffer: Buffer; cacheHit: boolean }> {
  const viewport = normalizeViewport(viewportInput)
  const key = cacheKey(rawUrl, viewport)

  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { buffer: cached.buffer, cacheHit: true }
  }

  const existing = inFlight.get(key)
  if (existing) {
    return { buffer: await existing, cacheHit: false }
  }

  const safety = await checkUrlSafety(rawUrl)
  if (!safety.safe) {
    throw new ScreenshotError('invalid_url', safety.reason ?? 'invalid_url')
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    throw new ScreenshotError('too_many_requests', 'too many concurrent screenshot jobs')
  }

  activeJobs += 1
  const job = captureScreenshot(rawUrl, viewport)
    .then((buffer) => {
      cache.set(key, { buffer, expiresAt: Date.now() + CACHE_TTL_MS })
      return buffer
    })
    .catch((err) => {
      throw new ScreenshotError('navigation_failed', err instanceof Error ? err.message : String(err))
    })
    .finally(() => {
      activeJobs -= 1
      inFlight.delete(key)
    })

  inFlight.set(key, job)
  return { buffer: await job, cacheHit: false }
}
