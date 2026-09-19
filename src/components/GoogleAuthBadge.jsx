import React from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { LogOut } from 'lucide-react';

export default function GoogleAuthBadge({ user, setUser }) {
  const handleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      // Extraemos la información relevante del perfil de Google
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
    }
  };

  const handleError = () => {
    console.error('Login con Google falló');
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('wms_google_user');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          theme="outline"
          shape="pill"
        />
      </div>
    );
  }

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
