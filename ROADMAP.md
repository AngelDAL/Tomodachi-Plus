# 🗺️ ROADMAP - Tomodachi POS Plus

> **Visión**: El POS #1 para negocios mexicanos — gratuito, personalizable, con facturación CFDI integrada.

---

## 📊 Estado Actual

| Métrica | Valor |
|---------|-------|
| Módulos backend | 12 (53 endpoints) |
| Páginas frontend | 19 HTML |
| Líneas PHP app | ~5,850 |
| Líneas JS | ~7,500 |
| Tablas BD | 11 |
| Tests | ❌ 0 |
| Seguridad | ✅ Vulnerabilidades corregidas |

---

## 🎯 Fases de mejora

### 🔴 FASE 1 — Seguridad (Prioridad Máxima)
> *Nave no despega si tiene fugas de combustible*

- [x] Mover API keys de Stability AI y Gemini a variables de entorno
- [x] Cerrar CORS (solo orígenes permitidos por tienda)
- [x] Activar SSL verification en llamadas curl externas
- [x] Sanitizar path traversal en uploads de imágenes
- [x] Remover shell_exec de `create_backup.php`
- [x] Regenerar session ID después de login exitoso
- [x] Rate limiting en endpoints de auth (login, forgot password)
- [x] No enviar contraseñas en texto plano por email
- [x] Remover archivos debug en raíz (debug_promotions.php, test_*)

### 🟡 FASE 2 — UX/UI (Ganancia Rápida)
> *Primera impresión = ultima impresión*

- [ ] Arreglar URL hardcodeada de `PlanManager.js` (localhost)
- [ ] Unificar funciones duplicadas (getRelativeImagePath, showNotification)
- [x] Agregar loading states en operaciones asíncronas
- [x] Mejorar feedback visual (toast notifications en lugar de alerts nativos)
- [ ] Responsive: pulir navegación móvil
- [ ] Agregar favicon y meta tags
- [ ] Optimizar imágenes de productos (lazy loading)
- [ ] Sistema de modo oscuro (listo en CSS, pendiente toggle)
- [ ] Keyboard shortcuts en POS

### 🟠 FASE 3 — Arquitectura (Calidad)
> *Escalar requiere cimientos firmes*

- [ ] Autoloading PSR-4 para clases PHP
- [ ] Router centralizado (1 entry point)
- [ ] Sistema de migraciones con tracking (tabla migrations)
- [ ] Modularizar JS (ES6 modules o bundle)
- [ ] Agregar tests (PHPUnit + Jest/Puppeteer)
- [ ] CI/CD con GitHub Actions
- [ ] .env para config secreta
- [ ] Schema.sql actualizado (incluir promotions + promotion_targets)

### 💚 FASE 4 — Features (Valor de Negocio)
> *Lo que paga las cuentas*

- [ ] **Facturación CFDI 4.0** — Plan Premium
  - [ ] Alta de PAC (Proveedor Autorizado de Certificación)
  - [ ] Catálogos SAT (métodos de pago, uso CFDI, regimenes fiscales)
  - [ ] Generación de XML timbrado
  - [ ] Cancelación de facturas
  - [ ] Historial de facturas emitidas
  - [ ] Reporte fiscal mensual
- [ ] Exportar ventas a CSV/PDF
- [ ] Template de tickets personalizable por tienda
- [ ] Panel de control en tiempo real (WebSocket)
- [ ] Catálogo de productos desde celular
- [ ] Integración con Mercado Pago / Stripe

### 💜 FASE 5 — Crecimiento (Escalar)
> *Llegar a más negocios*

- [ ] Panel de super admin con analytics globales
- [ ] Onboarding guiado para nuevos usuarios
- [ ] Landing page + marketing site
- [ ] Integración con WhatsApp Business API
- [ ] App nativa con Capacitor / Tauri
- [ ] Market de plugins / extensiones
- [ ] Multi-idioma (ES/EN)

---

## 📈 Métricas de éxito

| Métrica | Target |
|---------|--------|
| Velocidad de carga POS | < 2s |
| Tests coverage | > 70% |
| Vulnerabilidades críticas | 0 |
| Usuarios simultáneos por tienda | 10+ |
| Tiempo de onboarding | < 5 min |

---

## 📝 Changelog

*Documentado en CHANGELOG.md — cada cambio se registra con fecha, qué, por qué y quién.*

---

> *Este roadmap es vivo — se actualiza con cada revisión y feedback de usuarios.*
> Última actualización: 2026-06-24
