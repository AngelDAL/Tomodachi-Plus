<?php
/**
 * CORS Helper — Tomodachi POS
 * 
 * Configura CORS dinámicamente según orígenes permitidos.
 * Reemplaza los header('Access-Control-Allow-Origin: *') en endpoint individuales.
 */

function setupCORS() {
    $allowedOrigins = [];
    
    // Intentar desde constante definida en config.php
    if (defined('ALLOWED_ORIGINS') && ALLOWED_ORIGINS) {
        $origins = explode(',', ALLOWED_ORIGINS);
        foreach ($origins as $origin) {
            $origin = trim($origin);
            // Convertir wildcards: https://*.tomodachi.app → https://.+\.tomodachi\.app
            $pattern = '/^' . str_replace(['*', '.'], ['.+', '\.'], $origin) . '$/';
            $allowedOrigins[] = ['origin' => $origin, 'pattern' => $pattern];
        }
    }
    
    // Fallback: si estamos en desarrollo, permitir localhost
    if (empty($allowedOrigins)) {
        $allowedOrigins[] = ['origin' => 'http://localhost', 'pattern' => '/^http:\/\/localhost(?::\d+)?$/'];
        $allowedOrigins[] = ['origin' => 'http://localhost:8080', 'pattern' => '/^http:\/\/localhost(?::\d+)?$/'];
    }
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    
    if ($origin) {
        foreach ($allowedOrigins as $allowed) {
            if (preg_match($allowed['pattern'], $origin)) {
                header("Access-Control-Allow-Origin: $origin");
                break;
            }
        }
    } else {
        // Sin origen (petición directa), permitir el primero
        if (!empty($allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$allowedOrigins[0]['origin']}");
        }
    }
    
    // Manejar preflight OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
