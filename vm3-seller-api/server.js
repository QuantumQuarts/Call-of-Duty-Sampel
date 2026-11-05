require('dotenv').config();
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3001;
const TOKEN = process.env.SELLER_TOKEN || '';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'submissions.json');
if (!TOKEN) {
  console.error('SELLER_TOKEN belum diatur di .env. Server tidak dijalankan.');
  process.exit(1);
}

// Antrean disimpan di file JSON. Handler berjalan sinkron sehingga tidak ada tabrakan tulis.
function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}
function save(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function validate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = [];
  const field = (key, max, required = true) => {
    const v = typeof b[key] === 'string' ? b[key].trim() : '';
    if (required && !v) errors.push(`${key} wajib diisi`);
    if (v.length > max) errors.push(`${key} maksimal ${max} karakter`);
    return v;
  };
  const out = {
    seller_name: field('seller_name', 100),
    game_name: field('game_name', 150),
    size: field('size', 50),
    category: field('category', 100),
    rating: field('rating', 30),
    image_url: field('image_url', 500, false) || null,
  };
  if (out.image_url && !/^https?:\/\//i.test(out.image_url)) {
    errors.push('image_url harus diawali http:// atau https://');
  }
  return { out, errors };
}

function auth(req, res, next) {
  const got = Buffer.from(String(req.get('x-api-key') || ''));
  const want = Buffer.from(TOKEN);
  if (got.length === want.length && crypto.timingSafeEqual(got, want)) return next();
  res.status(401).json({ error: 'Token tidak valid' });
}

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Untuk halaman seller ----
app.get('/api/health', (req, res) => {
  const all = load();
  res.json({
    ok: true,
    hostname: os.hostname(),
    pending: all.filter((i) => i.status === 'pending').length,
    total: all.length,
  });
});

app.get('/api/submissions', (req, res) => res.json(load().slice().reverse()));

app.post('/api/submissions', (req, res) => {
  const { out, errors } = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const item = {
    submission_id: crypto.randomUUID(),
    ...out,
    status: 'pending',
    created_at: new Date().toISOString(),
    synced_at: null,
  };
  const all = load();
  all.push(item);
  save(all);
  res.status(201).json(item);
});

app.delete('/api/submissions/:id', (req, res) => {
  const all = load();
  const i = all.findIndex((x) => x.submission_id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
  if (all[i].status !== 'pending') return res.status(409).json({ error: 'Sudah diambil VM 1, tidak bisa dibatalkan' });
  all.splice(i, 1);
  save(all);
  res.status(204).end();
});

// ---- Untuk VM 1 (pull) ----
app.get('/api/pending', auth, (req, res) => {
  const items = load()
    .filter((i) => i.status === 'pending')
    .map(({ status, synced_at, reason, ...rest }) => rest);
  res.json({ items });
});

app.post('/api/ack', auth, (req, res) => {
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
  const rejected = Array.isArray(req.body && req.body.rejected) ? req.body.rejected : [];
  const now = new Date().toISOString();
  const all = load();
  let n = 0;
  for (const it of all) {
    if (it.status !== 'pending') continue;
    const rj = rejected.find((r) => r && r.id === it.submission_id);
    if (ids.includes(it.submission_id)) {
      it.status = 'synced';
      it.synced_at = now;
      n++;
    } else if (rj) {
      it.status = 'rejected';
      it.reason = String(rj.reason || '').slice(0, 200);
      it.synced_at = now;
      n++;
    }
  }
  save(all);
  res.json({ acknowledged: n });
});

app.use((err, req, res, next) => res.status(err.status || 500).json({ error: 'Permintaan tidak valid' }));

app.listen(PORT, '0.0.0.0', () => console.log(`VM 3 (Seller API) berjalan di port ${PORT}`));
