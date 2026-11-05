(function () {
  const $ = (id) => document.getElementById(id);
  const rowsEl = $('rows'), chipsEl = $('chips'), emptyEl = $('empty');
  const qEl = $('q'), statusEl = $('status'), msgEl = $('msg'), syncBtn = $('sync');
  let games = [], category = 'Semua', gamesKey = '', catKey = '';

  function el(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  function ratingClass(r) {
    const s = r.toLowerCase();
    if (s.indexOf('positive') !== -1 && (s.indexOf('very') === 0 || s.indexOf('overwhelmingly') === 0)) return 'r-very';
    if (s.indexOf('mostly positive') === 0) return 'r-mostly';
    return 'r-mixed';
  }

  function cell(label, child, cls) {
    const td = document.createElement('td');
    td.setAttribute('data-label', label);
    if (cls) td.className = cls;
    if (typeof child === 'string') td.textContent = child; else td.appendChild(child);
    return td;
  }

  function cover(g) {
    const urls = g.images || [];
    if (!urls.length) return el('div', 'Tanpa gambar', 'cover none');
    let i = 0;
    const img = document.createElement('img');
    img.className = 'cover';
    img.loading = 'lazy';
    img.alt = 'Sampul ' + g.game_name;
    img.src = urls[0];
    img.addEventListener('error', () => {
      i++;
      if (i < urls.length) { img.src = urls[i]; return; }
      img.replaceWith(el('div', 'Gambar tidak tersedia', 'cover none'));
    });
    return img;
  }

  function render() {
    const q = qEl.value.trim().toLowerCase();
    const list = games.filter((g) =>
      (category === 'Semua' || g.category === category) && g.game_name.toLowerCase().indexOf(q) !== -1);
    rowsEl.textContent = '';
    list.forEach((g) => {
      const tr = document.createElement('tr');
      tr.appendChild(cell('ID', String(g.id)));
      tr.appendChild(cell('Sampul', cover(g), 'cell-cover'));
      tr.appendChild(cell('Nama Game', g.game_name, 'name'));
      tr.appendChild(cell('Ukuran', g.size));
      tr.appendChild(cell('Kategori', g.category));
      tr.appendChild(cell('Rating', el('span', g.rating, 'badge ' + ratingClass(g.rating))));
      tr.appendChild(cell('Asal', el('span', g.source === 'seller' ? 'Seller: ' + (g.seller_name || '-') : 'VM 1', 'src')));
      if (g.link) {
        const a = el('a', 'Lihat di Steam', 'store');
        a.href = g.link; a.target = '_blank'; a.rel = 'noopener';
        tr.appendChild(cell('Toko', a));
      } else tr.appendChild(cell('Toko', '-'));
      rowsEl.appendChild(tr);
    });
    emptyEl.hidden = list.length > 0;
  }

  function buildChips() {
    const cats = ['Semua'];
    games.forEach((g) => { if (cats.indexOf(g.category) === -1) cats.push(g.category); });
    const key = cats.join('|');
    if (key === catKey) return;
    catKey = key;
    if (cats.indexOf(category) === -1) category = 'Semua';
    chipsEl.textContent = '';
    cats.forEach((c) => {
      const b = el('button', c, 'chip');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(c === category));
      b.addEventListener('click', () => {
        category = c;
        Array.prototype.forEach.call(chipsEl.children, (x) => x.setAttribute('aria-pressed', String(x === b)));
        render();
      });
      chipsEl.appendChild(b);
    });
  }

  function fmtSync(s) {
    if (!s || !s.at) return 'Belum pernah';
    const t = new Date(s.at).toLocaleTimeString('id-ID');
    return s.error ? t + ' - gagal (' + s.error + ')' : t + ' - ' + s.received + ' diterima, ' + s.imported + ' baru';
  }

  function setStatus(s) {
    $('st-vm1').textContent = s.vm1.hostname;
    $('st-db').textContent = s.database.ok
      ? 'Terhubung (' + s.database.ms + ' ms)'
      : 'Gagal (' + s.database.error + ')';
    $('st-seller').textContent = s.seller.ok
      ? 'Terhubung, ' + s.seller.pending + ' menunggu diambil (' + s.seller.hostname + ')'
      : 'Tidak terjangkau (' + s.seller.error + ')';
    $('st-sync').textContent = fmtSync(s.lastSync);
    $('st-count').textContent = s.database.ok ? s.database.count : '-';
    statusEl.classList.toggle('error', !s.database.ok);
    statusEl.classList.toggle('warn', s.database.ok && !s.seller.ok);
  }

  function setOffline(text) {
    statusEl.classList.add('error');
    $('st-db').textContent = text;
    ['st-vm1', 'st-seller', 'st-sync', 'st-count'].forEach((id) => { $(id).textContent = '-'; });
  }

  async function refresh() {
    try {
      const [sr, gr] = await Promise.all([fetch('/api/status'), fetch('/api/games')]);
      setStatus(await sr.json());
      if (gr.ok) {
        const data = await gr.json();
        const key = JSON.stringify(data);
        if (key !== gamesKey) { gamesKey = key; games = data; buildChips(); render(); }
      }
    } catch (e) {
      setOffline('Tidak dapat menghubungi VM 1');
    }
  }

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    msgEl.textContent = 'Menarik data dari VM 3...';
    try {
      const r = await (await fetch('/api/sync', { method: 'POST' })).json();
      msgEl.textContent = r.error
        ? 'Sinkronisasi gagal: ' + r.error
        : 'Sinkronisasi selesai: ' + r.imported + ' game baru dari ' + r.received + ' pengajuan.';
    } catch (e) {
      msgEl.textContent = 'Sinkronisasi gagal: VM 1 tidak merespons.';
    }
    syncBtn.disabled = false;
    refresh();
  });

  qEl.addEventListener('input', render);
  refresh();
  setInterval(refresh, 10000);
})();
