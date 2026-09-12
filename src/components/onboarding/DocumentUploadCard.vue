<template>
  <li class="doc-card" :class="{ 'doc-card--done': isUploaded }">
    <div class="doc-card__header">
      <h3 class="doc-card__title">{{ meta.label }}</h3>
      <span v-if="isUploaded" class="doc-card__badge">Uploaded</span>
    </div>

    <p v-if="meta.hint" class="doc-card__hint">{{ meta.hint }}</p>

    <template v-if="!isUploaded || replacing">
      <v-file-input
        :model-value="file"
        :label="`Choose ${meta.label.toLowerCase()}`"
        :accept="ACCEPTED_FILE_TYPES"
        :disabled="disabled || isUploading"
        :error-messages="error"
        variant="outlined"
        density="comfortable"
        prepend-icon=""
        prepend-inner-icon="mdi-paperclip"
        show-size
        @update:model-value="onFileChange"
      />

      <AppButton
        variant="secondary"
        :disabled="disabled || !file"
        :loading="isUploading"
        @click="onUpload"
      >
        Upload
      </AppButton>
      <AppButton v-if="replacing === 'editing'" variant="ghost" :disabled="disabled || isUploading" @click="emit('cancel-replacement')">Keep current document</AppButton>
      <p v-if="replacing === 'attempted' && !isUploading" role="status">Replacement is not confirmed. Retry the upload before submitting.</p>
    </template>

    <p v-else class="doc-card__filename">
      {{ document.file_name || 'Document received' }}
    </p>
    <AppButton v-if="isUploaded && !replacing" variant="ghost" :disabled="disabled || isUploading" @click="emit('replace')">Replace document</AppButton>
  </li>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/common/AppButton.vue'
import { ACCEPTED_FILE_TYPES, ONBOARDING_MESSAGES, UPLOAD_STATUS } from '@/constants/onboarding'
import { documentMeta, isFileWithinSizeLimit } from '@/utils/onboarding'

const props = defineProps({
  document: { type: Object, required: true },
  isUploading: { type: Boolean, default: false },
  replacing: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['upload', 'replace', 'cancel-replacement'])

const file = ref(null)
const error = ref('')
// The store replaces the document object only after both PUT and confirmation
// succeed. Failed replacements keep the editor visible for a retry.
watch(() => props.document, () => { file.value = null; error.value = '' })
watch(() => props.replacing, value => { if (!value) { file.value = null; error.value = '' } })

const meta = computed(() => documentMeta(props.document.document_type))
const isUploaded = computed(() => props.document.upload_status === UPLOAD_STATUS.UPLOADED)

/** v-file-input yields a File or an array of them depending on `multiple`. */
function onFileChange(value) {
  error.value = ''
  const selected = Array.isArray(value) ? value[0] : value
  if (selected && !isFileWithinSizeLimit(selected)) {
    file.value = null
    error.value = ONBOARDING_MESSAGES.FILE_TOO_LARGE
    return
  }
  file.value = selected ?? null
}

function onUpload() {
  if (!file.value) {
    error.value = ONBOARDING_MESSAGES.FILE_REQUIRED
    return
  }
  error.value = ''
  emit('upload', { documentType: props.document.document_type, file: file.value })
}
</script>

<style scoped>
.doc-card {
  list-style: none;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 16px;
  padding: 1rem;
  background-color: rgb(var(--v-theme-surface));
}

.doc-card--done {
  border-color: rgb(var(--v-theme-success));
}

.doc-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.doc-card__title {
  margin: 0;
  font-size: 1rem;
}

.doc-card__badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-success));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.doc-card__hint {
  margin: 0.35rem 0 0.75rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.doc-card__filename {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  overflow-wrap: anywhere;
}
</style>
