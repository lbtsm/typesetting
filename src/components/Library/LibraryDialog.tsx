import type { DocumentMeta } from '../../storage/documents'
import { Button } from '../ui'

export interface LibraryDialogProps {
  documents: readonly DocumentMeta[]
  currentId: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 本地文章列表。所有内容只存在这台机器的 localStorage 里。 */
export function LibraryDialog({
  documents,
  currentId,
  onOpen,
  onDelete,
  onClose,
}: LibraryDialogProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            本地文章（{documents.length}）
          </h2>
          <Button variant="ghost" onClick={onClose} title="关闭">
            ✕
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {documents.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">还没有保存的文章</p>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={[
                'group flex items-center gap-2 rounded-lg px-3 py-2',
                doc.id === currentId
                  ? 'bg-emerald-50 dark:bg-emerald-950'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onOpen(doc.id)}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
              >
                <span className="w-full truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {doc.title}
                </span>
                <span className="text-xs text-slate-400">{formatTime(doc.updatedAt)}</span>
              </button>
              <Button
                variant="ghost"
                title="删除"
                onClick={() => onDelete(doc.id)}
                className="opacity-0 group-hover:opacity-100"
              >
                删除
              </Button>
            </div>
          ))}
        </div>

        <footer className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-700">
          全部内容仅保存在当前浏览器，不会上传到任何服务器
        </footer>
      </div>
    </div>
  )
}
