import type { LinkMode } from '../markdown/links'
import { DEFAULT_THEME_ID } from '../themes'
import type { ThemeBase } from '../types/theme'
import { readJson, writeJson } from './localStorage'

/** 预览区宽度模式：phone 模拟手机正文宽度，wide 为桌面全宽。 */
export type PreviewDevice = 'phone' | 'wide'

export interface AppSettings {
  /** 当前主题 id */
  themeId: string
  /** 设置面板里对主题排版变量的覆盖，优先级高于主题自身 */
  overrides: Partial<ThemeBase>
  /** 链接处理策略 */
  linkMode: LinkMode
  /** 中英文自动空格 */
  autoSpace: boolean
  /** 图片 alt 渲染为图注 */
  imageCaption: boolean
  /** 隐藏分割线 */
  hideHorizontalRule: boolean
  /** 脚注区标题 */
  footnoteTitle: string
  /** 应用界面明暗（不影响文章本身） */
  uiTheme: 'light' | 'dark'
  /** 预览宽度 */
  previewDevice: PreviewDevice
  /** 编辑器字号 */
  editorFontSize: number
  /** 左侧编辑区占比，0.2 ~ 0.8 */
  splitRatio: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeId: DEFAULT_THEME_ID,
  overrides: {},
  linkMode: 'both',
  autoSpace: true,
  imageCaption: true,
  hideHorizontalRule: true,
  footnoteTitle: '参考资料',
  uiTheme: 'light',
  previewDevice: 'phone',
  editorFontSize: 14,
  splitRatio: 0.5,
}

const KEY = 'settings'

/**
 * 读取设置。做字段级合并而不是整体替换，
 * 这样以后新增设置项时，老用户的存档不会缺字段。
 */
export function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings>>(KEY, {})
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    overrides: { ...DEFAULT_SETTINGS.overrides, ...stored.overrides },
  }
}

export function saveSettings(settings: AppSettings): void {
  writeJson(KEY, settings)
}
