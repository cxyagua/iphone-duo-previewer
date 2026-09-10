import frameInnerSrc from '../../assets/frame-inner.png'
import type { DeviceProfile } from '../../types/device'

/**
 * iPhone Duo 设备参数配置。
 *
 * 分辨率 / ppi / 对角线：苹果官方发布信息确认（2026-09-09），见 PRD.md 第 0 / 6.1 节。
 * 安全区（safeArea）、外屏圆角（corner）、灵动岛位置：官方只给了定性描述，没有逐像素数据，
 * 这里用示意比例估算，后续拿到精确数据后只改这份配置，不用动组件代码。
 * frame-inner.png 的 holePad 是对图片 alpha 通道做像素分析实测得出的精确值，不是估的。
 */
export const IPHONE_DUO: DeviceProfile = {
  deviceId: 'iphone-duo',
  displayName: 'iPhone Duo',
  screens: {
    inner: {
      id: 'inner',
      resolution: { w: 1878, h: 2670 },
      ppi: 430,
      // dpr：官方未公布，按苹果 430~460ppi 机型一贯使用 @3x 取值，推出逻辑分辨率 626×890
      dpr: 3,
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
      islandEdge: { portrait: 'top', landscape: 'right' },
      safeArea: {
        portrait: { top: 6.5, bottom: 3, left: 3.2, right: 1.4 },
        landscape: { top: 3.2, bottom: 1.4, left: 3, right: 6.5 },
      },
      cssBezel: {
        bezelRatio: 0.045,
        corner: {
          portrait: { tl: 34, tr: 34, br: 10, bl: 10 },
          landscape: { tl: 10, tr: 34, br: 34, bl: 10 },
        },
      },
    },
  },
}
