import dns from 'node:dns'
import net from 'node:net'

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0'])

// 基础版 SSRF 防护：拦截已知的内网/回环/链路本地网段。
// 已知局限：DNS 解析和 Playwright 实际发起连接之间存在极短的 TOCTOU 窗口（DNS rebinding），
// 完善方案（固定解析结果、代理层过滤）留给后续迭代，见 docs/FEATURE_LIST.md 的 V1.2+ 项。
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 127) return true // 回环
  if (a === 10) return true // 私有 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true // 私有 172.16.0.0/12
  if (a === 192 && b === 168) return true // 私有 192.168.0.0/16
  if (a === 169 && b === 254) return true // 链路本地，含云元数据 169.254.169.254
  if (a === 0) return true // 0.0.0.0/8
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1') return true // 回环
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true // 链路本地
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA fc00::/7
  return false
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip)
  if (net.isIPv6(ip)) return isPrivateIPv6(ip)
  return false
}

export interface SsrfCheckResult {
  safe: boolean
  reason?: string
}

export async function checkUrlSafety(rawUrl: string): Promise<SsrfCheckResult> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { safe: false, reason: 'invalid_url' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { safe: false, reason: 'unsupported_protocol' }
  }

  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: 'blocked_hostname' }
  }
  if (net.isIP(hostname) && isPrivateIP(hostname)) {
    return { safe: false, reason: 'private_ip' }
  }

  try {
    const records = await dns.promises.lookup(hostname, { all: true })
    if (records.some((r) => isPrivateIP(r.address))) {
      return { safe: false, reason: 'private_ip' }
    }
  } catch {
    return { safe: false, reason: 'dns_resolution_failed' }
  }

  return { safe: true }
}
