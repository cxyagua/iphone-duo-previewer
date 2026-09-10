# iDuoPreviewer 技术开发文档

> 配合 `PRD.md`（产品方案）和 `FEATURE_LIST.md`（功能清单打钩）一起看。本文档只覆盖技术选型、项目结构、模块拆分和关键实现思路，不包含具体代码。

---

## 1. 技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | Vue 3（Composition API + `<script setup>`） | |
| 语言 | TypeScript | 全项目类型化，尤其是设备参数配置这类结构化数据 |
| 构建工具 | Vite | |
| 样式 | Tailwind CSS | 工具型产品，原子化 CSS 效率高，也方便做深浅色 token 切换（V1.2） |
| 状态管理 | Vue 内置 `ref`/`reactive` + 少量 `provide/inject`，**不引入 Pinia** | MVP 阶段状态很简单（当前内容、当前屏幕模式、UI开关），单文件/少数几个 composable 就能管，过早引入状态库是不必要的复杂度 |
| 路由 | 不需要 | 单页面工具，没有多路由场景，不引入 vue-router |
| PDF 渲染 | `pdf.js`（`pdfjs-dist`） | 见 PRD 6.2 |
| 国际化 | `vue-i18n`（Composition API 模式） | 新增，见 PRD 4.7、本文档第 5.7 节 |
| 图片手势交互 | `@panzoom/panzoom` | 图片预览的滚轮缩放 + 拖拽平移，超出原始 MVP 范围的增强体验 |
| 包管理 | pnpm（推荐）或 npm，看团队习惯 | |

MVP 阶段（对应 PRD 第 9 节已确认的决策）：**不需要后端**，网页预览仅做 iframe 嵌入，文件完全本地渲染不上传。因此 V1.0 是一个**纯前端静态站**，可以直接用 Vite 打包产物部署到任意静态托管（Vercel / Netlify / 静态对象存储 + CDN）。

---

## 2. 项目初始化

```bash
npm create vite@latest iduo-previewer -- --template vue-ts
cd iduo-previewer
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install pdfjs-dist
```

Tailwind 配置要点：
- `content` 指向 `./index.html` 和 `./src/**/*.{vue,ts}`。
- 在 `tailwind.config.ts` 里把**设备相关的视觉 token**（比如外框深色、预览区背景灰）定义成自定义颜色，不要在组件里写死十六进制色值，方便以后统一调整视觉风格（呼应 PRD 第 7 节视觉设计建议）。
- 预留 `darkMode: 'class'` 配置，即使 MVP 不做深色模式（V1.2 才做），提前预留成本很低，后续加开关即可。

---

## 3. 目录结构建议

```
src/
├── assets/                  # 静态资源（如无内容占位图标）
├── components/
│   ├── DeviceFrame/
│   │   ├── DeviceFrame.vue          # 设备外框容器，根据当前 screen + orientation 配置渲染裁切区
│   │   ├── SafeAreaOverlay.vue      # 安全区色块浮层，按当前 orientation 读取对应的安全区配置
│   │   ├── ScreenModeToggle.vue     # 内外屏切换分段控制器
│   │   └── OrientationToggle.vue    # 横屏/竖屏切换按钮，内外屏各自独立状态
│   ├── PreviewContent/
│   │   ├── ImagePreview.vue
│   │   ├── PdfPreview.vue
│   │   └── WebPreview.vue           # iframe 嵌入 + 加载失败态
│   ├── InputPanel/
│   │   ├── FileUploader.vue         # 拖拽/点击上传
│   │   └── UrlInput.vue
│   └── common/
│       ├── EmptyState.vue
│       ├── ErrorState.vue
│       ├── LoadingSpinner.vue
│       └── LocaleSwitcher.vue        # 语言切换分段控制器
├── composables/
│   ├── usePreviewSource.ts   # 当前预览内容（图片/PDF/网页）的状态与切换逻辑
│   ├── useScreenMode.ts      # 内屏/外屏状态 + 横竖屏 orientation 状态 + 派生出的最终设备参数
│   └── useFileValidation.ts  # 文件类型/大小校验逻辑
├── config/
│   └── devices/
│       └── iphone-duo.ts     # 设备参数配置（见第 4 节），后续多机型直接在此目录加文件
├── i18n/
│   ├── index.ts              # createI18n 实例、语言检测与持久化（见第 5.7 节）
│   └── locales/
│       ├── en.json           # 英文语言包（默认/回退语言）
│       └── zh.json           # 中文语言包
├── types/
│   ├── device.ts             # DeviceProfile / ScreenProfile 类型定义
│   └── preview.ts            # PreviewSource 联合类型定义
├── App.vue
└── main.ts
```

拆分原则：
- `DeviceFrame` 只关心"怎么把一个内容画到某个屏幕比例的框里"，不关心内容是图片还是网页——内容渲染统一通过一个插槽/`PreviewContent` 组件传进去，方便以后加新内容类型（比如 GIF 特殊处理）不用改 DeviceFrame。
- `PreviewContent` 下的三个组件各自独立，互不感知彼此存在，由父级根据当前 `PreviewSource.type` 做条件渲染。
- 设备参数（config/devices）和渲染组件解耦——组件永远从 `useScreenMode` 拿到的配置对象读参数，不允许在组件里写死任何设备相关的数字。

---

## 4. 核心数据结构（TypeScript）

对应 PRD 第 6.1 节确认的设备参数表，转成类型定义思路（不是最终代码，是结构说明）：

```
ScreenProfile:
  label: string                     // "内屏" / "外屏"
  resolution: { widthPx, heightPx }  // 始终以竖屏物理分辨率为基准，横屏由运行时宽高互换得出
  ppi: number
  diagonalInches: number
  aspectRatio: string                // "1878:2670"
  cornerStyle: 'symmetric' | 'asymmetric-d-shape'
  cornerRadius: { topLeft, topRight, bottomLeft, bottomRight }  // px，视觉稿阶段实测填入，竖屏姿态下的值
  notch: { type: 'none' | 'dynamic-island', safeAreaTopPx?: number }
  safeArea: { topPx, bottomPx, leftPx, rightPx }       // 竖屏安全区
  safeAreaLandscape: { topPx, bottomPx, leftPx, rightPx }  // 横屏安全区，单独定义、不做旋转推导（见 5.6）
  foldCreaseSafeArea?: boolean       // 仅内屏用得到

DeviceProfile:
  deviceId: string                   // "iphone-duo"
  displayName: string
  screens: { inner: ScreenProfile, outer: ScreenProfile }

Orientation: 'portrait' | 'landscape'   // 内外屏各自独立持有一份，见 useScreenMode

PreviewSource:
  一个联合类型，三选一：
    { type: 'image', file: File, objectUrl: string }
    { type: 'pdf', file: File, objectUrl: string, currentPage: number, totalPages: number }
    { type: 'url', value: string, loadState: 'idle' | 'loading' | 'loaded' | 'blocked' }
```

要点：
- `cornerRadius` 目前 PRD 里标记 TBD，先在配置文件里给一个合理估算值（比如按 iPhone 16 Pro Max 的圆角比例换算），等视觉稿定稿后直接改这一处配置，不涉及组件代码改动。
- `safeAreaLandscape` 不是从 `safeArea` 自动旋转算出来的——灵动岛/摄像头的物理位置固定，横屏时会偏到左边或右边，需要在配置文件里单独手填一套值（MVP 阶段只需要填"一个固定旋转方向"这一套，不用做两套镜像值，呼应 PRD 4.6 的简化处理）。
- `PreviewSource` 用可辨识联合类型（discriminated union，靠 `type` 字段区分），配合 Vue 的 `<script setup>` + `computed` 做类型收窄，避免到处写 `as any`。

---

## 5. 关键实现思路（不含代码，只讲技术路径）

### 5.1 设备外框（含 D 形外屏非对称圆角）
- 内屏 / 外屏都改用真实抠图素材（`frame-inner.png` / `frame-outer.png`），不再用 CSS/SVG 手绘轮廓。素材本身自带非对称圆角、铰链、摄像头等细节，不需要额外的 `clip-path` 或 SVG path。
- 素材以 `nativeOrientation` 记录拍摄/设计时的方向（内屏是 landscape，外屏是 portrait），渲染另一方向时用 CSS `rotate-90` 直接旋转同一张图，不需要为每个屏幕准备两张素材。
- 素材内屏幕开孔（transparent hole）相对整图的留白百分比记在 `ScreenProfile.frameImage.holePad` 里，靠脚本对图片 alpha 通道做像素分析实测得出（而不是估算），内容层按这个百分比定位，叠在素材下方；素材本身盖在上层（z-index 更高），靠自身不透明的圆角边框把内容层的直角遮成跟真机一致的圆角/D 形轮廓。
- 外屏素材原图四周有大片透明留白（尤其右侧，导致图放大铺满容器后中间露出一截透明空隙），处理时先按机身轮廓的 alpha 包围盒紧裁一次，再基于裁剪后的图重新测 `holePad`，裁剪后右侧边框明显比左侧窄，才吻合"右窄左宽让位铰链"的描述。

### 5.2 安全区浮层
- 一个绝对定位的 overlay 层，叠在内容层之上、设备外框之下（z-index 居中）。
- 根据 `ScreenProfile.safeArea` 的 top/bottom/left/right 各画一个半透明色块（`absolute` + 百分比或按画布实际渲染尺寸换算的 px），不同区域给不同 `background-color`（Tailwind 任意值语法 `bg-[rgba(...)]`）。
- 浮层显隐由一个 `ref<boolean>` 控制，工具条按钮切换；内外屏切换时浮层跟着 `useScreenMode` 派生的配置自动更新，不需要额外状态同步逻辑。

### 5.3 图片/PDF 本地渲染
- 图片：`URL.createObjectURL(file)` 生成本地 blob URL 给 `<img :src>`，组件卸载或换文件时记得 `URL.revokeObjectURL` 释放内存。
- PDF：`pdfjs-dist` 在 Web Worker 里解析，渲染当前页到 `<canvas>`；翻页只是重新渲染对应页码到同一个 canvas，不需要重新解析整个文档。

### 5.4 网页 iframe 嵌入与失败检测
- `<iframe :src="url">`，设置一个超时定时器（如 5 秒），配合 `iframe.onload` 事件：如果 onload 在超时前触发且能确认非跨域报错（跨域场景下 onload 的触发本身不代表内容真的渲染出来了，这是 iframe 嵌入检测的已知局限），展示内容；超时未触发或明确捕获到加载失败，则切换到 `blocked` 状态展示提示文案。
- 说明：由于浏览器同源策略，前端**无法 100% 可靠判断**一个跨域 iframe 是否因为 `X-Frame-Options` 被拒绝渲染（很多时候只是静默空白），超时兜底是目前前端唯一可行的近似方案，做好预期管理（PRD 里已经写清楚这是行业通病，不是本产品 bug）。

### 5.5 填充模式 / 屏幕切换动画
- 填充模式直接映射 CSS `object-fit`（图片）或 canvas 绘制时的缩放策略（PDF）。
- 内外屏切换：外框容器的宽高比切换配合 Tailwind 的 `transition` 工具类（`transition-[width,height] duration-300 ease-out`）实现平滑过渡。

### 5.6 横竖屏切换（MVP 新增）
- `useScreenMode` 内部维护两个独立的 `ref<Orientation>`（内屏一个、外屏一个），切换内外屏时不影响各自已选的横竖屏状态，用户切回来时能记住之前选的方向。
- 外框容器最终渲染宽高 = 竖屏 `resolution` 的宽高，横屏时 CSS 直接互换 `width`/`height`（配合 5.1 的 clip-path，路径也要按 90° 旋转后的宽高重新生成，不能只转外层容器不转内部 SVG 坐标系）。
- 安全区浮层组件根据当前 orientation 读 `safeArea` 还是 `safeAreaLandscape`，二者是配置文件里两份独立数据，组件本身不做任何旋转计算，逻辑上更简单也更不容易出错。
- MVP 范围内横屏只有一个固定方向，`OrientationToggle.vue` 做成一个二态开关（竖屏/横屏）即可，不需要做三态或四态的方向选择器。

### 5.7 多语言 / 国际化（新增）

- 使用 `vue-i18n` 的 Composition API 模式（`createI18n({ legacy: false, ... })`），在 `main.ts` 里通过 `app.use(i18n)` 全局挂载，组件内统一用 `const { t } = useI18n()` 取文案，不手写字符串拼接。
- 语言包按 locale 拆成独立 JSON 文件（`src/i18n/locales/en.json` / `zh.json`），key 按功能模块分组（`app` / `toolbar` / `fileUploader` / `toast` 等），与 `types/` 下的类型拆分思路一致，方便新增语言时对照翻译、不遗漏 key。
- 初始语言检测顺序：`localStorage`（key: `iduo-locale`）中的用户偏好 → 找不到则回退默认英文（`en`）。当前版本 MVP 阶段不做浏览器 `navigator.language` 自动检测，避免和用户手动选择的语言产生冲突歧义。
- `fallbackLocale: 'en'`：任何语言包缺失某个 key 时自动回退英文文案，不会出现空白或 key 原样展示的情况。
- 切换语言通过 `setLocale(locale)` 同步更新 `i18n.global.locale` 和 `localStorage`，是纯前端状态切换，不触发页面刷新或重新请求内容。
- 后续新增语言（如日语）的步骤：在 `locales/` 下新增一份 JSON、在 `i18n/index.ts` 的 `LocaleCode` 联合类型和 `messages` 里注册、在 `LocaleSwitcher.vue` 的 `options` 里加一项，不需要改动其余业务组件。

---

## 6. 依赖清单

**MVP 必需**
- `vue` `typescript` `vite` `@vitejs/plugin-vue`
- `tailwindcss` `postcss` `autoprefixer`
- `pdfjs-dist`

**MVP 范围之外已引入（现网使用中）**
- `vue-i18n`：多语言支持，见第 5.7 节
- `@panzoom/panzoom`：图片预览的缩放/平移手势

**V1.1 才需要引入**
- `html2canvas`（导出预览图为 PNG，如果最终选择 DOM 截图方案；若内容全部走 canvas 渲染则可能不需要额外库）
- 网页截图兜底（已实现，2026-09-10）：后端是仓库内新增的 `server/` 目录，独立的 Node 项目（有自己的 `package.json`，依赖不进 `app/`），技术栈 Express + Playwright（Chromium）。开发环境下 `server/` 监听 3001 端口，`app/vite.config.ts` 用 `server.proxy` 把 `/api` 转发到 3001，前端始终走相对路径调用，保持和 `app` 同域，不需要引入 CORS 配置。两个接口：
  - `POST /api/embed-check`：轻量请求头预检，判断目标网址是否会拒绝 iframe 嵌入（见 `PRD.md` 4.1 节的踩坑记录——单靠 iframe 加载超时判断不可靠，被拒绝嵌入的网站通常几百毫秒内就触发 `load` 事件）。
  - `POST /api/screenshot`：真正调用 Playwright 截图，内存缓存 10 分钟 + 同 URL 并发去重 + 全局并发上限 3。
  - 两个接口都先过一遍 `server/src/ssrf.ts` 的基础 SSRF 校验（协议白名单 + hostname/DNS 解析结果过滤私有网段）。

**不建议引入**
- 大型 UI 组件库（Element Plus / Ant Design Vue 等）——这是一个视觉高度定制的工具型产品（设备框、安全区浮层都是自绘），通用组件库能复用的部分很少，反而增加包体积和样式覆盖成本，用 Tailwind 手写交互组件（上传区、按钮、分段控制器）更合适。
- Pinia / Vuex——见第 1 节说明。

---

## 7. 开发规范

- 组件命名：多单词 PascalCase（Vue 官方推荐），如 `DeviceFrame.vue`、`UrlInput.vue`。
- 类型定义集中放在 `src/types/`，组件内部不重复定义相同结构的 interface。
- 所有设备相关的数字（比例、圆角、安全区）**只允许**出现在 `src/config/devices/*.ts` 里，代码审查时重点检查有没有"魔法数字"泄漏到组件里。
- ESLint + Prettier 走 Vue 官方推荐配置（`@vue/eslint-config-typescript`），提交前跑 `lint` 和 `type-check`。
- 建议补充少量单元测试（Vitest）覆盖 `composables/`（比如 `useFileValidation` 的边界条件、`useScreenMode` 的派生逻辑），组件本身可以先不强求测试覆盖率，工具型产品早期手工验证 + 少量单测性价比更高。

---

## 8. 部署建议（MVP 阶段）

- `npm run build` 产出纯静态文件，直接部署到 Vercel / Netlify / Cloudflare Pages 均可，免运维、免服务器成本，符合"MVP 不需要后端"的决策。
- 域名/HTTPS 走托管平台自带能力即可，不需要额外配置。
- V1.1 已引入网页截图兜底服务（`server/` 目录），当前 dev 环境的对外访问方式：`cloudflared tunnel --url http://localhost:5173` 暴露 Vite dev server，`server/`（3001 端口）本身不直接对外暴露，只通过 Vite 的 `server.proxy` 被同一个隧道域名下的 `/api` 路径间接访问。生产部署方案（`server/` 单独部署 + 前端配置真实 API base URL，或前端反代）仍未定，留待正式上线前评估。

---

## 9. 面向未来的架构提示：分屏效果预览（V1.2+，不在 MVP 内）

分屏预览（PRD 4.7）需要**两组独立的 `PreviewSource`**同时存在，会影响到 `usePreviewSource` 目前"全局唯一一份内容状态"的假设。MVP 阶段暂时不用为此做过度设计，但写 `usePreviewSource` 时优先把它做成一个可以传参数实例化的 composable（而不是模块级单例），这样未来分屏功能需要两份独立状态时，直接调用两次拿到两个独立实例即可，不需要推翻重写。

---

文档结束。本文档随 `FEATURE_LIST.md` 的开发进度同步更新，若设备参数（`config/devices/iphone-duo.ts`）或功能范围发生变化，记得回来同步这里的说明。
