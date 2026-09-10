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
  /** 灵动岛/摄像头安全区色块，相对内容画布（屏幕开孔）的位置百分比；直接量的是素材照片里摄像头的真实位置，不是简单居中估算 */
  island?: Record<Orientation, { top: number; left: number; width: number; height: number }>
  fold?: Record<Orientation, 'horizontal' | 'vertical'>
  /** 真实抠图素材：素材内屏幕开孔相对整图的留白百分比 + 素材本身是按哪个方向拍摄/设计的 */
  frameImage: {
    src: string
    holePad: HolePad
    /** 素材原始方向；渲染另一方向时靠 CSS 旋转同一张图实现，不需要两张素材 */
    nativeOrientation: Orientation
    /**
     * 素材本身（nativeOrientation 方向下）的像素尺寸。
     * 用于按素材真实长宽比 contain 布局，避免图被拉伸变形——
     * 外框展示区的宽高比是按屏幕分辨率算的，跟素材照片本身的长宽比不一定完全一致。
     */
    naturalSize: { w: number; h: number }
  }
}

export interface DeviceProfile {
  deviceId: string
  displayName: string
  screens: Record<ScreenId, ScreenProfile>
}
