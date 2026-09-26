import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook para gestionar la conexión en tiempo real vía WebSockets (Socket.io)
 * @param {Function} onEventoRecibido - Callback para procesar actualizaciones remotas
 * @param {string} wsUrl - URL del servidor WebSocket (opcional, fallback inteligente)
 */
export function useWmsSockets(onEventoRecibido, wsUrl) {
  const socketRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = wsUrl || (import.meta.env.VITE_API_URL || `${protocol}//${window.location.hostname}:3001`);

    try {
      const socket = io(host);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[WMS-WS] Conexión Socket.io establecida');
      });

      socket.on('wms_update_event', (data) => {
        if (onEventoRecibido) {
          onEventoRecibido(data);
        }
      });

      socket.on('connect_error', (err) => {
        console.warn('[WMS-WS] Advertencia de socket:', err.message || err);
      });

      socket.on('disconnect', () => {
        console.log('[WMS-WS] Conexión cerrada. Socket.io reintentará automáticamente.');
      });
    } catch (e) {
      console.warn('[WMS-WS] No se pudo inicializar Socket.io:', e.message);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onEventoRecibido, wsUrl]);

  return { socket: socketRef.current };
}
