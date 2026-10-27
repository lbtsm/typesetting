import {
  bundledLanguages,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from 'shiki'
import { CODE_THEMES } from '../themes'

/**
 * 代码高亮。
 *
 * 选 shiki 而不是 highlight.js 的原因只有一个：shiki 输出的是
 * `<span style="color:#xxx">`，token 颜色天然就是 inline style，
 * 复制到微信后不依赖任何 class 或外部样式表。
 *
 * shiki 的初始化是异步的（要加载语法定义），但初始化完成后高亮本身是同步的。
 * 因此这里维护一个单例：渲染管线只做同步调用，拿不到 highlighter 时自动退化为纯文本代码块。
 */

/** 启动时预载的语言，覆盖日常写作最常用的几种。其余语言按需懒加载。 */
const PRELOAD_LANGS: readonly string[] = [
  'go',
  'typescript',
  'javascript',
  'json',
  'bash',
  'yaml',
  'python',
  'rust',
  'sql',
  'markdown',
  'diff',
]

/** shiki 内置、无需加载语法文件的特殊语言 */
const BUILTIN_LANGS = new Set(['text', 'plaintext', 'txt', 'ansi'])

/** shiki 未覆盖的常见别名 */
const LANG_ALIASES: Readonly<Record<string, string>> = {
  golang: 'go',
  plain: 'text',
  '': 'text',
  console: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  'c++': 'cpp',
  'c#': 'csharp',
  proto: 'protobuf',
}

let highlighter: Highlighter | null = null
let initPromise: Promise<Highlighter | null> | null = null

function isBundled(lang: string): lang is BundledLanguage {
  return lang in bundledLanguages
}

/**
 * 把代码围栏上写的语言名归一化成 shiki 能识别的名字。
 * 识别不了的一律当纯文本，不让高亮失败影响整篇渲染。
 */
export function resolveLang(raw: string | null | undefined): string {
  const lang = (raw ?? '').trim().toLowerCase()
  const aliased = LANG_ALIASES[lang] ?? lang
  if (BUILTIN_LANGS.has(aliased)) return 'text'
  if (isBundled(aliased)) return aliased
  if (isBundled(lang)) return lang
  return 'text'
}

/** 同步拿 highlighter；尚未就绪时返回 null。 */
export function getHighlighter(): Highlighter | null {
  return highlighter
}

/**
 * 初始化 highlighter。可重复调用，只会真正初始化一次。
 * 初始化失败不抛出——高亮是锦上添花，不该让整个编辑器挂掉。
 */
export function initHighlighter(): Promise<Highlighter | null> {
  if (initPromise) return initPromise
  initPromise = createHighlighter({
    themes: [...CODE_THEMES],
    langs: PRELOAD_LANGS.filter(isBundled),
  })
    .then((instance) => {
      highlighter = instance
      return instance
    })
    .catch((error: unknown) => {
      console.error('[md2wechat] 代码高亮初始化失败，将退化为纯文本代码块：', error)
      return null
    })
  return initPromise
}

/**
 * 确保指定语言已加载。
 * @returns 是否确实加载了新语言（为 true 时调用方需要重新渲染一次）
 */
export async function ensureLanguages(langs: readonly string[]): Promise<boolean> {
  const instance = highlighter
  if (!instance) return false

  const loaded = new Set(instance.getLoadedLanguages())
  const pending = Array.from(new Set(langs)).filter(
    (lang) => lang !== 'text' && isBundled(lang) && !loaded.has(lang),
  )
  if (pending.length === 0) return false

  try {
    await instance.loadLanguage(...(pending as BundledLanguage[]))
    return true
  } catch (error) {
    console.error('[md2wechat] 加载语言失败：', pending, error)
    return false
  }
}

/** 某语言此刻是否可以直接高亮（已加载或为内置文本）。 */
export function isLangReady(lang: string): boolean {
  if (!highlighter) return false
  if (lang === 'text') return true
  return highlighter.getLoadedLanguages().includes(lang)
}

/** 取得某个 shiki 主题的背景色 / 前景色，用于给 pre 兜底上色。 */
export function getCodeThemeColors(themeName: string): { bg: string; fg: string } {
  const fallback = { bg: '#f6f8fa', fg: '#24292e' }
  if (!highlighter) return fallback
  try {
    const theme = highlighter.getTheme(themeName)
    return { bg: theme.bg || fallback.bg, fg: theme.fg || fallback.fg }
  } catch {
    return fallback
  }
}
