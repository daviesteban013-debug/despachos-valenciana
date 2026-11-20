import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Loader2, Trash2, ShieldCheck, ClipboardList, Lock } from 'lucide-react';
import { usuariosApi } from '../services/cuadreApi';

const ROLES = [
  { id: 'CONTADOR', etiqueta: 'Contador', detalle: 'Entra a la app y registra conteos en planillas' },
  { id: 'ADMIN', etiqueta: 'Admin', detalle: 'Además crea jornadas, carga el TNS, genera reconteos y gestiona usuarios' }
];

const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function UsuariosPanel({ notificar }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('CONTADOR');
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState(null); // email en proceso

  const cargar = useCallback(async () => {
    try {
      setDatos(await usuariosApi.listar());
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const u = await usuariosApi.agregar(email.trim(), rol);
      notificar('success', `${u.email} ${u.nuevo ? 'ya puede entrar' : 'quedó actualizado'} como ${u.rol === 'ADMIN' ? 'Admin' : 'Contador'}.`);
      setEmail('');
      setRol('CONTADOR');
      await cargar();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarRol = async (u, nuevoRol) => {
    setOcupado(u.email);
    try {
      await usuariosApi.cambiarRol(u.email, nuevoRol);
      notificar('success', `${u.email} ahora es ${nuevoRol === 'ADMIN' ? 'Admin' : 'Contador'}.`);
      await cargar();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (u) => {
    if (!window.confirm(`¿Quitar el acceso de ${u.email}? Ya no podrá entrar a la app (salvo que esté autorizado en Render).`)) return;
    setOcupado(u.email);
    try {
      await usuariosApi.quitar(u.email);
      notificar('success', `Se quitó el acceso de ${u.email}.`);
      await cargar();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setOcupado(null);
    }
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-16 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#E11D24]" /> Cargando usuarios...</div>;
  }

  const usuarios = datos?.usuarios || [];
  const entorno = datos?.entorno || { correos: [], admins: [], dominio: null };
  const yo = datos?.yo;
  const enEntorno = (e) => entorno.correos.includes(e) || entorno.admins.includes(e) ||
    (entorno.dominio && e.endsWith(`@${entorno.dominio}`));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Usuarios</h2>
        <p className="text-xs text-slate-500">Quién puede entrar a la app y con qué rol. Los cambios aplican de inmediato.</p>
      </div>

      {/* Agregar */}
      <form onSubmit={agregar} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="correo@gmail.com" autoComplete="off"
            className="w-full sm:flex-1 min-w-0 h-11 shrink-0 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
          <div className="flex h-11 rounded-xl border border-slate-300 overflow-hidden bg-slate-50 p-0.5 shrink-0">
            {ROLES.map(r => (
              <button key={r.id} type="button" onClick={() => setRol(r.id)} title={r.detalle}
                className={`px-3 text-xs font-bold rounded-lg ${rol === r.id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                {r.etiqueta}
              </button>
            ))}
          </div>
          <button disabled={guardando || !email.trim()}
            className="h-11 px-4 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 shrink-0">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Agregar
          </button>
        </div>
        <p className="text-[11px] text-slate-500">{ROLES.find(r => r.id === rol)?.detalle}. La persona entra con su cuenta de Google de ese correo.</p>
      </form>

      {/* Lista */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-black text-slate-900">
          Autorizados desde la app ({usuarios.length})
        </div>
        {usuarios.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Todavía no hay usuarios agregados desde la app.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {usuarios.map(u => {
              const esYo = u.email === yo;
              return (
                <li key={u.email} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${u.rol === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {u.rol === 'ADMIN' ? <ShieldCheck className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {u.email} {esYo && <span className="text-[11px] font-semibold text-slate-500">(tú)</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Agregado {fecha(u.agregado_en)}{u.agregado_por ? ` por ${u.agregado_por}` : ''}
                        {enEntorno(u.email) && ' · también autorizado en Render'}
                      </div>
                    </div>
                  </div>
                  {esYo ? (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 sm:ml-auto"><Lock className="w-3.5 h-3.5" /> No puedes cambiar tu propio acceso</span>
                  ) : (
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <select value={u.rol} disabled={ocupado === u.email} onChange={e => cambiarRol(u, e.target.value)}
                        className="h-9 px-2 rounded-lg border border-slate-300 text-xs font-bold bg-white">
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.etiqueta}</option>)}
                      </select>
                      <button onClick={() => quitar(u)} disabled={ocupado === u.email} title="Quitar acceso"
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40">
                        {ocupado === u.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Accesos configurados en Render (solo lectura) */}
      {(entorno.correos.length > 0 || entorno.admins.length > 0 || entorno.dominio) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-700">También configurados en Render (solo se cambian allá)</p>
          {entorno.dominio && <p>Cualquier correo <strong>@{entorno.dominio}</strong> puede entrar.</p>}
          {entorno.admins.length > 0 && <p>Admins: {entorno.admins.join(', ')}</p>}
          {entorno.correos.length > 0 && <p className="break-words">Pueden entrar: {entorno.correos.join(', ')}</p>}
        </div>
      )}
    </div>
  );
}
