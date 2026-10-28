import type { StyleMap, ThemeBase } from '../types/theme'

/**
 * 微信文章结构规范 §3 的默认字体栈（2026-10-28 核对）。
 * 本地预览显式使用同一顺序；mp-quote 不可用时由系统字体回退。
 * 代码块另用等宽字体，避免破坏源码与字符图的对齐。
 */
export const WECHAT_FONT_FAMILY =
  '"mp-quote", "PingFang SC", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", ' +
  '"Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif'

/** 等宽字体栈，优先 macOS / Windows 上程序员常装的字体。 */
export const MONO_FONT_FAMILY =
  '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, "Cascadia Mono", ' +
  '"Liberation Mono", "Courier New", monospace'

/**
 * 默认排版基线，取自用户参考文章（不是微信强制的排版值）：
 * 17px / 1.8 / rgba(0,0,0,0.9) / 两端对齐 / 段距 24px。
 */
export const DEFAULT_BASE: ThemeBase = {
  fontFamily: WECHAT_FONT_FAMILY,
  codeFontFamily: MONO_FONT_FAMILY,
  fontSize: '17px',
  lineHeight: '1.8',
  // 线上公众号文章正文并没有设 letter-spacing，显式写 normal 既对齐原文，
  // 又能挡掉微信模板可能带来的继承值
  letterSpacing: 'normal',
  textAlign: 'justify',
  boldWeight: '500',
  headingWeight: '500',
  headingAlign: 'center',
  textColor: 'rgba(0, 0, 0, 0.9)',
  headingColor: '#2b77bf',
  linkColor: '#2b77bf',
  accentColor: '#2b77bf',
  borderColor: '#e5e7eb',
  mutedColor: '#888888',
  surfaceColor: '#f7f8fa',
  paragraphMargin: '0 0 24px',
  blockMargin: '24px 0',
  codeFontSize: '14px',
  codeLineHeight: '1.7',
  codeTheme: 'github-light',
}

/** 把 '17px' 这类长度按比例缩放，保留一位小数并去掉多余的 .0。 */
export function scalePx(size: string, factor: number): string {
  const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(size.trim())
  if (!match) return size
  const value = Number(match[1])
  if (!Number.isFinite(value)) return size
  const scaled = Math.round(value * factor * 10) / 10
  return `${scaled}${match[2] || ''}`
}

/** 把 StyleMap 序列化成 inline style 字符串。空值会被跳过。 */
export function serializeStyle(style: StyleMap): string {
  return Object.entries(style)
    .filter(([, value]) => value !== '' && value != null)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ')
}
