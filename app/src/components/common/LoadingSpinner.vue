<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(defineProps<{ label?: string }>(), { label: '' })
</script>

<template>
  <div class="flex flex-col items-center gap-2.5 p-6 text-[var(--color-ink-muted)]">
    <div
      class="h-6.5 w-6.5 animate-spin rounded-full border-[2.5px] border-[var(--color-border)] border-t-[var(--color-accent)] motion-reduce:animate-[spin_1.6s_linear_infinite]"
    ></div>
    <div class="text-[13.5px] font-semibold text-[var(--color-ink)]">{{ props.label || t('loading.default') }}</div>
  </div>
</template>
