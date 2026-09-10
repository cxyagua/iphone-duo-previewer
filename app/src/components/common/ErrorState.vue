<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{
  title: string
  sub?: string
  linkHref?: string
  linkLabel?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-2.5 p-6 text-center text-[var(--color-ink-muted)]">
    <svg class="h-8.5 w-8.5 opacity-55" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
    <div class="text-[13.5px] font-semibold text-[var(--color-ink)]">{{ title }}</div>
    <div v-if="sub" class="max-w-[260px] text-[12.5px]">{{ sub }}</div>
    <a
      v-if="linkHref"
      :href="linkHref"
      target="_blank"
      rel="noopener noreferrer"
      class="font-semibold text-[var(--color-accent-ink)] hover:underline"
    >
      {{ linkLabel || t('errorState.openInNewTab') }}
    </a>
  </div>
</template>
