import { useCallback, useEffect, useMemo, useState } from 'react'
import { ensureLanguages, initHighlighter } from '../markdown/highlight'
import type { Footnote } from '../markdown/links'
import { renderMarkdown, type RenderOptions } from '../markdown/pipeline'

/** 渲染配置中除「是否注入行号」以外的部分——行号由用途决定，不由调用方决定。 */
export type RenderConfig = Omit<RenderOptions, 'withLineMarkers'>

export interface RenderedHtml {
  /** 预览用 HTML，带 data-line 以支持滚动同步 */
  html: string
  footnotes: Footnote[]
  /** 渲染异常时的提示，正常为 null */
  error: string | null
  /** 代码高亮器是否已就绪 */
  highlighterReady: boolean
  /** 按需生成「干净的」复制用 HTML（不含 data-line） */
  renderForCopy: () => string
}

interface SafeRenderResult {
  html: string
  footnotes: Footnote[]
  languages: string[]
  error: string | null
}

/**
 * 渲染并兜住异常：预览区不该因为一段畸形 Markdown 就整个白屏。
 *
 * @param highlighterVersion 不参与计算，只作为缓存键。
 *   shiki 的 highlighter 是模块级单例，`renderMarkdown` 的输出隐式依赖它的就绪状态；
 *   把这个状态显式传进来，useMemo 才能在高亮器就绪或补载语言后正确地重算。
 */
function renderSafely(
  markdown: string,
  config: RenderConfig,
  highlighterVersion: number,
): SafeRenderResult {
  void highlighterVersion
  try {
    const rendered = renderMarkdown(markdown, { ...config, withLineMarkers: true })
    return { ...rendered, error: null }
  } catch (error) {
    console.error('[md2wechat] 渲染失败：', error)
    return {
      html: '',
      footnotes: [],
      languages: [],
      error: error instanceof Error ? error.message : '渲染失败',
    }
  }
}

/**
 * Markdown → 预览 HTML。
 *
 * 注意 `config` 必须是稳定引用（调用方用 useMemo 包一下），
 * 否则每次父组件渲染都会触发一次全量重渲染。
 */
export function useRenderedHtml(markdown: string, config: RenderConfig): RenderedHtml {
  // shiki 是异步加载的：初始化完成、或按需补载了新语言之后，都要重渲染一次
  const [highlighterVersion, setHighlighterVersion] = useState(0)
  const [highlighterReady, setHighlighterReady] = useState(false)

  useEffect(() => {
    let alive = true
    void initHighlighter().then(() => {
      if (!alive) return
      setHighlighterReady(true)
      setHighlighterVersion((version) => version + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const result = useMemo(
    () => renderSafely(markdown, config, highlighterVersion),
    [markdown, config, highlighterVersion],
  )

  // 文中出现了尚未加载的语言时，补载并重渲染
  const languageKey = result.languages.join(',')
  useEffect(() => {
    if (!languageKey) return
    let alive = true
    void ensureLanguages(languageKey.split(',')).then((loaded) => {
      if (loaded && alive) setHighlighterVersion((version) => version + 1)
    })
    return () => {
      alive = false
    }
  }, [languageKey])

  const renderForCopy = useCallback(
    () => renderMarkdown(markdown, { ...config, withLineMarkers: false }).html,
    [markdown, config],
  )

  return {
    html: result.html,
    footnotes: result.footnotes,
    error: result.error,
    highlighterReady,
    renderForCopy,
  }
}
