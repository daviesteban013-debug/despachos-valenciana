# Autenticación y Autorización — Panel de Logística Valenciana

## Resumen

El panel usa **Google OAuth** para autenticar usuarios. La autenticación tiene **dos capas**:

1. **Google verifica la identidad** (el token es auténtico y el email está verificado).
2. **El backend verifica la autorización** (el email pertenece al dominio corporativo o está en la whitelist).

---

## Variables de entorno de producción

| Variable | Descripción |
|---|---|
| `ALLOWED_EMAIL_DOMAIN` | Dominio corporativo permitido (ej. `lavalenciana.com`) |
| `ALLOWED_EMAILS` | Lista de correos individuales permitidos, separados por coma |
| `VITE_GOOGLE_ALLOWED_DOMAIN` | Solo UX: filtra visualmente el selector de Google (ver ⚠️ abajo) |

---

## Cómo configurar en producción

### Opción A — Solo dominio corporativo (Google Workspace)

```env
ALLOWED_EMAIL_DOMAIN=lavalenciana.com
```

Permite: `logistica@lavalenciana.com`, `bodega01@lavalenciana.com`, etc.  
Rechaza: `personal@gmail.com`, `proveedor@otro.com`

---

### Opción B — Solo whitelist de correos individuales

```env
ALLOWED_EMAILS=operador@gmail.com,coordinador@lavalenciana.com,auditor@externo.com
```

Permite exactamente esos tres correos, sin importar el dominio.

---

### Opción C — Dominio corporativo + excepciones individuales (recomendado)

```env
ALLOWED_EMAIL_DOMAIN=lavalenciana.com
ALLOWED_EMAILS=proveedor.externo@gmail.com,auditoria@consultora.com
```

Un email es admitido si cumple **cualquiera** de las dos condiciones:
- Termina en `@lavalenciana.com`, **O**
- Está en la lista `ALLOWED_EMAILS`.

---

## ¿Qué pasa si no se configura ninguna variable?

El servidor arranca con el acceso abierto para cualquier cuenta de Google válida y muestra esta advertencia en los logs:

```
⚠️  [wmsAuth] MODO INSEGURO: No hay restricción de dominio ni whitelist configurada.
   Cualquier cuenta de Google puede acceder al panel de logística.
   Define ALLOWED_EMAIL_DOMAIN y/o ALLOWED_EMAILS en el archivo .env para restringir el acceso.
```

> **Nunca dejar este modo en producción.**

---

## Respuestas HTTP del backend

| Código | Causa | Mensaje |
|---|---|---|
| `401` | Token ausente, inválido o expirado | `"Token inválido o expirado."` |
| `403` | Token válido pero email no autorizado | `"Tu cuenta de Google no está autorizada para acceder al panel..."` |

El frontend distingue ambos casos y muestra mensajes diferentes:
- **401** → "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
- **403** → "Cuenta no autorizada. Contacta al administrador."

---

## Sobre `VITE_GOOGLE_ALLOWED_DOMAIN` (frontend)

> ⚠️ **Solo ayuda visual, NO es una validación de seguridad.**

Si se define, se pasa como `hosted_domain` al componente `<GoogleLogin>` de `@react-oauth/google`. Esto hace que el selector de cuentas de Google priorice o filtre las cuentas del dominio indicado.

Sin embargo, el parámetro `hd` del lado cliente **puede ser ignorado o bypaseado** (por ejemplo, usando la API de Google directamente). La única validación que realmente protege el sistema es la del backend.

```env
# .env del frontend (Vite)
VITE_GOOGLE_ALLOWED_DOMAIN=lavalenciana.com
```

---

## Rutas protegidas

Solo las rutas que ya usan `requireWmsAuth` aplican esta validación:

- `GET /api/despachos`
- `POST /api/despachos`
- `PATCH /api/despachos/:id/estado`
- `POST /api/despachos/:id/reintentar-sync`
- `POST /api/despachos/:id/incidencia`
- `GET /api/despachos/exportar-plantilla`
- `GET /api/devoluciones`
- `PATCH /api/devoluciones/:id/procesar`

Las rutas de inventario (`/api/inventario/*`), facturas (`/api/facturas`), kardex (`/api/kardex/*`) y el endpoint especial `/api/despachos/sync-excel-directo` **no requieren autenticación** (comportamiento intencional, no cambiado en esta tarea).
