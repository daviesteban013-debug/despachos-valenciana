/**
 * Clase de error operacional para el sistema WMS
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Envoltorio para eliminar la necesidad de try/catch manual en controladores Express
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware centralizado de gestión de errores
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Manejo específico de códigos de error de PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'Conflicto: Ya existe un registro con esta clave única o factura.';
        break;
      case '23503': // foreign_key_violation
        statusCode = 400;
        message = 'Violación de integridad: Referencia inexistente en base de datos.';
        break;
      case '42703': // undefined_column
        statusCode = 500;
        message = `Error de esquema en base de datos: ${err.message}`;
        break;
      default:
        break;
    }
  }

  // Log formateado en consola del servidor
  console.error(`[API-ERROR] [${req.method}] ${req.originalUrl} - Status: ${statusCode} - ${message}`);
  if (statusCode === 500 && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Respuesta compatible con el frontend existente (mantiene propiedad "error")
  return res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  });
}
