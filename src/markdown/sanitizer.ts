/**
 * URL 安全校验。
 *
 * 本项目的 XSS 防线有两层：
 *
 * 1. **源头拦截**：remark-rehype 在 `allowDangerousHtml: false` 下会直接丢弃
 *    Markdown 里的裸 HTML（`<script>`、`<img onerror>` 等根本进不了 AST）。
 *    我们也不使用 rehype-raw，所以不存在把用户 HTML 还原回 DOM 的路径。
 * 2. **URL 白名单**：唯一还能由用户控制的属性是 `href` / `src`，
 *    这里按协议白名单过滤，挡掉 `javascript:` / `data:` / `vbscript:` 等。
 */

/** 链接允许的协议 */
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** 图片额外允许内联的 data URI（仅限图片类型） */
const SAFE_IMAGE_DATA =
  /^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif|bmp);base64,[a-z0-9+/=\s]+$/i

/** ASCII 控制字符。这里「匹配控制字符」正是本意，用于识别 java\tscript: 这类绕过写法 */
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g

/**
 * 归一化待检查的 URL：剔除控制字符后再 trim。
 *
 * HTML 实体（`&#106;avascript:`）无需在这里处理：remark 在解析阶段已经解码过了，
 * 到这一步拿到的就是解码后的明文。
 */
function normalize(raw: string): string {
  return raw.replace(CONTROL_CHARS, '').trim()
}

/** 取出 URL 的协议部分（含冒号），没有协议则返回 null（相对路径/锚点）。 */
function protocolOf(url: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  return match ? `${match[1].toLowerCase()}:` : null
}

/**
 * 校验超链接 URL。
 * @returns 安全的 URL；不安全时返回 null，调用方应退化为纯文本。
 */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const url = normalize(raw)
  if (!url) return null

  const protocol = protocolOf(url)
  // 没有协议 = 相对路径、锚点或 //host 形式的协议相对 URL，均视为安全
  if (protocol === null) return url
  return SAFE_LINK_PROTOCOLS.has(protocol) ? url : null
}

/**
 * 校验图片 URL。在链接白名单之外额外允许 `data:image/*;base64,`，
 * 这样本地粘贴的内嵌图片能在预览里显示。
 *
 * 注意 `data:image/svg+xml` 可以携带脚本，但它只会出现在 `<img src>` 里，
 * 浏览器不会在 `<img>` 上下文执行 SVG 内的脚本，因此是安全的。
 */
export function sanitizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const url = normalize(raw)
  if (!url) return null

  const protocol = protocolOf(url)
  if (protocol === null) return url
  if (protocol === 'data:') return SAFE_IMAGE_DATA.test(url) ? url : null
  // 图片不需要 mailto:
  return protocol === 'http:' || protocol === 'https:' ? url : null
}

/** 判断是否为微信自家域名。这类链接粘贴到公众号后仍然可点。 */
export function isWechatUrl(url: string): boolean {
  return /^https?:\/\/mp\.weixin\.qq\.com\//i.test(url)
}
