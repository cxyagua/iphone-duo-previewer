<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits<{ submit: [string] }>()
const value = ref('')

function submit() {
  emit('submit', value.value)
}

defineExpose({
  clear: () => {
    value.value = ''
  },
  setValue: (v: string) => {
    value.value = v
  },
})
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5 shadow-[0_1px_2px_rgba(18,24,26,.06),0_10px_30px_-12px_rgba(18,24,26,.18)]"
  >
    <label class="text-[12.5px] font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase" for="url-input">
      {{ t('urlInput.label') }}
    </label>
    <div class="flex gap-2">
      <input
        id="url-input"
        v-model="value"
        type="text"
        placeholder="example.com"
        autocomplete="off"
        spellcheck="false"
        class="min-w-0 flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 font-mono text-[13.5px] text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        @keydown.enter="submit"
      />
      <button
        type="button"
        class="flex-none rounded-[10px] bg-[var(--color-accent)] px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-[var(--color-accent-ink)]"
        @click="submit"
      >
        {{ t('urlInput.submit') }}
      </button>
    </div>
    <p class="text-[11.5px] text-[var(--color-ink-muted)]">
      {{ t('urlInput.hint') }}
    </p>
  </div>
</template>
