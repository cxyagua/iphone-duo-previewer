<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ErrorState from '../common/ErrorState.vue'
import type { Orientation, ScreenProfile } from '../../types/device'

const { t } = useI18n()
const props = defineProps<{ url: string; screen: ScreenProfile; orientation: Orientation }>()
const emit = defineEmits<{ loaded: [string]; blocked: [string] }>()

const status = ref<'loading' | 'loaded' | 'blocked'>('loading')
let timer: ReturnType<typeof setTimeout> | undefined
let settled = false

function attach(url: string) {
  status.value = 'loading'
  settled = false
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (settled) return
    settled = true
    status.value = 'blocked'
    emit('blocked', url)
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
onBeforeUnmount(() => clearTimeout(timer))

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

function updateScale() {
  const host = hostRef.value
  if (!host) return
  const hostW = host.clientWidth
  scale.value = hostW > 0 ? hostW / logicalSize.value.w : 1
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
</script>

<template>
  <div ref="hostRef" class="relative h-full w-full overflow-hidden">
    <div
      v-if="status !== 'blocked'"
      class="absolute top-0 left-0"
      :style="{
        width: logicalSize.w + 'px',
        height: logicalSize.h + 'px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }"
    >
      <iframe
        :src="url"
        class="block h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerpolicy="no-referrer"
        @load="onIframeLoad"
      ></iframe>
    </div>
    <div
      v-if="status === 'loading'"
      class="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-2)]"
    >
      <LoadingSpinner :label="t('loading.web')" />
    </div>
    <ErrorState
      v-if="status === 'blocked'"
      :title="t('errorState.webTitle')"
      :sub="t('errorState.webSub')"
      :link-href="url"
    />
  </div>
</template>
