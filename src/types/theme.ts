/**
 * 主题类型定义。
 *
 * 设计要点：主题里的样式最终会被**逐节点内联**到 HTML 的 style 属性上，
 * 因此这里统一用 kebab-case 的 CSS 属性名作为 key，值为字符串，
 * 序列化时直接拼成 `a:b;c:d`，不经过任何 CSS 解析器。
 */

/** 一组 CSS 声明：key 为 kebab-case 属性名。 */
export type StyleMap = Readonly<Record<string, string>>

/** 主题的排版基础变量，设置面板可以在运行时覆盖其中一部分。 */
export interface ThemeBase {
  /** 正文字体栈 */
  fontFamily: string
  /** 代码字体栈 */
  codeFontFamily: string
  /** 正文字号，如 '16px' */
  fontSize: string
  /** 正文行高，如 '1.8' */
  lineHeight: string
  /** 字间距，如 '0.05em' */
  letterSpacing: string
  /** 正文对齐方式。微信官方正文用 justify（两端对齐） */
  textAlign: string
  /** 加粗字重。微信编辑器的「加粗」实际是 500 而非 700 */
  boldWeight: string
  /** 标题字重 */
  headingWeight: string
  /** 标题对齐方式 */
  headingAlign: string
  /** 正文颜色 */
  textColor: string
  /** 标题颜色 */
  headingColor: string
  /** 链接颜色 */
  linkColor: string
  /** 主题强调色：引用条、标题装饰线等 */
  accentColor: string
  /** 边框/分隔线颜色 */
  borderColor: string
  /** 次要文字颜色：图注、脚注、删除线 */
  mutedColor: string
  /** 浅色块背景：行内代码、表头、引用块 */
  surfaceColor: string
  /** 段落外边距 */
  paragraphMargin: string
  /** 块级元素（代码块/引用/表格/图片）外边距 */
  blockMargin: string
  /** 代码块字号 */
  codeFontSize: string
  /** 代码块行高 */
  codeLineHeight: string
  /** shiki 代码高亮主题名 */
  codeTheme: string
}

/**
 * 可被单独赋样式的元素槽位。
 * 渲染器要么按 tagName 映射到这里，要么由转换器通过 data-sk 显式指定。
 */
export const ELEMENT_KEYS = [
  'container',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'strong',
  'em',
  'del',
  'a',
  'inlineCode',
  'blockquote',
  'blockquoteP',
  'ul',
  'ol',
  'li',
  'listItemContent',
  'hr',
  'br',
  'img',
  'figure',
  'figcaption',
  'preWrap',
  'pre',
  'codeLine',
  'tableWrap',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'sup',
  'footnoteSection',
  'footnoteTitle',
  'footnoteItem',
  'footnoteIndex',
  'footnoteUrl',
  'taskMarker',
] as const

export type ElementKey = (typeof ELEMENT_KEYS)[number]

export type ThemeStyles = Readonly<Record<ElementKey, StyleMap>>

/** 构建完成、可直接用于渲染的主题。 */
export interface Theme {
  id: string
  name: string
  description: string
  base: ThemeBase
  styles: ThemeStyles
}

/**
 * 主题定义。只需写出与默认值不同的部分：
 * - base 为 ThemeBase 的局部覆盖
 * - overrides 接收合并后的 base，返回对默认样式表的局部覆盖（按 key 浅合并）
 */
export interface ThemeDefinition {
  id: string
  name: string
  description: string
  base?: Partial<ThemeBase>
  overrides?: (base: ThemeBase) => Partial<Record<ElementKey, StyleMap>>
}
