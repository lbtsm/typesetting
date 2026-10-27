import type { Element, ElementContent, Properties, Root, RootContent, Text } from 'hast'

/** hast 节点构造与查询的小工具集合。 */

export function text(value: string): Text {
  return { type: 'text', value }
}

export function el(
  tagName: string,
  properties: Properties = {},
  children: ElementContent[] = [],
): Element {
  return { type: 'element', tagName, properties, children }
}

export function isElement(node: unknown): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type?: unknown }).type === 'element'
  )
}

export function isText(node: unknown): node is Text {
  return (
    typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'text'
  )
}

/** 只取元素类型的子节点（忽略文本与注释）。 */
export function elementChildren(node: Element | Root): Element[] {
  return (node.children as unknown[]).filter(isElement)
}

/** 递归提取纯文本内容，用于生成脚注里的链接文字。 */
export function textContent(node: RootContent | Root): string {
  if (isText(node)) return node.value
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => textContent(child as RootContent)).join('')
  }
  return ''
}

/**
 * 显式指定该元素使用哪个主题槽位。
 * 渲染管线最后一步会读走 data-sk 并换成真正的 style 属性。
 */
export function withSlot(element: Element, slot: string): Element {
  element.properties = { ...element.properties, dataSk: slot }
  return element
}
