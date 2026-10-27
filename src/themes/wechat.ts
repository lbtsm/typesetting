import type { ThemeDefinition } from '../types/theme'

/**
 * 公众号原味：一比一复刻微信公众号线上文章的正文排版。
 *
 * 参数直接取自 mp.weixin.qq.com 的文章 DOM：
 *   正文   17px / 1.8 / rgba(0,0,0,0.9) / justify / margin-bottom 24px
 *   小标题 20px / 500 / #2B77BF / center
 *   加粗   font-weight: 500（微信编辑器的「加粗」就是 500，不是 700）
 *   图注   #888888
 * 这些值已经是 DEFAULT_BASE 的内容，所以这里只需要补标题的细节。
 */
export const wechatTheme: ThemeDefinition = {
  id: 'wechat',
  name: '公众号原味',
  description: '完全对齐微信线上文章的字体、字号与段距，粘贴后几乎零差异',
  overrides: (b) => ({
    // 微信编辑器里的「小标题」是 20px/500/#2B77BF/居中，对应 Markdown 的 ##
    h2: {
      'font-size': '20px',
      'font-weight': '500',
      'line-height': '1.8',
      color: b.headingColor,
      'text-align': 'center',
      margin: '30px 0 12px',
    },
    h1: {
      'font-size': '22px',
      'font-weight': '600',
      'line-height': '1.8',
      color: b.headingColor,
      'text-align': 'center',
      margin: '0 0 20px',
    },
    h3: {
      'font-size': '18px',
      'font-weight': '500',
      'line-height': '1.8',
      color: b.headingColor,
      'text-align': 'left',
      margin: '26px 0 10px',
    },
    // 微信默认引用块没有背景，只有一条浅灰竖线
    blockquote: {
      margin: '24px 0',
      padding: '4px 0 4px 14px',
      'border-left': '3px solid #dbdbdb',
      background: 'none',
      'border-radius': '0',
      color: '#888888',
    },
  }),
}
