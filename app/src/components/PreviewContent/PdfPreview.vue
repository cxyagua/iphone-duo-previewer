<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ErrorState from '../common/ErrorState.vue'
import type { FillMode } from '../../types/device'
import type { PdfSource } from '../../types/preview'

const { t } = useI18n()
const props = defineProps<{ source: PdfSource; fillMode: FillMode }>()

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ro: ResizeObserver | null = null
let renderToken = 0

async function renderPage() {
  const src = props.source
  if (src.loadState !== 'loaded' || !src.pdfDoc || !canvasRef.value || !rootRef.value) return
  const myToken = ++renderToken
  // pdfDoc 的具体类型来自 pdf.js，preview.ts 里为避免类型文件依赖第三方库用 unknown 收窄
  const doc = src.pdfDoc as {
    getPage: (n: number) => Promise<{
      getViewport: (opts: { scale: number }) => { width: number; height: number }
      render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
    }>
  }
  const page = await doc.getPage(src.currentPage)
  const base = page.getViewport({ scale: 1 })
  const rect = rootRef.value.getBoundingClientRect()
  if (rect.width < 4 || rect.height < 4) return
  const scaleX = rect.width / base.width
  const scaleY = rect.height / base.height
  const fitScale = props.fillMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewport = page.getViewport({ scale: fitScale * dpr })
  if (myToken !== renderToken) return
  const canvas = canvasRef.value
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  canvas.style.width = viewport.width / dpr + 'px'
  canvas.style.height = viewport.height / dpr + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({ canvasContext: ctx, viewport }).promise
}

watch(
  () => [props.source, props.source.currentPage, props.source.loadState, props.fillMode],
  () => renderPage(),
)

onMounted(() => {
  renderPage()
  if (rootRef.value && window.ResizeObserver) {
    ro = new ResizeObserver(() => renderPage())
    ro.observe(rootRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="rootRef" class="flex h-full w-full items-center justify-center overflow-hidden">
    <LoadingSpinner v-if="source.loadState === 'loading'" :label="t('loading.pdf')" />
    <ErrorState
      v-else-if="source.loadState === 'error'"
      :title="t('errorState.pdfTitle')"
      :sub="t('errorState.pdfSub')"
    />
    <canvas v-show="source.loadState === 'loaded'" ref="canvasRef" class="block"></canvas>
  </div>
</template>
