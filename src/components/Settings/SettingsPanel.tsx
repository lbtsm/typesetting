import { LINK_MODE_LABELS, type LinkMode } from '../../markdown/links'
import type { AppSettings } from '../../storage/settings'
import { DEFAULT_SETTINGS } from '../../storage/settings'
import type { Theme, ThemeBase } from '../../types/theme'
import { Button, Field, Select, TextInput, Toggle } from '../ui'

export interface SettingsPanelProps {
  settings: AppSettings
  /** 应用了覆盖之后的最终主题，用于显示各项当前生效值 */
  theme: Theme
  onChange: (patch: Partial<AppSettings>) => void
  onClose: () => void
}

const FONT_SIZES = ['14px', '15px', '16px', '17px', '18px', '19px', '20px']
const LINE_HEIGHTS = ['1.5', '1.6', '1.7', '1.75', '1.8', '2', '2.2']
const LETTER_SPACINGS = [
  { value: 'normal', label: '默认（与公众号一致）' },
  { value: '0.02em', label: '0.02em' },
  { value: '0.034em', label: '0.034em（微信部分模板）' },
  { value: '0.05em', label: '0.05em（宽松）' },
]
const PARAGRAPH_MARGINS = [
  { value: '0 0 12px', label: '12px（紧凑）' },
  { value: '0 0 16px', label: '16px' },
  { value: '0 0 20px', label: '20px' },
  { value: '0 0 24px', label: '24px（微信默认）' },
  { value: '0 0 32px', label: '32px（宽松）' },
]

/**
 * 设置面板。
 *
 * 这里改的是 settings.overrides，它会覆盖当前主题的排版变量，
 * 所以「换主题」和「微调字号」是两件互不干扰的事：
 * 换主题保留你调过的字号，清空覆盖即可回到主题原始值。
 */
export function SettingsPanel({ settings, theme, onChange, onClose }: SettingsPanelProps) {
  const patchOverride = (patch: Partial<ThemeBase>) =>
    onChange({ overrides: { ...settings.overrides, ...patch } })

  const hasOverrides = Object.keys(settings.overrides).length > 0

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">排版设置</h2>
        <Button variant="ghost" onClick={onClose} title="关闭">
          ✕
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">正文</h3>
          <Field label="字号">
            <Select
              value={theme.base.fontSize}
              onChange={(event) => patchOverride({ fontSize: event.target.value })}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                  {size === '17px' ? '（微信默认）' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="行高">
            <Select
              value={theme.base.lineHeight}
              onChange={(event) => patchOverride({ lineHeight: event.target.value })}
            >
              {LINE_HEIGHTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                  {value === '1.8' ? '（微信默认）' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="字间距">
            <Select
              value={theme.base.letterSpacing}
              onChange={(event) => patchOverride({ letterSpacing: event.target.value })}
            >
              {LETTER_SPACINGS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="段落间距">
            <Select
              value={theme.base.paragraphMargin}
              onChange={(event) => patchOverride({ paragraphMargin: event.target.value })}
            >
              {PARAGRAPH_MARGINS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="对齐方式">
            <Select
              value={theme.base.textAlign}
              onChange={(event) => patchOverride({ textAlign: event.target.value })}
            >
              <option value="justify">两端对齐（微信默认）</option>
              <option value="left">左对齐</option>
            </Select>
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">颜色</h3>
          <ColorField
            label="正文颜色"
            value={theme.base.textColor}
            onChange={(textColor) => patchOverride({ textColor })}
          />
          <ColorField
            label="标题颜色"
            value={theme.base.headingColor}
            onChange={(headingColor) => patchOverride({ headingColor })}
          />
          <ColorField
            label="链接 / 强调色"
            value={theme.base.linkColor}
            onChange={(linkColor) => patchOverride({ linkColor, accentColor: linkColor })}
          />
        </section>

        <section className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            微信适配
          </h3>
          <Field
            label="链接处理"
            hint="微信会剥掉非白名单域名的链接，脚注能保证读者仍拿得到 URL"
          >
            <Select
              value={settings.linkMode}
              onChange={(event) => onChange({ linkMode: event.target.value as LinkMode })}
            >
              {Object.entries(LINK_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="脚注区标题">
            <TextInput
              value={settings.footnoteTitle}
              onChange={(event) => onChange({ footnoteTitle: event.target.value })}
            />
          </Field>

          <Toggle
            label="中英文自动空格"
            hint="在汉字与字母/数字之间补一个空格"
            checked={settings.autoSpace}
            onChange={(autoSpace) => onChange({ autoSpace })}
          />
          <Toggle
            label="图片 alt 转图注"
            hint="独占一段的图片下方显示说明文字"
            checked={settings.imageCaption}
            onChange={(imageCaption) => onChange({ imageCaption })}
          />
          <Toggle
            label="隐藏分割线"
            hint="Markdown 的 --- / *** 不输出到正文"
            checked={settings.hideHorizontalRule}
            onChange={(hideHorizontalRule) => onChange({ hideHorizontalRule })}
          />
        </section>

        <section className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">编辑器</h3>
          <Field label="编辑器字号">
            <Select
              value={String(settings.editorFontSize)}
              onChange={(event) => onChange({ editorFontSize: Number(event.target.value) })}
            >
              {[12, 13, 14, 15, 16, 17, 18].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <Button
          className="w-full justify-center"
          disabled={!hasOverrides}
          onClick={() => onChange({ overrides: DEFAULT_SETTINGS.overrides })}
        >
          恢复主题原始排版
        </Button>
      </div>
    </aside>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  // <input type="color"> 只认 #rrggbb，rgba() 之类的值先退化成一个近似色
  const swatch = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatch}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600"
        />
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  )
}
