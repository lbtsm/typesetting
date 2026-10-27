import type { ThemeDefinition } from '../types/theme'
import { scalePx } from './tokens'

/**
 * 简洁：只有黑白灰，靠字号与留白区分层级，不用任何色块和边框装饰。
 */
export const simpleTheme: ThemeDefinition = {
  id: 'simple',
  name: '简洁',
  description: '纯黑白灰，靠字号和留白区分层级，零色块装饰',
  base: {
    fontSize: '16px',
    textColor: '#333333',
    headingColor: '#111111',
    linkColor: '#111111',
    accentColor: '#999999',
    borderColor: '#e0e0e0',
    mutedColor: '#9a9a9a',
    surfaceColor: '#f6f6f6',
    boldWeight: '600',
    headingWeight: '600',
    headingAlign: 'left',
    textAlign: 'left',
    letterSpacing: '0.02em',
    paragraphMargin: '0 0 18px',
    codeTheme: 'min-light',
  },
  overrides: (b) => ({
    h1: { 'font-size': scalePx(b.fontSize, 1.5), 'text-align': 'center', margin: '0 0 28px' },
    h2: { 'font-size': scalePx(b.fontSize, 1.22), margin: '34px 0 14px' },
    h3: { 'font-size': scalePx(b.fontSize, 1.08), margin: '26px 0 12px' },
    a: { 'text-decoration': 'underline', 'font-weight': '400' },
    blockquote: {
      'border-left': '2px solid #d0d0d0',
      background: 'none',
      padding: '2px 0 2px 16px',
      'border-radius': '0',
      color: '#777777',
    },
    // 用半透明底而不是实色：深色模式下它只是淡淡一层，不会变成白斑
    inlineCode: { background: 'rgba(0, 0, 0, 0.06)', color: '#111111' },  }),
}
