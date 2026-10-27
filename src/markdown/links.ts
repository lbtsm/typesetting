import type { Element, ElementContent, Root } from 'hast'
import { el, isElement, text, textContent, withSlot } from './hast'
import { isWechatUrl, sanitizeUrl } from './sanitizer'

/**
 * 链接处理。这是本工具针对微信最关键的一块适配。
 *
 * 背景：微信公众号编辑器会把**非白名单域名**的 `<a href>` 剥成纯文本——
 * 这是平台规则，任何排版工具都绕不过去。只有 mp.weixin.qq.com 的链接、
 * 以及账号自己配置过的白名单域名，粘贴后才仍然可点。
 *
 * 所以这里提供四种策略，默认 `both`：正文保留可点链接（在微信内失效时至少文字还在），
 * 同时在文末自动生成「参考资料」列表，让读者仍然拿得到 URL。
 */

export type LinkMode =
  /** 正文保留 <a href> + 文末脚注（默认，兼容性最好） */
  | 'both'
  /** 正文只留文字 + 上标序号，URL 全部进文末脚注 */
  | 'footnote'
  /** 只保留 <a href>，不生成脚注 */
  | 'inline'
  /** 只保留文字，彻底去掉链接 */
  | 'text'

export interface Footnote {
  index: number
  /** 链接显示文字 */
  label: string
  /** 已通过安全校验的 URL */
  url: string
}

export const LINK_MODE_LABELS: Readonly<Record<LinkMode, string>> = {
  both: '保留链接 + 文末脚注',
  footnote: '仅文末脚注',
  inline: '仅保留链接',
  text: '仅保留文字',
}

interface Context {
  mode: LinkMode
  footnotes: Footnote[]
  /** url -> 脚注序号，保证同一个 URL 只占一个编号 */
  indexByUrl: Map<string, number>
}

/** 取得（必要时登记）某个 URL 的脚注序号。 */
function footnoteIndex(ctx: Context, label: string, url: string): number {
  const existing = ctx.indexByUrl.get(url)
  if (existing !== undefined) return existing
  const index = ctx.footnotes.length + 1
  ctx.indexByUrl.set(url, index)
  ctx.footnotes.push({ index, label, url })
  return index
}

/** 把 <a> 换成不带 href 的 <span>，保留内部所有子节点（粗体/行内代码等）。 */
function toPlainSpan(node: Element): Element {
  return el('span', {}, node.children)
}

/** 处理单个 <a>，返回用来替换它的若干节点。 */
function transformAnchor(node: Element, ctx: Context): ElementContent[] {
  const rawHref = node.properties?.href
  const href = sanitizeUrl(typeof rawHref === 'string' ? rawHref : null)

  // 危险协议：降级为纯文本，URL 直接丢弃
  if (!href) return [toPlainSpan(node)]

  const label = textContent(node).trim()
  const anchor = el('a', { href }, node.children)

  // 微信站内链接粘贴后仍然可点，无需脚注
  if (isWechatUrl(href)) return [anchor]

  // 自动链接（显示文字本身就是 URL）没必要再加脚注
  const isBareUrl = label === href || label === href.replace(/^https?:\/\//, '')

  switch (ctx.mode) {
    case 'inline':
      return [anchor]
    case 'text':
      return [toPlainSpan(node)]
    case 'footnote': {
      if (isBareUrl) return [toPlainSpan(node)]
      const index = footnoteIndex(ctx, label || href, href)
      return [toPlainSpan(node), withSlot(el('sup', {}, [text(`[${index}]`)]), 'sup')]
    }
    case 'both': {
      if (isBareUrl) return [anchor]
      const index = footnoteIndex(ctx, label || href, href)
      return [anchor, withSlot(el('sup', {}, [text(`[${index}]`)]), 'sup')]
    }
  }
}

/** 递归重写子节点列表，把 <a> 展开成 1~2 个节点。 */
function walk(children: ElementContent[], ctx: Context): ElementContent[] {
  const out: ElementContent[] = []
  for (const child of children) {
    if (!isElement(child)) {
      out.push(child)
      continue
    }
    // 先递归处理内部，再处理自身
    child.children = walk(child.children, ctx)
    if (child.tagName === 'a') {
      out.push(...transformAnchor(child, ctx))
    } else {
      out.push(child)
    }
  }
  return out
}

/**
 * 就地改写整棵树里的链接。
 * @returns 收集到的脚注（已按出现顺序编号、按 URL 去重）
 */
export function transformLinks(tree: Root, mode: LinkMode): Footnote[] {
  const ctx: Context = { mode, footnotes: [], indexByUrl: new Map() }
  tree.children = walk(tree.children as ElementContent[], ctx) as Root['children']
  return ctx.footnotes
}

/** 构造文末「参考资料」区块。没有脚注时返回 null。 */
export function buildFootnoteSection(
  footnotes: readonly Footnote[],
  title: string,
): Element | null {
  if (footnotes.length === 0) return null

  const items = footnotes.map((note) =>
    withSlot(
      el('p', {}, [
        withSlot(el('span', {}, [text(`[${note.index}] `)]), 'footnoteIndex'),
        text(note.label ? `${note.label}: ` : ''),
        withSlot(el('span', {}, [text(note.url)]), 'footnoteUrl'),
      ]),
      'footnoteItem',
    ),
  )

  return withSlot(
    el('section', {}, [
      withSlot(el('p', {}, [text(title)]), 'footnoteTitle'),
      ...items,
    ]),
    'footnoteSection',
  )
}
