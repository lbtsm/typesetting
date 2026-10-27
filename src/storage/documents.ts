import { readJson, writeJson } from './localStorage'

/**
 * 文章仓库。所有内容只存在浏览器 localStorage 里，不经过任何服务器。
 *
 * 存储布局：
 *   md2wechat:docs        -> DocumentMeta[]（按更新时间倒序）
 *   md2wechat:doc:<id>    -> string（正文）
 *   md2wechat:currentDoc  -> string（当前打开的文章 id）
 *
 * 正文单独存键而不是塞进一个大数组，是为了避免每次自动保存都要
 * 把全部文章重新序列化一遍。
 */

export interface DocumentMeta {
  id: string
  title: string
  /** 毫秒时间戳 */
  updatedAt: number
  createdAt: number
}

const INDEX_KEY = 'docs'
const CURRENT_KEY = 'currentDoc'
const contentKey = (id: string) => `doc:${id}`

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 从正文推断标题：优先第一个 ATX 标题，其次第一行非空文本。 */
export function deriveTitle(content: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    const title = (heading ? heading[1] : line).replace(/[#*`~>_]/g, '').trim()
    if (title) return title.slice(0, 60)
  }
  return '未命名文章'
}

export function listDocuments(): DocumentMeta[] {
  return readJson<DocumentMeta[]>(INDEX_KEY, [])
}

function writeIndex(list: DocumentMeta[]): void {
  writeJson(
    INDEX_KEY,
    [...list].sort((a, b) => b.updatedAt - a.updatedAt),
  )
}

export function loadContent(id: string): string | null {
  return readJson<string | null>(contentKey(id), null)
}

export function getCurrentId(): string | null {
  return readJson<string | null>(CURRENT_KEY, null)
}

export function setCurrentId(id: string): void {
  writeJson(CURRENT_KEY, id)
}

/** 新建一篇文章并设为当前文章。 */
export function createDocument(content: string): DocumentMeta {
  const now = Date.now()
  const meta: DocumentMeta = {
    id: newId(),
    title: deriveTitle(content),
    createdAt: now,
    updatedAt: now,
  }
  writeJson(contentKey(meta.id), content)
  writeIndex([meta, ...listDocuments()])
  setCurrentId(meta.id)
  return meta
}

/** 保存正文并刷新索引里的标题与时间。 */
export function saveDocument(id: string, content: string): DocumentMeta | null {
  const list = listDocuments()
  const index = list.findIndex((item) => item.id === id)
  if (index === -1) return null

  writeJson(contentKey(id), content)
  const updated: DocumentMeta = {
    ...list[index],
    title: deriveTitle(content),
    updatedAt: Date.now(),
  }
  list[index] = updated
  writeIndex(list)
  return updated
}

export function deleteDocument(id: string): void {
  writeIndex(listDocuments().filter((item) => item.id !== id))
  writeJson(contentKey(id), null)
}

/**
 * 启动时取出要打开的文章。
 * 没有任何存档时用传入的样例新建一篇，保证首次打开就有内容可看。
 */
export function openInitialDocument(sample: string): { meta: DocumentMeta; content: string } {
  const list = listDocuments()
  const currentId = getCurrentId()
  const target = list.find((item) => item.id === currentId) ?? list[0]

  if (target) {
    const content = loadContent(target.id)
    if (content !== null) {
      setCurrentId(target.id)
      return { meta: target, content }
    }
  }
  const meta = createDocument(sample)
  return { meta, content: sample }
}
