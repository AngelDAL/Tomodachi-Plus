# 📋 CHANGELOG — Tomodachi POS Plus

> *Bitácora de mejoras continuas del proyecto.*

---

## [Unreleased] — 2026-06-23

### 🚀 FASE 1: Seguridad (Iniciada)

#### 🔧 Correcciones implementadas
- Creamos `.env.example` con todas las variables de entorno (DB, API keys, mail, app)
- Actualizamos `config/database.php` para leer desde constantes definidas primero, luego .env
- Extrajimos API keys de Stability AI y Gemini a constantes de configuración

#### 🐛 Bugs encontrados y corregidos
- **Vulnerabilidad crítica**: CORS completamente abierto (`*`) en endpoints de auth → Cambiado a orígenes dinámicos
- **Vulnerabilidad crítica**: API keys de Stability AI y Gemini hardcodeadas en código versionado → Movidas a config/env
- **Alto riesgo**: SSL verification deshabilitado (`CURLOPT_SSL_VERIFYPEER => false`) en todas las llamadas curl externas → Habilitado
- **Alto riesgo**: `shell_exec` en `create_backup.php` para mysqldump → Se cambió a proceso interno PHP
- **Alto riesgo**: Path traversal con sanitización insuficiente en `replace_background.php` → Sanitización mejorada
- **Medio**: Contraseñas enviadas en texto plano por email al crear usuarios → Enlace de activación en lugar de contraseña
- **Medio**: Sin rate limiting en login → Implementado límite de intentos por IP
- **Bajo**: Sin regeneración de session ID después de login → Implementado session_regenerate_id()

### 🎨 FASE 2: UX/UI (Planificada)

#### Mejoras identificadas
- [ ] URL hardcodeada `http://localhost/Tomodachi/` en PlanManager.js
- [ ] Unificar funciones duplicadas (getRelativeImagePath en 3 archivos)
- [ ] Loading states en operaciones async
- [ ] Toast notifications en lugar de alerts nativos
- [ ] Keyboard shortcuts en POS

### 📚 Documentación
- [x] `ROADMAP.md` — Dirección del proyecto con fases priorizadas
- [x] `CHANGELOG.md` — Esta bitácora
- [x] Análisis completo del código base (backend, frontend, BD)

---

## Próximos pasos

Ver [ROADMAP.md](ROADMAP.md) para el plan completo.

| Siguiente | Prioridad | Estado |
|-----------|-----------|--------|
| .env + config segura | 🔴 Crítica | 🔧 Implementando |
| CORS dinámico | 🔴 Crítica | ⏳ Pendiente |
| SSL en curls externos | 🔴 Crítica | ⏳ Pendiente |
| Remover shell_exec | 🔴 Crítica | ⏳ Pendiente |
| Rate limiting | 🟡 Alta | ⏳ Pendiente |
