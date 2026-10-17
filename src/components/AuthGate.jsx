import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { AlertOctagon } from 'lucide-react';
import GoogleAuthBadge from './GoogleAuthBadge';

/**
 * Sesión guardada con token Google vigente (margen de 5 minutos), o null.
 */
function usuarioGuardadoValido() {
  try {
    const guardado = JSON.parse(localStorage.getItem('wms_google_user'));
    if (!guardado?.token) return null;
    const { exp } = jwtDecode(guardado.token);
    if (exp && exp - 5 * 60 < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('wms_google_user');
      return null;
    }
    return guardado;
  } catch {
    localStorage.removeItem('wms_google_user');
    return null;
  }
}

/**
 * Exige iniciar sesión con Google antes de mostrar `children(usuario, setUsuario)`.
 * Usa la misma sesión que el WMS (localStorage `wms_google_user`).
 */
export default function AuthGate({ titulo, subtitulo, icono: Icono, children }) {
  const [usuario, setUsuario] = React.useState(() => usuarioGuardadoValido());

  React.useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('wms:auth-expired', alExpirar);
    return () => window.removeEventListener('wms:auth-expired', alExpirar);
  }, []);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
  if (!clientId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Falta Google Client ID</h2>
          <p className="text-sm text-slate-600">
            Configura <code>VITE_GOOGLE_CLIENT_ID</code> en el archivo <code>.env</code> para habilitar el inicio de sesión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {usuario ? children(usuario, setUsuario) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#7a0d10] flex items-center justify-center p-4">
          <div className="relative bg-white/95 p-8 sm:p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6">
            <div className="space-y-3">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 mx-auto">
                  <img src="/logo-valenciana.png" alt="La Valenciana Ferrehogar" className="w-full h-full object-cover" />
                </div>
                {Icono && (
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#E11D24] rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <Icono className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-[#E11D24] uppercase tracking-[0.15em]">La Valenciana FERREHOGAR</p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{titulo}</h2>
                {subtitulo && <p className="text-xs text-slate-500 mt-1.5 font-medium">{subtitulo}</p>}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <GoogleAuthBadge user={usuario} setUser={setUsuario} />
              <p className="text-[10px] text-slate-400 max-w-[220px] leading-relaxed">
                Solo las cuentas autorizadas por el administrador pueden ingresar.
              </p>
            </div>
          </div>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}
