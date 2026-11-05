// Menarik (pull) data dari Seller API di VM 3 lalu menyimpannya ke database VM 2.
const { validateGame } = require('./validate');

const BASE = (process.env.SELLER_URL || '').replace(/\/$/, '');
const TOKEN = process.env.SELLER_TOKEN || '';
let last = { at: null, received: 0, imported: 0, error: null };
let running = false;

const errText = (e) => (e.name === 'AbortError' ? 'timeout' : (e.cause && e.cause.code) || e.message);

async function call(pathname, opts = {}) {
  if (!BASE) throw new Error('SELLER_URL belum diatur');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(BASE + pathname, {
      method: opts.method || 'GET',
      headers: { 'x-api-key': TOKEN, 'content-type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`VM 3 membalas HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function health() {
  try {
    const h = await call('/api/health');
    return { ok: true, hostname: h.hostname, pending: h.pending };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

async function sync(pool) {
  if (running) return { ...last, skipped: true };
  running = true;
  try {
    const { items = [] } = await call('/api/pending');
    const accepted = [];
    const rejected = [];
    let imported = 0;
    for (const it of items) {
      const { out, errors } = validateGame(it, true);
      const idOk = typeof it.submission_id === 'string' && it.submission_id.length === 36;
      if (errors.length || !idOk) {
        if (typeof it.submission_id === 'string') {
          rejected.push({ id: it.submission_id, reason: errors.join('; ') || 'submission_id tidak valid' });
        }
        continue;
      }
      // INSERT IGNORE + UNIQUE(submission_id): tarik ulang tidak membuat data ganda.
      const [r] = await pool.execute(
        `INSERT IGNORE INTO games
         (game_name, size, category, rating, image_url, seller_name, submission_id, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'seller')`,
        [out.game_name, out.size, out.category, out.rating, out.image_url, out.seller_name, it.submission_id]
      );
      if (r.affectedRows === 1) imported++;
      accepted.push(it.submission_id);
    }
    if (accepted.length || rejected.length) {
      await call('/api/ack', { method: 'POST', body: { ids: accepted, rejected } });
    }
    last = { at: new Date().toISOString(), received: items.length, imported, error: null };
  } catch (e) {
    last = { at: new Date().toISOString(), received: 0, imported: 0, error: errText(e) };
  } finally {
    running = false;
  }
  return last;
}

module.exports = { health, sync, lastSync: () => last };
