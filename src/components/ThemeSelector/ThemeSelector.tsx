import { THEME_DEFINITIONS } from '../../themes'
import { MenuItem, Popover } from '../ui'

export interface ThemeSelectorProps {
  themeId: string
  onChange: (themeId: string) => void
}

/** 主题下拉。切换后右侧预览立即重渲染。 */
export function ThemeSelector({ themeId, onChange }: ThemeSelectorProps) {
  const current = THEME_DEFINITIONS.find((item) => item.id === themeId)

  return (
    <Popover label={`主题：${current?.name ?? '默认'}`} panelClassName="w-64">
      {(close) => (
        <div className="flex flex-col">
          {THEME_DEFINITIONS.map((definition) => (
            <MenuItem
              key={definition.id}
              title={definition.name}
              description={definition.description}
              active={definition.id === themeId}
              onClick={() => {
                onChange(definition.id)
                close()
              }}
            />
          ))}
        </div>
      )}
    </Popover>
  )
}
