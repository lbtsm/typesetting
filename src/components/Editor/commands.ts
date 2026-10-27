import { EditorSelection, type ChangeSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

/**
 * 编辑器的 Markdown 格式化命令。
 * 抽成纯函数，工具栏按钮和快捷键共用同一套实现。
 */

interface RangeEdit {
  changes: ChangeSpec[]
  range: ReturnType<typeof EditorSelection.range>
}

/**
 * 用标记包裹选中文本；若选区已经被同样的标记包裹，则取消包裹（toggle）。
 * 没有选区时插入一对标记并把光标放在中间。
 */
export function toggleWrap(view: EditorView, before: string, after = before): boolean {
  const { state } = view
  const transaction = state.changeByRange((range): RangeEdit => {
    const selected = state.sliceDoc(range.from, range.to)

    // 情况一：选区内部自带标记，如选中了 `**粗体**`
    if (
      selected.length >= before.length + after.length &&
      selected.startsWith(before) &&
      selected.endsWith(after)
    ) {
      const inner = selected.slice(before.length, selected.length - after.length)
      return {
        changes: [{ from: range.from, to: range.to, insert: inner }],
        range: EditorSelection.range(range.from, range.from + inner.length),
      }
    }

    // 情况二：标记在选区之外，如选中了 粗体，两侧是 ** **
    const outerFrom = range.from - before.length
    const outerTo = range.to + after.length
    if (
      outerFrom >= 0 &&
      outerTo <= state.doc.length &&
      state.sliceDoc(outerFrom, range.from) === before &&
      state.sliceDoc(range.to, outerTo) === after
    ) {
      return {
        changes: [{ from: outerFrom, to: outerTo, insert: selected }],
        range: EditorSelection.range(outerFrom, outerFrom + selected.length),
      }
    }

    // 情况三：加上标记
    return {
      changes: [
        { from: range.from, insert: before },
        { from: range.to, insert: after },
      ],
      range: EditorSelection.range(
        range.from + before.length,
        range.to + before.length,
      ),
    }
  })

  view.dispatch(transaction, { scrollIntoView: true, userEvent: 'input.format' })
  view.focus()
  return true
}

/**
 * 插入链接。有选区时把选中文本当作链接文字并把光标落在 URL 处；
 * 无选区时插入模板并选中「链接文字」占位符。
 */
export function insertLink(view: EditorView): boolean {
  const { state } = view
  const transaction = state.changeByRange((range): RangeEdit => {
    const selected = state.sliceDoc(range.from, range.to)
    if (selected) {
      const insert = `[${selected}]()`
      // 光标停在括号内，方便直接粘 URL
      const cursor = range.from + insert.length - 1
      return {
        changes: [{ from: range.from, to: range.to, insert }],
        range: EditorSelection.cursor(cursor),
      }
    }
    const placeholder = '链接文字'
    const insert = `[${placeholder}](https://)`
    return {
      changes: [{ from: range.from, insert }],
      range: EditorSelection.range(range.from + 1, range.from + 1 + placeholder.length),
    }
  })

  view.dispatch(transaction, { scrollIntoView: true, userEvent: 'input.link' })
  view.focus()
  return true
}

/** 在行首插入/移除前缀（标题、引用、列表）。 */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view
  const changes: ChangeSpec[] = []
  const seen = new Set<number>()

  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let number = startLine; number <= endLine; number += 1) {
      if (seen.has(number)) continue
      seen.add(number)
      const line = state.doc.line(number)
      if (line.text.startsWith(prefix)) {
        changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
      } else {
        changes.push({ from: line.from, insert: prefix })
      }
    }
  }

  if (changes.length === 0) return false
  view.dispatch({ changes, userEvent: 'input.format' })
  view.focus()
  return true
}

/** 在光标处插入一段文本（代码块、表格、分割线等片段）。 */
export function insertSnippet(view: EditorView, snippet: string): boolean {
  const { state } = view
  const range = state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: EditorSelection.cursor(range.from + snippet.length),
    scrollIntoView: true,
    userEvent: 'input.snippet',
  })
  view.focus()
  return true
}
