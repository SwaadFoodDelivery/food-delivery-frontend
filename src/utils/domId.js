/**
 * Unique DOM ids for aria-* wiring.
 *
 * Vue's own useId() only landed in 3.5 and this project pins ^3.2, so the
 * counter lives here instead.
 */
let counter = 0

/**
 * @param {string} [prefix]
 * @returns {string} a document-unique id such as `auth-heading-3`
 */
export function nextDomId(prefix = 'app') {
  counter += 1
  return `${prefix}-${counter}`
}
