import { checkUrlSafety } from './ssrf.js'

const CHECK_TIMEOUT_MS = 5000

// 大多数网站通过响应头拒绝被 iframe 嵌入（X-Frame-Options / CSP frame-ancestors），
// 而不是真的加载失败或很慢——浏览器对这种"内容被拒绝渲染但 iframe 认为导航已完成"的
// 情况会立刻触发 load 事件，前端单靠 iframe 超时完全测不出来（见对应 issue 的实测记录）。
// 所以在真正尝试 iframe 嵌入之前，服务端先请求一次目标 URL，读响应头判断是否会被拒绝。
function isBlockedByHeaders(headers: Headers): boolean {
  const xfo = headers.get('x-frame-options')
  if (xfo) return true

  const csp = headers.get('content-security-policy')
  if (csp) {
    const match = /frame-ancestors\s+([^;]+)/i.exec(csp)
    if (match && !match[1].includes('*')) return true
  }

  return false
}

export async function checkEmbeddable(rawUrl: string): Promise<boolean> {
  const safety = await checkUrlSafety(rawUrl)
  if (!safety.safe) return false

  try {
    const res = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    })
    res.body?.cancel()
    return !isBlockedByHeaders(res.headers)
  } catch {
    // 请求失败/超时不代表一定嵌入失败，交给前端的 iframe 超时机制兜底判断
    return true
  }
}
