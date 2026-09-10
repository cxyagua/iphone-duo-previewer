<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale, type LocaleCode } from '../../i18n'

const { t, locale } = useI18n()

const options: { value: LocaleCode; labelKey: string }[] = [
  { value: 'en', labelKey: 'locale.en' },
  { value: 'zh', labelKey: 'locale.zh' },
]
</script>

<template>
  <div
    class="inline-flex gap-0.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-[3px]"
    role="tablist"
    :aria-label="t('locale.switchAria')"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="locale === opt.value"
      class="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
      :class="
        locale === opt.value
          ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
      "
      @click="setLocale(opt.value)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>
