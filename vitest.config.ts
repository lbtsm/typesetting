import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * 测试配置与 vite.config 分开：这里不需要 Tailwind 插件。
 *
 * 默认跑在 node 环境（管线与 sanitizer 都是纯函数）；
 * 需要 DOM 的组件测试在文件顶部用 `// @vitest-environment jsdom` 单独切换。
 */
export default defineConfig({
  plugins: [react()],
})
