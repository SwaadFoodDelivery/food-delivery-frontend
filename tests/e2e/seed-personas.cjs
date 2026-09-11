// Fixture setup only. Real UI/API actions follow; no auth bypass endpoint or
// real identities/documents. Run only in the explicitly isolated local stack.
const { execFileSync } = require('node:child_process')
const { randomUUID, createHmac } = require('node:crypto')
const { openSync, writeFileSync, closeSync } = require('node:fs')

const database = process.env.E2E_DATABASE || 'swaad_e2e_20260911'
const postgres = process.env.E2E_POSTGRES_CONTAINER || 'food-delivery-postgres'
const redis = process.env.E2E_REDIS_CONTAINER || 'swaad-e2e-redis-20260911'
const output = process.env.E2E_PERSONA_FILE
if (!/^swaad_e2e_[a-z0-9_]+$/.test(database) || !/^swaad-e2e-[a-z0-9-]+$/.test(redis) || !output) {
  throw new Error('Require disposable swaad_e2e_* DB, swaad-e2e-* Redis and new E2E_PERSONA_FILE')
}
// Reserve a private, new output before changing the disposable database.
const fd = openSync(output, 'wx', 0o600)
try {
  const roles = { owner: 'restaurant_owner', driver: 'driver', manager: 'restaurant_manager', client: 'client', applicant: 'driver', ownerCourier: 'driver', opsCourier: 'driver' }
  const people = Object.fromEntries(Object.entries(roles).map(([name, role]) => [name, { userId: randomUUID(), role, deviceId: `e2e-${randomUUID()}` }]))
  const restaurantId = randomUUID()
  const applicationId = randomUUID()
  const orders = { owner: randomUUID(), driver: randomUUID(), operations: randomUUID() }
  const sql = ['BEGIN;']
  for (const [name, person] of Object.entries(people)) {
    const phone = `9${String(BigInt('0x' + person.userId.replaceAll('-', '').slice(0, 12)) % 1000000000n).padStart(9, '0')}`
    sql.push(`INSERT INTO users (user_id,phone,name,email,role,account_status,phone_verified,email_verified,onboarding_complete)
      VALUES ('${person.userId}','${phone}','E2E ${name} ${person.userId.slice(0, 8)}','${person.userId}@e2e.invalid','${person.role}','active',TRUE,TRUE,${name !== 'applicant'});`)
    if (person.role === 'driver') sql.push(`INSERT INTO driver_profiles (user_id,driving_license_number_encrypted,vehicle_registration_encrypted,is_available,current_city)
      VALUES ('${person.userId}',decode('ZGVtby1vbmx5','base64'),decode('ZGVtby1vbmx5','base64'),FALSE,'Shamgarh');`)
  }
  sql.push(`INSERT INTO restaurants (restaurant_id,owner_id,name,location,status,is_open)
    VALUES ('${restaurantId}','${people.owner.userId}','E2E Persona Kitchen ${restaurantId.slice(0, 8)}',ST_SetSRID(ST_MakePoint(75.6396,24.1874),4326),'active',TRUE);`)
  for (const [name, id] of Object.entries(orders)) {
    const courier = name === 'owner' ? people.ownerCourier : name === 'operations' ? people.opsCourier : people.driver
    sql.push(`INSERT INTO orders (order_id,user_id,restaurant_id,status,subtotal,taxes,delivery_fee,total_amount,payment_method)
      VALUES ('${id}','${people.client.userId}','${restaurantId}','confirmed',100,5,30,135,'cash_on_delivery');
      INSERT INTO deliveries (order_id,order_created_at,partner_id,provider,status,next_transition_at)
      SELECT order_id,created_at,'${courier.userId}','mock','assigned',NOW()+INTERVAL '1 day' FROM orders WHERE order_id='${id}';`)
  }
  sql.push(`INSERT INTO onboardings (onboarding_id,user_id,role,status)
    VALUES ('${applicationId}','${people.applicant.userId}','driver','pending_verification');
    INSERT INTO onboarding_documents (onboarding_id,document_type,s3_key,upload_status)
    SELECT '${applicationId}',document_type,'e2e-fictional/${applicationId}/'||document_type,'uploaded'
    FROM unnest(ARRAY['driving_license','vehicle_registration','vehicle_insurance']) AS document_type;
    COMMIT;`)
  execFileSync('docker', ['exec', '-i', postgres, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], { input: sql.join('\n'), stdio: ['pipe', 'ignore', 'pipe'] })
  for (const person of Object.values(people)) {
    const session = randomUUID()
    execFileSync('docker', ['exec', redis, 'redis-cli', 'HSET', `session:${session}`, 'is_active', 'true', 'user_id', person.userId, 'role', person.role, 'device_id', person.deviceId], { stdio: 'ignore' })
    execFileSync('docker', ['exec', redis, 'redis-cli', 'EXPIRE', `session:${session}`, '7200'], { stdio: 'ignore' })
    const now = Math.floor(Date.now() / 1000)
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
    const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ user_id: person.userId, role: person.role, sub: person.userId, jti: session, iat: now, nbf: now, exp: now + 7200 })}`
    person.accessToken = `${payload}.${createHmac('sha256', process.env.E2E_JWT_SECRET || 'dev-secret-change-me-in-prod').update(payload).digest('base64url')}`
  }
  writeFileSync(fd, JSON.stringify({ people, orders, restaurantId, applicationId }))
  console.log('Created isolated fictional persona fixtures; private sessions saved without printing tokens.')
} finally {
  closeSync(fd)
}
