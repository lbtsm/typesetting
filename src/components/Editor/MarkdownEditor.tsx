import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo, type RefObject } from 'react'
import { insertLink, toggleWrap } from './commands'

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  /** 把底层 EditorView 暴露给工具栏，让按钮和快捷键复用同一套命令 */
  viewRef: RefObject<EditorView | null>
  /** 编辑区滚动到的首行行号，用于与预览联动 */
  onScrollLine?: (line: number) => void
  fontSize: number
  dark: boolean
}

/**
 * 左侧 Markdown 编辑器。
 *
 * 用 CodeMirror 6 而非 Monaco：体积小一个数量级，中文输入法下的
 * 光标/组合输入行为更稳，而我们并不需要 Monaco 的 IntelliSense。
 */
export function MarkdownEditor({
  value,
  onChange,
  viewRef,
  onScrollLine,
  fontSize,
  dark,
}: MarkdownEditorProps) {
  const extensions = useMemo<Extension[]>(() => {
    const formatting = Prec.highest(
      keymap.of([
        { key: 'Mod-b', run: (view) => toggleWrap(view, '**'), preventDefault: true },
        { key: 'Mod-i', run: (view) => toggleWrap(view, '*'), preventDefault: true },
        { key: 'Mod-k', run: insertLink, preventDefault: true },
        {
          key: 'Mod-Shift-x',
          run: (view) => toggleWrap(view, '~~'),
          preventDefault: true,
        },
        { key: 'Mod-e', run: (view) => toggleWrap(view, '`'), preventDefault: true },
      ]),
    )

    const scrollReporter = EditorView.domEventHandlers({
      scroll(_event, view) {
        if (!onScrollLine) return
        // lineBlockAtHeight 用的是文档坐标，滚动容器的 scrollTop 正好同一套坐标系
        const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop)
        onScrollLine(view.state.doc.lineAt(block.from).number)
      },
    })

    return [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      formatting,
      scrollReporter,
      EditorView.theme({
        '&': { height: '100%', fontSize: `${fontSize}px` },
        '.cm-scroller': {
          fontFamily:
            '"JetBrains Mono", "SF Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace',
          lineHeight: '1.75',
          padding: '16px 0 40vh',
        },
        '.cm-content': { padding: '0 20px' },
        '.cm-line': { padding: '0' },
      }),
    ]
  }, [fontSize, onScrollLine])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={dark ? 'dark' : 'light'}
      height="100%"
      style={{ height: '100%' }}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        bracketMatching: false,
        closeBrackets: false,
        autocompletion: false,
        searchKeymap: true,
      }}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
    />
  )
}
