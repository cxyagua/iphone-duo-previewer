import { computed, ref } from 'vue'
import { IPHONE_DUO } from '../config/devices/iphone-duo'
import type { FillMode, Orientation, ScreenId } from '../types/device'

/**
 * 内屏/外屏 + 横竖屏 + 填充模式 + 安全区开关的状态与派生数据。
 * 做成可实例化的 composable（而非模块级单例），为将来「分屏效果预览」
 * 需要两份独立 screen 状态时留好扩展空间，见 TECH_SPEC.md 第 9 节。
 */
export function useScreenMode() {
  const screenMode = ref<ScreenId>('inner')
  const orientation = ref<Record<ScreenId, Orientation>>({
    inner: 'landscape',
    outer: 'portrait',
  })
  const fillMode = ref<FillMode>('contain')
  const safeAreaOn = ref(false)

  const screen = computed(() => IPHONE_DUO.screens[screenMode.value])
  const currentOrientation = computed(() => orientation.value[screenMode.value])
  const aspect = computed(() => {
    const { w, h } = screen.value.resolution
    return currentOrientation.value === 'portrait' ? { w, h } : { w: h, h: w }
  })
  const safeArea = computed(() => screen.value.safeArea[currentOrientation.value])

  function setScreenMode(id: ScreenId) {
    screenMode.value = id
  }
  function toggleOrientation() {
    const id = screenMode.value
    orientation.value = {
      ...orientation.value,
      [id]: orientation.value[id] === 'portrait' ? 'landscape' : 'portrait',
    }
  }
  function setFillMode(mode: FillMode) {
    fillMode.value = mode
  }
  function toggleSafeArea() {
    safeAreaOn.value = !safeAreaOn.value
  }

  return {
    screenMode,
    orientation,
    fillMode,
    safeAreaOn,
    screen,
    currentOrientation,
    aspect,
    safeArea,
    setScreenMode,
    toggleOrientation,
    setFillMode,
    toggleSafeArea,
  }
}
