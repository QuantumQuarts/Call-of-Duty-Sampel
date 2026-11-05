<?php
function env_or($key, $fallback) {
    $v = getenv($key);
    if ($v === false || $v === '') {
        $v = isset($_SERVER[$key]) ? $_SERVER[$key] : '';
    }
    return $v !== '' ? $v : $fallback;
}

$cfg = array(
    'host' => env_or('DB_HOST', 'localhost'),
    'user' => env_or('DB_USER', 'root'),
    'pass' => env_or('DB_PASSWORD', ''),
    'name' => env_or('DB_NAME', 'CoD_db'),
);

// File ini dibuat langsung di server, tidak masuk Git.
$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    $cfg = array_merge($cfg, require $local);
}
return $cfg;
