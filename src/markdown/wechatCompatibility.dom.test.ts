// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildStandaloneHtml } from '../clipboard/exportFile'
import { resolveTheme } from '../themes'
import { initHighlighter } from './highlight'
import { renderMarkdown } from './pipeline'

// 同时包含缩进、HTML 特殊字符、空行和超过手机列宽的字符图。
const SOURCE = '  接收方 <8KB> & rwnd\n\n │' + '─'.repeat(100) + '│\n    Read()\n'

function render(fence: string, themeId = 'wechat'): HTMLElement {
  const { html } = renderMarkdown(fence + '\n' + SOURCE + '\n```', {
    theme: resolveTheme(themeId),
    linkMode: 'both',
    autoSpace: true,
    imageCaption: true,
    hideHorizontalRule: true,
    footnoteTitle: '参考资料',
    withLineMarkers: false,
  })
  const page = new DOMParser().parseFromString(buildStandaloneHtml('兼容检查', html), 'text/html')
  return page.body
}

function expectSourceSurvives(body: HTMLElement) {
  const pre = body.querySelector('pre')
  expect(pre).not.toBeNull()
  expect(pre?.style.overflowX).toBe('auto')
  expect(pre?.parentElement?.hasAttribute('data-ignore-width')).toBe(true)
  const lines = Array.from(pre?.querySelectorAll(':scope > code') ?? [])
  expect(lines.map((line) => line.textContent).join('\n')).toBe(SOURCE)
  expect(lines[1].querySelector('br')).not.toBeNull()
  expect(lines.at(-1)?.querySelector('br')).not.toBeNull()
  expect(pre?.children).toHaveLength(lines.length)
  // 文本里的尖括号和 & 经过完整 HTML 导出仍是文本，不会生成标签。
  expect(pre?.querySelectorAll('script, img')).toHaveLength(0)
  expect(body.querySelectorAll('[data-sk], [class], [data-line]')).toHaveLength(0)
}

describe('微信 HTML 导出兼容回归', () => {
  it('高亮器未就绪时源码、尾部空行与长字符图仍完整', () => {
    expectSourceSurvives(render('```'))
  })

  it('高亮后所有主题、所有围栏都保留相同源码与空行', async () => {
    await initHighlighter()
    for (const id of ['wechat', 'classic', 'technical', 'simple', 'minimal', 'dark-code']) {
      for (const fence of ['```', '```go', '```text', '```unknown-language']) {
        expectSourceSurvives(render(fence, id))
      }
    }
  })
})
