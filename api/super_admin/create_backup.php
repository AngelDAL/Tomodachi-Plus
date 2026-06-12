<?php
/**
 * Crear respaldo completo de base de datos (estructura + datos)
 * POST /api/super_admin/create_backup.php
 */
require_once '../../config/database.php';
require_once '../../config/constants.php';
require_once '../../includes/Database.class.php';
require_once '../../includes/Response.class.php';
require_once '../../includes/Auth.class.php';
require_once '../../includes/Mail.class.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Método no permitido', 405);
}

$backupHandle = null;

try {
    $db = new Database();
    $auth = new Auth($db);

    if (!$auth->isLoggedIn()) {
        Response::unauthorized();
    }

    if (!$auth->hasRole(ROLE_SUPER_ADMIN)) {
        Response::error('Permisos insuficientes', 403);
    }

    $currentUser = $auth->getCurrentUser();
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = [];
    }

    $recipientEmail = isset($payload['email']) ? trim((string)$payload['email']) : '';
    if ($recipientEmail === '') {
        $selfUser = $db->selectOne('SELECT email FROM users WHERE user_id = ?', [$currentUser['user_id']]);
        $recipientEmail = $selfUser['email'] ?? '';
    }

    if ($recipientEmail === '' || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        Response::validationError(['email' => 'Debes proporcionar un correo válido para enviar el respaldo']);
    }

    $backupDir = __DIR__ . '/../../database/backups';
    if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) {
        Response::error('No se pudo crear la carpeta de respaldos', 500);
    }

    $timestamp = date('Ymd_His');
    $backupFileName = 'backup_' . DB_NAME . '_' . $timestamp . '.sql';
    $backupFilePath = $backupDir . '/' . $backupFileName;

    $backupHandle = fopen($backupFilePath, 'wb');
    if ($backupHandle === false) {
        Response::error('No se pudo crear el archivo de respaldo', 500);
    }

    $writeLine = function ($line = '') use ($backupHandle) {
        if (fwrite($backupHandle, $line . PHP_EOL) === false) {
            throw new Exception('No se pudo escribir el respaldo en disco');
        }
    };

    $writeLine('-- Tomodachi POS Database Backup');
    $writeLine('-- Generated at: ' . date('Y-m-d H:i:s'));
    $writeLine('-- Database: ' . DB_NAME);
    $writeLine();
    $writeLine('SET FOREIGN_KEY_CHECKS=0;');
    $writeLine();

    $tables = $db->select('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    if (empty($tables)) {
        throw new Exception('No se encontraron tablas para respaldar');
    }

    $tableNameColumn = array_key_first($tables[0]);
    $pdo = $db->getConnection();

    foreach ($tables as $tableRow) {
        $tableName = $tableRow[$tableNameColumn];
        $safeTableName = str_replace('`', '``', $tableName);

        $createTable = $db->selectOne("SHOW CREATE TABLE `{$safeTableName}`");
        if (!$createTable || !isset($createTable['Create Table'])) {
            throw new Exception('No se pudo obtener la estructura de la tabla: ' . $tableName);
        }

        $writeLine('-- -------------------------------------------');
        $writeLine('-- Table structure for `' . $tableName . '`');
        $writeLine('-- -------------------------------------------');
        $writeLine("DROP TABLE IF EXISTS `{$safeTableName}`;");
        $writeLine($createTable['Create Table'] . ';');
        $writeLine();

        $writeLine('-- Data for table `' . $tableName . '`');
        $rowsStmt = $db->query("SELECT * FROM `{$safeTableName}`");
        $columnsSql = null;

        while ($row = $rowsStmt->fetch(PDO::FETCH_ASSOC)) {
            if ($columnsSql === null) {
                $quotedColumns = array_map(function ($columnName) {
                    return '`' . str_replace('`', '``', $columnName) . '`';
                }, array_keys($row));
                $columnsSql = implode(', ', $quotedColumns);
            }

            $valuesSql = array_map(function ($value) use ($pdo) {
                if ($value === null) {
                    return 'NULL';
                }
                return $pdo->quote((string)$value);
            }, array_values($row));

            $writeLine("INSERT INTO `{$safeTableName}` ({$columnsSql}) VALUES (" . implode(', ', $valuesSql) . ');');
        }

        $writeLine();
    }

    $writeLine('SET FOREIGN_KEY_CHECKS=1;');

    fclose($backupHandle);
    $backupHandle = null;

    $mail = new Mail();
    $mailSent = $mail->sendDatabaseBackup(
        $recipientEmail,
        $currentUser['full_name'] ?? 'Administrador',
        $backupFilePath,
        $backupFileName
    );

    $relativeBackupPath = 'database/backups/' . $backupFileName;
    $message = $mailSent
        ? 'Respaldo creado y enviado por correo correctamente'
        : 'Respaldo creado en el sistema, pero no se pudo enviar por correo';

    Response::success([
        'backup_file' => $backupFileName,
        'backup_path' => $relativeBackupPath,
        'email_sent' => $mailSent,
        'email_to' => $recipientEmail
    ], $message);
} catch (Exception $e) {
    if (is_resource($backupHandle)) {
        fclose($backupHandle);
    }
    Response::error('Error al generar el respaldo: ' . $e->getMessage(), 500);
}
