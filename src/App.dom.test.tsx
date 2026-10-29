// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

/**
 * 整个应用的冒烟测试。
 *
 * 纯字符串断言验证不了 React 运行时——组件挂载顺序、hook 依赖、localStorage 读写
 * 这些只有真正跑起来才暴露。这里把 App 完整挂到 jsdom 上，确认：
 * 首屏能渲染出带内联样式的正文、刷新（重新挂载）后内容还在。
 */

/**
 * jsdom 缺这几个浏览器 API，补上最小实现。
 *
 * matchMedia 必须自己实现：jsdom 自带的那个对任何查询都返回 false，
 * 会让 App 误判成窄屏、直接不挂载预览区——那样测的就不是真实桌面行为了。
 */
function stubBrowserApis() {
  window.matchMedia = ((query: string) => {
    const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query)
    const matches = minWidth ? window.innerWidth >= Number(minWidth[1]) : false
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  }) as typeof window.matchMedia

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
    Range.prototype.getBoundingClientRect = () => new DOMRect()
  }
}

beforeEach(() => {
  stubBrowserApis()
  window.localStorage.clear()
})

afterEach(cleanup)

describe('App 冒烟', () => {
  it('首屏渲染出示例文章，且正文带内联样式', async () => {
    render(<App />)

    const article = await waitFor(() => {
      const node = screen.getByTestId('preview-article')
      expect(node.querySelector('h1')).not.toBeNull()
      return node
    })

    const heading = article.querySelector('h1')
    expect(heading?.textContent).toContain('TCP 为什么需要拥塞控制')
    expect(heading?.getAttribute('style')).toContain('font-size: 22px')

    const paragraph = article.querySelector('p')
    expect(paragraph?.getAttribute('style')).toContain('line-height: 1.8')

    // 预览区的正文里不应出现任何 class（微信不认 class）
    // 唯一例外是微信原生代码块的 class（code-snippet__*），交给微信自己的 CSS 接管
    const classes = Array.from(article.querySelectorAll('[class]'), (node) =>
      Array.from(node.classList),
    ).flat()
    expect(classes.every((name) => name.startsWith('code-snippet'))).toBe(true)
    // 代码块高亮的 token 颜色是内联的
    expect(article.querySelector('pre')?.getAttribute('style')).toContain('white-space: pre')
  })

  it('工具栏与主题选择器都挂上了', async () => {
    render(<App />)
    // 注意用 role 查询：示例文章正文里也写了「复制富文本」几个字，按文本找会撞车
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '复制富文本' })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: '复制 Markdown' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /主题：公众号原味/ })).toBeTruthy()
  })

  it('重新挂载后文章仍在（刷新不丢稿）', async () => {
    const first = render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText(/TCP 为什么需要拥塞控制/).length).toBeGreaterThan(0)
    })
    first.unmount()

    // 模拟刷新：重新挂载一个全新的 App，内容应从 localStorage 还原
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText(/TCP 为什么需要拥塞控制/).length).toBeGreaterThan(0)
    })
    expect(window.localStorage.getItem('md2wechat:currentDoc')).toBeTruthy()
  })
})
