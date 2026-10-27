import { describe, expect, it } from 'vitest'
import { isWechatUrl, sanitizeImageUrl, sanitizeUrl } from './sanitizer'

/**
 * 协议白名单的单元测试。
 *
 * 构造恶意 URL 时一律用 String.fromCharCode 拼接而不是写转义序列，
 * 这样源码里不会出现任何不可见字符，review 时一眼能看懂测的是什么。
 */
const TAB = String.fromCharCode(9)
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const NUL = String.fromCharCode(0)

describe('sanitizeUrl', () => {
  it('放行白名单协议', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    expect(sanitizeUrl('http://example.com/a?b=1#c')).toBe('http://example.com/a?b=1#c')
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
  })

  it('放行没有协议的相对路径与锚点', () => {
    expect(sanitizeUrl('/docs/intro')).toBe('/docs/intro')
    expect(sanitizeUrl('#section')).toBe('#section')
    expect(sanitizeUrl('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png')
  })

  it('拦截危险协议', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull()
    expect(sanitizeUrl('  javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('vbscript:msgbox')).toBeNull()
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull()
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('拦截用控制字符拆开协议名的绕过写法', () => {
    // Tab / 换行 / 回车 / NUL 都会被浏览器在解析 URL 时剔除，
    // 也就是说 java<TAB>script: 照样会执行，所以判协议之前必须先清掉它们
    expect(sanitizeUrl(`java${TAB}script:alert(1)`)).toBeNull()
    expect(sanitizeUrl(`java${LF}script:alert(1)`)).toBeNull()
    expect(sanitizeUrl(`java${CR}script:alert(1)`)).toBeNull()
    expect(sanitizeUrl(`java${NUL}script:alert(1)`)).toBeNull()
  })

  it('夹了空格的伪协议按相对路径放行', () => {
    // 空格不会被 URL 解析器剔除，`java script:` 在浏览器里就是一个普通相对路径，
    // 不存在执行风险，没必要拦。
    expect(sanitizeUrl('java script:alert(1)')).toBe('java script:alert(1)')
  })

  it('空值返回 null', () => {
    expect(sanitizeUrl('')).toBeNull()
    expect(sanitizeUrl('   ')).toBeNull()
    expect(sanitizeUrl(null)).toBeNull()
    expect(sanitizeUrl(undefined)).toBeNull()
  })
})

describe('sanitizeImageUrl', () => {
  it('放行 http(s) 与 data:image', () => {
    expect(sanitizeImageUrl('https://x.com/a.png')).toBe('https://x.com/a.png')
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo=',
    )
  })

  it('拦截非图片的 data URI 与其他协议', () => {
    expect(sanitizeImageUrl('data:text/html,x')).toBeNull()
    expect(sanitizeImageUrl('data:image/png,notbase64')).toBeNull()
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeImageUrl('mailto:a@b.com')).toBeNull()
    expect(sanitizeImageUrl(`java${TAB}script:alert(1)`)).toBeNull()
  })
})

describe('isWechatUrl', () => {
  it('识别公众号站内链接', () => {
    expect(isWechatUrl('https://mp.weixin.qq.com/s/abc')).toBe(true)
    expect(isWechatUrl('http://mp.weixin.qq.com/s/abc')).toBe(true)
    expect(isWechatUrl('https://example.com/mp.weixin.qq.com')).toBe(false)
  })
})
