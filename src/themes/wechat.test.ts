import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../markdown/pipeline'
import { resolveTheme } from './index'
import { WECHAT_FONT_FAMILY } from './tokens'

/**
 * 「公众号原味」主题与微信线上文章的参数对齐测试。
 *
 * 基准取自 mp.weixin.qq.com 一篇真实文章的 DOM：
 *   正文   font-size:17px; line-height:1.8; color:rgba(0,0,0,0.9);
 *          text-align:justify; margin-bottom:24px; font-weight:400
 *   小标题 font-size:20px; font-weight:500; color:#2B77BF; text-align:center
 *   加粗   font-weight:500
 *   图注   color:rgb(136,136,136)
 *   字体   .wx-root 的字体栈
 *   正文没有设 letter-spacing
 *
 * 这组值是用户明确要求「保持一致」的硬指标，所以单独立一个测试锁住，
 * 以后调主题时谁改坏了会立刻红。
 */
describe('公众号原味主题', () => {
  const theme = resolveTheme('wechat')

  it('字体栈与公众号阅读页一致', () => {
    expect(theme.base.fontFamily).toBe(WECHAT_FONT_FAMILY)
    expect(theme.base.fontFamily).toContain('PingFang SC')
    expect(theme.base.fontFamily).toContain('Microsoft YaHei')
    expect(theme.base.fontFamily).toContain('Hiragino Sans GB')
  })

  it('正文排版参数与线上文章逐项一致', () => {
    expect(theme.styles.p['font-size']).toBe('17px')
    expect(theme.styles.p['line-height']).toBe('1.8')
    expect(theme.styles.p.color).toBe('rgba(0, 0, 0, 0.9)')
    expect(theme.styles.p['text-align']).toBe('justify')
    expect(theme.styles.p.margin).toBe('0 0 24px')
    // 线上文章正文没有 letter-spacing
    expect(theme.styles.p['letter-spacing']).toBe('normal')
  })

  it('小标题为 20px / 500 / #2B77BF / 居中', () => {
    expect(theme.styles.h2['font-size']).toBe('20px')
    expect(theme.styles.h2['font-weight']).toBe('500')
    expect(theme.styles.h2.color).toBe('#2b77bf')
    expect(theme.styles.h2['text-align']).toBe('center')
    expect(theme.styles.h2['line-height']).toBe('1.8')
  })

  it('加粗字重是 500 而不是 700', () => {
    expect(theme.styles.strong['font-weight']).toBe('500')
  })

  it('图注用 #888888', () => {
    expect(theme.styles.figcaption.color).toBe('#888888')
  })

  /**
   * 微信深色模式会中和块级元素的背景，但不碰行内元素上显式设置的背景，
   * 浅色底会原样留在深色正文里变成白斑。参考文章整篇正文的背景色用量是 0。
   */
  it('行内代码不带背景色，只靠等宽字体 + 强调色区分', () => {
    expect(theme.styles.inlineCode.background).toBeUndefined()
    expect(theme.styles.inlineCode.padding).toBeUndefined()
    expect(theme.styles.inlineCode['border-radius']).toBeUndefined()
    expect(theme.styles.inlineCode['font-family']).toContain('monospace')
    expect(theme.styles.inlineCode.color).toBe('#2b77bf')

    const { html } = renderMarkdown('应用 `Read()` 比较慢', {
      theme,
      linkMode: 'both',
      autoSpace: true,
      imageCaption: true,
      hideHorizontalRule: true,
      footnoteTitle: '参考资料',
      withLineMarkers: false,
    })
    const inlineCode = /<code style="([^"]*)">Read\(\)<\/code>/.exec(html)?.[1] ?? ''
    expect(inlineCode).not.toContain('background')
    expect(inlineCode).toContain('color: #2b77bf')
  })

  it('渲染产物里这些值确实落到了 style 属性上', () => {
    const { html } = renderMarkdown('## 小标题\n\n正文**加粗**。', {
      theme,
      linkMode: 'both',
      autoSpace: true,
      imageCaption: true,
      hideHorizontalRule: true,
      footnoteTitle: '参考资料',
      withLineMarkers: false,
    })
    expect(html).toContain('font-size: 20px; font-weight: 500')
    expect(html).toContain('color: #2b77bf')
    expect(html).toContain('<strong style="font-weight: 500')
    expect(html).toContain('font-size: 17px; line-height: 1.8; color: rgba(0, 0, 0, 0.9)')
  })
})
