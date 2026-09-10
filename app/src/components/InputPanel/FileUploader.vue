<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PreviewSource } from '../../types/preview'

const { t } = useI18n()
const props = defineProps<{ source: PreviewSource | null }>()
const emit = defineEmits<{ files: [FileList]; clear: [] }>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const fileInfo = computed(() => {
  const s = props.source
  if (s && (s.type === 'image' || s.type === 'pdf')) return { name: s.name, size: s.size }
  return null
})

function fmtBytes(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

function openPicker() {
  fileInputRef.value?.click()
}
function onChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files && files.length) emit('files', files)
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files?.length) emit('files', e.dataTransfer.files)
}
function onChangeFile() {
  emit('clear')
  if (fileInputRef.value) fileInputRef.value.value = ''
}
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5 shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]"
  >
    <span class="text-[12.5px] font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">{{
      t('fileUploader.heading')
    }}</span>

    <div
      v-if="!fileInfo"
      class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed p-6 text-center transition-colors"
      :class="
        isDragOver
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]'
      "
      tabindex="0"
      role="button"
      :aria-label="t('fileUploader.ariaUpload')"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="onDrop"
    >
      <svg
        class="h-6.5 w-6.5 text-[var(--color-ink-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
      >
        <path d="M12 16V4M12 4 7 9M12 4l5 5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <p class="text-sm font-semibold">{{ t('fileUploader.dropHint') }}</p>
      <p class="text-[12.5px] text-[var(--color-ink-muted)]">
        {{ t('fileUploader.or') }}
        <span class="font-semibold text-[var(--color-accent-ink)]">{{ t('fileUploader.chooseFile') }}</span> ·
        {{ t('fileUploader.fileTypes') }}
      </p>
      <input ref="fileInputRef" type="file" accept="image/*,application/pdf" hidden @change="onChange" />
    </div>

    <div
      v-else
      class="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5"
    >
      <svg
        class="h-5.5 w-5.5 flex-none text-[var(--color-accent-ink)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </svg>
      <div class="min-w-0 flex-1">
        <div class="truncate text-[13px] font-semibold">{{ fileInfo.name }}</div>
        <div class="text-[11.5px] text-[var(--color-ink-muted)]">{{ fmtBytes(fileInfo.size) }}</div>
      </div>
      <button
        type="button"
        class="flex-none text-[12.5px] font-semibold text-[var(--color-accent-ink)] hover:underline"
        @click="onChangeFile"
      >
        {{ t('fileUploader.changeFile') }}
      </button>
    </div>

    <p class="text-[11.5px] text-[var(--color-ink-muted)]">{{ t('fileUploader.localOnly') }}</p>
  </div>
</template>
