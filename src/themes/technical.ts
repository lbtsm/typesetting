import type { ThemeDefinition } from '../types/theme'
import { scalePx } from './tokens'

/**
 * 技术：标题挂一条强调色竖条，代码块用 One Dark。
 * 适合源码剖析、协议解析这类代码占比高的文章。
 */
export const technicalTheme: ThemeDefinition = {
  id: 'technical',
  name: '技术',
  description: '标题带强调色竖条，深色代码块，适合代码密集的源码/协议类文章',
  base: {
    fontSize: '16px',
    textColor: '#2f3337',
    headingColor: '#111827',
    linkColor: '#0969da',
    accentColor: '#2f81f7',
    borderColor: '#d8dee4',
    surfaceColor: '#f3f5f7',
    boldWeight: '700',
    headingWeight: '700',
    headingAlign: 'left',
    textAlign: 'left',
    letterSpacing: '0.02em',
    paragraphMargin: '0 0 18px',
    codeTheme: 'one-dark-pro',
  },
  overrides: (b) => ({
    h1: {
      'font-size': scalePx(b.fontSize, 1.5),
      'text-align': 'center',
      margin: '0 0 26px',
    },
    h2: {
      'font-size': scalePx(b.fontSize, 1.25),
      'border-left': `4px solid ${b.accentColor}`,
      'padding-left': '12px',
      margin: '32px 0 16px',
    },
    h3: {
      'font-size': scalePx(b.fontSize, 1.1),
      color: b.accentColor,
      margin: '24px 0 12px',
    },
    inlineCode: {
      background: 'rgba(47, 129, 247, 0.1)',
      color: '#0969da',
    },
    blockquote: {
      'border-left': `4px solid ${b.accentColor}`,
      background: 'rgba(47, 129, 247, 0.06)',
      color: '#4b5563',
    },  }),
}
