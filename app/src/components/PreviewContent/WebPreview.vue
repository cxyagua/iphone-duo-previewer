<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ErrorState from '../common/ErrorState.vue'
import type { FillMode, Orientation, ScreenProfile } from '../../types/device'

const { t } = useI18n()
const props = defineProps<{
  url: string
  screen: ScreenProfile
  orientation: Orientation
  fillMode: FillMode
  // DeviceFrame 在 nativeOrientation 和当前 orientation 不一致时，会把整块画框（含这个组件）
  // 转 90°（0 / 90 / -90，见 DeviceFrame 的 rotationDeg）。见下面 updateScale 的注释。
  frameRotation: number
}>()
const emit = defineEmits<{ loaded: [string]; blocked: [string]; screenshot: [string] }>()

const status = ref<'checking' | 'loading' | 'loaded' | 'blocked' | 'screenshotting' | 'screenshot'>('checking')
const screenshotUrl = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let settled = false

function revokeScreenshot() {
  if (screenshotUrl.value) {
    URL.revokeObjectURL(screenshotUrl.value)
    screenshotUrl.value = null
  }
}

async function fallbackToScreenshot(url: string) {
  status.value = 'screenshotting'
  try {
    // 截图视口宽高要和 iframe 实际用的视口一致：宽度是 logicalSize.w，
    // 高度不是 logicalSize.h，而是按展示框宽高比重新推算出来的 boxHeight
    // （见 updateScale 里的注释），这样两条路径展示出来的宽高比才是同一个。
    const res = await fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        width: Math.round(logicalSize.value.w),
        height: Math.round(boxHeight.value) || Math.round(logicalSize.value.h),
        dpr: props.screen.dpr,
      }),
    })
    if (!res.ok || props.url !== url) throw new Error('screenshot failed')
    revokeScreenshot()
    screenshotUrl.value = URL.createObjectURL(await res.blob())
    status.value = 'screenshot'
    emit('screenshot', url)
  } catch {
    if (props.url === url) {
      status.value = 'blocked'
      emit('blocked', url)
    }
  }
}

async function attach(url: string) {
  status.value = 'checking'
  revokeScreenshot()
  settled = false
  clearTimeout(timer)

  // 大部分网站是通过响应头（X-Frame-Options / CSP frame-ancestors）拒绝嵌入的，
  // 而不是真的加载慢——浏览器对这种情况会立刻触发 iframe 的 load 事件（内容是被拦截的错误页），
  // 如果这时 iframe 已经在并发加载，这个"伪 load"事件会抢在预检结果之前把状态误标为 loaded，
  // 截图兜底就再也不会触发了。所以必须先等预检结果出来，再决定要不要真的把 src 交给 iframe。
  try {
    const res = await fetch('/api/embed-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (props.url !== url) return
    const { embeddable } = await res.json()
    if (res.ok && embeddable === false) {
      settled = true
      fallbackToScreenshot(url)
      return
    }
  } catch {
    // 预检本身失败不代表嵌入一定失败，交给下面的 iframe 超时机制兜底
  }

  if (props.url !== url) return
  status.value = 'loading'
  timer = setTimeout(() => {
    if (settled) return
    settled = true
    fallbackToScreenshot(url)
  }, 10000)
}

function onIframeLoad() {
  if (settled) return
  settled = true
  clearTimeout(timer)
  status.value = 'loaded'
  emit('loaded', props.url)
}

watch(() => props.url, (url) => attach(url), { immediate: true })
onBeforeUnmount(() => {
  clearTimeout(timer)
  revokeScreenshot()
})

// 网页要按设备真实的逻辑（CSS）分辨率渲染，断点/布局才会和真机一致；
// 展示框可能比逻辑分辨率小得多，所以 iframe 按逻辑尺寸铺开后再整体 scale 缩小去适配展示框，
// 而不是直接把展示框的尺寸当成 viewport 塞给网页（那样小屏网站会被误判成手机版）。
const logicalSize = computed(() => {
  const { w, h } = props.screen.resolution
  const dpr = props.screen.dpr
  const lw = w / dpr
  const lh = h / dpr
  return props.orientation === 'portrait' ? { w: lw, h: lh } : { w: lh, h: lw }
})

const hostRef = ref<HTMLDivElement | null>(null)
const scale = ref(1)
const boxHeight = ref(0)

// 展示框（真机照片抠出来的开孔区域）的宽高比和"分辨率÷dpr"算出来的设备逻辑宽高比
// 是两套独立测量的数据（dpr 是估的，开孔是按素材 alpha 通道量的），对不上是正常的。
// 响应式断点基本只认宽度不认高度，所以宽度必须锁定成设备真实逻辑宽度保证断点和真机一致；
// 高度反过来按展示框的宽高比重新推算，这样 scale 之后正好严丝合缝填满展示框，
// 不会再出现宽高比打架导致的裁切或留白。
//
// frameRotation 不为 0 时（DeviceFrame 把整块画框转了 90°），hostRef 自己的
// clientWidth/clientHeight 量到的是"转之前"（旋转祖先的本地坐标系）的宽高——CSS transform
// 不会改变后代元素自己的布局盒子，只影响最终绘制效果，所以这里量到的宽高轴和视觉上
// 最终呈现的宽高轴是对调的，需要先换算回视觉宽高，才能套用和不转时同一套公式。
function updateScale() {
  const host = hostRef.value
  if (!host) return
  const rawW = host.clientWidth
  const rawH = host.clientHeight
  const swapped = Math.abs(props.frameRotation) === 90
  const hostW = swapped ? rawH : rawW
  const hostH = swapped ? rawW : rawH
  scale.value = hostW > 0 ? hostW / logicalSize.value.w : 1
  boxHeight.value = hostW > 0 ? logicalSize.value.w * (hostH / hostW) : logicalSize.value.h
}

let ro: ResizeObserver | null = null
onMounted(() => {
  updateScale()
  if (hostRef.value && window.ResizeObserver) {
    ro = new ResizeObserver(() => updateScale())
    ro.observe(hostRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(logicalSize, () => updateScale())
watch(() => props.frameRotation, () => updateScale())
</script>

<template>
  <div ref="hostRef" class="relative h-full w-full overflow-hidden">
    <!-- iframe 和截图共用同一个容器：宽高严格等于 iframe 的真实 CSS 视口（logicalSize.w × boxHeight），
    截图也是照这个尺寸截的，所以两者能直接铺满，不用再分别处理。容器叠加一个 -frameRotation
    的反向旋转抵消 DeviceFrame 对整块画框的旋转，保证网页内容视觉上始终正向显示，
    同时内部真实 CSS 尺寸依然是目标朝向的真实分辨率，断点判断和真机一致。 -->
    <div
      v-if="(status === 'loading' || status === 'loaded') || (status === 'screenshot' && screenshotUrl)"
      class="absolute top-1/2 left-1/2"
      :style="{
        width: logicalSize.w + 'px',
        height: boxHeight + 'px',
        transform: `translate(-50%, -50%) rotate(${-frameRotation}deg) scale(${scale})`,
      }"
    >
      <iframe
        v-if="status === 'loading' || status === 'loaded'"
        :src="url"
        class="block h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerpolicy="no-referrer"
        @load="onIframeLoad"
      ></iframe>
      <img
        v-else-if="status === 'screenshot' && screenshotUrl"
        :src="screenshotUrl"
        alt=""
        class="block h-full w-full select-none"
        :class="fillMode === 'cover' ? 'object-cover' : 'object-contain'"
        draggable="false"
      />
    </div>
    <div
      v-if="status === 'checking' || status === 'loading' || status === 'screenshotting'"
      class="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-2)]"
    >
      <LoadingSpinner :label="status === 'screenshotting' ? t('loading.screenshot') : t('loading.web')" />
    </div>
    <span
      v-if="status === 'screenshot' && screenshotUrl"
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white"
    >
      {{ t('webPreview.screenshotBadge') }}
    </span>
    <ErrorState
      v-if="status === 'blocked'"
      :title="t('errorState.webTitle')"
      :sub="t('errorState.webSub')"
      :link-href="url"
    />
  </div>
</template>
