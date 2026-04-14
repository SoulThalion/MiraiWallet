# Error Codes (Backend)

Este documento define los `error.code` devueltos por la API para que frontend traduzca mensajes de UI por idioma.

## Formato de error API

```json
{
  "success": false,
  "error": {
    "code": 2006,
    "message": "Credenciales inválidas",
    "details": {}
  }
}
```

## Códigos

| Code | Clave interna | HTTP | Mensaje técnico backend (ejemplo) | Contexto típico |
|---:|---|---:|---|---|
| `1001` | `VALIDATION_FAILED` | 400 | Validación de request fallida | Middleware de validación de payload |
| `1002` | `VALIDATION_ERROR` | 422 | Error de validación | Errores Sequelize |
| `1003` | `ROUTE_NOT_FOUND` | 404 | Ruta METHOD /path no encontrada | Ruta inexistente |
| `1004` | `INTERNAL_ERROR` | 500 | Error interno del servidor | Excepciones no controladas |
| `2002` | `AUTH_TOKEN_MISSING` | 401 | No se proporcionó token | Header Authorization ausente |
| `2003` | `AUTH_TOKEN_INVALID` | 401 | Token inválido o expirado | JWT inválido/expirado |
| `2001` | `AUTH_UNAUTHORIZED` | 401 | Usuario no encontrado o inactivo | Usuario inválido |
| `2004` | `AUTH_FORBIDDEN` | 403 | Permisos insuficientes | RBAC |
| `2005` | `AUTH_EMAIL_ALREADY_REGISTERED` | 409 | El email ya está registrado | Registro |
| `2006` | `AUTH_INVALID_CREDENTIALS` | 401 | Credenciales inválidas | Login |
| `2007` | `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token inválido o expirado | Refresh token corrupto |
| `2008` | `AUTH_REFRESH_TOKEN_REVOKED` | 401 | Refresh token revocado | Refresh token no coincide |
| `2009` | `AUTH_CURRENT_PASSWORD_INVALID` | 400 | La contraseña actual es incorrecta | Cambio de contraseña / wipe |
| `2010` | `USER_NOT_FOUND` | 404 | Usuario no encontrado | Perfil |
| `3001` | `ACCOUNT_NOT_FOUND` | 404 | Cuenta no encontrada | Cuentas/transacciones/import |
| `3002` | `CATEGORY_NOT_FOUND` | 404 | Categoría no encontrada | Categorías/presupuestos |
| `3003` | `BUDGET_NOT_FOUND` | 404 | Presupuesto no encontrado | Eliminar presupuesto |
| `3004` | `ALERT_NOT_FOUND` | 404 | Alerta no encontrada | Alerts |
| `3005` | `TRANSACTION_NOT_FOUND` | 404 | Transacción no encontrada | Movimientos |
| `3006` | `CATEGORY_ALREADY_EXISTS` | 409 | La categoría "X" ya existe | Crear categoría |
| `3007` | `CATEGORY_DEFAULT_DELETE_FORBIDDEN` | 400 | No se pueden eliminar categorías por defecto | Eliminar categoría |
| `3101` | `TX_EDIT_ONLY_MANUAL` | 403 | Solo se pueden editar movimientos creados manualmente | Editar movimiento importado |
| `3102` | `TX_CATEGORY_REQUIRED_FOR_EXPENSE` | 400 | La categoría es obligatoria para un gasto | Update de gasto sin categoría |
| `4001` | `IMPORT_EXCEL_READ_FAILED` | 400 | No se pudo leer el archivo Excel | Parser XLSX |
| `4002` | `IMPORT_EXCEL_NO_SHEETS` | 400 | El Excel no contiene hojas | Parser XLSX |
| `4003` | `IMPORT_ING_TABLE_NOT_FOUND` | 400 | No se encontró la tabla de movimientos ING | Parser ING |
| `4004` | `IMPORT_HEADERS_INCOMPLETE` | 400 | Cabeceras de columnas incompletas | Parser ING |
| `4005` | `IMPORT_NO_VALID_ROWS` | 400 | No se encontraron filas válidas | Parser/import |
| `4006` | `IMPORT_BALANCE_COLUMN_INVALID` | 400 | Columna Saldo no legible | Sync saldo |
| `4007` | `IMPORT_PATTERN_KEY_REQUIRED` | 400 | patternKey es obligatorio | Dismiss recurrente |
| `5001` | `PROFILE_MONTH_CYCLE_INVALID` | 400 | Periodo de mes inválido | Config ciclo |
| `5002` | `PROFILE_MONTH_CYCLE_DATE_RANGE_INVALID` | 400 | Inicio posterior a fin | Config ciclo |
| `5003` | `PROFILE_MONTH_CYCLE_MODE_INVALID` | 400 | mode inválido | Config ciclo |
| `5004` | `PROFILE_MONTH_CYCLE_START_INVALID` | 400 | startDay inválido | Config ciclo |
| `5005` | `PROFILE_MONTH_CYCLE_END_INVALID` | 400 | endDay inválido | Config ciclo |
| `5006` | `PROFILE_MONTH_CYCLE_ANCHOR_INVALID` | 400 | anchor inválido | Config ciclo |
| `5007` | `PROFILE_EXCLUDED_CATEGORY_IDS_INVALID` | 400 | recurringExcludedCategoryIds inválido | Config recurrentes |
| `5008` | `PROFILE_EXCLUDED_CATEGORY_ID_INVALID` | 400 | ID de categoría inválido | Config recurrentes |
| `5009` | `PROFILE_EXCLUDED_CATEGORY_UNKNOWN` | 400 | Categoría desconocida | Config recurrentes |
| `5010` | `PROFILE_EXCLUDED_SUBCATEGORY_IDS_INVALID` | 400 | recurringExcludedSubcategoryIds inválido | Config recurrentes |
| `5011` | `PROFILE_EXCLUDED_SUBCATEGORY_ID_INVALID` | 400 | ID de subcategoría inválido | Config recurrentes |
| `5012` | `PROFILE_EXCLUDED_SUBCATEGORY_UNKNOWN` | 400 | Subcategoría desconocida | Config recurrentes |
| `9001` | `DB_NOT_CONFIGURED` | 500 | Base de datos no configurada | Entorno mal configurado |

