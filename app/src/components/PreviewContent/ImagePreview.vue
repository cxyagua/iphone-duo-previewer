<script setup lang="ts">
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FillMode } from '../../types/device'
import type { ImageSource } from '../../types/preview'

const props = defineProps<{ source: ImageSource; fillMode: FillMode }>()

const imgRef = ref<HTMLImageElement | null>(null)
let panzoom: PanzoomObject | null = null

function onWheel(event: WheelEvent) {
  panzoom?.zoomWithWheel(event)
}

function reset() {
  panzoom?.reset({ animate: true })
}

onMounted(() => {
  if (!imgRef.value) return
  panzoom = Panzoom(imgRef.value, {
    maxScale: 6,
    minScale: 1,
    contain: 'outside',
    cursor: 'grab',
  })
})
onBeforeUnmount(() => panzoom?.destroy())

// 换图或切换填充模式后回到初始状态，避免带着上一张图的缩放/位移
watch(() => [props.source.objectUrl, props.fillMode], () => reset())
</script>

<template>
  <div class="h-full w-full touch-none" @wheel.prevent="onWheel" @dblclick="reset">
    <img
      ref="imgRef"
      :src="source.objectUrl"
      alt=""
      class="block h-full w-full select-none"
      :class="fillMode === 'cover' ? 'object-cover' : 'object-contain'"
      draggable="false"
    />
  </div>
</template>
