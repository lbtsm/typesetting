import type { StyleMap, ThemeBase, ThemeStyles } from '../types/theme'
import { scalePx } from './tokens'

/** 表头与内容单元格共用的样式，保证两者格式一致。 */
function tableCell(b: ThemeBase): StyleMap {
  return {
    border: `1px solid ${b.borderColor}`,
    padding: '8px 12px',
    color: b.textColor,
    'font-size': scalePx(b.fontSize, 0.88),
    'line-height': '1.6',
    'word-break': 'normal',
  }
}

/**
 * 由排版基线推导出完整的默认样式表。
 *
 * 两条贯穿始终的约定：
 *
 * 1. **关键属性在每个块级元素上重复写一遍**（font-size / line-height / color /
 *    text-align）。微信编辑器在粘贴时会重排 DOM，外层 section 上的继承并不可靠，
 *    重复声明是让样式稳定落地的唯一办法。
 * 2. **优先使用简单的文档流布局**：避免定位、浮动或变形造成视觉顺序与 DOM
 *    顺序不一致，减少粘贴重排和深色模式转换时的差异（结构规范 §4.2.2）。
 */
export function createStyles(b: ThemeBase): ThemeStyles {
  /** 正文继承的基础排版，供块级元素复用 */
  const inherited: StyleMap = {
    'font-size': b.fontSize,
    'line-height': b.lineHeight,
    color: b.textColor,
    'letter-spacing': b.letterSpacing,
  }

  const heading = (size: string, marginTop: string, marginBottom: string): StyleMap => ({
    'font-family': b.fontFamily,
    'font-size': size,
    'font-weight': b.headingWeight,
    'line-height': '1.8',
    color: b.headingColor,
    'text-align': b.headingAlign,
    margin: `${marginTop} 0 ${marginBottom}`,
  })

  return {
    container: {
      'font-family': b.fontFamily,
      'font-size': b.fontSize,
      'line-height': b.lineHeight,
      'letter-spacing': b.letterSpacing,
      color: b.textColor,
      'text-align': b.textAlign,
      'word-break': 'break-word',
      'overflow-wrap': 'break-word',
    },

    // ---- 标题 ----
    h1: heading(scalePx(b.fontSize, 1.3), '32px', '16px'),
    h2: heading(scalePx(b.fontSize, 1.18), '30px', '12px'),
    h3: { ...heading(scalePx(b.fontSize, 1.06), '26px', '10px'), 'text-align': 'left' },
    h4: {
      ...heading(b.fontSize, '22px', '10px'),
      'text-align': 'left',
      color: b.textColor,
    },
    h5: {
      ...heading(b.fontSize, '20px', '8px'),
      'text-align': 'left',
      color: b.textColor,
    },
    h6: {
      ...heading(scalePx(b.fontSize, 0.94), '20px', '8px'),
      'text-align': 'left',
      color: b.mutedColor,
    },

    // ---- 正文 ----
    p: {
      ...inherited,
      'text-align': b.textAlign,
      margin: b.paragraphMargin,
    },
    strong: { 'font-weight': b.boldWeight, color: 'inherit' },
    em: { 'font-style': 'italic' },
    del: { 'text-decoration': 'line-through', color: b.mutedColor },
    a: {
      color: b.linkColor,
      'text-decoration': 'none',
      'font-weight': b.boldWeight,
      'word-break': 'break-all',
    },
    // 行内代码刻意不给背景色。
    //
    // 微信的深色模式会中和块级元素（pre、表格单元格）上的背景，
    // 但**不会**处理行内元素上显式设置的背景——浅色底会原样留在深色正文里，
    // 变成一块刺眼的白斑。参考的公众号线上文章整篇正文的背景色用量是 0。
    // 靠等宽字体 + 强调色区分行内代码已经足够清楚。
    inlineCode: {
      'font-family': b.codeFontFamily,
      'font-size': '0.92em',
      color: b.accentColor,
      'word-break': 'break-all',
    },

    // ---- 引用 ----
    blockquote: {
      margin: b.blockMargin,
      padding: '12px 16px',
      'border-left': `4px solid ${b.accentColor}`,
      background: b.surfaceColor,
      'border-radius': '0 4px 4px 0',
      color: b.mutedColor,
    },
    blockquoteP: {
      'font-size': b.fontSize,
      'line-height': b.lineHeight,
      'letter-spacing': b.letterSpacing,
      color: 'inherit',
      'text-align': b.textAlign,
      margin: '0',
    },

    // ---- 列表 ----
    ul: {
      margin: b.blockMargin,
      'padding-left': '1.4em',
      'list-style-type': 'disc',
      'list-style-position': 'outside',
      color: b.textColor,
    },
    ol: {
      margin: b.blockMargin,
      'padding-left': '1.4em',
      'list-style-type': 'decimal',
      'list-style-position': 'outside',
      color: b.textColor,
    },
    li: {
      ...inherited,
      'text-align': b.textAlign,
      margin: '0 0 8px',
    },
    // li 里包裹行内内容的 section。微信粘贴时会重排 li 的内部结构，
    // 不能指望继承，排版属性在这里再写一遍。
    listItemContent: {
      ...inherited,
      'text-align': b.textAlign,
      margin: '0',
    },

    // ---- 分隔线 / 换行 ----
    hr: {
      border: 'none',
      'border-top': `1px solid ${b.borderColor}`,
      height: '1px',
      margin: '32px 0',
    },
    br: {},

    // ---- 图片 ----
    figure: { margin: b.blockMargin, 'text-align': 'center' },
    img: {
      'max-width': '100%',
      height: 'auto',
      display: 'block',
      margin: '0 auto',
      'border-radius': '4px',
    },
    figcaption: {
      'font-size': scalePx(b.fontSize, 0.82),
      color: b.mutedColor,
      'text-align': 'center',
      'line-height': '1.6',
      margin: '8px 0 0',
    },

    // ---- 代码块 ----
    //
    // 微信正文样式表里有一条针对所有元素的强制规则：
    //
    //   .rich_media_content * {
    //     max-width: 100% !important;
    //     box-sizing: border-box !important;
    //     word-wrap: break-word !important;
    //   }
    //
    // 这些是之前阅读页中观察到的限制，并非粘贴白名单的完整约定。
    // 行内 !important 用于抵抗样式覆盖，但清洗器是否保留取决于微信端。
    // 每行一个块级 code 保持换行；pre 自身提供横向滚动（结构规范 §1.8）。
    // data-ignore-width 只影响宽度检测，不会修改计算样式或自动开启滚动。
    preWrap: {
      margin: b.blockMargin,
      'overflow-x': 'auto',
      '-webkit-overflow-scrolling': 'touch',
      'border-radius': '6px',
    },
    pre: {
      margin: '0',
      padding: '16px',
      'border-radius': '6px',
      'font-size': b.codeFontSize,
      'line-height': b.codeLineHeight,
      'white-space': 'pre !important',
      'word-wrap': 'normal !important',
      'word-break': 'normal !important',
      'max-width': 'none !important',
      'overflow-x': 'auto',
      '-webkit-overflow-scrolling': 'touch',
      'letter-spacing': '0',
      'text-align': 'left',
    },
    // 每个源码行一个块级 code（与微信原生代码块同构），换行由结构表达，不依赖 \n 字符。
    // 不强制内容宽度；超长的行由 pre 的横向滚动承接。
    codeLine: {
      'font-family': b.codeFontFamily,
      'font-size': b.codeFontSize,
      'line-height': b.codeLineHeight,
      'white-space': 'pre !important',
      'word-wrap': 'normal !important',
      'word-break': 'normal !important',
      'max-width': 'none !important',
      display: 'block',
      background: 'none',
      padding: '0',
      margin: '0',
      'letter-spacing': '0',
    },

    // ---- 表格 ----
    tableWrap: { margin: b.blockMargin, 'overflow-x': 'auto' },
    table: {
      width: '100%',
      'border-collapse': 'collapse',
      'font-size': scalePx(b.fontSize, 0.88),
      'line-height': '1.6',
      'text-align': 'left',
      'letter-spacing': '0',
    },
    thead: {},
    tbody: {},
    tr: {},
    // 单元格必须显式 word-break: normal。
    // break-word 等价于 overflow-wrap: anywhere，会参与 min-content 计算，把每个
    // 单元格的最小宽度缩到一个字符；自动表格布局随即把宽度让给长文本列，短列
    // 被压成一字一行。正文容器上的 break-word 会继承下来，所以这里要挡住。
    // （微信强制的是 word-wrap: break-word，它不影响 min-content，不碍事。）
    //
    // 表头不加底色、颜色同内容：浅色底在微信深色模式下会变成一整条灰白块。
    // 只保留加粗作为表头标识。
    th: {
      ...tableCell(b),
      'font-weight': b.boldWeight,
      'text-align': 'left',
    },
    td: tableCell(b),

    // ---- 链接脚注 ----
    sup: {
      'font-size': '0.72em',
      color: b.linkColor,
      'vertical-align': 'super',
      'line-height': '0',
      margin: '0 2px',
    },
    footnoteSection: {
      margin: '32px 0 0',
      'padding-top': '16px',
      'border-top': `1px solid ${b.borderColor}`,
    },
    footnoteTitle: {
      'font-size': scalePx(b.fontSize, 0.94),
      'font-weight': b.boldWeight,
      color: b.headingColor,
      'text-align': 'left',
      margin: '0 0 12px',
    },
    footnoteItem: {
      'font-size': scalePx(b.fontSize, 0.82),
      'line-height': '1.7',
      color: b.mutedColor,
      'text-align': 'left',
      margin: '0 0 8px',
      'word-break': 'break-all',
    },
    footnoteIndex: { color: b.linkColor },
    footnoteUrl: { color: b.mutedColor },

    // GFM 任务列表：微信会清掉 <input>，所以渲染成字符标记
    taskMarker: { color: b.accentColor, 'margin-right': '4px' },
  }
}
