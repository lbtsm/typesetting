/** 文件导入导出。全部在浏览器内完成，不经过服务器。 */

/** 触发浏览器下载。 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 立刻 revoke 在部分浏览器上会打断下载，延后一帧更稳
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 把标题清洗成安全的文件名。 */
export function toFilename(title: string, extension: string): string {
  const safe = title.replace(/[\\/:*?"<>|\n\r\t]/g, '_').trim() || '未命名文章'
  return `${safe.slice(0, 80)}.${extension}`
}

/**
 * 导出完整 HTML 文档。
 *
 * body 里的正文已经是全内联样式，这里只补一个居中的容器，
 * 保证单独用浏览器打开时的阅读宽度和微信正文接近。
 */
export function buildStandaloneHtml(title: string, bodyHtml: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapedTitle}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background: #ffffff;">
<div style="max-width: 677px; margin: 0 auto;">
${bodyHtml}
</div>
</body>
</html>
`
}

/** 读取用户选择的本地文件内容。 */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}
