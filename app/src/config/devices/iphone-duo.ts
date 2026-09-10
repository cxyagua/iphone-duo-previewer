import frameInnerSrc from '../../assets/frame-inner.png'
import frameOuterSrc from '../../assets/frame-outer.png'
import type { DeviceProfile } from '../../types/device'

/**
 * iPhone Duo 设备参数配置。
 *
 * 分辨率 / ppi / 对角线：苹果官方发布信息确认（2026-09-09），见 docs/PRD.md 第 0 / 6.1 节。
 * 安全区（safeArea）、灵动岛位置：官方只给了定性描述，没有逐像素数据，
 * 这里用示意比例估算，后续拿到精确数据后只改这份配置，不用动组件代码。
 * frame-inner.png / frame-outer.png 的 holePad 都是对图片 alpha 通道做像素分析实测得出的精确值，不是估的。
 */
export const IPHONE_DUO: DeviceProfile = {
  deviceId: 'iphone-duo',
  displayName: 'iPhone Duo',
  screens: {
    inner: {
      id: 'inner',
      resolution: { w: 1878, h: 2670 },
      ppi: 430,
      // dpr：官方未公布。7.6" 尺寸更接近 iPad mini 而非普通 iPhone，苹果平板类大屏一贯用 2x
      // （不管 ppi 高低，iPad mini/Air 326ppi 也是 2x）；三星折叠屏主屏实测也是 2x（Galaxy Fold
      // 768 CSS px、Galaxy Z Fold 928 CSS px），按 2x 更贴近真机，推出逻辑分辨率 939×1335
      dpr: 2,
      diagonalInches: 7.6,
      hasIsland: false,
      fold: { portrait: 'horizontal', landscape: 'vertical' },
      safeArea: {
        portrait: { top: 2.2, bottom: 3.2, left: 1.2, right: 1.2 },
        landscape: { top: 1.2, bottom: 1.2, left: 2.2, right: 2.2 },
      },
      frameImage: {
        src: frameInnerSrc,
        // 1.png（1480x1063）alpha 通道实测：left=53 right=1424 top=73 bottom=1003
        holePad: { top: 6.87, bottom: 5.64, left: 3.58, right: 3.78 },
        nativeOrientation: 'landscape',
        naturalSize: { w: 1480, h: 1063 },
      },
    },
    outer: {
      id: 'outer',
      resolution: { w: 1398, h: 2034 },
      ppi: 460,
      // dpr：同上按 @3x 取值，推出逻辑分辨率 466×678
      dpr: 3,
      diagonalInches: 5.4,
      hasIsland: true,
      // 对 frame-outer.png 做连通域分析实测出的摄像头圆点位置：在裁剪后的 918x1047 原图里，
      // 摄像头是一个孤立的近黑色圆形色块，圆心 (797, 114)，直径 62px（与镜头旁边连成一片的
      // 机身黑色边框是分开的两个连通域，取的是面积较小、独立的那一个）。
      // 换算成相对屏幕开孔（contentRect，见下面 holePad 算出的 left=67 right=875 top=42 bottom=1011，
      // 宽 808 高 969）的百分比：圆心 left=(797-67)/808=90.35%，top=(114-42)/969=7.43%；
      // 直径换算成宽高各自的百分比（不能共用一个百分比，因为 contentRect 不是正方形，宽高各自的
      // 每百分比对应的实际像素数不一样，直接用同一个百分比会把正圆画成椭圆）：
      // width=62/808=7.67%，height=62/969=6.40%；top/left 再各自减半个宽高换算成左上角坐标。
      // landscape 直接复用同一组数值，不能重新按角度换算——DeviceFrame 里横屏是把素材连同内容一起
      // 整体旋转的刚体旋转，这个安全区色块画在同一个本地坐标系里，会跟着素材一起
      // 转到正确位置，如果再手动做一次角度变换反而是重复旋转，会转到镜头对面去。
      island: {
        portrait: { top: 4.23, left: 86.51, width: 7.67, height: 6.4 },
        landscape: { top: 4.23, left: 86.51, width: 7.67, height: 6.4 },
      },
      safeArea: {
        portrait: { top: 6.5, bottom: 3, left: 3.2, right: 1.4 },
        landscape: { top: 3.2, bottom: 1.4, left: 3, right: 6.5 },
      },
      frameImage: {
        src: frameOuterSrc,
        // 素材本身（除了机身四周的合理留白）左侧还带了一大截空白画布（铰链那侧，非机身也非屏幕），
        // 上下也各带了几十像素空白，之前直接拿这版原图算 holePad 会让机身在展示框里整体偏移；
        // 已按机身轮廓 alpha 通道重新紧裁到 918x1047，再对裁剪后的图做 alpha 通道实测：
        // left=67 right=875(margin 43) top=42 bottom=1011(margin 36)
        // 裁剪后左侧边框仍明显比右侧宽，符合 PRD 里"右窄左宽让位铰链"的 D 形非对称描述——
        // 这个不对称是屏幕开孔相对机身的真实设计，不是裁剪误差，保留
        holePad: { top: 4.01, bottom: 3.44, left: 7.3, right: 4.68 },
        nativeOrientation: 'portrait',
        naturalSize: { w: 918, h: 1047 },
      },
    },
  },
}

// 内外屏切换按钮点下去的一瞬间才第一次用到另一张素材的话，图片还没取到会有一下空白/间隙，
// 应用启动时就把两张都预热进浏览器缓存，真正切换时只是换 src，直接读缓存，不会有加载间隙。
if (typeof window !== 'undefined') {
  Object.values(IPHONE_DUO.screens).forEach((screen) => {
    const preload = new Image()
    preload.src = screen.frameImage.src
  })
}
