// Local demo fixture provisioning only; no application auth bypass endpoint.
// Requires migrations/catalog in an explicitly named disposable E2E database.
const { execFileSync } = require('node:child_process')
const { randomUUID, createHmac } = require('node:crypto')
const { writeFileSync } = require('node:fs')

const database = process.env.E2E_DATABASE || 'swaad_e2e_20260911'
const postgres = process.env.E2E_POSTGRES_CONTAINER || 'food-delivery-postgres'
const redis = process.env.E2E_REDIS_CONTAINER || 'swaad-e2e-redis-20260911'
const output = process.env.E2E_AUTH_FILE
if (!/^swaad_e2e_[a-z0-9_]+$/.test(database) || !/^swaad-e2e-[a-z0-9-]+$/.test(redis) || !output) {
  throw new Error('Use a swaad_e2e_* database, isolated swaad-e2e-* Redis container and E2E_AUTH_FILE outside the repository')
}
const userId = randomUUID()
const sessionId = randomUUID()
const deviceId = `e2e-${randomUUID()}`
const phone = `9${String(BigInt('0x' + userId.replaceAll('-', '').slice(0, 12)) % 1000000000n).padStart(9, '0')}`
execFileSync('docker', ['exec', '-i', postgres, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], {
  input: `BEGIN;
INSERT INTO users (user_id, phone, name, email, role, account_status, phone_verified, email_verified, onboarding_complete)
VALUES ('${userId}', '${phone}', 'Browser Demo Client', '${userId}@e2e.invalid', 'client', 'active', TRUE, TRUE, TRUE);
INSERT INTO addresses (user_id, label, line1, city, state, pincode, latitude, longitude, is_default)
VALUES ('${userId}', 'E2E outside radius', 'Fictional outside-radius fixture', 'Shamgarh', 'Madhya Pradesh', '458883', 24.0, 75.0, FALSE);
COMMIT;`, stdio: ['pipe', 'ignore', 'pipe']
})
execFileSync('docker', ['exec', redis, 'redis-cli', 'HSET', `session:${sessionId}`, 'is_active', 'true', 'user_id', userId, 'role', 'client', 'device_id', deviceId], { stdio: 'ignore' })
execFileSync('docker', ['exec', redis, 'redis-cli', 'EXPIRE', `session:${sessionId}`, '7200'], { stdio: 'ignore' })
const now = Math.floor(Date.now() / 1000)
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ user_id: userId, role: 'client', sub: userId, jti: sessionId, iat: now, nbf: now, exp: now + 7200 })}`
const signature = createHmac('sha256', process.env.E2E_JWT_SECRET || 'dev-secret-change-me-in-prod').update(payload).digest('base64url')
writeFileSync(output, JSON.stringify({ accessToken: `${payload}.${signature}`, userId, deviceId }), { mode: 0o600, flag: 'wx' })
console.log(`Created isolated demo client ${userId}; private session saved. No token printed.`)
