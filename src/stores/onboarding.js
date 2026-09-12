/**
 * Onboarding store.
 *
 * The document list is whatever `POST /onboarding/role/init` returns for the
 * authenticated role — this store never decides which documents a role needs.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as onboardingService from '@/services/onboardingService'
import { uploadToPresignedUrl } from '@/services/uploadService'
import { useAuthStore } from '@/stores/auth'
import { ONBOARDING_STATUS, UPLOAD_STATUS } from '@/constants/onboarding'

export const useOnboardingStore = defineStore('onboarding', () => {
  const onboardingId = ref('')
  const status = ref('')
  const onboardingRole = ref('')
  const rejectionReason = ref('')
  /** One entry per required document, as returned by init. */
  const documents = ref([])
  /** document_type → true while its upload is in flight. */
  const uploading = ref({})
  // Editing can be discarded before a PUT; an attempted PUT may have changed
  // storage even if its response/confirmation failed, so it must be retried.
  const replacements = ref({})
  const hasUnfinishedReplacements = computed(() => Object.values(replacements.value).some(Boolean))

  const isInitialised = computed(() => Boolean(onboardingId.value))

  const uploadedCount = computed(
    () => documents.value.filter((doc) => doc.upload_status === UPLOAD_STATUS.UPLOADED).length
  )

  const allDocumentsUploaded = computed(
    () => documents.value.length > 0 && uploadedCount.value === documents.value.length
  )

  const isSubmitted = computed(
    () =>
      status.value === ONBOARDING_STATUS.PENDING_VERIFICATION ||
      status.value === ONBOARDING_STATUS.APPROVED
  )

  const isRejected = computed(() => status.value === ONBOARDING_STATUS.REJECTED)

  const progressPercent = computed(() =>
    documents.value.length === 0
      ? 0
      : Math.round((uploadedCount.value / documents.value.length) * 100)
  )

  function reset() {
    onboardingId.value = ''
    status.value = ''
    onboardingRole.value = ''
    rejectionReason.value = ''
    documents.value = []
    uploading.value = {}
    replacements.value = {}
  }

  function applyInitPayload(data) {
    onboardingId.value = data?.onboarding_id || ''
    status.value = data?.status || ''
    onboardingRole.value = data?.role || ''
    rejectionReason.value = data?.rejection_reason || ''
    documents.value = Array.isArray(data?.documents) ? [...data.documents] : []
    uploading.value = {}
    replacements.value = {}
  }

  /**
   * Loads onboarding for the signed-in user's role, including its review state
   * and refreshed upload URLs when the application is editable.
   *
   * @returns {Promise<object>} the init payload
   */
  async function start() {
    const auth = useAuthStore()
    const data = await onboardingService.initOnboarding({ role: auth.role })
    applyInitPayload(data)
    return data
  }

  function setUploading(documentType, value) {
    uploading.value = { ...uploading.value, [documentType]: value }
  }

  function beginReplacement(documentType) {
    if (status.value !== ONBOARDING_STATUS.DRAFT || uploading.value[documentType] || replacements.value[documentType]) return
    if (!documents.value.some(doc => doc.document_type === documentType && doc.upload_status === UPLOAD_STATUS.UPLOADED)) return
    replacements.value = { ...replacements.value, [documentType]: 'editing' }
  }

  function cancelReplacement(documentType) {
    if (uploading.value[documentType] || replacements.value[documentType] !== 'editing') return
    replacements.value = { ...replacements.value, [documentType]: '' }
  }

  /**
   * Uploads one document, then tells the backend the object landed.
   *
   * Two steps by design: the PUT goes straight to S3 and the backend only finds
   * out via the `documents/uploaded` callback.
   *
   * @param {{documentType: string, file: File}} params
   * @returns {Promise<void>}
   */
  async function uploadDocument({ documentType, file }) {
    const target = documents.value.find((doc) => doc.document_type === documentType)
    if (!target) return

    if (target.upload_status === UPLOAD_STATUS.UPLOADED) {
      replacements.value = { ...replacements.value, [documentType]: 'attempted' }
    }

    setUploading(documentType, true)
    try {
      // contentType is left to its default: the URL is signed with
      // application/octet-stream and S3 rejects anything else.
      await uploadToPresignedUrl({
        file,
        uploadUrl: target.upload_url,
        method: target.method
      })
      await onboardingService.markDocumentUploaded({ s3Key: target.s3_key })
      documents.value = documents.value.map((doc) =>
        doc.document_type === documentType
          ? { ...doc, upload_status: UPLOAD_STATUS.UPLOADED, file_name: file.name }
          : doc
      )
      replacements.value = { ...replacements.value, [documentType]: '' }
    } finally {
      setUploading(documentType, false)
    }
  }

  /**
   * Submits for verification. 412 UPLOADS_INCOMPLETE if anything is still pending.
   * @returns {Promise<object>}
   */
  async function submit() {
    if (hasUnfinishedReplacements.value || Object.values(uploading.value).some(Boolean)) {
      throw new Error('Finish document uploads or cancel an unstarted replacement before submitting.')
    }
    const data = await onboardingService.submitOnboarding({ onboardingId: onboardingId.value })
    status.value = data?.status || ONBOARDING_STATUS.PENDING_VERIFICATION
    return data
  }

  /**
   * Moves a rejected onboarding back to draft so documents can be replaced.
   * @returns {Promise<object>}
   */
  async function resubmit() {
    const data = await onboardingService.resubmitOnboarding({ onboardingId: onboardingId.value })
    status.value = data?.status || ONBOARDING_STATUS.DRAFT
    rejectionReason.value = ''
    return data
  }

  return {
    onboardingId,
    status,
    onboardingRole,
    rejectionReason,
    documents,
    uploading,
    replacements,
    hasUnfinishedReplacements,
    beginReplacement,
    cancelReplacement,
    isInitialised,
    uploadedCount,
    allDocumentsUploaded,
    isSubmitted,
    isRejected,
    progressPercent,
    start,
    uploadDocument,
    submit,
    resubmit,
    reset
  }
})
