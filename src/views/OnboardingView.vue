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

      <!-- Approval is confirmed by the profile, not the submit response. -->
      <div v-else-if="auth.isOnboardingComplete" class="onboarding__state">
        <FormAlert :message="ONBOARDING_MESSAGES.APPROVED" type="success" />
        <AppButton block @click="goToLanding">Continue</AppButton>
      </div>

      <div v-else-if="onboarding.isSubmitted" class="onboarding__state" role="status" aria-live="polite">
        <h2>Pending review</h2>
        <FormAlert :message="submittedMessage" type="info" />
        <p>{{ ONBOARDING_MESSAGES.PENDING_REVIEW }}</p>
        <AppButton block :loading="isLoading" @click="start">Check review status</AppButton>
      </div>

      <div v-else-if="onboarding.isRejected" class="onboarding__state">
        <FormAlert :message="ONBOARDING_MESSAGES.REJECTED" type="warning" />
        <p v-if="onboarding.rejectionReason">{{ onboarding.rejectionReason }}</p>
        <FormAlert :message="feedback.message" :type="feedback.type" />
        <AppButton block :loading="isSubmitting" @click="onResubmit">Start over</AppButton>
      </div>

      <!-- No documents configured for this role -->
      <div v-else-if="onboarding.documents.length === 0" class="onboarding__state">
        <FormAlert
          :message="`No documents are configured for the ${roleLabel} role yet.`"
          type="info"
        />
        <AppButton variant="secondary" :loading="isLoading" @click="start">Try again</AppButton>
      </div>

      <!-- Document upload -->
      <template v-else>
        <PersonalDetailsCard
          v-if="isClientRole"
          :saved="detailsSaved"
          :is-saving="isSavingDetails"
          :disabled="isSubmitting"
          @save="onSaveDetails"
        />

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

        <p v-if="isClientRole && !detailsSaved" class="onboarding__gate-note">
          Save your details above to enable submission.
        </p>

        <AppButton
          block
          :disabled="!canSubmit"
          :loading="isSubmitting"
          @click="onSubmit"
        >
          Submit for verification
        </AppButton>

      </template>
      <FormAlert :message="signOutError" type="error" />
      <AppButton variant="ghost" :loading="isSigningOut" :disabled="isSubmitting || hasUploadsInFlight" @click="onSignOut">Sign out</AppButton>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import DocumentUploadCard from '@/components/onboarding/DocumentUploadCard.vue'
import PersonalDetailsCard from '@/components/onboarding/PersonalDetailsCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
import { updateClientProfile } from '@/services/profileService'
import { ERROR_CODES, ROLES, ROLE_LABELS } from '@/constants/auth'
import { ONBOARDING_INTRO, ONBOARDING_MESSAGES, ONBOARDING_STATUS } from '@/constants/onboarding'
import { ROUTE_NAMES } from '@/constants/routes'
import { hasErrorCode, toErrorMessage } from '@/utils/errors'

const router = useRouter()
const auth = useAuthStore()
const onboarding = useOnboardingStore()

const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const isSigningOut = ref(false)
const signOutError = ref('')
const submittedMessage = ref(ONBOARDING_MESSAGES.SUBMIT_SUCCESS)
const feedback = reactive({ message: '', type: 'info' })

// Date of birth / gender are client-only fields on the backend (business/
// profile.go only upserts them when the authenticated role is client), so
// this step only exists for that role.
const isClientRole = computed(() => auth.role === ROLES.CLIENT)
const detailsSaved = ref(false)
const isSavingDetails = ref(false)

const hasUploadsInFlight = computed(() => Object.values(onboarding.uploading).some(Boolean))
const canSubmit = computed(() =>
  onboarding.status === ONBOARDING_STATUS.DRAFT && !isSubmitting.value &&
  !isSavingDetails.value && !hasUploadsInFlight.value &&
  onboarding.allDocumentsUploaded && (!isClientRole.value || detailsSaved.value)
)

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

/** Refreshes approval and the application's review state or upload URLs. */
async function start() {
  isLoading.value = true
  loadError.value = ''
  try {
    await auth.fetchProfile({ force: true })
    if (auth.isOnboardingComplete) return
    if (auth.profile?.profile?.date_of_birth && auth.profile?.profile?.gender) {
      detailsSaved.value = true
    }
    await onboarding.start()
  } catch (error) {
    if (await auth.consumeAlreadyCompleted(error)) {
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

/** Saves date of birth + gender via PUT /users/me/profile. */
async function onSaveDetails({ dateOfBirth, gender }) {
  isSavingDetails.value = true
  setFeedback('')
  try {
    await updateClientProfile({ dateOfBirth, gender })
    detailsSaved.value = true
    await auth.fetchProfile({ force: true })
  } catch (error) {
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isSavingDetails.value = false
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
  if (!canSubmit.value) return
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
    if (await auth.consumeAlreadyCompleted(error)) {
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
  if (isSubmitting.value || !onboarding.isRejected) return
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

async function onSignOut() {
  if (isSigningOut.value) return
  isSigningOut.value = true
  signOutError.value = ''
  try {
    await auth.signOut()
    onboarding.reset()
    await router.replace({ name: ROUTE_NAMES.LOGIN })
  } catch (error) {
    signOutError.value = toErrorMessage(error)
  } finally {
    isSigningOut.value = false
  }
}

onMounted(async () => {
  onboarding.reset()
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

.onboarding__gate-note {
  margin: 0;
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
