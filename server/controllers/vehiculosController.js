import { ApiError } from '../middlewares/errorHandler.js';
import { listarVehiculos, registrarVehiculo } from '../services/vehiculosService.js';
import { io } from '../server.js';

// GET /api/vehiculos
export async function listarVehiculosController(req, res, next) {
  try {
    const vehiculos = await listarVehiculos();
    return res.json(vehiculos);
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

// POST /api/vehiculos
export async function crearVehiculoController(req, res, next) {
  try {
    const { placa, conductor, modelo, identificador } = req.body;

    if (!placa || !placa.trim()) {
      return next(new ApiError(400, 'La placa del vehículo es requerida.'));
    }

    const resultado = await registrarVehiculo({
      placa,
      conductor,
      modelo,
      identificador
    });

    // Notificar a todos los clientes conectados vía WebSocket
    if (io) {
      io.emit('wms_update_event', {
        action: 'VEHICULO_CREADO',
        vehiculo: resultado.vehiculo,
        destino: resultado.destino
      });
    }

    return res.status(201).json({
      success: true,
      mensaje: `Vehículo [${resultado.vehiculo.placa}] registrado y creado en plantilla Excel exitosamente.`,
      vehiculo: resultado.vehiculo,
      destino: resultado.destino
    });
  } catch (error) {
    console.error('[VEHICULOS-CONTROLLER] Error:', error.message);
    return next(new ApiError(500, error.message));
  }
}
