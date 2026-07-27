/**
 * Profile view constants.
 *
 * `GET /users/me/profile` returns a role-specific `profile` object:
 *   client → { date_of_birth, gender }
 *   driver → { is_available, current_city }
 *   restaurant_owner / restaurant_manager → omitted (loadRoleProfile returns nil)
 * See internal/services/users/business/profile.go.
 */
import { ROLES } from '@/constants/auth'

export const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other'
}

export const GENDER_OPTIONS = Object.entries(GENDER_LABELS).map(([value, label]) => ({
  value,
  label
}))

/**
 * Roles whose onboarding is a full manual verification (documents proving a
 * license, a vehicle, or authority to act for a business) rather than a bare
 * identity check. Product decision: these show "pending verification" until
 * reviewed; `client` activates immediately on submit.
 *
 * IMPORTANT: this is a frontend-only distinction. The backend's account_status
 * enum has no "pending" value (only active/suspended/deleted — see
 * migrations/000003_create_users.up.sql) and there is no admin approve/reject
 * endpoint in this codebase, so nothing server-side actually changes for these
 * roles yet. `account_status` itself still reads "active" underneath; this
 * only affects what the UI displays in its place, using onboarding_complete +
 * role as a proxy signal.
 */
export const ROLES_PENDING_MANUAL_VERIFICATION = [
  ROLES.DRIVER,
  ROLES.RESTAURANT_OWNER,
  ROLES.RESTAURANT_MANAGER
]

export const VERIFICATION_STATUS_LABEL = 'Pending verification'
export const VERIFICATION_STATUS_MESSAGE =
  'Your documents are being reviewed. This usually takes up to 24 hours.'

/** Which extra fields to render per role, and where to read them from. */
export const ROLE_PROFILE_FIELDS = {
  [ROLES.CLIENT]: [
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'gender' }
  ],
  [ROLES.DRIVER]: [
    { key: 'is_available', label: 'Available for deliveries', type: 'boolean' },
    { key: 'current_city', label: 'Current city', type: 'text' }
  ],
  [ROLES.RESTAURANT_OWNER]: [],
  [ROLES.RESTAURANT_MANAGER]: []
}

/**
 * Roles the backend has no role-specific profile table for. Shown as a note so
 * the empty section is not mistaken for a loading failure.
 */
export const ROLES_WITHOUT_PROFILE_DETAILS = [
  ROLES.RESTAURANT_OWNER,
  ROLES.RESTAURANT_MANAGER
]

export const PROFILE_EMPTY_VALUE = 'Not provided'

export const PROFILE_MESSAGES = {
  NO_ROLE_DETAILS:
    'The backend does not store extra profile details for this role yet.',
  LOAD_FAILED: 'Could not load your profile.'
}
