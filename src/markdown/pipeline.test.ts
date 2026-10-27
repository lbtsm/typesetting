import { beforeAll, describe, expect, it } from 'vitest'
import { resolveTheme } from '../themes'
import { ensureLanguages, initHighlighter } from './highlight'
import { renderMarkdown, type RenderOptions } from './pipeline'

/** 需求文档「二十三、验收标准」里给出的样例文章 */
const SAMPLE = `# TCP 为什么需要拥塞控制？

想象一个千兆网卡的服务器，给一个正在忙别的事、处理很慢的客户端发数据。

服务器噼里啪啦发过去，客户端的接收缓冲区很快就满了。

**后面的数据只能被丢弃**，然后触发重传。

所谓"连接"，纯粹是通信双方各自在内存里记的一本账。

[查看完整文章](https://example.com)

## 为什么需要拥塞控制？

- 防止网络拥塞
- 减少丢包
- 提高网络利用率

> 网络通信并不是一根线。

### Go 示例

\`\`\`go
func main() {
    fmt.Println("hello")
}
\`\`\`

### 表格

| API | Description |
| --- | --- |
| GET | 获取数据 |
| POST | 创建数据 |
`

function options(patch: Partial<RenderOptions> = {}): RenderOptions {
  return {
    theme: resolveTheme('wechat'),
    linkMode: 'both',
    autoSpace: true,
    imageCaption: true,
    // 与 DEFAULT_SETTINGS 保持一致：分割线默认不输出到正文
    hideHorizontalRule: true,
    footnoteTitle: '参考资料',
    withLineMarkers: false,
    ...patch,
  }
}

/**
 * 示例文章的渲染结果。必须在 beforeAll 里生成：
 * shiki 是异步初始化的，在 describe 体里直接渲染会赶在高亮器就绪之前。
 */
let html = ''

beforeAll(async () => {
  await initHighlighter()
  await ensureLanguages(['go'])
  html = renderMarkdown(SAMPLE, options()).html
})

describe('渲染管线', () => {
  it('根节点是带完整正文样式的 section', () => {
    expect(html.startsWith('<section style="')).toBe(true)
    expect(html).toContain('font-family: system-ui')
    expect(html).toContain('font-size: 17px')
    expect(html).toContain('line-height: 1.8')
    expect(html).toContain('color: rgba(0, 0, 0, 0.9)')
  })

  it('标题层级被正确解析且各自带样式', () => {
    expect(html).toMatch(/<h1 style="[^"]*font-size: 22px/)
    expect(html).toMatch(/<h2 style="[^"]*font-size: 20px/)
    expect(html).toMatch(/<h3 style="[^"]*font-size: 18px/)
    expect(html).toContain('TCP 为什么需要拥塞控制？')
  })

  it('粗体渲染为 strong 且字重与微信一致（500）', () => {
    expect(html).toMatch(/<strong style="font-weight: 500[^"]*">后面的数据只能被丢弃<\/strong>/)
  })

  it('链接显示文字而非 URL，且 href 可点', () => {
    expect(html).toContain('>查看完整文章</a>')
    expect(html).toContain('<a href="https://example.com"')
    // 正文里不应该出现裸 URL 文本（文末脚注区除外）
    const body = html.slice(0, html.indexOf('参考资料'))
    expect(body).not.toContain('>https://example.com<')
  })

  it('自动生成文末脚注', () => {
    expect(html).toContain('参考资料')
    expect(html).toContain('[1] ')
    expect(html).toContain('查看完整文章: ')
    expect(html).toMatch(/<sup style="[^"]*">\[1\]<\/sup>/)
  })

  it('列表与引用正常', () => {
    expect(html).toMatch(/<ul style="[^"]*list-style-type: disc/)
    expect(html).toContain('防止网络拥塞')
    expect(html).toMatch(/<blockquote style="[^"]*border-left/)
    expect(html).toContain('网络通信并不是一根线。')
  })

  it('代码块是 pre > code 结构、带横向滚动外壳与高亮', () => {
    expect(html).toMatch(/<section style="[^"]*"><pre style="[^"]*"><code style="[^"]*">/)
    expect(html).toContain('overflow-x: auto')
    expect(html).toContain('white-space: pre')
    // shiki 的 token 颜色是内联的
    expect(html).toMatch(/<span style="color: #[0-9A-Fa-f]{3,8}">func<\/span>/)
    expect(html).toContain('fmt.')
    expect(html).not.toContain('<iframe')
  })

  it('表格带边框、表头加粗并可横向滚动', () => {
    expect(html).toMatch(/<table style="[^"]*border-collapse: collapse/)
    // 表头只靠加粗区分，不加底色（深色模式下浅色底会变成灰白块）
    expect(html).toMatch(/<th style="[^"]*font-weight: 500/)
    expect(html).toMatch(/<td style="[^"]*border:/)
    expect(html).toContain('获取数据')
  })

  it('中英文之间自动补空格', () => {
    const { html: spaced } = renderMarkdown('使用Go语言写了3个服务', options())
    expect(spaced).toContain('使用 Go 语言写了 3 个服务')
  })

  it('关闭自动空格时保持原样', () => {
    const { html: raw } = renderMarkdown('使用Go语言', options({ autoSpace: false }))
    expect(raw).toContain('使用Go语言')
  })

  it('所有 class 属性都被清除（微信不认 class）', () => {
    expect(html).not.toContain('class=')
  })

  it('不注入 data-line 时输出里没有行号属性', () => {
    expect(html).not.toContain('data-line')
    const { html: preview } = renderMarkdown(SAMPLE, options({ withLineMarkers: true }))
    expect(preview).toContain('data-line')
  })
})

describe('图片', () => {
  it('独占一段的图片生成居中图块与图注', () => {
    const { html: out } = renderMarkdown('![一张示意图](https://example.com/a.png)', options())
    expect(out).toMatch(/<img src="https:\/\/example\.com\/a\.png"[^>]*style="[^"]*max-width: 100%/)
    expect(out).toContain('height: auto')
    expect(out).toContain('一张示意图')
  })

  it('关闭图注时不输出说明文字', () => {
    const { html: out } = renderMarkdown(
      '![一张示意图](https://example.com/a.png)',
      options({ imageCaption: false }),
    )
    expect(out).toContain('<img')
    expect(out).not.toContain('>一张示意图<')
  })
})

describe('链接策略', () => {
  const md = '[文档](https://example.com/docs)'

  it('inline 模式只保留链接、不生成脚注', () => {
    const { html: out, footnotes } = renderMarkdown(md, options({ linkMode: 'inline' }))
    expect(out).toContain('<a href="https://example.com/docs"')
    expect(footnotes).toHaveLength(0)
  })

  it('footnote 模式去掉 href 只留文字与序号', () => {
    const { html: out, footnotes } = renderMarkdown(md, options({ linkMode: 'footnote' }))
    expect(out).not.toContain('<a href')
    expect(out).toContain('文档')
    expect(footnotes).toHaveLength(1)
  })

  it('text 模式彻底去掉链接', () => {
    const { html: out, footnotes } = renderMarkdown(md, options({ linkMode: 'text' }))
    expect(out).not.toContain('<a href')
    expect(out).not.toContain('<sup')
    expect(footnotes).toHaveLength(0)
  })

  it('相同 URL 只占一个脚注编号', () => {
    const { footnotes } = renderMarkdown('[A](https://a.com) [B](https://a.com)', options())
    expect(footnotes).toHaveLength(1)
  })

  it('微信站内链接不进脚注', () => {
    const { html: out, footnotes } = renderMarkdown(
      '[上一篇](https://mp.weixin.qq.com/s/abc)',
      options(),
    )
    expect(out).toContain('<a href="https://mp.weixin.qq.com/s/abc"')
    expect(footnotes).toHaveLength(0)
  })
})

describe('XSS 防护（端到端）', () => {
  it('Markdown 里的裸 HTML 被丢弃', () => {
    const { html: out } = renderMarkdown(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n正常文字',
      options(),
    )
    expect(out).not.toContain('<script')
    expect(out).not.toContain('onerror')
    expect(out).toContain('正常文字')
  })

  it('危险协议的链接降级为纯文本且不保留 URL', () => {
    const { html: out } = renderMarkdown('[点我](javascript:alert(1))', options())
    expect(out).not.toContain('javascript:')
    expect(out).toContain('点我')
  })

  it('危险协议的图片被整体丢弃', () => {
    const { html: out } = renderMarkdown('![x](javascript:alert(1))', options())
    expect(out).not.toContain('<img')
    expect(out).not.toContain('javascript:')
  })

  it('输出里不会出现事件处理器属性', () => {
    const { html: out } = renderMarkdown(SAMPLE, options())
    expect(out).not.toMatch(/\son[a-z]+=/i)
  })
})

/**
 * 回归：`- **好记**:没人愿意背…` 粘到微信后，「好记」独占一行，冒号后的文字掉到下一行。
 *
 * 微信编辑器粘贴时要求 <li> 里是块级容器；遇到「元素开头 + 裸文本」的混排，
 * 会把开头的 <strong> 单独提成一段。所以行内内容必须先包进一个 <section>。
 */
/**
 * 回归：TTL 表格第一列在手机上被挤成一字一行（T/T/L、(6/0s/)）。
 *
 * 根因是 word-break: break-word——它等价于 overflow-wrap: anywhere，会参与
 * min-content 计算，把每个单元格的最小宽度缩到一个字符；自动表格布局再把
 * 宽度让给长文本列，短列就被压扁。正文容器上也有这条声明且 word-break 可继承，
 * 所以单元格必须显式写 normal 挡住。
 */
describe('表格单元格', () => {
  const md = '| TTL | 好处 |\n|---|---|\n| **短**(60s) | 改 IP 后几分钟就全网生效 |'
  const cellStyles = (html: string, tag: 'th' | 'td') =>
    Array.from(html.matchAll(new RegExp(`<${tag} style="([^"]*)"`, 'g')), (m) => m[1])

  it('单元格不会在任意字符处断开', () => {
    const { html: out } = renderMarkdown(md, options())
    for (const style of [...cellStyles(out, 'th'), ...cellStyles(out, 'td')]) {
      expect(style).toContain('word-break: normal')
      expect(style).not.toContain('break-word')
      expect(style).not.toContain('break-all')
    }
  })

  it('表头没有底色，颜色与内容单元格一致', () => {
    const { html: out } = renderMarkdown(md, options())
    const [th] = cellStyles(out, 'th')
    const [td] = cellStyles(out, 'td')
    expect(th).not.toContain('background')
    const colorOf = (style: string) => /(?:^|; )color: ([^;]+)/.exec(style)?.[1]
    expect(colorOf(th)).toBe(colorOf(td))
  })

  it('所有主题的表头都不带底色', () => {
    for (const id of ['wechat', 'classic', 'technical', 'simple', 'minimal', 'dark-code']) {
      const { html: out } = renderMarkdown(md, options({ theme: resolveTheme(id) }))
      expect(cellStyles(out, 'th')[0], id).not.toContain('background')
    }
  })
})

describe('列表项包裹', () => {
  const strip = (html: string) => html.replace(/ style="[^"]*"/g, '')

  it('行内内容整体包进 section，粗体与后续文字留在同一块里', () => {
    const { html: out } = renderMarkdown('- **好记**:没人愿意背 `140.82.121.4`。', options())
    expect(strip(out)).toContain(
      '<li><section><strong>好记</strong>:没人愿意背 <code>140.82.121.4</code>。</section></li>',
    )
  })

  it('section 带正文排版样式，不依赖 li 的继承', () => {
    const { html: out } = renderMarkdown('- 一项', options())
    expect(out).toMatch(/<li style="[^"]*"><section style="[^"]*font-size: 17px[^"]*line-height: 1.8/)
  })

  it('嵌套列表保持块级，不被包进 section', () => {
    const { html: out } = renderMarkdown('- 父项\n  - 子项', options())
    const s = strip(out)
    expect(s).toMatch(/<li><section>父项<\/section>\s*<ul>/)
    expect(s).toContain('<li><section>子项</section></li>')
  })

  it('有序列表与任务列表同样处理', () => {
    expect(strip(renderMarkdown('1. **一**:说明', options()).html)).toContain(
      '<li><section><strong>一</strong>:说明</section></li>',
    )
    const task = strip(renderMarkdown('- [x] **完成**:说明', options()).html)
    expect(task).toContain('<li><section><span>☑</span> <strong>完成</strong>:说明</section></li>')
  })

  it('松散列表里的多个段落保留原有 p，不再额外包裹', () => {
    const s = strip(renderMarkdown('- 第一段\n\n  第二段', options()).html)
    expect(s).toMatch(/<li>\s*<p>第一段<\/p>\s*<p>第二段<\/p>\s*<\/li>/)
  })
})

describe('GFM 扩展', () => {
  it('删除线', () => {
    const { html: out } = renderMarkdown('~~废弃~~', options())
    expect(out).toMatch(/<del style="[^"]*line-through/)
  })

  it('行内代码走等宽字体 + 强调色，且不带背景色', () => {
    const { html: out } = renderMarkdown('`inline` 文本', options())
    const style = /<code style="([^"]*)">inline<\/code>/.exec(out)?.[1] ?? ''
    expect(style).toContain('monospace')
    expect(style).toContain('color: #2b77bf')
    // 深色模式下行内元素的浅色底会变成白斑，所以一律不给背景
    expect(style).not.toContain('background')
    expect(out).not.toContain('<pre')
  })

  it('任务列表换成字符标记（微信会清掉 input）', () => {
    const { html: out } = renderMarkdown('- [x] 已完成\n- [ ] 未完成', options())
    expect(out).not.toContain('<input')
    expect(out).toContain('☑')
    expect(out).toContain('☐')
  })

  it('分割线默认隐藏，上下文字保留', () => {
    for (const marker of ['---', '----', '***', '___']) {
      const { html: out } = renderMarkdown(`上\n\n${marker}\n\n下`, options())
      expect(out, marker).not.toContain('<hr')
      expect(out, marker).toContain('上')
      expect(out, marker).toContain('下')
    }
  })

  it('关掉隐藏后分割线正常输出', () => {
    const { html: out } = renderMarkdown(
      '上\n\n---\n\n下',
      options({ hideHorizontalRule: false }),
    )
    expect(out).toMatch(/<hr style="[^"]*border-top/)
  })

  it('紧跟文字的 ---- 是 setext 二级标题，不受隐藏分割线影响', () => {
    const { html: out } = renderMarkdown('这是标题\n----\n\n正文', options())
    expect(out).toMatch(/<h2 style="[^"]*">这是标题<\/h2>/)
    expect(out).not.toContain('<hr')
  })
})

/**
 * 回归：没写语言的代码块在微信手机端显示错乱，写了 ```go 的正常。
 *
 * 根因是 shiki 对 plaintext 不上色，产出的是 `<span>` 这种一个属性都没有的裸标签，
 * 而带语言时每段文本都包在 `<span style="color:…">` 里。微信粘贴时会清掉无样式的
 * 行内标签，连带把 ASCII 图依赖的连续空格折叠掉。
 *
 * 所以要求：两种围栏产出的结构必须一致，且代码块里不允许出现无属性标签。
 */
describe('代码块结构一致性', () => {
  const ART = '  已收到      空闲\n\n ┌────┬────┐\n │ ██ │    │\n └────┴────┘'

  const fences = {
    '无语言': '```\n' + ART + '\n```',
    'go': '```go\n' + ART + '\n```',
    '显式 text': '```text\n' + ART + '\n```',
    '未知语言': '```不存在的语言\n' + ART + '\n```',
  }

  for (const [label, md] of Object.entries(fences)) {
    it(`${label}：不出现无属性的裸标签`, () => {
      const { html: out } = renderMarkdown(md, options())
      expect(out).not.toContain('<span>')
      expect(out).not.toContain('<code>')
      expect(out).not.toContain('<pre>')
    })

    it(`${label}：每行文本都带显式颜色`, () => {
      const { html: out } = renderMarkdown(md, options())
      expect(out).toMatch(/<span style="color: #[0-9a-f]{3,8}[^"]*"> ┌────┬────┐<\/span>/i)
    })

    it(`${label}：连续空格原样保留`, () => {
      const { html: out } = renderMarkdown(md, options())
      expect(out).toContain('  已收到      空闲')
    })
  }

  /**
   * 微信正文样式表里有一条对所有元素的强制规则：
   *   .rich_media_content * { max-width:100%!important; word-wrap:break-word!important }
   * 它会把超宽的代码行压回正文宽度再强行断开，ASCII 图就此错行。
   * 行内 !important 优先级高于样式表 !important，用它顶回去；
   * 再给 code 一个 max-content 宽度，pre 的横向滚动范围才覆盖得到最长那行。
   */
  it('代码块顶得住微信强制的 max-width 与 word-wrap', () => {
    const wide = '```\n' + '─'.repeat(120) + '\n```'
    const { html: out } = renderMarkdown(wide, options())

    expect(out).toContain('max-width: none !important')
    expect(out).toContain('word-wrap: normal !important')
    expect(out).toContain('word-break: normal !important')
    expect(out).toContain('white-space: pre !important')
    // 横向滚动的三件套
    expect(out).toContain('width: max-content')
    expect(out).toContain('overflow-x: auto')
    expect(out).toContain('-webkit-overflow-scrolling: touch')
  })

  it('带语言的代码块享受同样的保护', () => {
    const { html: out } = renderMarkdown('```go\nfunc main() {}\n```', options())
    expect(out).toContain('max-width: none !important')
    expect(out).toContain('width: max-content')
  })

  it('无语言与带语言产出的行结构完全一致', () => {
    // 用正则匹配行容器，避免测试被 codeLine 的样式微调绊倒
    const lineOpen = /<span style="display: inline[^"]*">/g
    const emptyLine = /<span style="display: inline[^"]*"><\/span>/

    const plain = renderMarkdown(fences['无语言'], options()).html
    const go = renderMarkdown(fences['go'], options()).html

    expect(plain.match(lineOpen)?.length).toBe(go.match(lineOpen)?.length)
    // 空行在两种情况下都是「空的行容器」，不带多余的内层标签
    expect(plain).toMatch(emptyLine)
    expect(go).toMatch(emptyLine)
  })
})

describe('主题切换', () => {
  it('不同主题产出不同的正文样式', () => {
    const wechat = renderMarkdown('正文', options({ theme: resolveTheme('wechat') })).html
    const classic = renderMarkdown('正文', options({ theme: resolveTheme('classic') })).html
    expect(wechat).toContain('font-size: 17px')
    expect(classic).toContain('font-size: 16px')
    expect(classic).toContain('color: #3f3f3f')
    expect(wechat).not.toBe(classic)
  })

  it('运行时覆盖字号/行高生效', () => {
    const theme = resolveTheme('wechat', { fontSize: '20px', lineHeight: '2.2' })
    const { html: out } = renderMarkdown('正文', options({ theme }))
    expect(out).toContain('font-size: 20px')
    expect(out).toContain('line-height: 2.2')
  })

  it('未知主题 id 回退到默认主题', () => {
    expect(resolveTheme('不存在的主题').id).toBe('wechat')
  })
})
