<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Orientation } from '../../types/device'

const { t } = useI18n()
const props = defineProps<{ modelValue: Orientation }>()
const emit = defineEmits<{ 'update:modelValue': [Orientation] }>()

function toggle() {
  emit('update:modelValue', props.modelValue === 'portrait' ? 'landscape' : 'portrait')
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)]"
    :title="t('toolbar.orientationTitle')"
    @click="toggle"
  >
    <svg class="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="7" y="2" width="10" height="20" rx="2.4" />
      <line x1="10" y1="18.3" x2="14" y2="18.3" />
    </svg>
    <span>{{ modelValue === 'portrait' ? t('toolbar.orientationPortrait') : t('toolbar.orientationLandscape') }}</span>
  </button>
</template>
