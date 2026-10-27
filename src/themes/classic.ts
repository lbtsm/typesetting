import type { ThemeDefinition } from '../types/theme'
import { scalePx } from './tokens'

/**
 * 默认：16px / 1.8 / #3f3f3f 的通用技术文排版。
 * 标题左对齐，二级标题带一条下划线，层级一眼可辨但不花哨。
 */
export const classicTheme: ThemeDefinition = {
  id: 'classic',
  name: '默认',
  description: '16px / 1.8 / #3f3f3f，标题左对齐带分隔线，适合大多数技术文章',
  base: {
    fontSize: '16px',
    textColor: '#3f3f3f',
    headingColor: '#1f2328',
    linkColor: '#576b95',
    accentColor: '#576b95',
    boldWeight: '700',
    headingWeight: '700',
    headingAlign: 'left',
    textAlign: 'left',
    letterSpacing: '0.02em',
    paragraphMargin: '0 0 16px',
    blockMargin: '20px 0',
  },
  overrides: (b) => ({
    h1: {
      'font-size': scalePx(b.fontSize, 1.5),
      'text-align': 'center',
      margin: '0 0 24px',
    },
    h2: {
      'font-size': scalePx(b.fontSize, 1.25),
      'border-bottom': `1px solid ${b.borderColor}`,
      'padding-bottom': '8px',
      margin: '32px 0 16px',
    },
    h3: { 'font-size': scalePx(b.fontSize, 1.1), margin: '24px 0 12px' },
  }),
}
