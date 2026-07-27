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
