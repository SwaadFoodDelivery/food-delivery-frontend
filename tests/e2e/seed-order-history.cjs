const { execFileSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { mkdtempSync, readFileSync, unlinkSync, rmdirSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')

// New fictional owner + delivered history only. No existing rows are changed.
// Authentication is seeded by the existing guarded helper, not OTP login.
function seedOrderHistory() {
  const database = process.env.E2E_DATABASE || ''
  if (process.env.E2E_LOCAL_SEED !== '1' || !/^swaad_e2e_order_list_[a-z0-9_]+$/.test(database)) {
    throw new Error('Order history acceptance requires explicit local seeding in a dedicated swaad_e2e_order_list_* database')
  }
  const directory = mkdtempSync(join(tmpdir(), 'swaad-order-list-auth-'))
  const authFile = join(directory, 'session.json')
  let authCreated = false
  const cleanup = () => {
    if (authCreated) unlinkSync(authFile)
    rmdirSync(directory)
  }
  try {
    execFileSync(process.execPath, [join(__dirname, 'seed-session.cjs')], {
      env: { ...process.env, E2E_AUTH_FILE: authFile }, stdio: 'pipe'
    })
    authCreated = true
    const auth = JSON.parse(readFileSync(authFile, 'utf8'))
    if (!/^[0-9a-f-]{36}$/.test(auth.userId)) throw new Error('Invalid seeded user identity')
    // Two timestamp groups differ below millisecond precision. The second group
    // crosses the 20-row page boundary, exercising UUID tie-breaking as well.
    const orders = Array.from({ length: 23 }, (_, index) => ({
      order_id: randomUUID(),
      created_at: index < 3 ? '2026-09-13T10:00:00.123457Z' : '2026-09-13T10:00:00.123456Z',
      total_amount_minor: 12001 + index,
      taxes: ((1001 + index) / 100).toFixed(2)
    }))
    const values = orders.map(order => `('${order.order_id}', '${order.created_at}', '${auth.userId}', '10000000-0000-4000-8000-000000000001', 'delivered', 100.00, ${order.taxes}, 10.00, 0.00, ${(order.total_amount_minor / 100).toFixed(2)}, 'cod')`).join(',\n')
    execFileSync('docker', ['exec', '-i', process.env.E2E_POSTGRES_CONTAINER || 'food-delivery-postgres', 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], {
      input: `BEGIN; INSERT INTO orders (order_id, created_at, user_id, restaurant_id, status, subtotal, taxes, delivery_fee, discount, total_amount, payment_method) VALUES ${values}; COMMIT;`,
      stdio: ['pipe', 'ignore', 'pipe']
    })
    orders.sort((left, right) => left.created_at === right.created_at
      ? (left.order_id < right.order_id ? 1 : -1)
      : (left.created_at < right.created_at ? 1 : -1))
    return { auth, orders, cleanup }
  } catch {
    // Never propagate child-process output or the private session's contents.
    cleanup()
    throw new Error('Private order-history fixture setup failed; verify the dedicated database, catalog and local session prerequisites')
  }
}

module.exports = { seedOrderHistory }
