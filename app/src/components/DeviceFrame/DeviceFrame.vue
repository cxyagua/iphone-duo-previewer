<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SafeAreaOverlay from './SafeAreaOverlay.vue'
import type { Orientation, ScreenProfile } from '../../types/device'

const props = defineProps<{
  screen: ScreenProfile
  orientation: Orientation
  safeAreaOn: boolean
}>()

const stageRef = ref<HTMLDivElement | null>(null)
const frameW = ref(0)
const frameH = ref(0)

// 舞台盒子（frameW/frameH）要按素材照片本身的宽高比来算，而不是按屏幕物理分辨率算——
// 机身照片包含大量分辨率之外的东西（边框、铰链、摄像头凸起），比例跟纯屏幕分辨率不一致
// （比如外屏分辨率比例约 0.69，但机身照片本身接近 0.88），如果盒子按分辨率比例撑开，
// 契合分辨率比例做 contain 布局的照片就会在盒子里出现上下/左右留白，显得比实际能用的空间小。
// 按照片自身比例撑盒子，photo 能完全填满盒子，不浪费舞台空间。
// orientation 与素材 nativeOrientation 不一致时会整体旋转 90°，此时盒子的宽高也要跟着互换。
const aspect = computed(() => {
  const { w, h } = props.screen.frameImage.naturalSize
  const isNative = props.orientation === props.screen.frameImage.nativeOrientation
  return isNative ? { w, h } : { w: h, h: w }
})

// 舞台高度上限不能从 stage.clientHeight 读——stage 没有固定高度，它的盒子高度本身就是被
// frameH（这个函数的计算结果）撑出来的，读自己刚撑出来的高度当"可用高度"是循环依赖：
// 一旦某次算出一个偏大的 frameH，之后每次 fit() 都会读到那个偏大值当上限，越缩窗口越缩不下去；
// 反过来给移动端设个较小的固定上限，又会在窗口没那么窄但也没那么高的情况下（比如手动拖窄的
// 桌面浏览器窗口、或者宽高比更"高瘦"的外屏）把上限卡得比实际可用空间小很多，画框显得很小。
// 所以上限直接按 window.innerHeight 的比例算，跟 stage 自己当前渲染出来多高完全无关；
// 舞台 div 本身也不再设 min-height，它的实际高度就等于 frameH，宽高比"扁"的屏幕自然矮，
// 不会像之前那样被强制撑出一截用不上的留白。
function heightBudget() {
  return Math.min(Math.max(window.innerHeight * 0.72, 220), 860)
}

function fit() {
  const stage = stageRef.value
  if (!stage) return
  const cs = getComputedStyle(stage)
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const availW = Math.max(stage.clientWidth - padX, 0)
  const availH = Math.max(heightBudget() - padY, 0)
  const ratio = aspect.value.w / aspect.value.h
  let w = availW
  let h = w / ratio
  if (h > availH) {
    h = availH
    w = h * ratio
  }
  frameW.value = w
  frameH.value = h
}

let ro: ResizeObserver | null = null
onMounted(() => {
  fit()
  if (stageRef.value && window.ResizeObserver) {
    ro = new ResizeObserver(() => fit())
    ro.observe(stageRef.value)
  }
  window.addEventListener('resize', fit)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', fit)
})
watch(aspect, () => fit())

const holePad = computed(() => props.screen.frameImage.holePad)
// 素材本身是按 nativeOrientation 拍的；渲染另一方向时靠旋转同一张图实现，不需要为每个屏幕准备两张素材
const rotated = computed(() => props.orientation !== props.screen.frameImage.nativeOrientation)

// frameW/frameH 盒子现在已经是照片自身比例撑出来的（见上面 aspect），这里仍然用 contain
// 而不是直接等于盒子尺寸，是留一道保险：万一某个屏幕的照片比例和盒子算出来的比例有浮点误差，
// 也只会留一点点边距，绝不会把真实照片拉伸变形。
// 旋转场景下素材是在"旋转前"的坐标系里铺开的，layoutBox 要把 frameW/frameH 换回旋转前的宽高。
const layoutBox = computed(() =>
  rotated.value ? { w: frameH.value, h: frameW.value } : { w: frameW.value, h: frameH.value },
)
const imageRect = computed(() => {
  const box = layoutBox.value
  const { w: iw, h: ih } = props.screen.frameImage.naturalSize
  if (!box.w || !box.h || !iw || !ih) return { left: 0, top: 0, width: 0, height: 0 }
  const scale = Math.min(box.w / iw, box.h / ih)
  const width = iw * scale
  const height = ih * scale
  return { left: (box.w - width) / 2, top: (box.h - height) / 2, width, height }
})
const contentRect = computed(() => {
  const img = imageRect.value
  const pad = holePad.value
  return {
    left: img.left + (img.width * pad.left) / 100,
    top: img.top + (img.height * pad.top) / 100,
    width: img.width * (1 - (pad.left + pad.right) / 100),
    height: img.height * (1 - (pad.top + pad.bottom) / 100),
  }
})

const frameRef = ref<HTMLDivElement | null>(null)
defineExpose({ frameRef })

// 内外屏切换时不做尺寸渐变，而是先淡出、等新素材真正加载完成再淡入，
// 避免"先跳尺寸、素材还没铺满"露出中间态的间隙。
// 素材加载完成以 <img> 的 load/error 事件为准，不是猜一个固定延时——两张素材虽然已经在
// app 启动时预热进了浏览器缓存，正常应该很快触发，但真机/弱网下缓存不一定命中。
const visible = ref(true)
let fadeSafetyTimer: ReturnType<typeof setTimeout> | undefined

function onFrameImageSettled() {
  clearTimeout(fadeSafetyTimer)
  visible.value = true
}

watch(
  () => props.screen.id,
  () => {
    visible.value = false
    clearTimeout(fadeSafetyTimer)
    // 兜底：万一 load/error 出于某种异常一直不触发，也不能永远卡在淡出状态
    fadeSafetyTimer = setTimeout(() => {
      visible.value = true
    }, 1500)
  },
)
onBeforeUnmount(() => clearTimeout(fadeSafetyTimer))
</script>

<template>
  <div
    ref="stageRef"
    class="relative flex items-center justify-center min-h-[120px] px-0 md:px-[clamp(16px,3vw,32px)]"
    style="padding-block: clamp(4px, 0.8vw, 10px)"
  >
    <div
      ref="frameRef"
      class="relative flex-none transition-opacity duration-200 ease-out [container-type:size]"
      :class="visible ? 'opacity-100' : 'opacity-0'"
      :style="{ width: frameW + 'px', height: frameH + 'px' }"
    >
      <!-- 内外屏都用真实抠图素材：素材本身是 nativeOrientation 方向，另一方向靠旋转同一张图实现 -->
      <div
        class="absolute"
        :class="
          rotated
            ? 'top-1/2 left-1/2 h-[100cqw] w-[100cqh] -translate-x-1/2 -translate-y-1/2 rotate-90'
            : 'inset-0'
        "
      >
        <div
          class="absolute overflow-hidden bg-[var(--color-surface-2)]"
          :style="{
            left: contentRect.left + 'px',
            top: contentRect.top + 'px',
            width: contentRect.width + 'px',
            height: contentRect.height + 'px',
          }"
        >
          <slot />
          <SafeAreaOverlay v-if="safeAreaOn" :screen="screen" :orientation="orientation" />
        </div>
        <img
          :src="screen.frameImage.src"
          alt=""
          class="pointer-events-none absolute z-[5] select-none"
          :style="{
            left: imageRect.left + 'px',
            top: imageRect.top + 'px',
            width: imageRect.width + 'px',
            height: imageRect.height + 'px',
          }"
          @load="onFrameImageSettled"
          @error="onFrameImageSettled"
        />
      </div>
    </div>
  </div>
</template>
