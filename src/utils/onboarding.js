/** Presentation helpers for the document types the backend hands back. */
import { DOCUMENT_META, MAX_FILE_SIZE_BYTES } from '@/constants/onboarding'

/**
 * Humanises an unmapped document_type, e.g. `trade_license` → `Trade license`.
 * @param {string} documentType
 * @returns {string}
 */
function humanise(documentType) {
  const words = String(documentType ?? '').replace(/_/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Document'
}

/**
 * Label and hint for a document type. Falls back gracefully so a new row in
 * `document_type_definitions` still renders without a frontend change.
 *
 * @param {string} documentType
 * @returns {{label: string, hint: string}}
 */
export function documentMeta(documentType) {
  const meta = DOCUMENT_META[documentType]
  if (meta) return meta
  return { label: humanise(documentType), hint: '' }
}

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isFileWithinSizeLimit(file) {
  return Boolean(file) && file.size <= MAX_FILE_SIZE_BYTES
}

/**
 * @param {number} bytes
 * @returns {string} e.g. "1.4 MB"
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
