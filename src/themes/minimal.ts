import type { ThemeDefinition } from '../types/theme'
import { scalePx } from './tokens'

/**
 * 极简：加大行高与段距，窄字号，适合长文慢读。
 * 标题不用颜色，仅靠字重与大留白拉开层级。
 */
export const minimalTheme: ThemeDefinition = {
  id: 'minimal',
  name: '极简',
  description: '大行高大段距，窄排版，适合长篇阅读',
  base: {
    fontSize: '16px',
    lineHeight: '2',
    textColor: '#4a4a4a',
    headingColor: '#222222',
    linkColor: '#8a6d3b',
    accentColor: '#c0a062',
    borderColor: '#ececec',
    mutedColor: '#a0a0a0',
    surfaceColor: '#fafafa',
    boldWeight: '600',
    headingWeight: '600',
    headingAlign: 'center',
    textAlign: 'justify',
    letterSpacing: '0.05em',
    paragraphMargin: '0 0 28px',
    blockMargin: '32px 0',
    codeTheme: 'min-light',
  },
  overrides: (b) => ({
    h1: { 'font-size': scalePx(b.fontSize, 1.4), margin: '0 0 32px' },
    h2: { 'font-size': scalePx(b.fontSize, 1.15), margin: '40px 0 16px' },
    h3: { 'font-size': b.fontSize, 'text-align': 'center', margin: '32px 0 14px' },
    hr: {
      border: 'none',
      'border-top': `1px solid ${b.borderColor}`,
      height: '1px',
      margin: '48px 0',
    },
    blockquote: {
      'border-left': `2px solid ${b.accentColor}`,
      background: 'none',
      padding: '2px 0 2px 18px',
      'border-radius': '0',
      color: '#8c8c8c',
    },
    // 半透明底，深色模式下不会留白斑
    inlineCode: { background: 'rgba(192, 160, 98, 0.16)', color: '#8a6d3b' },
  }),
}
