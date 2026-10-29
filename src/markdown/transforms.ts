import type { Element, ElementContent, Root } from 'hast'
import { visit } from 'unist-util-visit'
import type { Theme } from '../types/theme'
import { el, elementChildren, isElement, isText, text, textContent, withSlot } from './hast'
import { getCodeThemeColors, getHighlighter, isLangReady, resolveLang } from './highlight'
import { addCjkSpacing } from './pangu'
import { sanitizeImageUrl } from './sanitizer'

/** 不参与中英文自动空格的容器 */
const NO_SPACING_TAGS = new Set(['code', 'pre', 'kbd', 'samp'])

/**
 * 取 class 列表。
 *
 * 要同时认 `className` 和 `class` 两个键：前者是 hast 规范（remark-rehype 产出的），
 * 后者是 shiki 自己拼 hast 时用的写法。只认一个会漏掉另一半节点。
 */
function classList(node: Element): string[] {
  const raw: unknown = node.properties?.className ?? node.properties?.class
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(/\s+/).filter(Boolean)
  return []
}

/** 把原节点的 data-line 搬到包装节点上，保证滚动同步不丢锚点。 */
function inheritLine(from: Element, to: Element): Element {
  const line = from.properties?.dataLine
  if (line !== undefined) {
    to.properties = { ...to.properties, dataLine: line }
    delete from.properties?.dataLine
  }
  return to
}

/** 就地替换 parent.children 中的某个节点。 */
function replaceChild(parent: { children: ElementContent[] }, index: number, next: ElementContent) {
  parent.children.splice(index, 1, next)
}

/**
 * 给顶层块元素打上源码行号，供编辑器 ↔ 预览滚动同步使用。
 * 仅在预览模式注入；复制时不会调用，避免把无用属性带进微信。
 */
export function markSourceLines(tree: Root): void {
  for (const node of tree.children) {
    if (!isElement(node)) continue
    const line = node.position?.start.line
    if (line !== undefined) {
      node.properties = { ...node.properties, dataLine: String(line) }
    }
  }
}

/** 中英文之间自动加空格。 */
export function applyAutoSpacing(tree: Root): void {
  const skip = (node: ElementContent): boolean =>
    isElement(node) && NO_SPACING_TAGS.has(node.tagName)

  const walk = (children: ElementContent[]): void => {
    for (const child of children) {
      if (isText(child)) {
        child.value = addCjkSpacing(child.value)
      } else if (isElement(child) && !skip(child)) {
        walk(child.children)
      }
    }
  }
  walk(tree.children as ElementContent[])
}

/**
 * 代码块高亮。
 *
 * 产出结构照搬微信原生代码块——每个源码行一个块级 <code>，空行 <code><br></code>：
 *   <section data-ignore-width data-sk="preWrap">
 *     <pre data-sk="pre"><code data-sk="codeLine">行1</code><code data-sk="codeLine">行2</code></pre>
 *   </section>
 *
 * 避免依赖「inline 行 + 裸 \n 字符」：粘贴清洗可能折叠换行。
 * 块级 code 的换行由结构本身表达，不依赖换行字符。
 *
 * 外层 section 负责横向滚动，并带 data-ignore-width——微信文章结构规范（1.4.4）
 * 明确让横向滚动容器用它豁免宽度检查。
 *
 * @returns 文中出现过的语言，供上层按需懒加载语法
 */
export function highlightCodeBlocks(tree: Root, theme: Theme): string[] {
  const languages = new Set<string>()
  const highlighter = getHighlighter()
  const fallbackColors = getCodeThemeColors(theme.base.codeTheme)

  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) return
    const codeNode = elementChildren(node).find((child) => child.tagName === 'code')
    if (!codeNode) return

    const langClass = classList(codeNode).find((name) => name.startsWith('language-'))
    const lang = resolveLang(langClass?.slice('language-'.length))
    languages.add(lang)

    // Tab 在微信里宽度不可控，统一展开成 4 个空格，保证缩进一定正确
    const source = textContent(codeNode).replace(/\n$/, '').replace(/\t/g, '    ')

    let lines: Element[] | null = null
    let colors = fallbackColors

    if (highlighter && isLangReady(lang)) {
      try {
        const hast = highlighter.codeToHast(source, { lang, theme: theme.base.codeTheme })
        const shikiPre = hast.children.find(
          (child): child is Element => isElement(child) && child.tagName === 'pre',
        )
        const shikiCode = shikiPre && elementChildren(shikiPre)[0]
        if (shikiCode) {
          colors = readShikiColors(shikiPre) ?? colors
          lines = shikiLinesToCode(shikiCode.children, colors.fg)
        }
      } catch (error) {
        console.error('[md2wechat] 代码高亮失败，退化为纯文本：', lang, error)
      }
    }

    // 高亮器尚未就绪、语言缺失或高亮抛错时，自己拼出与高亮路径完全相同的结构
    lines ??= plainLinesToCode(source, colors.fg)

    // 套上微信原生代码块的 class（结构取自参考文章）。粘贴后若 class 得以保留，
    // 微信自己的 CSS 会接管不折行与横向滚动；若被删，行内样式兜底，效果退回现状。
    // dataWxClass 是内部标记，applyInlineStyles 清掉其他 class 之后会把它还原成 class。
    const pre = withSlot(
      el(
        'pre',
        {
          dataWxClass: 'code-snippet__js',
          dataLang: lang === 'text' ? 'plaintext' : lang,
          style: `background: ${colors.bg}; color: ${colors.fg}`,
        },
        lines,
      ),
      'pre',
    )
    const wrapper = withSlot(
      el(
        'section',
        {
          dataWxClass: 'code-snippet__fix code-snippet__js',
          dataIgnoreWidth: '',
          style: `background: ${colors.bg}`,
        },
        [pre],
      ),
      'preWrap',
    )
    replaceChild(parent as { children: ElementContent[] }, index, inheritLine(node, wrapper))
    return 'skip'
  })

  return Array.from(languages)
}

/** 构造一个代码行：块级 code，空行放 <br> 撑开高度。 */
function codeLine(children: ElementContent[]): Element {
  return withSlot(el('code', {}, children.length > 0 ? children : [el('br')]), 'codeLine')
}

/**
 * 把 shiki 的输出改造成「每行一个块级 code」。
 *
 * shiki 用 `<span class="line">` 表示一行，行与行之间夹着 `\n` 文本节点。
 * 这里只取 line 元素、丢掉 `\n`，换行完全由块级结构表达。
 *
 * 同时统一 token 的形状：shiki 对 plaintext 不上色，产出的是一个属性都没有的裸 `<span>`，
 * 而带语言时每段文本都是 `<span style="color:#xxx">`。微信粘贴时会清掉无样式的行内标签，
 * 连带折叠 ASCII 图依赖的连续空格，所以有内容的裸 span 补上前景色，空的直接删掉。
 */
function shikiLinesToCode(nodes: ElementContent[], fg: string): Element[] {
  return nodes
    .filter((node): node is Element => isElement(node) && classList(node).includes('line'))
    .map((line) => codeLine(line.children.flatMap((token) => normalizeCodeToken(token, fg))))
}

function normalizeCodeToken(node: ElementContent, fg: string): ElementContent[] {
  if (!isElement(node)) return [node]
  const style = node.properties?.style
  if (typeof style === 'string' && style.trim() !== '') return [node]
  // 空行：shiki 对 plaintext 会生成 <span> 里套一个空文本节点，按内容判空才丢得掉
  if (textContent(node) === '') return []
  node.properties = { ...node.properties, style: `color: ${fg}` }
  return [node]
}

/** 高亮不可用时的兜底，手工拼出与高亮路径一致的行结构。 */
function plainLinesToCode(source: string, fg: string): Element[] {
  return source
    .split('\n')
    .map((line) => codeLine(line ? [el('span', { style: `color: ${fg}` }, [text(line)])] : []))
}

/** 从 shiki 生成的 <pre> 的 style 里读出背景色与前景色。 */
function readShikiColors(pre: Element): { bg: string; fg: string } | null {
  const style = pre.properties?.style
  if (typeof style !== 'string') return null
  const bg = /background-color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()
  const fg = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()
  if (!bg || !fg) return null
  return { bg, fg }
}

/**
 * 图片：独占一段的图片升级成「图 + 图注」结构，图注取自 alt 文本。
 * 同时校验 src，非法协议的图片直接丢弃。
 */
export function transformImages(tree: Root, withCaption: boolean): void {
  // 先统一做一遍 src 校验
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'img' || !parent || index === undefined) return
    const src = sanitizeImageUrl(
      typeof node.properties?.src === 'string' ? node.properties.src : null,
    )
    if (!src) {
      ;(parent as { children: ElementContent[] }).children.splice(index, 1)
      return index
    }
    node.properties = { ...node.properties, src }
  })

  // 再把「整段只有一张图」的段落换成居中图块
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'p' || !parent || index === undefined) return
    const children = node.children.filter(
      (child) => !(isText(child) && child.value.trim() === ''),
    )
    if (children.length !== 1) return
    const img = children[0]
    if (!isElement(img) || img.tagName !== 'img') return

    withSlot(img, 'img')
    const alt = typeof img.properties?.alt === 'string' ? img.properties.alt.trim() : ''
    const blocks: ElementContent[] = [img]
    if (withCaption && alt) {
      blocks.push(withSlot(el('p', {}, [text(alt)]), 'figcaption'))
    }
    const figure = withSlot(el('section', {}, blocks), 'figure')
    replaceChild(parent as { children: ElementContent[] }, index, inheritLine(node, figure))
    return 'skip'
  })
}

/**
 * GFM 任务列表：微信会清掉 <input>，换成 ☑ / ☐ 字符。
 */
export function transformTaskLists(tree: Root): void {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'li' || !classList(node).includes('task-list-item')) return
    node.properties = { ...node.properties, style: 'list-style: none' }

    const children: ElementContent[] = []
    for (const child of node.children) {
      if (isElement(child) && child.tagName === 'input') {
        const checked = child.properties?.checked === true
        // 标记后不加空格：remark 已经在 checkbox 后面插了一个空格文本节点
        children.push(withSlot(el('span', {}, [text(checked ? '☑' : '☐')]), 'taskMarker'))
        continue
      }
      children.push(child)
    }
    node.children = children
  })

  // 整列都是任务项的 ul 去掉项目符号缩进
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'ul') return
    const items = elementChildren(node)
    if (items.length === 0) return
    if (!items.every((item) => classList(item).includes('task-list-item'))) return
    node.properties = {
      ...node.properties,
      style: 'list-style-type: none; padding-left: 0',
    }
  })
}

/**
 * 列表项里 remark 生成的 <p> 会带来多余段距，
 * 单段的 li 直接拆掉 p，多段的保留但由主题控制边距。
 */
export function normalizeListItems(tree: Root): void {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'li') return
    const paragraphs = elementChildren(node).filter((child) => child.tagName === 'p')
    if (paragraphs.length !== 1) return

    const children: ElementContent[] = []
    for (const child of node.children) {
      if (isElement(child) && child.tagName === 'p') {
        children.push(...child.children)
      } else {
        children.push(child)
      }
    }
    node.children = children
  })
}

/** 列表项里视为块级、不参与包裹的子元素 */
const LIST_ITEM_BLOCK_TAGS = new Set([
  'ul',
  'ol',
  'p',
  'section',
  'pre',
  'blockquote',
  'table',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'div',
])

function isBlankText(node: ElementContent): boolean {
  return isText(node) && node.value.trim() === ''
}

/**
 * 把 li 里连续的行内内容包进一个 section。
 *
 * 微信编辑器粘贴时要求 li 内是块级容器；遇到 `<li><strong>好记</strong>:说明</li>`
 * 这种「元素开头 + 裸文本」的混排，会把开头的 strong 单独提成一段，冒号后的文字
 * 掉到下一行。Markdown Nice 等工具输出 `<li><section>…</section></li>` 也是这个原因。
 *
 * 嵌套列表、松散列表里的 <p> 等块级子元素保持原样；
 * 一段行内内容首尾的空白文本节点留在 section 外面，避免包出多余的换行。
 * 必须在 transformTaskLists 之后调用，这样任务标记 ☑/☐ 会被一起包进去。
 */
export function wrapListItemContent(tree: Root): void {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'li') return

    const out: ElementContent[] = []
    let run: ElementContent[] = []

    const flush = () => {
      let start = 0
      let end = run.length
      while (start < end && isBlankText(run[start])) start += 1
      while (end > start && isBlankText(run[end - 1])) end -= 1
      out.push(...run.slice(0, start))
      if (end > start) {
        out.push(withSlot(el('section', {}, run.slice(start, end)), 'listItemContent'))
      }
      out.push(...run.slice(end))
      run = []
    }

    for (const child of node.children) {
      if (isElement(child) && LIST_ITEM_BLOCK_TAGS.has(child.tagName)) {
        flush()
        out.push(child)
      } else {
        run.push(child)
      }
    }
    flush()
    node.children = out
  })
}

/** 表格包一层可横向滚动的 section，避免移动端爆版。 */
export function wrapTables(tree: Root): void {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'table' || !parent || index === undefined) return
    // 只豁免有意提供横向滚动的表格子树，不给整篇正文放行宽度检查。
    const wrapper = withSlot(el('section', { dataIgnoreWidth: '' }, [node]), 'tableWrap')
    replaceChild(parent as { children: ElementContent[] }, index, inheritLine(node, wrapper))
    return 'skip'
  })
}

/**
 * 删除分割线。
 *
 * Markdown 里的 `---` / `----` / `***` 都是分隔符，写作时用来断章很顺手，
 * 但放进公众号正文往往显得多余，所以默认在转换时隐藏（设置里可关）。
 *
 * 注意这只影响独立成行的分隔符。紧跟在文字下一行的 `----` 在 Markdown 里
 * 是 setext 二级标题而不是分割线，不会走到这里。
 */
export function removeHorizontalRules(tree: Root): void {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'hr' || !parent || index === undefined) return
    ;(parent as { children: ElementContent[] }).children.splice(index, 1)
    return index
  })
}

/** 引用块内的段落换用专属槽位，最后一段去掉下边距。 */
export function styleBlockquotes(tree: Root): void {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'blockquote') return
    for (const child of elementChildren(node)) {
      if (child.tagName === 'p') withSlot(child, 'blockquoteP')
    }
  })
}
