import { useCallback, useSyncExternalStore } from 'react'

/**
 * 订阅一条 CSS 媒体查询。用于在 JS 里区分「桌面分栏」与「移动端切页」两套布局。
 *
 * 用 useSyncExternalStore 而不是 useState + useEffect：
 * matchMedia 本来就是一个外部数据源，这样首帧读到的就是真实值，
 * 不会出现「先按默认值渲染一次、再在 effect 里纠正」的闪烁。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
