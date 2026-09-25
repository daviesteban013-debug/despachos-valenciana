import React, { useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { LogOut, ShieldX } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// VITE_GOOGLE_ALLOWED_DOMAIN es SOLO una ayuda visual de UX para que el
// selector de Google priorice las cuentas del dominio corporativo.
// ⚠️  NO es una validación de seguridad real: el parámetro "hd" del lado
// cliente puede ser ignorado o bypaseado. La validación obligatoria está
// en el backend (ALLOWED_EMAIL_DOMAIN / ALLOWED_EMAILS en wmsAuth.js).
const HINT_DOMAIN = import.meta.env.VITE_GOOGLE_ALLOWED_DOMAIN || undefined;

export default function GoogleAuthBadge({ user, setUser }) {
  const [authError, setAuthError] = useState(null); // null | '401' | '403'

  const handleSuccess = async (credentialResponse) => {
    setAuthError(null);
    try {
      const decoded = jwtDecode(credentialResponse.credential);

      // Verificar con el backend ANTES de guardar al usuario en estado local.
      // Así detectamos si la cuenta no está autorizada (403) antes de entrar al panel.
      const res = await fetch(`${API_URL}/api/despachos`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${credentialResponse.credential}` }
      });

      if (res.status === 403) {
        // Cuenta de Google válida pero no autorizada por el administrador
        setAuthError('403');
        return;
      }

      if (res.status === 401) {
        // Token inválido o expirado (no debería ocurrir con un token recién emitido)
        setAuthError('401');
        return;
      }

      // Acceso concedido → guardar sesión
      const userData = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        token: credentialResponse.credential
      };
      setUser(userData);
      // Guardamos en localStorage para persistencia básica
      localStorage.setItem('wms_google_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error decodificando el token de Google:', error);
      setAuthError('401');
    }
  };

  const handleError = () => {
    console.error('Login con Google falló');
    setAuthError('401');
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setAuthError(null);
    localStorage.removeItem('wms_google_user');
  };

  // ─── Pantalla de cuenta no autorizada (403) ───────────────────────────────
  if (authError === '403') {
    return (
      <div className="flex flex-col items-center gap-4 w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
          <ShieldX className="w-7 h-7 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">Cuenta no autorizada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Tu cuenta de Google no tiene permisos para acceder al panel de logística de La Valenciana.
            Contacta al administrador si crees que esto es un error.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 h-9 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
        >
          Intentar con otra cuenta
        </button>
      </div>
    );
  }

  // ─── Pantalla de sesión expirada / token inválido (401) ───────────────────
  if (authError === '401') {
    return (
      <div className="flex flex-col items-center gap-4 w-full text-center">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xs">
          Tu sesión ha expirado o el token es inválido. Por favor inicia sesión nuevamente.
        </p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          theme="outline"
          shape="pill"
          {...(HINT_DOMAIN ? { hosted_domain: HINT_DOMAIN } : {})}
        />
      </div>
    );
  }

  // ─── Usuario ya logueado ──────────────────────────────────────────────────
  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
        <img
          src={user.picture}
          alt={user.name}
          className="w-8 h-8 rounded-full shadow-sm border border-slate-100"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col hidden sm:flex">
          <span className="text-sm font-bold text-slate-800 leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {user.email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full transition-colors ml-1"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── Pantalla de login ────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        theme="outline"
        shape="pill"
        // hosted_domain filtra visualmente las cuentas sugeridas al dominio corporativo.
        // ⚠️  Solo es una sugerencia de UX; la validación real está en el backend.
        {...(HINT_DOMAIN ? { hosted_domain: HINT_DOMAIN } : {})}
      />
    </div>
  );
}
