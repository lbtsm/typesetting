/**
 * 富文本复制。
 *
 * 微信公众号后台的编辑器通过监听粘贴事件读取 `text/html`，
 * 因此只要把带 inline style 的 HTML 写进剪贴板的 text/html 分支，
 * 粘贴进去就能带上完整样式。
 *
 * 两条通路：
 * 1. 异步 Clipboard API（`navigator.clipboard.write`）——现代浏览器首选，
 *    可以同时写入 text/html 与 text/plain。要求安全上下文（localhost 算安全）。
 * 2. 选区 + `document.execCommand('copy')` 兜底——把 HTML 塞进一个屏幕外的
 *    contenteditable 元素并选中它，浏览器会自动生成 text/html。
 *    用于 http 内网访问、旧浏览器、以及用户拒绝剪贴板权限的场景。
 */

export type CopyMethod = 'clipboard-api' | 'selection'

export type CopyResult =
  | { ok: true; method: CopyMethod }
  | { ok: false; message: string }

function hasClipboardApi(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    typeof window.ClipboardItem === 'function' &&
    window.isSecureContext
  )
}

async function viaClipboardApi(html: string, plain: string): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
    return true
  } catch (error) {
    console.warn('[md2wechat] Clipboard API 写入失败，改用选区兜底：', error)
    return false
  }
}

/**
 * 选区兜底方案。
 *
 * 几个必须这么写的细节：
 * - 容器要留在文档流里（只是移到屏幕外），`display:none` 的元素无法被选中。
 * - 用 `contenteditable` 可以让 Safari 正确生成 text/html。
 * - 复制完必须恢复用户原本的选区，否则正文里的选中状态会被清掉。
 */
function viaSelection(html: string): boolean {
  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.opacity = '0'
  container.style.whiteSpace = 'pre-wrap'
  document.body.appendChild(container)

  const selection = window.getSelection()
  const previousRanges: Range[] = []
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i += 1) {
      previousRanges.push(selection.getRangeAt(i).cloneRange())
    }
  }

  let copied = false
  try {
    const range = document.createRange()
    range.selectNodeContents(container)
    selection?.removeAllRanges()
    selection?.addRange(range)
    copied = document.execCommand('copy')
  } catch (error) {
    console.error('[md2wechat] 选区复制失败：', error)
  } finally {
    selection?.removeAllRanges()
    for (const range of previousRanges) selection?.addRange(range)
    container.remove()
  }
  return copied
}

/**
 * 复制富文本（带样式），用于直接粘贴进微信公众号编辑器。
 *
 * @param html  已内联样式的 HTML
 * @param plain 对应的纯文本，作为不支持富文本的目标程序的降级内容
 */
export async function copyRichText(html: string, plain: string): Promise<CopyResult> {
  if (hasClipboardApi() && (await viaClipboardApi(html, plain))) {
    return { ok: true, method: 'clipboard-api' }
  }
  if (viaSelection(html)) {
    return { ok: true, method: 'selection' }
  }
  return {
    ok: false,
    message: '浏览器拒绝了剪贴板写入，请手动全选预览区复制',
  }
}

/** 复制纯文本（Markdown 源码）。 */
export async function copyPlainText(value: string): Promise<CopyResult> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return { ok: true, method: 'clipboard-api' }
    } catch (error) {
      console.warn('[md2wechat] writeText 失败，改用 textarea 兜底：', error)
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.left = '-99999px'
  document.body.appendChild(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch (error) {
    console.error('[md2wechat] 纯文本复制失败：', error)
  } finally {
    textarea.remove()
  }

  return copied
    ? { ok: true, method: 'selection' }
    : { ok: false, message: '浏览器拒绝了剪贴板写入，请手动复制' }
}
