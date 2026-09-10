import { ref, shallowRef } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PreviewSource } from '../types/preview'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const MAX_IMAGE_BYTES = 50 * 1024 * 1024
const MAX_PDF_BYTES = 80 * 1024 * 1024

/**
 * 当前预览内容（图片 / PDF / 网址）的状态与加载逻辑。
 * 同样做成可实例化 composable，理由见 useScreenMode.ts 顶部注释。
 */
export function usePreviewSource() {
  const source = shallowRef<PreviewSource | null>(null)
  const toastMessage = ref('')
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function showToast(msg: string) {
    toastMessage.value = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastMessage.value = ''
    }, 3200)
  }

  function revokeCurrent() {
    if (source.value?.type === 'image') {
      URL.revokeObjectURL(source.value.objectUrl)
    }
  }

  function loadImage(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      showToast('toast.imageTooLarge')
      return
    }
    revokeCurrent()
    source.value = {
      type: 'image',
      name: file.name,
      size: file.size,
      objectUrl: URL.createObjectURL(file),
    }
  }

  async function loadPdf(file: File) {
    if (file.size > MAX_PDF_BYTES) {
      showToast('toast.pdfTooLarge')
      return
    }
    revokeCurrent()
    const next: PreviewSource = {
      type: 'pdf',
      name: file.name,
      size: file.size,
      loadState: 'loading',
      currentPage: 1,
      totalPages: 0,
      pdfDoc: null,
    }
    source.value = next
    try {
      const buf = await file.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: buf }).promise
      if (source.value === next) {
        source.value = { ...next, loadState: 'loaded', totalPages: doc.numPages, pdfDoc: doc }
      }
    } catch {
      if (source.value === next) {
        source.value = { ...next, loadState: 'error' }
      }
    }
  }

  function handleFiles(files: FileList | File[] | null | undefined) {
    const file = files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) return loadImage(file)
    if (file.type === 'application/pdf') return loadPdf(file)
    showToast('toast.unsupportedFormat')
  }

  function normalizeUrl(raw: string): string | null {
    let v = raw.trim()
    if (!v) return null
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v
    try {
      // eslint-disable-next-line no-new
      new URL(v)
      return v
    } catch {
      return null
    }
  }

  function loadUrl(raw: string) {
    const url = normalizeUrl(raw)
    if (!url) {
      showToast('toast.invalidUrl')
      return
    }
    revokeCurrent()
    source.value = { type: 'url', value: url, loadState: 'loading' }
  }

  function markUrlLoaded(url: string) {
    if (source.value?.type === 'url' && source.value.value === url) {
      source.value = { ...source.value, loadState: 'loaded' }
    }
  }
  function markUrlBlocked(url: string) {
    if (source.value?.type === 'url' && source.value.value === url) {
      source.value = { ...source.value, loadState: 'blocked' }
    }
  }

  function setPdfPage(page: number) {
    if (source.value?.type === 'pdf') {
      source.value = { ...source.value, currentPage: page }
    }
  }

  function reset() {
    revokeCurrent()
    source.value = null
  }

  return {
    source,
    toastMessage,
    handleFiles,
    loadUrl,
    markUrlLoaded,
    markUrlBlocked,
    setPdfPage,
    reset,
    showToast,
  }
}
