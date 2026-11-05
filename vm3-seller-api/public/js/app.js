(function () {
  const $ = (id) => document.getElementById(id);
  const rowsEl = $('rows'), emptyEl = $('empty'), msgEl = $('msg'), form = $('form');
  const STATUS = { pending: 'Menunggu diambil VM 1', synced: 'Sudah masuk database', rejected: 'Ditolak' };

  function el(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function cell(label, child) {
    const td = document.createElement('td');
    td.setAttribute('data-label', label);
    if (typeof child === 'string') td.textContent = child; else td.appendChild(child);
    return td;
  }

  function render(items) {
    rowsEl.textContent = '';
    items.forEach((it) => {
      const tr = document.createElement('tr');
      tr.appendChild(cell('Waktu', new Date(it.created_at).toLocaleString('id-ID')));
      tr.appendChild(cell('Game', it.game_name));
      tr.appendChild(cell('Seller', it.seller_name));
      tr.appendChild(cell('Status', (STATUS[it.status] || it.status) + (it.reason ? ': ' + it.reason : '')));
      if (it.status === 'pending') {
        const b = el('button', 'Batalkan', 'btn ghost');
        b.type = 'button';
        b.addEventListener('click', async () => {
          await fetch('/api/submissions/' + encodeURIComponent(it.submission_id), { method: 'DELETE' });
          refresh();
        });
        tr.appendChild(cell('Aksi', b));
      } else tr.appendChild(cell('Aksi', '-'));
      rowsEl.appendChild(tr);
    });
    emptyEl.hidden = items.length > 0;
  }

  async function refresh() {
    try {
      const [h, s] = await Promise.all([fetch('/api/health'), fetch('/api/submissions')]);
      const health = await h.json();
      $('st-host').textContent = health.hostname;
      $('st-pending').textContent = health.pending;
      $('st-total').textContent = health.total;
      $('status').classList.remove('error');
      render(await s.json());
    } catch (e) {
      $('status').classList.add('error');
      $('st-host').textContent = 'Tidak dapat menghubungi VM 3';
    }
  }

  try { $('seller_name').value = localStorage.getItem('seller_name') || ''; } catch (e) { /* abaikan */ }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('submit');
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        msgEl.textContent = 'Pengajuan "' + data.game_name + '" terkirim. Menunggu diambil VM 1.';
        try { localStorage.setItem('seller_name', body.seller_name); } catch (e) { /* abaikan */ }
        form.reset();
        $('seller_name').value = body.seller_name;
      } else {
        msgEl.textContent = 'Gagal: ' + (data.errors || [data.error]).join('; ');
      }
    } catch (e) {
      msgEl.textContent = 'Gagal: VM 3 tidak merespons.';
    }
    btn.disabled = false;
    refresh();
  });

  refresh();
  setInterval(refresh, 5000);
})();
