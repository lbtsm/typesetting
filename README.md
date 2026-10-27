# md2wechat

本地运行的 Markdown → 微信公众号排版工具。左边写 Markdown，右边实时看到公众号里的最终效果，
点一下「复制富文本」，到公众号后台「新建图文」直接粘贴。

**不需要登录，不连服务器，文章内容只存在你自己的浏览器里。**

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端里提示的地址即可。

其他命令：

```bash
npm run build      # 生产构建
npm run test       # 运行测试（渲染管线 + XSS 防护 + 主题）
npm run lint       # oxlint
npm run typecheck  # TypeScript strict 检查
```

## 为什么它排出来的版能直接用

### 1. 预览和复制是同一份 HTML

常见做法是「预览用 CSS 渲染，导出时再把 CSS 内联」，这会导致预览好看、粘贴到微信就走样。
这里的做法是：**主题样式在 AST 阶段就逐节点写进 `style` 属性**，预览区和剪贴板拿到的
是同一个字符串，没有第二条渲染路径，也就不存在两者对不上的可能。

```
Markdown → mdast → hast → 结构改写（链接/图片/列表/表格/代码）
       → 主题样式内联 → <section> 包裹 → HTML 字符串
                                   ├─→ 预览
                                   └─→ 剪贴板 text/html
```

输出里没有任何 `class`（微信会丢弃），所有样式都是这种形态：

```html
<p style="font-size: 17px; line-height: 1.8; color: rgba(0, 0, 0, 0.9); ...">正文</p>
```

### 2. 默认主题一比一复刻公众号正文

默认主题「公众号原味」的参数直接取自微信线上文章的 DOM：

| 项目 | 值 |
| --- | --- |
| 字体 | `system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif` |
| 正文 | 17px / 行高 1.8 / `rgba(0,0,0,0.9)` / 两端对齐 / 段距 24px |
| 小标题 | 20px / 字重 500 / `#2B77BF` / 居中 |
| 加粗 | `font-weight: 500`（微信编辑器的「加粗」就是 500，不是 700） |
| 图注 | `#888888` |

### 3. 链接：微信的限制与应对

微信会把**非白名单域名**的 `<a href>` 剥成纯文本——这是平台规则，没有工具能绕开。
所以提供四种策略（设置面板可切换）：

| 模式 | 行为 |
| --- | --- |
| `both`（默认） | 正文保留 `<a href>` + 文末自动生成「参考资料」脚注 |
| `footnote` | 正文只留文字 + 上标序号，URL 全进脚注 |
| `inline` | 只保留 `<a href>`，不生成脚注 |
| `text` | 只保留文字 |

`mp.weixin.qq.com` 的链接粘贴后仍然可点，因此永远按原样保留、不进脚注。

### 4. 代码块

用 [shiki](https://shiki.style/) 高亮，它输出的 token 颜色本身就是 `<span style="color:#xxx">`，
天然满足微信的要求。代码块结构：

```html
<section style="overflow-x: auto; ..."><pre style="..."><code style="white-space: pre; ...">…</code></pre></section>
```

外层 `section` 负责横向滚动（微信对 `section` 上的 `overflow` 支持比 `pre` 稳），
Tab 统一展开成 4 个空格以保证缩进不受微信字体影响。

**一条必须守住的不变量：代码块里不允许出现没有任何属性的标签。**

shiki 对 plaintext 不上色，原始产物是 `<span>` 这种裸标签；而带语言时每段文本都是
`<span style="color:#xxx">`。微信粘贴时会清掉无样式的行内标签，连带把 ASCII 图
依赖的连续空格一起折叠——表现就是「写了 ```go 正常，不写语言的围栏在手机上错乱」。

所以 `normalizeCodeContent()` 会把无语言的产物拉成和带语言完全一样的形状：
有内容的裸 span 补上主题前景色，空行的裸 span 直接删掉。高亮器没就绪时的兜底路径
也手工拼出同一个结构。`src/markdown/pipeline.test.ts` 的「代码块结构一致性」锁住了这点。

**另一条不变量：代码块的 `max-width` / `word-wrap` / `white-space` 必须带 `!important`。**

微信正文样式表里有一条针对所有元素的强制规则：

```css
.rich_media_content * {
  max-width: 100% !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
}
```

超宽的代码行会被压回正文列宽，再按 `break-word` 强行断开——宽 ASCII 图就此错行。
微信给自己的代码块开了豁免（`.code-snippet__fix * { max-width: 1000% !important }`），
我们没有那个 class，只能靠**行内 `!important`**：CSS 层叠里 style 属性上的 `!important`
优先级高于样式表里的 `!important`，正好把这两条顶回去。顶回去之后再给 `<code>`
一个 `width: max-content`，`<pre>` 的横向滚动范围才覆盖得到最长那一行。

> 如果某天微信的粘贴清洗器开始剥掉行内 `!important`，备用方案是改成输出微信原生的
> `<section class="code-snippet__fix">` + 每行一个 `<code>` 的结构，直接吃它自己的
> 豁免规则；代价是行号栏强制出现，且预览端要自带一份同样的 CSS。

### 5. 行内代码不给背景色

微信的深色模式会中和**块级**元素（`pre`、表格单元格）上的背景，但**不会**处理
**行内**元素上显式设置的背景——浅色底会原样留在深色正文里，变成一块刺眼的白斑。

所以行内代码只靠等宽字体 + 强调色区分，不加 `background` / `padding` / `border-radius`。
参考的公众号线上文章整篇正文的背景色用量就是 0，这也是微信原生的做法。

主题里确实需要底色时用半透明值（如 `rgba(0,0,0,0.06)`），它在深色模式下只是淡淡一层，
不会糊成白块。

### 6. 表格：表头无底色，单元格不在任意字符处断开

表头和内容单元格共用同一套样式（`tableCell()`），只多一个加粗，不加底色——
理由同行内代码，浅色底在微信深色模式下会变成一整条灰白块。

单元格显式写 `word-break: normal`。`break-word` 等价于 `overflow-wrap: anywhere`，
会参与 min-content 计算，把每个单元格的最小宽度缩到一个字符；自动表格布局随即把
宽度让给长文本列，短列被压成一字一行（`T/T/L`）。正文容器上的 `break-word`
会继承下来，所以必须在单元格上挡住。

### 7. 列表项内容包进 section

微信编辑器粘贴时要求 `<li>` 内是块级容器；遇到 `<li><strong>好记</strong>:说明</li>`
这种「元素开头 + 裸文本」的混排，会把开头的 `<strong>` 单独提成一段，冒号后的文字掉到
下一行。所以 `wrapListItemContent()` 把 `<li>` 里连续的行内内容包成
`<li><section>…</section></li>`，嵌套列表等块级子元素保持原样。

### 8. 分割线默认隐藏

Markdown 的 `---` / `****` / `___` 写作时用来断章很顺手，但放进公众号正文多半多余，
所以默认不输出（设置面板「隐藏分割线」可关）。

注意这只影响独立成行的分隔符。紧跟在文字下一行的 `----` 在 Markdown 里是
**setext 二级标题**而不是分割线：

```markdown
这是标题
----
```

会渲染成 `<h2>这是标题</h2>`，不受这个开关影响。

## 功能

- 标题、粗体、斜体、删除线、行内代码、引用、有序/无序列表、任务列表、分割线
- 表格（表头突出 + 可横向滚动，移动端不爆版）
- 图片（独占一段时自动居中并把 `alt` 渲染成图注）
- 代码块（30+ 语言按需加载语法）
- 6 套主题：公众号原味 / 默认 / 技术 / 简洁 / 极简 / 深色代码
- 设置面板微调字号、行高、字间距、段距、对齐、正文/标题/链接颜色
- 中英文之间自动补空格
- 分割线默认隐藏（可关）
- 复制富文本 / 复制 Markdown
- 导入 Markdown、导出 Markdown、导出 HTML（含完整 inline CSS）
- 本地文章库 + 自动保存，刷新不丢
- 手机宽度 / 桌面宽度两种预览，编辑区与预览滚动联动
- 界面暗色模式

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `Cmd/Ctrl + S` | 保存 |
| `Cmd/Ctrl + B` | 粗体 |
| `Cmd/Ctrl + I` | 斜体 |
| `Cmd/Ctrl + K` | 插入链接 |
| `Cmd/Ctrl + E` | 行内代码 |
| `Cmd/Ctrl + Shift + X` | 删除线 |
| `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` | 撤销 / 重做 |

## 安全

- Markdown 里的裸 HTML 在 `remark-rehype` 阶段直接丢弃，不使用 `rehype-raw`，
  不存在把用户输入还原成 DOM 的路径
- `href` 只放行 `http:` / `https:` / `mailto:`，`src` 只放行 `http(s):` 与 `data:image/*;base64,`
- 协议检测前会剔除控制字符，挡住 `java\tscript:` 这类绕过手法
- 相关用例见 `src/markdown/pipeline.test.ts` 的「XSS 防护」一节

## 目录结构

```
src/
├── components/
│   ├── Editor/          CodeMirror 编辑器与格式化命令
│   ├── Preview/         预览区与滚动联动
│   ├── Toolbar/         顶部工具栏
│   ├── ThemeSelector/   主题下拉
│   ├── Settings/        排版设置面板
│   ├── Library/         本地文章列表
│   └── ui/              按钮、浮层等界面基础件
├── markdown/
│   ├── pipeline.ts      管线编排（唯一的渲染入口）
│   ├── transforms.ts    代码块/图片/列表/表格等结构改写
│   ├── links.ts         链接策略与脚注生成
│   ├── inlineStyle.ts   把主题样式写进 style 属性
│   ├── highlight.ts     shiki 高亮
│   ├── sanitizer.ts     URL 协议白名单
│   ├── pangu.ts         中英文自动空格
│   └── hast.ts          hast 小工具
├── themes/              6 套主题 + 样式表生成
├── clipboard/           富文本复制、文件导入导出
├── storage/             localStorage 封装、设置、文章库
├── hooks/
└── types/theme.ts
```
