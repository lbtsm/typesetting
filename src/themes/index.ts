import type { Theme, ThemeBase, ThemeDefinition } from '../types/theme'
import { buildTheme } from './buildTheme'
import { classicTheme } from './classic'
import { darkCodeTheme } from './darkCode'
import { minimalTheme } from './minimal'
import { simpleTheme } from './simple'
import { technicalTheme } from './technical'
import { wechatTheme } from './wechat'

/** 全部可选主题，顺序即 UI 中的展示顺序。 */
export const THEME_DEFINITIONS: readonly ThemeDefinition[] = [
  wechatTheme,
  classicTheme,
  technicalTheme,
  simpleTheme,
  minimalTheme,
  darkCodeTheme,
]

export const DEFAULT_THEME_ID = wechatTheme.id

/** 代码高亮用到的全部 shiki 主题，启动时一次性预载。 */
export const CODE_THEMES: readonly string[] = Array.from(
  new Set(THEME_DEFINITIONS.map((d) => d.base?.codeTheme ?? 'github-light')),
)

function findDefinition(id: string): ThemeDefinition {
  return THEME_DEFINITIONS.find((d) => d.id === id) ?? wechatTheme
}

/**
 * 取得最终用于渲染的主题。
 * @param id    主题 id，未知 id 回退到默认主题
 * @param patch 设置面板的运行时覆盖
 */
export function resolveTheme(id: string, patch?: Partial<ThemeBase>): Theme {
  return buildTheme(findDefinition(id), patch)
}

export { buildTheme }
export * from './tokens'
