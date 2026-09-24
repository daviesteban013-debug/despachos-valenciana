// Slugs oficiales requeridos por la especificación de base de datos
export const SECCIONES = [
  {
    slug: 'materiales_construccion',
    nombre: 'Materiales de Construcción',
    color: 'bg-stone-100 text-stone-800 border-stone-300',
    badgeColor: 'bg-stone-700 text-white',
    accentBorder: 'border-stone-500',
    icon: 'Hammer',
    bodegaFisica: 'Nave A - Patios y Silos',
    sugerencias: [
      'Cemento Gris 50kg Argos',
      'Varilla Corrugada 1/2" x 6m',
      'Estuco Plástico 20kg Corona',
      'Pegacor Blanco Porcelánico 25kg',
      'Arena de Peña m³'
    ]
  },
  {
    slug: 'pinturas',
    nombre: 'Pinturas',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    badgeColor: 'bg-indigo-600 text-white',
    accentBorder: 'border-indigo-500',
    icon: 'Paintbrush',
    bodegaFisica: 'Pasillo 4 - Tintometría',
    sugerencias: [
      'Esmalte Sintético Pintulux Rojo Galón',
      'Vinilo Tipo 1 Blanco Nieve Cuñete 5 Gal',
      'Thinner Corriente Galón',
      'Brocha Cerda Mona 3"',
      'Rodillo Antigota Felpa 9"'
    ]
  },
  {
    slug: 'herramienta_electrica',
    nombre: 'Herramienta Eléctrica',
    color: 'bg-amber-50 text-amber-900 border-amber-300',
    badgeColor: 'bg-amber-600 text-white',
    accentBorder: 'border-amber-500',
    icon: 'Drill',
    bodegaFisica: 'Vitrina Central de Seguridad',
    sugerencias: [
      'Taladro Percutor 1/2" 650W DeWalt DWD024',
      'Pulidora Angular 4-1/2" 750W Bosch GWS 700',
      'Sierra Circular 7-1/4" 1800W Makita',
      'Rotomartillo SDS-Plus 800W Stanley',
      'Juego de Brocas Cobalto x 13 un'
    ]
  },
  {
    slug: 'plomeria',
    nombre: 'Plomería',
    color: 'bg-cyan-50 text-cyan-900 border-cyan-300',
    badgeColor: 'bg-cyan-700 text-white',
    accentBorder: 'border-cyan-500',
    icon: 'Droplets',
    bodegaFisica: 'Pasillo 8 - Tuberías y Grifería',
    sugerencias: [
      'Tubo PVC Presión 1/2" RDE 9 x 6m Pavco',
      'Codo PVC Presión 90° 1/2" Soldar',
      'Llave de Paso Terminal Bola 1/2"',
      'Soldadura PVC Líquida 1/4 Galón',
      'Válvula Reguladora Reductora de Presión 1/2"'
    ]
  },
  {
    slug: 'electrico',
    nombre: 'Eléctrico',
    color: 'bg-yellow-50 text-yellow-900 border-yellow-300',
    badgeColor: 'bg-yellow-600 text-white',
    accentBorder: 'border-yellow-500',
    icon: 'Zap',
    bodegaFisica: 'Pasillo 6 - Cables y Tableros',
    sugerencias: [
      'Cable Cobre THHN #12 AWG Rojo Rollo 100m',
      'Tomacorriente Doble Polo a Tierra Leviton',
      'Breaker Enchufable 1x20A Schneider',
      'Cinta Aislante Autofundente 3M Temflex',
      'Caja Galvanizada 4x4 Pesada 1/2" y 3/4"'
    ]
  },
  {
    slug: 'jardin_exteriores',
    nombre: 'Jardín y Exteriores',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    badgeColor: 'bg-emerald-600 text-white',
    accentBorder: 'border-emerald-500',
    icon: 'Trees',
    bodegaFisica: 'Área Exterior - Vivero y Cercas',
    sugerencias: [
      'Manguera Reforzada 1/2" x 25m con Boquilla',
      'Cortacésped Gasolina 140cc 4T Truper',
      'Tijera para Podar Ramas Bypass 8"',
      'Abono Orgánico Compostado Bulto 25kg',
      'Alambre de Púas Calibre 14 x 400m'
    ]
  },
  {
    slug: 'ferreteria_general',
    nombre: 'Ferretería General',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    badgeColor: 'bg-slate-700 text-white',
    accentBorder: 'border-slate-500',
    icon: 'Wrench',
    bodegaFisica: 'Pasillo 1 y 2 - Mostrador Central',
    sugerencias: [
      'Cerradura Sobreponer Derecha Yale 101',
      'Chazo Plástico 5/16" Caja x 100 un',
      'Tornillo Drywall 6x1" Zincado Caja x 500 un',
      'Candado Latón Macizo 50mm Llave Multipunto',
      'Bisagra Omega 3x3 Acero Inoxidable Par'
    ]
  }
];

// Lista plana y sin duplicados de todas las sugerencias de las 7 secciones.
// Usada para autocompletado en FacturacionPage sin necesitar el selector visual de sección.
export const SUGERENCIAS_CONSOLIDADAS = [
  ...new Set(SECCIONES.flatMap((s) => s.sugerencias))
];

// Helper para obtener metadatos de sección rápidamente
export const getSeccionInfo = (slug) => {
  return SECCIONES.find((s) => s.slug === slug) || {
    slug,
    nombre: slug,
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeColor: 'bg-slate-600 text-white',
    accentBorder: 'border-slate-400',
    icon: 'Package',
    bodegaFisica: 'Sección General'
  };
};

export const ESTADOS_FACTURA = {
  PENDIENTE: 'pendiente',
  EN_VITRINA: 'en_vitrina',
  LISTA_SELLO: 'lista_sello',
  FALTANTE: 'faltante',
  ENTREGADA: 'entregada'
};

export const ESTADOS_META = {
  pendiente: {
    label: 'Pendiente',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300',
    borderClass: 'border-l-4 border-l-slate-400',
    cardBorder: 'border-slate-300',
    descripcion: 'Recién creada en caja, vitrina aún no la toma'
  },
  en_vitrina: {
    label: 'En Vitrina',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    borderClass: 'border-l-4 border-l-amber-500',
    cardBorder: 'border-amber-400',
    descripcion: 'Operario alistando ítems en las bodegas físicas'
  },
  lista_sello: {
    label: 'Lista para Sello',
    badgeClass: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold animate-pulse',
    borderClass: 'border-l-4 border-l-purple-600',
    cardBorder: 'border-purple-500 ring-2 ring-purple-400/50',
    descripcion: 'Vitrina confirmó entrega completa; esperando sello físico en Facturación'
  },
  faltante: {
    label: 'Faltante (Congelada)',
    badgeClass: 'bg-red-100 text-red-900 border border-red-300 font-bold',
    borderClass: 'border-l-4 border-l-red-600',
    cardBorder: 'border-red-500 bg-red-50/30',
    descripcion: 'Vitrina reportó falta de stock; congelada para nota crédito o ajuste'
  },
  entregada: {
    label: 'Entregada y Sellada',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
    borderClass: 'border-l-4 border-l-emerald-600',
    cardBorder: 'border-emerald-400 bg-emerald-50/20',
    descripcion: 'Sello físico verificado; inventario descontado por cantidad original'
  },
  'ENTREGADA Y SELLADA': {
    label: 'Entregada y Sellada',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
    borderClass: 'border-l-4 border-l-emerald-600',
    cardBorder: 'border-emerald-400 bg-emerald-50/20',
    descripcion: 'Sello físico verificado; inventario descontado por cantidad original'
  },
  'Sello verificado': {
    label: 'Sello Verificado',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
    borderClass: 'border-l-4 border-l-emerald-600',
    cardBorder: 'border-emerald-400 bg-emerald-50/20',
    descripcion: 'Sello físico verificado; inventario descontado por cantidad original'
  }
};
