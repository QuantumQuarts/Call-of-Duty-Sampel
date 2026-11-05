// Validasi input game (dipakai CRUD dan sinkronisasi dari VM 3).
function validateGame(body, withSeller = false) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = [];
  const field = (key, max, required = true) => {
    const v = typeof b[key] === 'string' ? b[key].trim() : '';
    if (required && !v) errors.push(`${key} wajib diisi`);
    if (v.length > max) errors.push(`${key} maksimal ${max} karakter`);
    return v;
  };
  const out = {
    game_name: field('game_name', 150),
    size: field('size', 50),
    category: field('category', 100),
    rating: field('rating', 30),
    image_url: field('image_url', 500, false) || null,
  };
  if (withSeller) out.seller_name = field('seller_name', 100);
  if (out.image_url && !/^https?:\/\//i.test(out.image_url)) {
    errors.push('image_url harus diawali http:// atau https://');
  }
  return { out, errors };
}

module.exports = { validateGame };
