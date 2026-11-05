require('dotenv').config();
const express = require('express');
const os = require('os');
const path = require('path');
const pool = require('./db');
const seller = require('./seller');
const { validateGame } = require('./validate');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ID Steam hanya dipakai untuk gambar/tautan data bawaan yang image_url-nya kosong.
const STEAM = {
  'Call of Duty: Modern Warfare II (2022)': 3595230,
  'Call of Duty: Modern Warfare (2019)': 2000950,
  'Call of Duty: Black Ops Cold War': 1985810,
  'Call of Duty: Modern Warfare IV (2026)': 4435490,
  'Call of Duty: WWII': 476600,
  'Call of Duty: Ghosts': 209160,
};

function decorate(r) {
  const sid = STEAM[r.game_name];
  let images = [];
  if (r.image_url) images = [r.image_url];
  else if (sid) {
    images = [
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${sid}/header.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${sid}/header.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${sid}/header.jpg`,
    ];
  }
  return {
    id: r.id, game_name: r.game_name, size: r.size, category: r.category, rating: r.rating,
    seller_name: r.seller_name, source: r.source, images,
    link: sid ? `https://store.steampowered.com/app/${sid}` : null,
  };
}

// id harus bilangan bulat positif
app.param('id', (req, res, next, id) =>
  /^\d{1,10}$/.test(id) ? next() : res.status(400).json({ error: 'id harus berupa angka' }));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Kesalahan server atau database', code: err.code || null });
  });

const getOne = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM games WHERE id = ?', [id]);
  return rows[0];
};

// ---- CRUD (diuji dari Postman di host) ----
app.get('/api/games', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM games ORDER BY id');
  res.json(rows.map(decorate));
}));

app.get('/api/games/:id', wrap(async (req, res) => {
  const row = await getOne(req.params.id);
  if (!row) return res.status(404).json({ error: 'Game tidak ditemukan' });
  res.json(decorate(row));
}));

app.post('/api/games', wrap(async (req, res) => {
  const { out, errors } = validateGame(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const [r] = await pool.execute(
    'INSERT INTO games (game_name, size, category, rating, image_url) VALUES (?, ?, ?, ?, ?)',
    [out.game_name, out.size, out.category, out.rating, out.image_url]
  );
  res.status(201).json(decorate(await getOne(r.insertId)));
}));

app.put('/api/games/:id', wrap(async (req, res) => {
  const { out, errors } = validateGame(req.body);
  if (errors.length) return res.status(400).json({ errors });
  if (!(await getOne(req.params.id))) return res.status(404).json({ error: 'Game tidak ditemukan' });
  await pool.execute(
    'UPDATE games SET game_name = ?, size = ?, category = ?, rating = ?, image_url = ? WHERE id = ?',
    [out.game_name, out.size, out.category, out.rating, out.image_url, req.params.id]
  );
  res.json(decorate(await getOne(req.params.id)));
}));

app.delete('/api/games/:id', wrap(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM games WHERE id = ?', [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Game tidak ditemukan' });
  res.status(204).end();
}));

// ---- Status dan sinkronisasi dengan VM 3 ----
app.get('/api/status', wrap(async (req, res) => {
  const t = Date.now();
  let database;
  try {
    const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM games');
    database = { ok: true, ms: Date.now() - t, count: row.n };
  } catch (e) {
    database = { ok: false, error: e.code || 'ERROR' };
  }
  res.json({
    vm1: { hostname: os.hostname(), uptime: Math.round(process.uptime()) },
    database,
    seller: await seller.health(),
    lastSync: seller.lastSync(),
  });
}));

app.post('/api/sync', wrap(async (req, res) => res.json(await seller.sync(pool))));

app.use((err, req, res, next) => res.status(err.status || 500).json({ error: 'Permintaan tidak valid' }));

app.listen(PORT, '0.0.0.0', () => console.log(`VM 1 berjalan di port ${PORT}`));

const every = Number(process.env.SYNC_INTERVAL_MS ?? 15000);
if (every > 0) setInterval(() => seller.sync(pool), every);
