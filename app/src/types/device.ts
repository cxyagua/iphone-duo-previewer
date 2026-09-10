export type ScreenId = 'inner' | 'outer'
export type Orientation = 'portrait' | 'landscape'
export type FillMode = 'contain' | 'cover'

export interface SafeAreaBox {
  top: number
  bottom: number
  left: number
  right: number
}

export interface HolePad {
  top: number
  bottom: number
  left: number
  right: number
}

export interface CornerRadius {
  tl: number
  tr: number
  br: number
  bl: number
}

/**
 * 一块屏幕（内屏/外屏）的完整展示参数。
 * 分辨率/ppi/对角线取自 PRD 6.1 已确认的 iPhone Duo 官方数据；
 * 安全区、圆角为示意估算值（PRD 中标记 TBD，待官方精确数据/实测校准）。
 */
export interface ScreenProfile {
  id: ScreenId
  resolution: { w: number; h: number }
  ppi: number
  /** 物理像素 -> 逻辑（CSS）像素的缩放系数，即 devicePixelRatio，用于还原网页在真机上实际拿到的 viewport 宽高 */
  dpr: number
  diagonalInches: number
  safeArea: Record<Orientation, SafeAreaBox>
  hasIsland: boolean
  islandEdge?: Record<Orientation, 'top' | 'bottom' | 'left' | 'right'>
  fold?: Record<Orientation, 'horizontal' | 'vertical'>
  /** 有真实抠图素材的屏幕：素材内屏幕开孔相对整图的留白百分比 */
  frameImage?: {
    src: string
    holePad: HolePad
  }
  /** 没有素材、用 CSS 手绘的屏幕：按 360px 基准宽度标定的圆角 + 边框厚度比例 */
  cssBezel?: {
    corner: Record<Orientation, CornerRadius>
    bezelRatio: number
  }
}

export interface DeviceProfile {
  deviceId: string
  displayName: string
  screens: Record<ScreenId, ScreenProfile>
}
