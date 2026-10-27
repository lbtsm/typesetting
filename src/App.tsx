import type { EditorView } from '@codemirror/view'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { copyPlainText, copyRichText } from './clipboard/copyRichText'
import {
  buildStandaloneHtml,
  downloadFile,
  readTextFile,
  toFilename,
} from './clipboard/exportFile'
import { MarkdownEditor } from './components/Editor/MarkdownEditor'
import { LibraryDialog } from './components/Library/LibraryDialog'
import { Preview } from './components/Preview/Preview'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { Toolbar } from './components/Toolbar/Toolbar'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useRenderedHtml, type RenderConfig } from './hooks/useRenderedHtml'
import { useToast } from './hooks/useToast'
import { SAMPLE_MARKDOWN } from './sample'
import {
  createDocument,
  deleteDocument,
  listDocuments,
  loadContent,
  openInitialDocument,
  saveDocument,
  setCurrentId,
  type DocumentMeta,
} from './storage/documents'
import { loadSettings, saveSettings, type AppSettings } from './storage/settings'
import { resolveTheme } from './themes'

/** 自动保存的静默期：停止输入这么久之后写入 localStorage */
const AUTOSAVE_DELAY = 800
/** 预览重渲染的防抖，比自动保存短得多，保证打字时预览跟得上 */
const RENDER_DELAY = 150
/** 与 Tailwind 的 md 断点保持一致 */
const DESKTOP_QUERY = '(min-width: 768px)'

const NEW_DOCUMENT = '# 新文章\n\n'

type MobilePane = 'editor' | 'preview'

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  // 启动时就从 localStorage 取回上次编辑的文章：
  // 放在 useState 初始化器里而不是 effect 里，首帧就能渲染出内容，不会先闪一下空白。
  // openInitialDocument 是幂等的（已有存档时只读不写），StrictMode 下重复调用也安全。
  const [initialDocument] = useState(() => openInitialDocument(SAMPLE_MARKDOWN))
  const [documents, setDocuments] = useState<readonly DocumentMeta[]>(() => listDocuments())
  const [currentDoc, setCurrentDoc] = useState<DocumentMeta | null>(initialDocument.meta)
  const [markdown, setMarkdown] = useState(initialDocument.content)
  const [dirty, setDirty] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [syncLine, setSyncLine] = useState<number | null>(null)
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const [splitRatio, setSplitRatio] = useState(settings.splitRatio)

  const viewRef = useRef<EditorView | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const splitRatioRef = useRef(splitRatio)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { toast, show } = useToast()

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.uiTheme === 'dark')
  }, [settings.uiTheme])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }))
  }, [])

  // ---- 渲染 ----
  const theme = useMemo(
    () => resolveTheme(settings.themeId, settings.overrides),
    [settings.themeId, settings.overrides],
  )

  const renderConfig = useMemo<RenderConfig>(
    () => ({
      theme,
      linkMode: settings.linkMode,
      autoSpace: settings.autoSpace,
      imageCaption: settings.imageCaption,
      hideHorizontalRule: settings.hideHorizontalRule,
      footnoteTitle: settings.footnoteTitle,
    }),
    [
      theme,
      settings.linkMode,
      settings.autoSpace,
      settings.imageCaption,
      settings.hideHorizontalRule,
      settings.footnoteTitle,
    ],
  )

  const debouncedMarkdown = useDebouncedValue(markdown, RENDER_DELAY)
  const { html, error, renderForCopy } = useRenderedHtml(debouncedMarkdown, renderConfig)

  // ---- 自动保存 ----
  const persist = useCallback(
    (content: string) => {
      if (!currentDoc) return
      const updated = saveDocument(currentDoc.id, content)
      if (updated) {
        setCurrentDoc(updated)
        setDocuments(listDocuments())
      }
      setDirty(false)
    },
    [currentDoc],
  )

  useEffect(() => {
    if (!dirty || !currentDoc) return
    const timer = window.setTimeout(() => persist(markdown), AUTOSAVE_DELAY)
    return () => window.clearTimeout(timer)
  }, [markdown, dirty, currentDoc, persist])

  const handleChange = useCallback((value: string) => {
    setMarkdown(value)
    setDirty(true)
  }, [])

  /** 切换文章前先把当前改动落盘，避免未保存内容丢失。 */
  const flushPending = useCallback(() => {
    if (currentDoc && dirty) persist(markdown)
  }, [currentDoc, dirty, markdown, persist])

  // ---- 文档操作 ----
  const handleNewDocument = useCallback(() => {
    flushPending()
    const meta = createDocument(NEW_DOCUMENT)
    setCurrentDoc(meta)
    setMarkdown(NEW_DOCUMENT)
    setDocuments(listDocuments())
    setDirty(false)
    show('已新建文章', 'success')
  }, [flushPending, show])

  const handleOpenDocument = useCallback(
    (id: string) => {
      flushPending()
      const content = loadContent(id)
      const meta = listDocuments().find((item) => item.id === id)
      if (content === null || !meta) {
        show('这篇文章的内容已丢失', 'error')
        return
      }
      setCurrentId(id)
      setCurrentDoc(meta)
      setMarkdown(content)
      setDirty(false)
      setLibraryOpen(false)
    },
    [flushPending, show],
  )

  const handleDeleteDocument = useCallback(
    (id: string) => {
      deleteDocument(id)
      const remaining = listDocuments()
      setDocuments(remaining)
      if (id !== currentDoc?.id) return

      // 删掉的正是当前文章：打开剩下的第一篇，一篇不剩就用示例新建
      const next = remaining[0]
      if (next) {
        setCurrentId(next.id)
        setCurrentDoc(next)
        setMarkdown(loadContent(next.id) ?? '')
      } else {
        setCurrentDoc(createDocument(SAMPLE_MARKDOWN))
        setMarkdown(SAMPLE_MARKDOWN)
        setDocuments(listDocuments())
      }
      setDirty(false)
    },
    [currentDoc],
  )

  // ---- 导入导出 ----
  const handleFileSelected = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        const content = await readTextFile(file)
        flushPending()
        const meta = createDocument(content)
        setCurrentDoc(meta)
        setMarkdown(content)
        setDocuments(listDocuments())
        setDirty(false)
        show(`已导入 ${file.name}`, 'success')
      } catch (importError) {
        console.error('[md2wechat] 导入失败：', importError)
        show('导入失败，请确认是 UTF-8 文本文件', 'error')
      }
    },
    [flushPending, show],
  )

  const title = currentDoc?.title ?? '未命名文章'

  const handleExportMarkdown = useCallback(() => {
    downloadFile(toFilename(title, 'md'), markdown, 'text/markdown')
    show('已导出 Markdown', 'success')
  }, [markdown, title, show])

  const handleExportHtml = useCallback(() => {
    downloadFile(toFilename(title, 'html'), buildStandaloneHtml(title, renderForCopy()), 'text/html')
    show('已导出 HTML（样式已全部内联）', 'success')
  }, [renderForCopy, title, show])

  // ---- 复制 ----
  const handleCopyRichText = useCallback(async () => {
    const result = await copyRichText(renderForCopy(), markdown)
    show(
      result.ok ? '已复制，去公众号后台直接粘贴即可' : result.message,
      result.ok ? 'success' : 'error',
    )
  }, [renderForCopy, markdown, show])

  const handleCopyMarkdown = useCallback(async () => {
    const result = await copyPlainText(markdown)
    show(result.ok ? '已复制 Markdown 源码' : result.message, result.ok ? 'success' : 'error')
  }, [markdown, show])

  // ---- Cmd/Ctrl + S ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      persist(markdown)
      show('已保存到本地', 'success')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [markdown, persist, show])

  // ---- 分栏拖拽 ----
  const handleDividerDown = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault()
      const rect = splitRef.current?.getBoundingClientRect()
      if (!rect) return

      const onMove = (moveEvent: MouseEvent) => {
        const ratio = Math.min(0.8, Math.max(0.2, (moveEvent.clientX - rect.left) / rect.width))
        splitRatioRef.current = ratio
        setSplitRatio(ratio)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        // 拖拽过程中不写 localStorage，松手时存一次
        updateSettings({ splitRatio: splitRatioRef.current })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [updateSettings],
  )

  const showEditor = isDesktop || mobilePane === 'editor'
  const showPreview = isDesktop || mobilePane === 'preview'

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Toolbar
        title={title}
        saveState={dirty ? 'dirty' : 'saved'}
        settings={settings}
        settingsOpen={settingsOpen}
        viewRef={viewRef}
        onSettingsChange={updateSettings}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onNewDocument={handleNewDocument}
        onOpenLibrary={() => {
          setDocuments(listDocuments())
          setLibraryOpen(true)
        }}
        onImportMarkdown={() => fileInputRef.current?.click()}
        onExportMarkdown={handleExportMarkdown}
        onExportHtml={handleExportHtml}
        onCopyRichText={handleCopyRichText}
        onCopyMarkdown={handleCopyMarkdown}
      />

      {/* 窄屏放不下左右分栏，改成切页 */}
      {!isDesktop && (
        <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 py-1.5 dark:border-slate-700">
          {(['editor', 'preview'] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={[
                'flex-1 cursor-pointer rounded-md py-1 text-sm font-medium transition-colors',
                mobilePane === pane
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
              ].join(' ')}
            >
              {pane === 'editor' ? '编辑' : '预览'}
            </button>
          ))}
        </div>
      )}

      <main className="flex min-h-0 flex-1">
        <div ref={splitRef} className="flex min-w-0 flex-1">
          {showEditor && (
            <section
              className="min-w-0 overflow-hidden"
              style={
                isDesktop
                  ? { flex: `0 0 ${splitRatio * 100}%` }
                  : { flex: '1 1 100%' }
              }
            >
              <MarkdownEditor
                value={markdown}
                onChange={handleChange}
                viewRef={viewRef}
                onScrollLine={setSyncLine}
                fontSize={settings.editorFontSize}
                dark={settings.uiTheme === 'dark'}
              />
            </section>
          )}

          {isDesktop && (
            <div
              onMouseDown={handleDividerDown}
              className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-emerald-500 dark:bg-slate-700"
              role="separator"
              aria-orientation="vertical"
            />
          )}

          {showPreview && (
            <section className="min-w-0 flex-1">
              <Preview
                html={html}
                device={settings.previewDevice}
                syncLine={isDesktop ? syncLine : null}
                error={error}
              />
            </section>
          )}
        </div>

        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            theme={theme}
            onChange={updateSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </main>

      {libraryOpen && currentDoc && (
        <LibraryDialog
          documents={documents}
          currentId={currentDoc.id}
          onOpen={handleOpenDocument}
          onDelete={handleDeleteDocument}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => {
          void handleFileSelected(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {toast && (
        <div
          className={[
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg',
            toast.tone === 'error' ? 'bg-red-600' : 'bg-slate-800',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
