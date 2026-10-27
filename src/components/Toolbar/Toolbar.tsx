import type { EditorView } from '@codemirror/view'
import type { RefObject } from 'react'
import type { AppSettings } from '../../storage/settings'
import {
  insertLink,
  insertSnippet,
  toggleLinePrefix,
  toggleWrap,
} from '../Editor/commands'
import { ThemeSelector } from '../ThemeSelector/ThemeSelector'
import { Button, Divider, MenuItem, Popover, ToolButton } from '../ui'

export type SaveState = 'saved' | 'dirty'

export interface ToolbarProps {
  title: string
  saveState: SaveState
  settings: AppSettings
  settingsOpen: boolean
  viewRef: RefObject<EditorView | null>
  onSettingsChange: (patch: Partial<AppSettings>) => void
  onToggleSettings: () => void
  onNewDocument: () => void
  onOpenLibrary: () => void
  onImportMarkdown: () => void
  onExportMarkdown: () => void
  onExportHtml: () => void
  onCopyRichText: () => void
  onCopyMarkdown: () => void
}

const TABLE_SNIPPET = `
| 列一 | 列二 |
| --- | --- |
| 内容 | 内容 |
`

const CODE_SNIPPET = '\n```go\n\n```\n'

export function Toolbar(props: ToolbarProps) {
  const {
    title,
    saveState,
    settings,
    settingsOpen,
    viewRef,
    onSettingsChange,
    onToggleSettings,
  } = props

  /** 所有格式化按钮都作用在当前 EditorView 上；编辑器未就绪时静默忽略。 */
  const run = (action: (view: EditorView) => void) => () => {
    const view = viewRef.current
    if (view) action(view)
  }

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* 第一行：文件、主题、复制 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="mr-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Markdown → 公众号
        </span>

        <Popover label="文件">
          {(close) => (
            <div className="flex flex-col">
              <MenuItem
                title="新建文章"
                onClick={() => {
                  props.onNewDocument()
                  close()
                }}
              />
              <MenuItem
                title="打开 / 历史"
                description="本地保存的全部文章"
                onClick={() => {
                  props.onOpenLibrary()
                  close()
                }}
              />
              <MenuItem
                title="导入 Markdown"
                onClick={() => {
                  props.onImportMarkdown()
                  close()
                }}
              />
              <MenuItem
                title="导出 Markdown"
                onClick={() => {
                  props.onExportMarkdown()
                  close()
                }}
              />
              <MenuItem
                title="导出 HTML"
                description="含完整 inline CSS，可直接用浏览器打开"
                onClick={() => {
                  props.onExportHtml()
                  close()
                }}
              />
            </div>
          )}
        </Popover>

        <ThemeSelector
          themeId={settings.themeId}
          onChange={(themeId) => onSettingsChange({ themeId })}
        />

        <Button
          onClick={() =>
            onSettingsChange({
              previewDevice: settings.previewDevice === 'phone' ? 'wide' : 'phone',
            })
          }
          title="切换预览宽度"
        >
          {settings.previewDevice === 'phone' ? '手机宽度' : '桌面宽度'}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 sm:inline" title={title}>
            {saveState === 'saved' ? '已保存' : '未保存'} · {title}
          </span>
          <Button
            onClick={() =>
              onSettingsChange({ uiTheme: settings.uiTheme === 'dark' ? 'light' : 'dark' })
            }
            title="切换界面明暗"
          >
            {settings.uiTheme === 'dark' ? '☀' : '☾'}
          </Button>
          <Button onClick={onToggleSettings} active={settingsOpen}>
            设置
          </Button>
          <Button onClick={props.onCopyMarkdown}>复制 Markdown</Button>
          <Button variant="primary" onClick={props.onCopyRichText}>
            复制富文本
          </Button>
        </div>
      </div>

      {/* 第二行：Markdown 格式化 */}
      <div className="flex flex-wrap items-center gap-0.5 border-t border-slate-100 px-3 py-1 dark:border-slate-800">
        <ToolButton title="一级标题" onClick={run((v) => toggleLinePrefix(v, '# '))}>
          H1
        </ToolButton>
        <ToolButton title="二级标题" onClick={run((v) => toggleLinePrefix(v, '## '))}>
          H2
        </ToolButton>
        <ToolButton title="三级标题" onClick={run((v) => toggleLinePrefix(v, '### '))}>
          H3
        </ToolButton>
        <Divider />
        <ToolButton title="粗体 (Cmd/Ctrl+B)" onClick={run((v) => toggleWrap(v, '**'))}>
          <strong>B</strong>
        </ToolButton>
        <ToolButton title="斜体 (Cmd/Ctrl+I)" onClick={run((v) => toggleWrap(v, '*'))}>
          <em>I</em>
        </ToolButton>
        <ToolButton title="删除线" onClick={run((v) => toggleWrap(v, '~~'))}>
          <span className="line-through">S</span>
        </ToolButton>
        <ToolButton title="行内代码 (Cmd/Ctrl+E)" onClick={run((v) => toggleWrap(v, '`'))}>
          {'</>'}
        </ToolButton>
        <Divider />
        <ToolButton title="插入链接 (Cmd/Ctrl+K)" onClick={run(insertLink)}>
          链接
        </ToolButton>
        <ToolButton
          title="插入图片"
          onClick={run((v) => insertSnippet(v, '![图片描述](https://)'))}
        >
          图片
        </ToolButton>
        <Divider />
        <ToolButton title="引用" onClick={run((v) => toggleLinePrefix(v, '> '))}>
          引用
        </ToolButton>
        <ToolButton title="无序列表" onClick={run((v) => toggleLinePrefix(v, '- '))}>
          列表
        </ToolButton>
        <ToolButton title="有序列表" onClick={run((v) => toggleLinePrefix(v, '1. '))}>
          编号
        </ToolButton>
        <Divider />
        <ToolButton title="代码块" onClick={run((v) => insertSnippet(v, CODE_SNIPPET))}>
          代码块
        </ToolButton>
        <ToolButton title="表格" onClick={run((v) => insertSnippet(v, TABLE_SNIPPET))}>
          表格
        </ToolButton>
        <ToolButton title="分割线" onClick={run((v) => insertSnippet(v, '\n---\n'))}>
          分割线
        </ToolButton>
      </div>
    </header>
  )
}
