import { useCallback, useEffect, useRef, useState } from 'react'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

/** 极简的全局提示：同一时刻只显示一条，到时自动消失。 */
export function useToast(durationMs = 2400) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<number | null>(null)
  const seqRef = useRef(0)

  const show = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      seqRef.current += 1
      setToast({ id: seqRef.current, message, tone })
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setToast(null), durationMs)
    },
    [durationMs],
  )

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  return { toast, show }
}
