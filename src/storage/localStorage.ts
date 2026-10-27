/**
 * localStorage 薄封装。
 *
 * 浏览器在隐私模式、磁盘写满、被策略禁用等情况下都可能让 localStorage 抛异常，
 * 所以所有读写都包了 try/catch——存储失败不该让编辑器崩掉，
 * 最多是这次没存上，用户的正文还在内存里。
 */

const PREFIX = 'md2wechat:'

/** 存储是否可用。不可用时所有写操作静默降级为 no-op。 */
let available: boolean | null = null

export function isStorageAvailable(): boolean {
  if (available !== null) return available
  try {
    const probe = `${PREFIX}__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    available = true
  } catch {
    available = false
  }
  return available
}

export function readJson<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`[md2wechat] 读取 ${key} 失败，使用默认值：`, error)
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (!isStorageAvailable()) return false
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[md2wechat] 写入 ${key} 失败：`, error)
    return false
  }
}

export function removeKey(key: string): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch (error) {
    console.warn(`[md2wechat] 删除 ${key} 失败：`, error)
  }
}
