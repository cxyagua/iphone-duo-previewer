export interface ImageSource {
  type: 'image'
  name: string
  size: number
  objectUrl: string
}

export interface PdfSource {
  type: 'pdf'
  name: string
  size: number
  loadState: 'loading' | 'loaded' | 'error'
  currentPage: number
  totalPages: number
  // pdf.js 的 PDFDocumentProxy，避免在类型文件里引入库依赖，这里用 unknown 收窄
  pdfDoc: unknown | null
}

export interface UrlSource {
  type: 'url'
  value: string
  loadState: 'loading' | 'loaded' | 'blocked'
}

export type PreviewSource = ImageSource | PdfSource | UrlSource
