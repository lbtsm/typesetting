import type { Element, Root } from 'hast'
import { visit } from 'unist-util-visit'
import { serializeStyle } from '../themes/tokens'
import { ELEMENT_KEYS, type ElementKey, type StyleMap, type Theme } from '../types/theme'

/**
 * 把主题样式内联到每个节点的 style 属性上。
 *
 * 这是整条管线里最关键的一步，原因很直接：**微信公众号编辑器会丢弃 class 和
 * 外部样式表**，只认元素自己的 style 属性。所以我们不在运行时用 CSS 渲染预览、
 * 再想办法「导出时内联」，而是一开始就只产出内联样式——
 * 预览和复制用的是同一份 HTML 字符串，不存在两者对不上的可能。
 */

/** 标签名 → 主题槽位的默认映射 */
const TAG_TO_SLOT: Readonly<Record<string, ElementKey>> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  p: 'p',
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  del: 'del',
  s: 'del',
  a: 'a',
  blockquote: 'blockquote',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  hr: 'hr',
  br: 'br',
  img: 'img',
  table: 'table',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  th: 'th',
  td: 'td',
  pre: 'pre',
  // 裸 <code> 一定是行内代码；代码块里的 code 由转换器显式标了 data-sk="code"
  code: 'inlineCode',
  sup: 'sup',
}

const VALID_SLOTS = new Set<string>(ELEMENT_KEYS)

/**
 * 粘贴到微信后毫无意义、反而可能干扰编辑器的属性。
 *
 * class / className、tabindex / tabIndex 都列了两种写法：
 * remark-rehype 走 hast 规范的驼峰键，shiki 自己拼 hast 时用的是 HTML 原名。
 */
const DROPPED_PROPERTIES = ['className', 'class', 'tabIndex', 'tabindex', 'id']

/** 把 inline style 字符串解析回键值对。 */
function parseStyle(value: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const declaration of value.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    const prop = declaration.slice(0, colon).trim()
    const val = declaration.slice(colon + 1).trim()
    if (prop && val) out[prop] = val
  }
  return out
}

/** 决定某个元素该用哪个主题槽位。 */
function slotOf(node: Element): ElementKey | null {
  const explicit = node.properties?.dataSk
  if (typeof explicit === 'string' && VALID_SLOTS.has(explicit)) {
    return explicit as ElementKey
  }
  return TAG_TO_SLOT[node.tagName] ?? null
}

/**
 * 就地给整棵树写入 inline style，并清掉对微信无用的属性。
 *
 * 节点上已有的 style（shiki 的 token 颜色、代码块背景、任务列表的 list-style）
 * 优先级高于主题样式——它们是转换阶段算出来的结果，不该被主题覆盖。
 */
export function applyInlineStyles(tree: Root, theme: Theme): void {
  visit(tree, 'element', (node) => {
    const properties = node.properties ?? {}

    const slot = slotOf(node)
    const themeStyle: StyleMap = slot ? theme.styles[slot] : {}
    const existing =
      typeof properties.style === 'string' ? parseStyle(properties.style) : {}

    const merged = { ...themeStyle, ...existing }
    const serialized = serializeStyle(merged)

    for (const key of DROPPED_PROPERTIES) delete properties[key]
    delete properties.dataSk

    if (serialized) {
      properties.style = serialized
    } else {
      delete properties.style
    }
    node.properties = properties
  })
}
