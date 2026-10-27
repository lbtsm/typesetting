/**
 * 中英文混排自动加空格（俗称「盘古之白」）。
 *
 * 微信公众号的中文读者对这个很敏感：`使用Go语言` 和 `使用 Go 语言` 观感差别明显。
 * 这里只做最保守的一档——仅在「汉字 ↔ 字母/数字」边界补空格，
 * 不碰标点，避免把 `中文,English` 改成 `中文, English` 这类误伤。
 */

const CJK = '\\u2e80-\\u2eff\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'
const ALNUM = 'A-Za-z0-9'

/** 汉字后面紧跟字母/数字/部分开括号 */
const CJK_BEFORE = new RegExp(`([${CJK}])([${ALNUM}@$#%&])`, 'g')
/** 字母/数字/部分闭合符后面紧跟汉字 */
const CJK_AFTER = new RegExp(`([${ALNUM}%)\\]!?])([${CJK}])`, 'g')

/** 在中英文之间插入空格。幂等：已有空格的位置不会重复插入。 */
export function addCjkSpacing(input: string): string {
  return input.replace(CJK_BEFORE, '$1 $2').replace(CJK_AFTER, '$1 $2')
}
