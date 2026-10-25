<?php
// Kredensial dibaca dari Environment Variables DewaCloud (Settings > Variables).
// Jika getenv() kosong di server Anda, isi nilai cadangan di sebelah kanan tanda ?:
function env_or($key, $fallback) {
    $v = getenv($key);
    if ($v === false || $v === '') {
        $v = isset($_SERVER[$key]) ? $_SERVER[$key] : '';
    }
    return $v !== '' ? $v : $fallback;
}

return array(
    'host' => env_or('DB_HOST', 'localhost'),
    'user' => env_or('DB_USER', 'root'),
    'pass' => env_or('DB_PASSWORD', ''),
    'name' => env_or('DB_NAME', 'CoD_db'),
);
