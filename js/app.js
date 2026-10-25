(function () {
  var rowsEl = document.getElementById('rows');
  var chipsEl = document.getElementById('chips');
  var emptyEl = document.getElementById('empty');
  var qEl = document.getElementById('q');
  var statusEl = document.getElementById('status');
  var games = [];
  var category = 'Semua';

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  function ratingClass(r) {
    var s = r.toLowerCase();
    if (s.indexOf('very') === 0) return 'r-very';
    if (s.indexOf('mostly') === 0) return 'r-mostly';
    return 'r-mixed';
  }

  function cell(label, child, cls) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    if (cls) td.className = cls;
    if (typeof child === 'string') td.textContent = child; else td.appendChild(child);
    return td;
  }

  function cover(g) {
    if (!g.image) return el('div', 'Tanpa gambar', 'cover none');
    var img = document.createElement('img');
    img.className = 'cover';
    img.loading = 'lazy';
    img.alt = 'Sampul ' + g.game_name;
    img.src = g.image;
    img.addEventListener('error', function () {
      img.replaceWith(el('div', 'Gambar tidak tersedia', 'cover none'));
    });
    return img;
  }

  function render() {
    var q = qEl.value.trim().toLowerCase();
    var list = games.filter(function (g) {
      return (category === 'Semua' || g.category === category) &&
             g.game_name.toLowerCase().indexOf(q) !== -1;
    });
    rowsEl.textContent = '';
    list.forEach(function (g) {
      var tr = document.createElement('tr');
      tr.appendChild(cell('ID', String(g.id)));
      tr.appendChild(cell('Sampul', cover(g), 'cell-cover'));
      tr.appendChild(cell('Nama Game', g.game_name, 'name'));
      tr.appendChild(cell('Ukuran', g.size));
      tr.appendChild(cell('Kategori', g.category));
      tr.appendChild(cell('Rating', el('span', g.rating, 'badge ' + ratingClass(g.rating))));
      if (g.link) {
        var a = el('a', 'Lihat di Steam', 'store');
        a.href = g.link; a.target = '_blank'; a.rel = 'noopener';
        tr.appendChild(cell('Toko', a));
      } else {
        tr.appendChild(cell('Toko', '-'));
      }
      rowsEl.appendChild(tr);
    });
    emptyEl.hidden = list.length > 0;
  }

  function buildChips() {
    var cats = ['Semua'];
    games.forEach(function (g) { if (cats.indexOf(g.category) === -1) cats.push(g.category); });
    chipsEl.textContent = '';
    cats.forEach(function (c) {
      var b = el('button', c, 'chip');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(c === category));
      b.addEventListener('click', function () {
        category = c;
        Array.prototype.forEach.call(chipsEl.children, function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        render();
      });
      chipsEl.appendChild(b);
    });
  }

  function setStatus(ok, text, host, count) {
    statusEl.classList.toggle('error', !ok);
    document.getElementById('st-text').textContent = text;
    document.getElementById('st-host').textContent = host || '-';
    document.getElementById('st-count').textContent = count === undefined ? '-' : count;
  }

  fetch('api.php', { cache: 'no-store' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.ok) { setStatus(false, data.message, data.host); return; }
      games = data.games;
      setStatus(true, 'Koneksi berhasil', data.host, data.count);
      buildChips();
      render();
    })
    .catch(function () {
      setStatus(false, 'Tidak dapat memuat api.php. Pastikan PHP berjalan di server.');
    });

  qEl.addEventListener('input', render);
})();
