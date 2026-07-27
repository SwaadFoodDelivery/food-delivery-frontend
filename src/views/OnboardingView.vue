<template>
  <main class="onboarding">
    <section class="onboarding__panel" aria-labelledby="onboarding-heading">
      <header class="onboarding__header">
        <p class="onboarding__role">{{ roleLabel }}</p>
        <h1 id="onboarding-heading" class="onboarding__title">{{ intro.title }}</h1>
        <p class="onboarding__subtitle">{{ intro.subtitle }}</p>
      </header>

      <!-- Loading -->
      <div v-if="isLoading" class="onboarding__state">
        <v-skeleton-loader type="article, actions" />
        <p class="onboarding__sr" role="status" aria-live="polite">Preparing your documents…</p>
      </div>

      <!-- Load failure -->
      <div v-else-if="loadError" class="onboarding__state">
        <FormAlert :message="loadError" type="error" />
        <AppButton variant="secondary" :loading="isLoading" @click="start">Try again</AppButton>
      </div>

      <!-- Submitted -->
      <div v-else-if="onboarding.isSubmitted" class="onboarding__state">
        <FormAlert :message="submittedMessage" type="success" />
        <AppButton block @click="goToLanding">Continue</AppButton>
      </div>

      <!-- No documents configured for this role -->
      <div v-else-if="onboarding.documents.length === 0" class="onboarding__state">
        <FormAlert
          :message="`No documents are configured for the ${roleLabel} role yet.`"
          type="info"
        />
        <AppButton variant="secondary" @click="goToLanding">Skip for now</AppButton>
      </div>

      <!-- Document upload -->
      <template v-else>
        <div class="onboarding__progress">
          <v-progress-linear
            :model-value="onboarding.progressPercent"
            color="primary"
            height="8"
            rounded
            :aria-label="`Onboarding progress: ${onboarding.progressPercent} percent`"
          />
          <p class="onboarding__progress-text" role="status" aria-live="polite">
            {{ onboarding.uploadedCount }} of {{ onboarding.documents.length }} documents uploaded
          </p>
        </div>

        <FormAlert :message="feedback.message" :type="feedback.type" />

        <ul class="onboarding__documents">
          <DocumentUploadCard
            v-for="document in onboarding.documents"
            :key="document.document_id"
            :document="document"
            :is-uploading="onboarding.uploading[document.document_type] === true"
            :disabled="isSubmitting"
            @upload="onUpload"
          />
        </ul>

        <AppButton
          block
          :disabled="!onboarding.allDocumentsUploaded"
          :loading="isSubmitting"
          @click="onSubmit"
        >
          Submit for verification
        </AppButton>

        <AppButton
          v-if="onboarding.isRejected"
          variant="secondary"
          block
          :loading="isSubmitting"
          @click="onResubmit"
        >
          Start over
        </AppButton>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import DocumentUploadCard from '@/components/onboarding/DocumentUploadCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
import { ERROR_CODES, ROLE_LABELS } from '@/constants/auth'
import { ONBOARDING_INTRO, ONBOARDING_MESSAGES } from '@/constants/onboarding'
import { ROUTE_NAMES } from '@/constants/routes'
import { hasErrorCode, toErrorMessage } from '@/utils/errors'

const router = useRouter()
const auth = useAuthStore()
const onboarding = useOnboardingStore()

const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const submittedMessage = ref(ONBOARDING_MESSAGES.SUBMIT_SUCCESS)
const feedback = reactive({ message: '', type: 'info' })

const roleLabel = computed(() => ROLE_LABELS[auth.role] || auth.role)
const intro = computed(
  () => ONBOARDING_INTRO[auth.role] || { title: 'Complete your onboarding', subtitle: '' }
)

function setFeedback(message, type = 'info') {
  feedback.message = message
  feedback.type = type
}

function goToLanding() {
  router.replace({ name: ROUTE_NAMES.LANDING })
}

/**
 * Each init creates a fresh draft with fresh presigned URLs. Those expire within
 * minutes, so the view starts one on mount rather than reusing a stale list.
 */
async function start() {
  isLoading.value = true
  loadError.value = ''
  try {
    await onboarding.start()
  } catch (error) {
    // The one case where users.onboarding_complete is genuinely true — record it
    // and get out of the user's way.
    if (auth.consumeAlreadyCompleted(error)) {
      goToLanding()
      return
    }
    if (hasErrorCode(error, ERROR_CODES.ONBOARDING_CONFIG_MISSING)) {
      loadError.value = `${error.message} Contact support so your ${roleLabel.value} documents can be configured.`
      return
    }
    loadError.value = toErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

/** Uploads to S3, then reports the object back to the backend. */
async function onUpload({ documentType, file }) {
  setFeedback('')
  try {
    await onboarding.uploadDocument({ documentType, file })
  } catch (error) {
    setFeedback(toErrorMessage(error, ONBOARDING_MESSAGES.UPLOAD_FAILED), 'error')
  }
}

async function onSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  setFeedback('')
  try {
    const data = await onboarding.submit()
    submittedMessage.value = data?.message || ONBOARDING_MESSAGES.SUBMIT_SUCCESS
  } catch (error) {
    if (hasErrorCode(error, ERROR_CODES.UPLOADS_INCOMPLETE)) {
      setFeedback(ONBOARDING_MESSAGES.UPLOADS_INCOMPLETE, 'warning')
      return
    }
    if (auth.consumeAlreadyCompleted(error)) {
      goToLanding()
      return
    }
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isSubmitting.value = false
  }
}

/** Returns a rejected onboarding to draft, then pulls a fresh document set. */
async function onResubmit() {
  isSubmitting.value = true
  setFeedback('')
  try {
    await onboarding.resubmit()
    await start()
  } catch (error) {
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  onboarding.reset()
  // The router guard already loaded the profile; this only covers a hard reload
  // straight onto /onboarding.
  try {
    await auth.fetchProfile()
  } catch {
    // Non-fatal — start() will surface anything that actually blocks onboarding.
  }
  await start()
})
</script>

<style scoped>
.onboarding {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem 4rem;
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.onboarding__panel {
  width: 100%;
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.onboarding__header {
  margin-bottom: 0.25rem;
}

.onboarding__role {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.onboarding__title {
  margin: 0.25rem 0 0.35rem;
  font-size: 1.6rem;
}

.onboarding__subtitle {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.onboarding__state {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.onboarding__progress-text {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.onboarding__documents {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.onboarding__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
