import { ref } from 'vue'
import html2canvas from 'html2canvas-pro'

/**
 * 把设备框 DOM 节点（外框 + 内容 + 安全区浮层）合成导出为 PNG。
 * 用 html2canvas-pro 而非 html2canvas：项目样式里用到 Tailwind v4 生成的
 * oklch/color-mix 颜色（如 bg-black/90），原版 html2canvas 无法解析会直接报错。
 */
export function useExportImage() {
  const exporting = ref(false)

  async function exportImage(el: HTMLElement, filename: string) {
    exporting.value = true
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('toBlob returned null')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportImage }
}
