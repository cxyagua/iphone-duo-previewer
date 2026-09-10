<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ScreenId } from '../../types/device'

const { t } = useI18n()
defineProps<{ modelValue: ScreenId }>()
const emit = defineEmits<{ 'update:modelValue': [ScreenId] }>()

const options: { value: ScreenId; labelKey: string }[] = [
  { value: 'inner', labelKey: 'screen.inner' },
  { value: 'outer', labelKey: 'screen.outer' },
]
</script>

<template>
  <div
    class="inline-flex gap-0.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-[3px]"
    role="tablist"
    :aria-label="t('screen.selectAria')"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      class="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
      :class="
        modelValue === opt.value
          ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
      "
      @click="emit('update:modelValue', opt.value)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>
