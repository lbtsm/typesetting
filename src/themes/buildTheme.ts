import type {
  ElementKey,
  StyleMap,
  Theme,
  ThemeBase,
  ThemeDefinition,
  ThemeStyles,
} from '../types/theme'
import { createStyles } from './createStyles'
import { DEFAULT_BASE } from './tokens'

/** 丢掉值为 undefined 的键，避免覆盖时把默认值打成 undefined。 */
function compact<T extends object>(patch: Partial<T> | undefined): Partial<T> {
  if (!patch) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== '') out[key] = value
  }
  return out as Partial<T>
}

/** 按 ElementKey 逐槽位浅合并样式。 */
function mergeStyles(
  base: ThemeStyles,
  patch: Partial<Record<ElementKey, StyleMap>>,
): ThemeStyles {
  const out: Record<string, StyleMap> = { ...base }
  for (const [key, style] of Object.entries(patch)) {
    if (!style) continue
    out[key] = { ...out[key], ...style }
  }
  return out as ThemeStyles
}

/**
 * 把主题定义编译成可渲染的主题。
 *
 * @param definition 主题定义
 * @param patch      运行时覆盖（设置面板里的字号/行高/字色等），优先级最高
 */
export function buildTheme(definition: ThemeDefinition, patch?: Partial<ThemeBase>): Theme {
  const base: ThemeBase = {
    ...DEFAULT_BASE,
    ...compact(definition.base),
    ...compact(patch),
  }
  const styles = createStyles(base)
  const overrides = definition.overrides?.(base)
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    base,
    styles: overrides ? mergeStyles(styles, overrides) : styles,
  }
}
