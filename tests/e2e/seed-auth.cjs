// Create fictional accounts only. No OTP/session/onboarding/document injection.
const { execFileSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { openSync, writeFileSync, closeSync } = require('node:fs')
const database = process.env.E2E_DATABASE || 'swaad_e2e_20260911'
if (!/^swaad_e2e_[a-z0-9_]+$/.test(database) || !process.env.E2E_AUTH_FIXTURE_FILE) throw new Error('Require isolated E2E database and new private fixture file')
const fd = openSync(process.env.E2E_AUTH_FIXTURE_FILE, 'wx', 0o600)
try {
  const people = Object.fromEntries([['applicant', 'driver'], ['manager', 'restaurant_manager']].map(([name, role]) => {
    const userId = randomUUID()
    const phone = `9${String(BigInt('0x' + userId.replaceAll('-', '').slice(0, 12)) % 1000000000n).padStart(9, '0')}`
    return [name, { userId, phone, role, name: `E2E ${name} ${userId.slice(0, 8)}` }]
  }))
  const sql = ['BEGIN;']
  for (const [name, p] of Object.entries(people)) {
    sql.push(`INSERT INTO users(user_id,phone,name,email,role,account_status,phone_verified,email_verified,onboarding_complete)
      VALUES('${p.userId}','${p.phone}','${p.name}','${p.userId}@e2e.invalid','${p.role}','active',TRUE,TRUE,${name === 'manager'});`)
  }
  sql.push(`INSERT INTO driver_profiles(user_id,driving_license_number_encrypted,vehicle_registration_encrypted,is_available,current_city)
    VALUES('${people.applicant.userId}',decode('ZGVtby1vbmx5','base64'),decode('ZGVtby1vbmx5','base64'),FALSE,'Shamgarh');`, 'COMMIT;')
  execFileSync('docker', ['exec', '-i', process.env.E2E_POSTGRES_CONTAINER || 'food-delivery-postgres', 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], { input: sql.join('\n'), stdio: ['pipe', 'ignore', 'pipe'] })
  writeFileSync(fd, JSON.stringify(people))
} finally { closeSync(fd) }
