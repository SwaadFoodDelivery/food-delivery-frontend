<template>
  <main class="profile">
    <section class="profile__panel" aria-labelledby="profile-heading">
      <header class="profile__header">
        <!-- Push rather than history.back(), so a direct load of /profile still
             has somewhere to go. -->
        <button type="button" class="profile__back" aria-label="Back to home" @click="goHome">
          <v-icon icon="mdi-arrow-left" size="22" aria-hidden="true" />
        </button>
        <h1 id="profile-heading" class="profile__title">View profile</h1>
      </header>

      <div v-if="isLoading" class="profile__state">
        <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
        <p class="profile__sr" role="status" aria-live="polite">Loading your profile…</p>
      </div>

      <div v-else-if="error" class="profile__state">
        <FormAlert :message="error" type="error" />
        <AppButton variant="secondary" @click="load">Try again</AppButton>
      </div>

      <template v-else-if="profile">
        <div class="profile__identity">
          <span class="profile__avatar" aria-hidden="true">{{ initial }}</span>
          <div>
            <p class="profile__name">{{ profile.name }}</p>
            <p class="profile__role">{{ roleLabel }}</p>
          </div>
        </div>

        <h2 class="profile__section-title">Account</h2>
        <dl class="profile__list">
          <ProfileField label="Mobile" :value="`${PHONE_COUNTRY_CODE} ${profile.phone}`">
            <template #badge>
              <span v-if="profile.phone_verified" class="profile__badge">Verified</span>
            </template>
          </ProfileField>
          <ProfileField label="Email" :value="profile.email">
            <template #badge>
              <span v-if="profile.email_verified" class="profile__badge">Verified</span>
            </template>
          </ProfileField>
          <ProfileField label="Account status" :value="profile.account_status" />
          <ProfileField label="Member since" :value="formatDate(profile.created_at)" />
        </dl>

        <!-- Role-specific block, driven by what the backend returns for this role. -->
        <h2 class="profile__section-title">{{ roleLabel }} details</h2>
        <p v-if="hasNoRoleDetails" class="profile__note">
          {{ PROFILE_MESSAGES.NO_ROLE_DETAILS }}
        </p>
        <dl v-else class="profile__list">
          <ProfileField
            v-for="field in roleFields"
            :key="field.key"
            :label="field.label"
            :value="formatFieldValue(field)"
          />
        </dl>

        <AppButton variant="secondary" block :loading="isSigningOut" @click="onSignOut">
          Sign out
        </AppButton>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import ProfileField from '@/components/profile/ProfileField.vue'
import { useAuthStore } from '@/stores/auth'
import { PHONE_COUNTRY_CODE, ROLE_LABELS } from '@/constants/auth'
import {
  GENDER_LABELS,
  PROFILE_EMPTY_VALUE,
  PROFILE_MESSAGES,
  ROLES_WITHOUT_PROFILE_DETAILS,
  ROLE_PROFILE_FIELDS
} from '@/constants/profile'
import { ROUTE_NAMES } from '@/constants/routes'
import { toErrorMessage } from '@/utils/errors'

const router = useRouter()
const auth = useAuthStore()

const isLoading = ref(true)
const isSigningOut = ref(false)
const error = ref('')

const profile = computed(() => auth.profile)
const roleLabel = computed(() => ROLE_LABELS[profile.value?.role] || profile.value?.role || '')
const initial = computed(() => (profile.value?.name || '').trim().charAt(0).toUpperCase())

const roleFields = computed(() => ROLE_PROFILE_FIELDS[profile.value?.role] ?? [])

/**
 * The backend has no role profile table for restaurant roles, so `profile` is
 * omitted entirely — say so rather than rendering an empty list.
 */
const hasNoRoleDetails = computed(
  () =>
    roleFields.value.length === 0 || ROLES_WITHOUT_PROFILE_DETAILS.includes(profile.value?.role)
)

function formatDate(value) {
  if (!value) return PROFILE_EMPTY_VALUE
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Reads the field out of the nested role-specific `profile` object. */
function formatFieldValue(field) {
  const raw = profile.value?.profile?.[field.key]

  if (field.type === 'boolean') return raw === true ? 'Yes' : 'No'
  if (raw === undefined || raw === null || raw === '') return PROFILE_EMPTY_VALUE
  if (field.type === 'gender') return GENDER_LABELS[raw] || raw
  if (field.type === 'date') return formatDate(raw)
  return String(raw)
}

function goHome() {
  router.push({ name: ROUTE_NAMES.LANDING })
}

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    await auth.fetchProfile({ force: true })
  } catch (loadError) {
    error.value = toErrorMessage(loadError, PROFILE_MESSAGES.LOAD_FAILED)
  } finally {
    isLoading.value = false
  }
}

async function onSignOut() {
  isSigningOut.value = true
  try {
    await auth.signOut()
    router.replace({ name: ROUTE_NAMES.LOGIN })
  } finally {
    isSigningOut.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.profile {
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem 3rem;
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.profile__panel {
  width: 100%;
  max-width: 32rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.profile__back:hover {
  background-color: rgb(var(--v-theme-surface-variant));
}

.profile__back:focus-visible {
  outline: 3px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}

.profile__title {
  margin: 0;
  font-size: 1.4rem;
}

.profile__state {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile__identity {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
}

.profile__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 1.35rem;
  font-weight: 700;
}

.profile__name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.profile__role {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.profile__section-title {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.profile__list {
  margin: 0;
  padding: 0.5rem 1rem;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
}

.profile__note {
  margin: 0;
  padding: 1rem;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface-variant));
  font-size: 0.9rem;
}

.profile__badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-success));
}

.profile__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
