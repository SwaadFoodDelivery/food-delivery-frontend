/**
 * Onboarding constants.
 *
 * The document set per role is NOT decided here — `POST /onboarding/role/init`
 * returns it, driven by the `document_type_definitions` table. DOCUMENT_META is
 * presentation only: a label and helper line for each `document_type` currently
 * seeded in migrations/000020_harden_onboarding_workflow.up.sql. An unrecognised
 * type still renders (see documentMeta()) — it just falls back to a humanised
 * version of the raw type.
 */
import { ROLES } from '@/constants/auth'

/** onboardings.status — internal/constants/onboarding.go. */
export const ONBOARDING_STATUS = {
  DRAFT: 'draft',
  PENDING_VERIFICATION: 'pending_verification',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/** onboarding_documents.upload_status. */
export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  REJECTED: 'rejected'
}

export const ONBOARDING_STATUS_LABELS = {
  [ONBOARDING_STATUS.DRAFT]: 'Draft',
  [ONBOARDING_STATUS.PENDING_VERIFICATION]: 'Pending verification',
  [ONBOARDING_STATUS.APPROVED]: 'Approved',
  [ONBOARDING_STATUS.REJECTED]: 'Rejected'
}

/** ISO-2; the backend defaults to IN when the field is blank. */
export const DEFAULT_COUNTRY = 'IN'

/**
 * The presigned PUT is signed with `content-type: application/octet-stream`
 * (business/onboarding.go → buildPresignedUploads). Sending any other
 * Content-Type breaks the SigV4 signature, so the browser must send exactly this.
 */
export const UPLOAD_CONTENT_TYPE = 'application/octet-stream'

export const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png'
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_FILE_SIZE_LABEL = '5 MB'

export const DOCUMENT_META = {
  identity_proof: {
    label: 'Identity proof',
    hint: 'Aadhaar, passport, voter ID or any government-issued photo ID.'
  },
  driving_license: {
    label: 'Driving licence',
    hint: 'Both sides in a single file, valid and not expired.'
  },
  vehicle_registration: {
    label: 'Vehicle registration (RC)',
    hint: 'RC book or smart card for the vehicle you will deliver with.'
  },
  vehicle_insurance: {
    label: 'Vehicle insurance',
    hint: 'Current policy document covering the same vehicle.'
  },
  fssai_license: {
    label: 'FSSAI licence',
    hint: 'Food safety licence issued for this outlet.'
  },
  gstin: {
    label: 'GST certificate',
    hint: 'GST registration certificate showing the GSTIN.'
  },
  pan_card: {
    label: 'PAN card',
    hint: 'PAN of the registered business or proprietor.'
  },
  employee_id: {
    label: 'Employee ID',
    hint: 'Staff ID card issued by the restaurant you manage.'
  },
  authorization_letter: {
    label: 'Authorisation letter',
    hint: 'Signed letter from the owner authorising you to manage the outlet.'
  }
}

/** Copy shown above the document list, per role. */
export const ONBOARDING_INTRO = {
  [ROLES.CLIENT]: {
    title: 'Verify your identity',
    subtitle: 'Upload your identity document for review before you can order.'
  },
  [ROLES.DRIVER]: {
    title: 'Get road-ready',
    subtitle: 'Upload your licence and vehicle papers so we can activate deliveries.'
  },
  [ROLES.RESTAURANT_OWNER]: {
    title: 'Register your restaurant',
    subtitle: 'We need your food-safety and tax documents before you can go live.'
  },
  [ROLES.RESTAURANT_MANAGER]: {
    title: 'Confirm your role',
    subtitle: 'Prove you are authorised to manage this outlet.'
  }
}

export const ONBOARDING_MESSAGES = {
  FILE_REQUIRED: 'Choose a file to upload.',
  FILE_TOO_LARGE: `Each file must be under ${MAX_FILE_SIZE_LABEL}.`,
  UPLOADS_INCOMPLETE: 'Upload every document before submitting.',
  SUBMIT_SUCCESS: 'Documents submitted. We will review them shortly.',
  PENDING_REVIEW: 'Your application is pending review. Access will be available after approval.',
  APPROVED: 'Your application is approved. You can now continue.',
  REJECTED: 'Your application needs changes. Start over to update your documents and submit them for review again.',
  ALREADY_COMPLETED: 'Onboarding is already complete for this account.',
  UPLOAD_FAILED: 'Upload failed. Check the file and try again.'
}
