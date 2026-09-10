<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DeviceFrame from './components/DeviceFrame/DeviceFrame.vue'
import ScreenModeToggle from './components/DeviceFrame/ScreenModeToggle.vue'
import OrientationToggle from './components/DeviceFrame/OrientationToggle.vue'
import ImagePreview from './components/PreviewContent/ImagePreview.vue'
import PdfPreview from './components/PreviewContent/PdfPreview.vue'
import WebPreview from './components/PreviewContent/WebPreview.vue'
import EmptyState from './components/common/EmptyState.vue'
import FileUploader from './components/InputPanel/FileUploader.vue'
import UrlInput from './components/InputPanel/UrlInput.vue'
import LocaleSwitcher from './components/common/LocaleSwitcher.vue'
import { useScreenMode } from './composables/useScreenMode'
import { usePreviewSource } from './composables/usePreviewSource'
import { useExportImage } from './composables/useExportImage'
import type { FillMode } from './types/device'

const { t } = useI18n()

const {
  screenMode,
  fillMode,
  safeAreaOn,
  screen,
  currentOrientation,
  setScreenMode,
  toggleOrientation,
  setFillMode,
  toggleSafeArea,
} = useScreenMode()

const { source, toastMessage, handleFiles, loadUrl, markUrlLoaded, markUrlBlocked, setPdfPage, reset, showToast } =
  usePreviewSource()

const { exporting, exportImage } = useExportImage()

const urlInputRef = ref<InstanceType<typeof UrlInput> | null>(null)
const deviceFrameRef = ref<InstanceType<typeof DeviceFrame> | null>(null)

const fillOptions: { value: FillMode; labelKey: string }[] = [
  { value: 'contain', labelKey: 'toolbar.fillContain' },
  { value: 'cover', labelKey: 'toolbar.fillCover' },
]

const screenLabelKey = computed(() => (screenMode.value === 'inner' ? 'screen.inner' : 'screen.outer'))

function onReset() {
  reset()
  setFillMode('contain')
  urlInputRef.value?.clear()
}

const showPager = computed(() => source.value?.type === 'pdf' && source.value.totalPages > 1)

onMounted(() => {
  urlInputRef.value?.setValue('deepseek.com')
  loadUrl('deepseek.com')
})

// 网页预览是跨域 iframe，浏览器安全限制下 html2canvas 无法读取其内容（会导出成空白框），
// 所以导出功能只对图片/PDF 开放；网址截图导出留给 V1.1 的截图兜底方案（见 docs/FEATURE_LIST.md）。
const canExport = computed(() => !!source.value && source.value.type !== 'url' && !exporting.value)

async function onExport() {
  const el = deviceFrameRef.value?.frameRef
  if (!el || !canExport.value) return
  try {
    const filename = `iduo-previewer-${screenMode.value}-${currentOrientation.value}-${Date.now()}.png`
    await exportImage(el, filename)
  } catch {
    showToast('toast.exportFailed')
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 pt-7 pb-16 md:px-6">
    <!-- 顶部：产品名 + 内外屏切换 -->
    <header class="mb-5.5 flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <div class="flex flex-col gap-1">
        <div class="flex items-baseline gap-1.5">
          <span class="text-[22px] font-extrabold tracking-tight">iDuo</span>
          <span class="text-[22px] font-medium tracking-tight text-[var(--color-ink-muted)]">Previewer</span>
        </div>
        <span class="font-mono text-[11px] tracking-wide text-[var(--color-ink-muted)] uppercase">
          {{ t('app.tagline') }}
        </span>
      </div>
      <div class="flex items-center gap-2 sm:flex-col sm:items-end">
        <LocaleSwitcher />
        <ScreenModeToggle :model-value="screenMode" @update:model-value="setScreenMode" />
      </div>
    </header>

    <main class="flex flex-col gap-3">
      <!-- 舞台工具条 -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <OrientationToggle :model-value="currentOrientation" @update:model-value="toggleOrientation" />

          <div class="inline-flex gap-0.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-[3px]">
            <button
              v-for="opt in fillOptions"
              :key="opt.value"
              type="button"
              class="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              :class="
                fillMode === opt.value
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]'
                  : 'text-[var(--color-ink-muted)]'
              "
              @click="setFillMode(opt.value)"
            >
              {{ t(opt.labelKey) }}
            </button>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[9px] border px-3.5 py-2 text-[13px] font-semibold transition-colors"
            :class="
              safeAreaOn
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)]'
            "
            :aria-pressed="safeAreaOn"
            :title="t('toolbar.safeAreaTitle')"
            @click="toggleSafeArea"
          >
            <svg class="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            <span>{{ t('toolbar.safeArea') }}</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-ink)]"
            :disabled="!canExport"
            :title="source?.type === 'url' ? t('toolbar.exportUnavailableForUrl') : t('toolbar.exportTitle')"
            @click="onExport"
          >
            <svg class="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M4 19.5h16" />
            </svg>
            <span>{{ exporting ? t('toolbar.exporting') : t('toolbar.export') }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)] hover:border hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            :title="t('toolbar.resetTitle')"
            @click="onReset"
          >
            <svg class="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            <span>{{ t('toolbar.reset') }}</span>
          </button>
        </div>
      </div>

      <!-- 舞台 -->
      <div>
        <DeviceFrame ref="deviceFrameRef" :screen="screen" :orientation="currentOrientation" :safe-area-on="safeAreaOn">
          <template #default="{ rotationDeg }">
            <div class="absolute inset-0 z-[1]">
              <EmptyState v-if="!source" />
              <ImagePreview v-else-if="source.type === 'image'" :source="source" :fill-mode="fillMode" />
              <PdfPreview v-else-if="source.type === 'pdf'" :source="source" :fill-mode="fillMode" />
              <WebPreview
                v-else-if="source.type === 'url'"
                :url="source.value"
                :screen="screen"
                :orientation="currentOrientation"
                :fill-mode="fillMode"
                :frame-rotation="rotationDeg"
                @loaded="markUrlLoaded"
                @blocked="markUrlBlocked"
                @screenshot="showToast('toast.screenshotFallback')"
              />
            </div>
          </template>
        </DeviceFrame>

        <!-- PDF 翻页 -->
        <div v-if="showPager && source?.type === 'pdf'" class="mt-3.5 flex items-center justify-center gap-3.5">
          <button
            type="button"
            class="h-7 w-7 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-35"
            :disabled="source.currentPage <= 1"
            :aria-label="t('pager.prev')"
            @click="setPdfPage(source.currentPage - 1)"
          >
            ‹
          </button>
          <span class="font-mono text-[12.5px] text-[var(--color-ink-muted)]">
            {{ source.currentPage }} / {{ source.totalPages }}
          </span>
          <button
            type="button"
            class="h-7 w-7 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-35"
            :disabled="source.currentPage >= source.totalPages"
            :aria-label="t('pager.next')"
            @click="setPdfPage(source.currentPage + 1)"
          >
            ›
          </button>
        </div>

        <!-- 规格条 -->
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--color-ink-muted)]">
            <strong class="font-semibold text-[var(--color-ink)]">{{ t(screenLabelKey) }}</strong>
          </span>
          <span class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--color-ink-muted)]">
            {{ screen.resolution.w }} × {{ screen.resolution.h }} px
          </span>
          <span class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--color-ink-muted)]">
            {{ screen.ppi }} ppi
          </span>
          <span class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--color-ink-muted)]">
            {{ screen.diagonalInches }}″
          </span>
        </div>

        <!-- 安全区图例 -->
        <div v-if="safeAreaOn" class="mt-2.5 flex flex-wrap items-center justify-center gap-4">
          <div class="flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
            <span class="h-2.5 w-2.5 flex-none rounded-[3px]" style="background: var(--color-zone-notch)"></span>
            {{ t('safeAreaLegend.notch') }}
          </div>
          <div class="flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
            <span class="h-2.5 w-2.5 flex-none rounded-[3px]" style="background: var(--color-zone-gesture)"></span>
            {{ t('safeAreaLegend.gesture') }}
          </div>
          <div class="flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
            <span class="h-2.5 w-2.5 flex-none rounded-[3px]" style="background: var(--color-ink-muted)"></span>
            {{ t('safeAreaLegend.fold') }}
          </div>
        </div>
      </div>
    </main>

    <!-- 上传 / 网址输入区 -->
    <section class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr]">
      <FileUploader :source="source" @files="handleFiles" @clear="reset" />
      <UrlInput ref="urlInputRef" @submit="loadUrl" />
    </section>

    <!-- Contact -->
    <footer
      class="mt-8 flex flex-col items-start gap-3.5 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-6 py-8 text-left sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3.5">
        <svg
          class="h-9 w-9 flex-none text-[var(--color-accent-ink)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
        </svg>
        <div>
          <div class="text-[16px] font-extrabold text-[var(--color-ink)]">{{ t('contact.heading') }}</div>
          <div class="mt-1 text-[13.5px] text-[var(--color-ink-muted)]">
            {{ t('contact.body') }}
          </div>
        </div>
      </div>
      <a
        href="mailto:iduo@24haowan.com"
        class="inline-flex flex-none items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[var(--color-accent-ink)]"
      >
        iduo@24haowan.com
      </a>
    </footer>

    <!-- toast -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-y-0"
      leave-to-class="opacity-0 translate-y-0"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 -translate-y-1.5 rounded-[10px] px-4.5 py-2.5 text-[13px] font-semibold shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]"
        style="background: var(--color-ink); color: var(--color-bg)"
      >
        {{ t(toastMessage) }}
      </div>
    </Transition>
  </div>
</template>
