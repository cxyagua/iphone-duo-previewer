<script setup lang="ts">
import { computed } from 'vue'
import type { Orientation, ScreenProfile } from '../../types/device'

const props = defineProps<{ screen: ScreenProfile; orientation: Orientation }>()

const sa = computed(() => props.screen.safeArea[props.orientation])
const foldDir = computed(() => props.screen.fold?.[props.orientation])
const islandEdge = computed(() => props.screen.islandEdge?.[props.orientation])

const notchStripe =
  'background-image:repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-zone-notch) 55%, transparent) 0 6px, transparent 6px 12px);'
const gestureStripe =
  'background-image:repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-zone-gesture) 55%, transparent) 0 6px, transparent 6px 12px);'
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-[6]">
    <!-- 上下左右安全区色块（斜纹样式提示“限制区域”） -->
    <div
      class="absolute inset-x-0 top-0 bg-[var(--color-zone-notch-soft)]"
      :style="[notchStripe, { height: sa.top + '%' }]"
    ></div>
    <div
      class="absolute inset-x-0 bottom-0 bg-[var(--color-zone-gesture-soft)]"
      :style="[gestureStripe, { height: sa.bottom + '%' }]"
    ></div>
    <div
      class="absolute inset-y-0 left-0 bg-[var(--color-zone-gesture-soft)]"
      :style="[gestureStripe, { width: sa.left + '%' }]"
    ></div>
    <div
      class="absolute inset-y-0 right-0 bg-[var(--color-zone-gesture-soft)]"
      :style="[gestureStripe, { width: sa.right + '%' }]"
    ></div>

    <!-- 内屏：折叠线（非安全区限制，仅示意） -->
    <template v-if="!screen.hasIsland && foldDir">
      <div
        v-if="foldDir === 'horizontal'"
        class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 opacity-55"
        style="background: repeating-linear-gradient(to right, var(--color-ink-muted) 0 5px, transparent 5px 10px)"
      ></div>
      <div
        v-else
        class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 opacity-55"
        style="background: repeating-linear-gradient(to bottom, var(--color-ink-muted) 0 5px, transparent 5px 10px)"
      ></div>
    </template>

    <!-- 外屏：灵动岛示意 -->
    <template v-else-if="screen.hasIsland && islandEdge">
      <div
        v-if="islandEdge === 'top'"
        class="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/90"
        :style="{ top: sa.top * 0.28 + '%', width: '26%', height: sa.top * 0.5 + '%' }"
      ></div>
      <div
        v-else-if="islandEdge === 'right'"
        class="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/90"
        :style="{ right: sa.right * 0.28 + '%', height: '26%', width: sa.right * 0.5 + '%' }"
      ></div>
      <div
        v-else-if="islandEdge === 'left'"
        class="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/90"
        :style="{ left: sa.left * 0.28 + '%', height: '26%', width: sa.left * 0.5 + '%' }"
      ></div>
      <div
        v-else
        class="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/90"
        :style="{ bottom: sa.bottom * 0.28 + '%', width: '26%', height: sa.bottom * 0.5 + '%' }"
      ></div>
    </template>
  </div>
</template>
