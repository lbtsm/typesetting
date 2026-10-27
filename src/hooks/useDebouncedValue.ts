import { useEffect, useState } from 'react'

/**
 * 防抖取值。
 *
 * 预览渲染（解析 + 高亮 + 内联样式）在长文上有成本，
 * 每敲一个字就重渲染会让打字发涩；延迟一小段再渲染，手感明显更顺。
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
