<?php
/**
 * Router para PHP built-in server (Dev)
 * Sirve archivos estáticos desde public/ y APIs desde api/
 * Incluye protecciones de seguridad contra directory traversal
 */

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$baseDir = __DIR__;

// ===== Seguridad: Prevenir directory traversal =====
$realPath = realpath($baseDir . $path);
$allowedDirs = [
    realpath($baseDir . '/public'),
    realpath($baseDir . '/api'),
];

// Para paths que no son / y contienen .., rechazar traversal
if (strpos($path, '..') !== false) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden: directory traversal detectado']);
    return true;
}

// ===== Seguridad: Bloquear archivos sensibles =====
$blockedPatterns = [
    '/^\.env/',
    '/^config\//',
    '/^includes\//',
    '/^database\//',
    '/\.sql$/',
    '/router\.php$/',
];
foreach ($blockedPatterns as $pattern) {
    if (preg_match($pattern, ltrim($path, '/'))) {
        http_response_code(403);
        echo 'Forbidden';
        return true;
    }
}

// ===== API endpoints =====
if (strpos($path, '/api/') === 0) {
    $apiFile = $baseDir . $path;
    if (file_exists($apiFile)) {
        // Cambiar al directorio del API para que los require relativos funcionen
        chdir(dirname($apiFile));
        require $apiFile;
        return true;
    }
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API endpoint not found']);
    return true;
}

// ===== Archivos estáticos y HTML desde public/ =====
$publicPath = $baseDir . '/public' . $path;
if ($path !== '/' && file_exists($publicPath)) {
    if (is_dir($publicPath)) {
        http_response_code(403);
        echo 'Forbidden';
        return true;
    }
    // Servir archivo estático manualmente
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
        'otf'  => 'font/otf',
        'webp' => 'image/webp',
        'mp4'  => 'video/mp4',
        'pdf'  => 'application/pdf',
        'txt'  => 'text/plain',
        'xml'  => 'application/xml',
        'map'  => 'application/json',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    readfile($publicPath);
    return true;
}

// ===== Raíz → landing =====
$landing = $baseDir . '/public/landing.html';
if (file_exists($landing)) {
    readfile($landing);
    return true;
}

// ===== 404 =====
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>404 - No encontrado</h1>';
echo '<p>La ruta solicitada no existe: <code>' . htmlspecialchars($path) . '</code></p>';
return true;
