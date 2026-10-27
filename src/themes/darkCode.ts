import type { ThemeDefinition } from '../types/theme'
import { scalePx } from './tokens'

/**
 * 深色代码：正文仍为浅色（微信正文背景无法改成深色），
 * 但代码块、行内代码、引用块统一走深色调，突出代码。
 */
export const darkCodeTheme: ThemeDefinition = {
  id: 'dark-code',
  name: '深色代码',
  description: '正文浅底 + 深色代码块与引用块，代码视觉权重最高',
  base: {
    fontSize: '16px',
    textColor: '#3c4043',
    headingColor: '#1b1f23',
    linkColor: '#d97706',
    accentColor: '#f59e0b',
    borderColor: '#dcdfe4',
    mutedColor: '#8b949e',
    surfaceColor: '#f5f5f4',
    boldWeight: '700',
    headingWeight: '700',
    headingAlign: 'left',
    textAlign: 'left',
    letterSpacing: '0.02em',
    paragraphMargin: '0 0 18px',
    codeTheme: 'vitesse-dark',
  },
  overrides: (b) => ({
    h1: { 'font-size': scalePx(b.fontSize, 1.5), 'text-align': 'center', margin: '0 0 26px' },
    h2: {
      'font-size': scalePx(b.fontSize, 1.24),
      'border-bottom': `2px solid ${b.accentColor}`,
      'padding-bottom': '6px',
      margin: '32px 0 16px',
    },
    h3: { 'font-size': scalePx(b.fontSize, 1.08), margin: '24px 0 12px' },
    inlineCode: { background: '#1b1e28', color: '#e5c07b' },
    blockquote: {
      'border-left': `4px solid ${b.accentColor}`,
      background: '#22262f',
      color: '#c9d1d9',
      'border-radius': '0 6px 6px 0',
    },
  }),
}
