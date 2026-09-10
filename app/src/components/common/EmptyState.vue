<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-2.5 p-6 text-center text-[var(--color-ink-muted)]">
    <svg class="h-8.5 w-8.5 opacity-55" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 15 5-5 4 4 3-3 6 6" />
      <circle cx="8" cy="9" r="1.3" />
    </svg>
    <div class="text-[13.5px] font-semibold text-[var(--color-ink)]">{{ t('emptyState.title') }}</div>
    <div class="max-w-[240px] text-[12.5px]">{{ t('emptyState.desc') }}</div>
  </div>
</template>
