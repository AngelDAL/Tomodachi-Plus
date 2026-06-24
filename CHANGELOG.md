# 📋 CHANGELOG — Tomodachi POS Plus

> *Bitácora de mejoras continuas del proyecto.*

---

## [Unreleased] — 2026-06-24

### 🚀 FASE 1: Seguridad — ✅ Completada

> **Estado**: Las 9 vulnerabilidades corregidas, debug files removidos, router.php creado.

#### 🔧 Correcciones implementadas

- **API keys fuera del código**: Movidas Stability AI y Gemini a variables de entorno (`config/env.php`, `.env`)
- **CORS dinámico**: Reemplazado `Access-Control-Allow-Origin: *` con validación contra orígenes permitidos por tienda
- **SSL verification**: Activado `CURLOPT_SSL_VERIFYPEER => true` en todas las llamadas curl externas
- **Path traversal sanitizado**: Mejorada sanitización en `replace_background.php` (basename + whitelist de caracteres)
- **Shell_exec eliminado**: `create_backup.php` migrado a proceso interno PHP (mysqldump vía `exec()` con escapes)
- **Session ID regenerado**: `session_regenerate_id(true)` después de login exitoso
- **Rate limiting**: Implementado límite de intentos por IP en login y forgot password (archivo `/tmp/login_attempts/`)
- **Contraseñas seguras**: Enlace de activación en lugar de contraseña en texto plano al crear usuarios
- **Debug files removidos**: Eliminados `debug_promotions.php`, `test_conexion.php`, `test_db.php`, `test_upload.php` y otros archivos de prueba en raíz

#### 🐛 Bugs encontrados y corregidos

| Vulnerabilidad | Severidad | Solución |
|---------------|-----------|----------|
| CORS completamente abierto (`*`) | 🔴 Crítica | Orígenes dinámicos por tienda |
| API keys hardcodeadas en código versionado | 🔴 Crítica | Movidas a config/env |
| SSL verification deshabilitado en curls externos | 🔴 Alta | Habilitado (`CURLOPT_SSL_VERIFYPEER => true`) |
| `shell_exec` en `create_backup.php` | 🔴 Alta | Cambiado a proceso interno PHP |
| Path traversal en `replace_background.php` | 🔴 Alta | Sanitización mejorada con basename + regex |
| Contraseñas en texto plano por email | 🟡 Medio | Enlace de activación en lugar de contraseña |
| Sin rate limiting en login | 🟡 Medio | Límite de intentos por IP implementado |
| Sin regeneración de session ID tras login | 🟢 Bajo | `session_regenerate_id()` implementado |

### 🛡️ Infraestructura: Dev Server

- **Router.php creado**: Punto de entrada único para el servidor de desarrollo con protecciones contra directory traversal, MIME types correctos y manejo de CORS para dev

### 🎨 FASE 2: UX/UI — 🟡 En Progreso (2/9 completados)

#### ✅ Completado

- **Toast system implementado** — `assets/js/toast.js` creado con sistema de notificaciones toast (success, error, warning, info). Reemplazó todos los `alert()` y `confirm()` nativos en los archivos JS:
  - `promotions.js` → Toasts confirm/error
  - `products.js` → Toast de guardado exitoso
  - `POS.js` → Toast de error en carga de productos
  - `login.js` → Toast de error de autenticación
  - `create_backup.js` → Toast en lugar de alert en proceso de respaldo
  - `backup_success.php` → Toast UI mejorado
- **Loading states**: Agregados indicadores de carga en operaciones asíncronas (login, carga de productos, promociones, respaldos)

#### ⏳ Pendiente

- [ ] Arreglar URL hardcodeada `http://localhost/Tomodachi/` en PlanManager.js
- [ ] Unificar funciones duplicadas (getRelativeImagePath en 3 archivos)
- [ ] Responsive: pulir navegación móvil
- [ ] Agregar favicon y meta tags
- [ ] Optimizar imágenes de productos (lazy loading)
- [ ] Sistema de modo oscuro — toggle pendiente (CSS listo)
- [ ] Keyboard shortcuts en POS

### 📚 Documentación

- [x] `ROADMAP.md` — Actualizado con progreso (Fase 1 ✅ completa, Fase 2 parcial)
- [x] `CHANGELOG.md` — Esta bitácora actualizada
- [x] Análisis completo del código base (backend, frontend, BD)

---

## Próximos pasos

Ver [ROADMAP.md](ROADMAP.md) para el plan completo.

| Siguiente | Prioridad | Estado |
|-----------|-----------|--------|
| Fase 3 — Arquitectura (PSR-4, Router, Tests) | 🟠 Alta | ⏳ Pendiente |
| Fase 2 — UX restante (PlanManager.js, responsive, dark mode) | 🟡 Media | 🔧 En progreso |
| Fase 4 — Facturación CFDI 4.0 | 💚 Media | ⏳ Pendiente |
