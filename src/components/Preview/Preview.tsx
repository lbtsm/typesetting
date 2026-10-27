import { useEffect, useRef } from 'react'
import type { PreviewDevice } from '../../storage/settings'

export interface PreviewProps {
  /** 已内联样式的 HTML */
  html: string
  device: PreviewDevice
  /** 编辑区当前顶部行号，用于滚动联动；为 null 表示不联动 */
  syncLine: number | null
  error: string | null
}

/** 微信正文在手机与桌面端的实际宽度 */
const DEVICE_WIDTH: Record<PreviewDevice, number> = {
  phone: 375,
  wide: 677,
}

interface Anchor {
  line: number
  top: number
}

/** 收集预览区里带 data-line 的锚点及其相对滚动容器的位置。 */
function collectAnchors(scroller: HTMLElement, article: HTMLElement): Anchor[] {
  const scrollerTop = scroller.getBoundingClientRect().top
  const anchors: Anchor[] = []
  for (const node of article.querySelectorAll<HTMLElement>('[data-line]')) {
    const line = Number(node.dataset.line)
    if (!Number.isFinite(line)) continue
    anchors.push({
      line,
      top: node.getBoundingClientRect().top - scrollerTop + scroller.scrollTop,
    })
  }
  return anchors
}

/** 按行号在锚点之间做线性插值，得到目标滚动位置。 */
function scrollTopForLine(anchors: Anchor[], line: number): number | null {
  if (anchors.length === 0) return null
  if (line <= anchors[0].line) return 0

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const current = anchors[i]
    const next = anchors[i + 1]
    if (line >= current.line && line < next.line) {
      const span = next.line - current.line
      const progress = span > 0 ? (line - current.line) / span : 0
      return current.top + (next.top - current.top) * progress
    }
  }
  return anchors[anchors.length - 1].top
}

/**
 * 右侧实时预览。
 *
 * 这里直接把管线产出的 HTML 字符串塞进 DOM（dangerouslySetInnerHTML）。
 * 之所以安全：这段 HTML 完全由本地渲染管线生成——Markdown 里的裸 HTML 在
 * remark-rehype 阶段已被丢弃，href/src 走过协议白名单，管线自身也不会
 * 产出 script/事件处理器。换句话说，这里不存在「把用户输入当 HTML 执行」的路径。
 *
 * 更重要的是：这段 HTML 与「复制富文本」写进剪贴板的是同一份产物，
 * 所以预览看到的就是粘贴到微信后的样子。
 */
export function Preview({ html, device, syncLine, error }: PreviewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (syncLine === null) return
    const scroller = scrollerRef.current
    const article = articleRef.current
    if (!scroller || !article) return

    const target = scrollTopForLine(collectAnchors(scroller, article), syncLine)
    if (target === null) return
    scroller.scrollTo({ top: target, behavior: 'auto' })
  }, [syncLine, html])

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950">
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          渲染失败：{error}
        </div>
      )}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div
          className="mx-auto bg-white px-5 py-6 shadow-sm ring-1 ring-black/5"
          style={{ maxWidth: DEVICE_WIDTH[device] }}
        >
          {/* data-testid 挂在外层容器上，不会进入复制到微信的 HTML */}
          <div
            ref={articleRef}
            data-testid="preview-article"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
