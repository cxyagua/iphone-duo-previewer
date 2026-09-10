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

const aspect = computed(() => {
  const { w, h } = props.screen.resolution
  return props.orientation === 'portrait' ? { w, h } : { w: h, h: w }
})

function fit() {
  const stage = stageRef.value
  if (!stage) return
  const cs = getComputedStyle(stage)
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const availW = Math.max(stage.clientWidth - padX, 0)
  const availH = Math.max(stage.clientHeight - padY, 0)
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

// 外屏（css 手绘外框）：圆角配置以 360px 参考宽度标定，按实际帧宽等比缩放
const bezelPx = computed(() => Math.max(6, frameW.value * (props.screen.cssBezel?.bezelRatio ?? 0.045)))
const cornerScale = computed(() => (frameW.value ? frameW.value / 360 : 1))
const corner = computed(() => {
  const c = props.screen.cssBezel?.corner[props.orientation]
  if (!c) return { tl: 0, tr: 0, br: 0, bl: 0 }
  const s = cornerScale.value
  return { tl: c.tl * s, tr: c.tr * s, br: c.br * s, bl: c.bl * s }
})
const bezelRadius = computed(
  () => `${corner.value.tl}px ${corner.value.tr}px ${corner.value.br}px ${corner.value.bl}px`,
)
const contentRadius = computed(() => {
  const b = bezelPx.value
  const c = corner.value
  return [
    Math.max(c.tl - b, 0),
    Math.max(c.tr - b, 0),
    Math.max(c.br - b, 0),
    Math.max(c.bl - b, 0),
  ]
    .map((v) => v + 'px')
    .join(' ')
})

const holePad = computed(() => props.screen.frameImage?.holePad)
</script>

<template>
  <div
    ref="stageRef"
    class="relative flex items-center justify-center rounded-xl bg-[image:radial-gradient(var(--color-border)_1px,transparent_1px)] bg-[length:22px_22px]"
    style="background-color: var(--color-bg); min-height: clamp(300px, 54vh, 600px); padding: clamp(18px, 4vw, 44px)"
  >
    <div class="relative flex-none [container-type:size]" :style="{ width: frameW + 'px', height: frameH + 'px' }">
      <!-- 内屏：有真实抠图素材，横屏为素材原始方向，竖屏靠旋转同一张图实现 -->
      <template v-if="screen.frameImage">
        <div
          class="absolute"
          :class="
            orientation === 'portrait'
              ? 'top-1/2 left-1/2 h-[100cqw] w-[100cqh] -translate-x-1/2 -translate-y-1/2 rotate-90'
              : 'inset-0'
          "
        >
          <div
            class="absolute overflow-hidden bg-[var(--color-surface-2)]"
            :style="{
              top: holePad!.top + '%',
              bottom: holePad!.bottom + '%',
              left: holePad!.left + '%',
              right: holePad!.right + '%',
            }"
          >
            <slot />
            <SafeAreaOverlay v-if="safeAreaOn" :screen="screen" :orientation="orientation" />
          </div>
          <img
            :src="screen.frameImage.src"
            alt=""
            class="pointer-events-none absolute inset-0 z-[5] h-full w-full select-none"
          />
        </div>
      </template>

      <!-- 外屏：没有干净素材，用 CSS 手绘近似 D 形非对称圆角外框 -->
      <template v-else>
        <div
          class="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
          :style="{ background: 'var(--color-chrome)', borderRadius: bezelRadius, padding: bezelPx + 'px' }"
        >
          <div
            class="relative h-full w-full overflow-hidden bg-[var(--color-surface-2)]"
            :style="{ borderRadius: contentRadius }"
          >
            <slot />
            <SafeAreaOverlay v-if="safeAreaOn" :screen="screen" :orientation="orientation" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
