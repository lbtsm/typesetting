import type { ElementContent, Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { serializeStyle } from '../themes/tokens'
import type { Theme } from '../types/theme'
import { el } from './hast'
import { applyInlineStyles } from './inlineStyle'
import { buildFootnoteSection, transformLinks, type Footnote, type LinkMode } from './links'
import {
  applyAutoSpacing,
  highlightCodeBlocks,
  markSourceLines,
  normalizeListItems,
  removeHorizontalRules,
  styleBlockquotes,
  transformImages,
  transformTaskLists,
  wrapListItemContent,
  wrapTables,
} from './transforms'

export interface RenderOptions {
  theme: Theme
  linkMode: LinkMode
  /** 中英文之间自动加空格 */
  autoSpace: boolean
  /** 把独占一段的图片的 alt 渲染成图注 */
  imageCaption: boolean
  /** 隐藏 Markdown 的分割线（`---` / `***`），公众号正文里通常不需要 */
  hideHorizontalRule: boolean
  /** 文末脚注区块的标题 */
  footnoteTitle: string
  /**
   * 是否注入 data-line 源码行号。
   * 预览需要（用于滚动同步），复制/导出时必须关掉，避免把无用属性带进微信。
   */
  withLineMarkers: boolean
}

export interface RenderResult {
  /** 完整的、全内联样式的 HTML（根节点是一个 section） */
  html: string
  /** 收集到的链接脚注 */
  footnotes: Footnote[]
  /** 文中出现的代码语言，供上层按需懒加载 shiki 语法 */
  languages: string[]
}

/**
 * Markdown 解析器。
 *
 * `allowDangerousHtml` 保持默认的 false：Markdown 里的裸 HTML 会被直接丢弃，
 * 这既是产品决策（公众号排版不需要用户手写 HTML），也是 XSS 的第一道防线。
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })

/**
 * Markdown → 微信兼容 HTML。
 *
 * 完整链路：
 *   Markdown → mdast → hast → 链接/图片/列表/表格/代码等结构改写
 *          → 主题样式内联 → 外层 section 包裹 → HTML 字符串
 *
 * 预览与「复制富文本」调用的是同一个函数，仅 withLineMarkers 不同，
 * 两者使用同一套结构和内联样式；微信端仍可能清洗 HTML 或调整颜色。
 */
export function renderMarkdown(markdown: string, options: RenderOptions): RenderResult {
  const { theme } = options
  const tree = processor.runSync(processor.parse(markdown)) as Root

  // 行号必须最先打，后续包装节点会把它继承上去
  if (options.withLineMarkers) markSourceLines(tree)

  const footnotes = transformLinks(tree, options.linkMode)
  if (options.autoSpace) applyAutoSpacing(tree)

  // 顺序有讲究：先拆掉 li 里的 <p>，任务列表的 <input> 才会成为 li 的直接子节点
  normalizeListItems(tree)
  transformTaskLists(tree)
  wrapListItemContent(tree)
  transformImages(tree, options.imageCaption)
  wrapTables(tree)
  styleBlockquotes(tree)
  if (options.hideHorizontalRule) removeHorizontalRules(tree)
  const languages = highlightCodeBlocks(tree, theme)

  const footnoteSection = buildFootnoteSection(footnotes, options.footnoteTitle)
  if (footnoteSection) tree.children.push(footnoteSection)

  applyInlineStyles(tree, theme)

  // 最外层 section 承载正文字体/字号/行高；关键块级元素另有显式样式。
  const container = el(
    'section',
    { style: serializeStyle(theme.styles.container) },
    tree.children as ElementContent[],
  )

  return { html: toHtml(container), footnotes, languages }
}
