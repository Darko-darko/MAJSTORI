import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs'

// Use CDN worker matching the installed version
const PDFJS_VERSION = pdfjsLib.version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`

/**
 * Renders all pages of a PDF to JPEG data URLs.
 * @param {string} pdfUrl - URL to the PDF file (signed URL or blob URL)
 * @param {object} opts
 * @param {number} opts.scale - Render scale (default 2 for ~150 DPI)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.85)
 * @param {number} opts.maxPages - Max pages to render (default 5)
 * @returns {Promise<string[]>} Array of base64 JPEG data URLs
 */
export async function pdfToImages(pdfUrl, { scale = 2, quality = 0.85, maxPages = 5 } = {}) {
  const pdf = await pdfjsLib.getDocument({ url: pdfUrl, disableAutoFetch: true }).promise
  const pageCount = Math.min(pdf.numPages, maxPages)
  const images = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise

    images.push(canvas.toDataURL('image/jpeg', quality))
    canvas.remove()
  }

  pdf.destroy()
  return images
}
