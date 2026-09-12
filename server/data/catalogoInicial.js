// Catálogo maestro realista de La Valenciana FERREHOGAR (350 productos)
// 50 productos por cada una de las 7 secciones de ferretería y construcción

const SECCIONES_CONFIG = [
  {
    id: 1,
    codigo: 'BOD-MAT',
    slug: 'materiales_construccion',
    nombre: 'Materiales de Construcción',
    prefijo: 'MAT',
    unidades: ['BULTO', 'METRO', 'UNIDAD', 'M3'],
    items: [
      { n: 'Cemento Gris 50kg Argos Tipo UG', d: 'Cemento de uso general para mampostería y losas', u: 'BULTO', p: 50.0, pr: 34500 },
      { n: 'Cemento Blanco 40kg Diamante', d: 'Cemento blanco especial para estucos y acabados finos', u: 'BULTO', p: 40.0, pr: 46200 },
      { n: 'Varilla Corrugada 1/2" x 6m Grado 60', d: 'Acero de refuerzo sismorresistente Diaco', u: 'METRO', p: 5.96, pr: 29800 },
      { n: 'Varilla Corrugada 3/8" x 6m Grado 60', d: 'Acero corrugado para flejes y columnas livianas', u: 'METRO', p: 3.35, pr: 18200 },
      { n: 'Varilla Corrugada 5/8" x 6m Grado 60', d: 'Acero estructural para vigas de carga', u: 'METRO', p: 9.32, pr: 49500 },
      { n: 'Estuco Plástico Exterior Cuñete 20kg', d: 'Masilla acrílica impermeable para fachadas', u: 'BULTO', p: 20.0, pr: 68900 },
      { n: 'Estuco Interior Yeso Blanco Bulto 25kg', d: 'Estuco en polvo de alta blancura y fácil lijado', u: 'BULTO', p: 25.0, pr: 24500 },
      { n: 'Pegacor Blanco Porcelánico Bulto 25kg', d: 'Mortero adhesivo de máxima adherencia Corona', u: 'BULTO', p: 25.0, pr: 41000 },
      { n: 'Pegacor Gris Cerámico Bulto 25kg', d: 'Adhesivo cementicio para pisos y paredes cerámicas', u: 'BULTO', p: 25.0, pr: 27900 },
      { n: 'Malla Electrosoldada 4mm 15x15 2.4x6m', d: 'Refuerzo de acero para pisos y contrapisos', u: 'UNIDAD', p: 18.5, pr: 78500 },
      { n: 'Arena Lavada de Río m³', d: 'Arena limpia clasificada para mezclas de concreto', u: 'M3', p: 1400.0, pr: 95000 },
      { n: 'Arena de Peña para Pega m³', d: 'Árido seleccionado para morteros de mampostería', u: 'M3', p: 1350.0, pr: 82000 },
      { n: 'Gravilla 1/2" Triturada m³', d: 'Piedra triturada limpia para fundición de elementos estructurales', u: 'M3', p: 1500.0, pr: 110000 },
      { n: 'Ladrillo Estructural Tolete Perforado 24x11x6', d: 'Bloque cerámico rojo cocido para muros de carga', u: 'UNIDAD', p: 2.1, pr: 1650 },
      { n: 'Ladrillo Farol Limpio 30x20x10cm', d: 'Bloque hueco liviano para mampostería no estructural', u: 'UNIDAD', p: 4.2, pr: 2400 },
      { n: 'Alambre Negro Recocido Calibre 18 Rollo 10kg', d: 'Alambre maleable para amarre de varillas', u: 'ROLLO', p: 10.0, pr: 68000 },
      { n: 'Impermeabilizante Integral Sika 1 Galón', d: 'Aditivo líquido hidrófugo para morteros y hormigones', u: 'GALON', p: 4.5, pr: 39900 },
      { n: 'Sikaflex 1A Gris Cartucho 300ml', d: 'Sellador elastomérico de poliuretano para juntas', u: 'UNIDAD', p: 0.45, pr: 38500 },
      { n: 'Placa Yeso Gyplac Standard 1/2" 1.22x2.44m', d: 'Lámina de drywall para muros interiores y cielos rasos', u: 'UNIDAD', p: 22.0, pr: 43900 },
      { n: 'Perfil Perimetral Galv. 2.44m Cal 26', d: 'Perfil metálico soporte para cielos en panel yeso', u: 'UNIDAD', p: 0.85, pr: 7200 }
    ]
  },
  {
    id: 2,
    codigo: 'BOD-PIN',
    slug: 'pinturas',
    nombre: 'Pinturas',
    prefijo: 'PIN',
    unidades: ['GALON', 'CUÑETE', 'UNIDAD'],
    items: [
      { n: 'Esmalte Sintético Pintulux Rojo Bandera Galón', d: 'Pintura alquídica brillante de alta resistencia', u: 'GALON', p: 4.2, pr: 72900 },
      { n: 'Esmalte Sintético Pintulux Negro Mate Galón', d: 'Acabado mate para herrería y carpintería metálica', u: 'GALON', p: 4.1, pr: 69900 },
      { n: 'Vinilo Tipo 1 Blanco Nieve Cuñete 5 Galones', d: 'Pintura al agua lavable de alto poder cubriente Koraza', u: 'CUÑETE', p: 24.0, pr: 219000 },
      { n: 'Vinilo Tipo 1 Gris Niebla Galón', d: 'Pintura para interiores de acabado satinado lavable', u: 'GALON', p: 5.1, pr: 54900 },
      { n: 'Pintura Fachada Hidrorepelente Blanco Galón', d: 'Revestimiento 100% acrílico resistente a rayos UV', u: 'GALON', p: 5.3, pr: 89000 },
      { n: 'Anticorrosivo Alquídico Gris Galón', d: 'Fondo protector contra la herrumbre para metales ferrosos', u: 'GALON', p: 4.4, pr: 64500 },
      { n: 'Thinner Corriente Galón', d: 'Disolvente y limpiador de pinturas y resinas alquídicas', u: 'GALON', p: 3.2, pr: 28500 },
      { n: 'Thinner Fino Extra Acrílico Galón', d: 'Disolvente de alta pureza para acabados automotrices y lacas', u: 'GALON', p: 3.3, pr: 42000 },
      { n: 'Brocha Cerda Mona 3" Profesional', d: 'Brocha con mango de madera y virola de acero inoxidable', u: 'UNIDAD', p: 0.18, pr: 12500 },
      { n: 'Brocha Cerda Mona 4" Profesional', d: 'Brocha ancha para aplicación rápida en superficies grandes', u: 'UNIDAD', p: 0.24, pr: 17900 },
      { n: 'Rodillo Antigota Microfibra Felpa 9"', d: 'Rodillo para vinilos con tecnología antigoteo para techos', u: 'UNIDAD', p: 0.32, pr: 19800 },
      { n: 'Bandeja Plástica Pintor 9" Reforzada', d: 'Bandeja escurridora ergonómica con base estriada', u: 'UNIDAD', p: 0.22, pr: 8500 },
      { n: 'Barniz Sintético Transparente Brillante Galón', d: 'Protector alquídico transparente para maderas interiores', u: 'GALON', p: 3.9, pr: 81000 },
      { n: 'Sellador Acrílico Lijable para Madera Galón', d: 'Tapa poros y base niveladora de secado rápido', u: 'GALON', p: 4.0, pr: 58000 },
      { n: 'Pintura Aerosol Esmalte Negro Brillante 400ml', d: 'Aerosol multiusos de secado instantáneo Aerocolor', u: 'UNIDAD', p: 0.4, pr: 15200 },
      { n: 'Pintura Aerosol Metalizado Dorado 400ml', d: 'Pintura decorativa efecto metal brillante', u: 'UNIDAD', p: 0.4, pr: 18900 },
      { n: 'Cinta Enmascarar 1" x 40m Masking Tape', d: 'Cinta de papel adhesivo de retiro limpio 3M', u: 'UNIDAD', p: 0.12, pr: 6400 },
      { n: 'Lija de Agua Grano 120 Norton', d: 'Hoja de lija impermeable al carburo de silicio', u: 'UNIDAD', p: 0.03, pr: 2100 },
      { n: 'Lija para Madera Grano 80 Fandeli', d: 'Lija al óxido de aluminio para pulido pesado', u: 'UNIDAD', p: 0.04, pr: 2200 },
      { n: 'Espátula Acero Inoxidable 3" Mango Plástico', d: 'Espátula flexible para aplicación de masilla y raspado', u: 'UNIDAD', p: 0.14, pr: 9800 }
    ]
  },
  {
    id: 3,
    codigo: 'BOD-HER',
    slug: 'herramienta_electrica',
    nombre: 'Herramienta Eléctrica',
    prefijo: 'HER',
    unidades: ['UNIDAD', 'JUEGO'],
    items: [
      { n: 'Taladro Percutor 1/2" 650W DeWalt DWD024', d: 'Taladro reversible de velocidad variable con empuñadura lateral', u: 'UNIDAD', p: 2.3, pr: 349000 },
      { n: 'Taladro Inalámbrico 20V Max DeWalt DCD771', d: 'Taladro atornillador con 2 baterías de litio y cargador rápido', u: 'UNIDAD', p: 2.8, pr: 589000 },
      { n: 'Pulidora Angular 4-1/2" 750W Bosch GWS 700', d: 'Amoladora compacta ergonómica con guarda de protección', u: 'UNIDAD', p: 2.1, pr: 249000 },
      { n: 'Pulidora Angular 9" 2200W DeWalt DWE490', d: 'Esmeriladora industrial de servicio pesado para corte y desbaste', u: 'UNIDAD', p: 5.9, pr: 620000 },
      { n: 'Sierra Circular 7-1/4" 1800W Makita 5007N', d: 'Sierra para corte de madera con base de aluminio y disco 24T', u: 'UNIDAD', p: 5.2, pr: 499000 },
      { n: 'Rotomartillo SDS-Plus 800W Stanley SHR263K', d: 'Martillo perforador 3 modos con maletín plástico de transporte', u: 'UNIDAD', p: 3.4, pr: 410000 },
      { n: 'Lijadora Orbital 1/4 Hoja 200W Black&Decker', d: 'Lijadora de palma con recolector de polvo integrado', u: 'UNIDAD', p: 1.4, pr: 145000 },
      { n: 'Sierra Caladora 550W Pendular Bosch GST 650', d: 'Caladora de velocidad regulable para cortes rectos y curvos', u: 'UNIDAD', p: 2.0, pr: 235000 },
      { n: 'Cepillo Eléctrico para Madera 600W DeWalt D26676', d: 'Cepilladora de precisión con cuchillas de carburo reversibles', u: 'UNIDAD', p: 3.1, pr: 465000 },
      { n: 'Soldador Inverter 200A MMA Lusqtoff', d: 'Equipo inversor compacto bivoltaje para electrodo revestido', u: 'UNIDAD', p: 4.8, pr: 680000 },
      { n: 'Pistola de Calor 2000W Stanley STXH2000', d: 'Decapador térmico con selector de temperatura variable', u: 'UNIDAD', p: 1.1, pr: 155000 },
      { n: 'Juego Brocas Concreto SDS-Plus x 5 un DeWalt', d: 'Brocas de percusión punta carburo 5, 6, 8, 10 y 12mm', u: 'JUEGO', p: 0.45, pr: 48000 },
      { n: 'Juego Brocas Metal Cobalto HSS x 13 un Bosch', d: 'Brocas de alta dureza para perforación en acero inoxidable', u: 'JUEGO', p: 0.38, pr: 62000 },
      { n: 'Disco Corte Metal 4-1/2" x 1mm Norton Quantum', d: 'Disco abrasivo extrafino para corte rápido y sin rebaba', u: 'UNIDAD', p: 0.06, pr: 4200 },
      { n: 'Disco Desbaste Metal 4-1/2" x 1/4" DeWalt', d: 'Disco para desbaste de cordones de soldadura y perfilería', u: 'UNIDAD', p: 0.16, pr: 6800 },
      { n: 'Disco Diamantado Segmentado 4-1/2" Bosch', d: 'Disco de corte en seco para mampostería, ladrillo y concreto', u: 'UNIDAD', p: 0.15, pr: 26500 },
      { n: 'Disco Sierra Circular 7-1/4" 40 Dientes Makita', d: 'Hoja de sierra carburo tungsteno para cortes finos en madera', u: 'UNIDAD', p: 0.38, pr: 49000 },
      { n: 'Juego Puntas Atornillador x 32 Piezas Stanley', d: 'Estuche de puntas Phillips, Torx y planas con extensor magnético', u: 'JUEGO', p: 0.32, pr: 39900 },
      { n: 'Compresor de Aire 2HP 24 Litros Truper', d: 'Compresor portátil lubricado con aceite para pistolas y clavadoras', u: 'UNIDAD', p: 21.0, pr: 649000 },
      { n: 'Careta para Soldar Fotosensible Automática', d: 'Pantalla de soldadura con oscurecimiento solar DIN 9-13', u: 'UNIDAD', p: 0.65, pr: 89000 }
    ]
  },
  {
    id: 4,
    codigo: 'BOD-PLO',
    slug: 'plomeria',
    nombre: 'Plomería',
    prefijo: 'PLO',
    unidades: ['METRO', 'UNIDAD', 'GALON'],
    items: [
      { n: 'Tubo PVC Presión 1/2" RDE 9 x 6m Pavco', d: 'Tubería rígida para conducción de agua potable a presión', u: 'METRO', p: 1.4, pr: 22800 },
      { n: 'Tubo PVC Presión 3/4" RDE 11 x 6m Pavco', d: 'Tubería para distribución de red hidráulica domiciliaria', u: 'METRO', p: 2.1, pr: 34500 },
      { n: 'Tubo PVC Sanitario 3" x 6m Pavco', d: 'Tubería para desagüe de aguas negras y ventilación', u: 'METRO', p: 4.8, pr: 58900 },
      { n: 'Tubo PVC Sanitario 4" x 6m Pavco', d: 'Tubería principal para bajantes de aguas residuales', u: 'METRO', p: 6.9, pr: 84000 },
      { n: 'Codo PVC Presión 90° 1/2" Soldar', d: 'Accesorio de desvío angular para red hidráulica', u: 'UNIDAD', p: 0.04, pr: 1200 },
      { n: 'Codo PVC Presión 90° 3/4" Soldar', d: 'Accesorio de PVC virgen para cambio de dirección', u: 'UNIDAD', p: 0.06, pr: 1800 },
      { n: 'Tee PVC Presión 1/2" Soldar', d: 'Accesorio de derivación triple para agua potable', u: 'UNIDAD', p: 0.05, pr: 1600 },
      { n: 'Adaptador Macho PVC 1/2" Roscado', d: 'Terminal de acople con rosca NPT para grifería', u: 'UNIDAD', p: 0.03, pr: 950 },
      { n: 'Unión Universal PVC Presión 1/2"', d: 'Unión desarmable con empaque O-ring para bombas y filtros', u: 'UNIDAD', p: 0.12, pr: 6500 },
      { n: 'Llave de Paso Terminal Bola 1/2" Metálica', d: 'Válvula de corte rápido en latón niquelado Genebre', u: 'UNIDAD', p: 0.35, pr: 28900 },
      { n: 'Llave de Paso PVC Bola 1/2" Cementar', d: 'Válvula económica para aislamiento de ramales sanitarios', u: 'UNIDAD', p: 0.18, pr: 9800 },
      { n: 'Válvula Cheque Retención 1/2" Vertical York', d: 'Válvula antirretorno con resorte de acero inox', u: 'UNIDAD', p: 0.32, pr: 34000 },
      { n: 'Soldadura PVC Líquida 1/4 Galón Pavco', d: 'Pegamento de curado rápido para unión química de tubos', u: 'GALON', p: 0.95, pr: 42000 },
      { n: 'Limpiador Desengrasante PVC 1/4 Galón', d: 'Solvente acondicionador para limpieza previa al soldado', u: 'GALON', p: 0.88, pr: 27500 },
      { n: 'Cinta Teflón 1/2" x 10m Alta Densidad', d: 'Cinta selladora de roscas para evitar fugas hidráulicas', u: 'UNIDAD', p: 0.02, pr: 2500 },
      { n: 'Flotador Tanque Plástico 1/2" con Boya', d: 'Válvula mecánica de llenado para tanque de reserva', u: 'UNIDAD', p: 0.28, pr: 18500 },
      { n: 'Sifón Lavamanos PVC Flexible Universal', d: 'Desagüe con trampa de olores extensible y empaque de caucho', u: 'UNIDAD', p: 0.22, pr: 14900 },
      { n: 'Grifería Lavaplatos Monocontrol Cuello Cisne', d: 'Grifo de acero inoxidable con cartucho cerámico 35mm', u: 'UNIDAD', p: 1.45, pr: 119000 },
      { n: 'Rejilla Sanitaria Piso 3x2" Sosco Acero Inox', d: 'Desagüe para ducha con tapa anti-cucarachas y rosca', u: 'UNIDAD', p: 0.18, pr: 16500 },
      { n: 'Tanque Reserva Agua 1000 Litros Cilíndrico', d: 'Tanque plástico polietileno virgen cuatro capas con accesorios', u: 'UNIDAD', p: 26.0, pr: 489000 }
    ]
  },
  {
    id: 5,
    codigo: 'BOD-ELE',
    slug: 'electrico',
    nombre: 'Eléctrico',
    prefijo: 'ELE',
    unidades: ['ROLLO', 'UNIDAD', 'METRO'],
    items: [
      { n: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m', d: 'Conductor de cobre 99.9% aislamiento PVC 90°C Centelsa', u: 'ROLLO', p: 3.8, pr: 189000 },
      { n: 'Cable Cobre THHN #12 AWG Negro Rollo 100m', d: 'Cable eléctrico unipolar para circuitos ramales y tomas', u: 'ROLLO', p: 3.8, pr: 189000 },
      { n: 'Cable Cobre THHN #12 AWG Blanco Rollo 100m', d: 'Cable conductor neutro certificado RETIE', u: 'ROLLO', p: 3.8, pr: 189000 },
      { n: 'Cable Cobre THHN #10 AWG Verde Rollo 100m', d: 'Conductor para polo a tierra en instalaciones eléctricas', u: 'ROLLO', p: 5.6, pr: 295000 },
      { n: 'Cable Dúplex Blanco 2x14 AWG x 100m', d: 'Cordón paralelo flexible para extensiones e iluminación', u: 'ROLLO', p: 3.2, pr: 139000 },
      { n: 'Tomacorriente Doble con Polo a Tierra Leviton', d: 'Salida eléctrica 15A 125V blanca con tornillos de fijación', u: 'UNIDAD', p: 0.08, pr: 8900 },
      { n: 'Interruptor Sencillo 10A 120V Leviton Blanco', d: 'Mecanismo basculante silencioso de unipolar de empotrar', u: 'UNIDAD', p: 0.07, pr: 7500 },
      { n: 'Interruptor Conmutable Triple Leviton', d: 'Placa con tres interruptores para control de escalera o pasillo', u: 'UNIDAD', p: 0.12, pr: 24500 },
      { n: 'Breaker Enchufable 1x20A Schneider Electric', d: 'Interruptor termomagnético monopolar curva C para riel o placa', u: 'UNIDAD', p: 0.14, pr: 21900 },
      { n: 'Breaker Enchufable 2x40A Schneider Electric', d: 'Disyuntor bipolar para estufas y calentadores eléctricos', u: 'UNIDAD', p: 0.28, pr: 54000 },
      { n: 'Tablero Distribución Eléctrico 8 Circuitos', d: 'Caja metálica de sobreponer con barraje de cobre y tapa', u: 'UNIDAD', p: 2.8, pr: 79000 },
      { n: 'Cinta Aislante Autofundente 3M Temflex 1700', d: 'Cinta de PVC retardante a la llama hasta 600V', u: 'UNIDAD', p: 0.08, pr: 6200 },
      { n: 'Tubo Conduit PVC 1/2" x 3m Eléctrico', d: 'Tubería rígida curva en frío para canalización de conductores', u: 'METRO', p: 0.6, pr: 7800 },
      { n: 'Curva Conduit PVC 90° 1/2"', d: 'Codo predoblado para unión de ductos de energía', u: 'UNIDAD', p: 0.03, pr: 1100 },
      { n: 'Caja Galvanizada 4x4 Pesada 1/2" y 3/4"', d: 'Caja metálica embutida para derivaciones eléctricas', u: 'UNIDAD', p: 0.24, pr: 4800 },
      { n: 'Caja Plástica 5800 Rectangular 2x4"', d: 'Caja octagonal/rectangular de policarbonato antichispa', u: 'UNIDAD', p: 0.06, pr: 1600 },
      { n: 'Panel LED Incrustar Redondo 18W Luz Blanca', d: 'Luminaria extraplana con driver multitensión Philips', u: 'UNIDAD', p: 0.26, pr: 24500 },
      { n: 'Reflector LED Exterior 50W IP65 Luz Día', d: 'Proyector con carcasa de aluminio estanco para fachadas', u: 'UNIDAD', p: 0.85, pr: 58000 },
      { n: 'Varilla Polo a Tierra Cobre 5/8" x 2.4m', d: 'Electrodo copperweld con grapa de fijación de bronce', u: 'UNIDAD', p: 2.9, pr: 65000 },
      { n: 'Multímetro Digital Automotriz Truper MUT-33', d: 'Probador de voltaje AC/DC, corriente, continuidad y diodos', u: 'UNIDAD', p: 0.35, pr: 72000 }
    ]
  },
  {
    id: 6,
    codigo: 'BOD-JAR',
    slug: 'jardin_exteriores',
    nombre: 'Jardín y Exteriores',
    prefijo: 'JAR',
    unidades: ['UNIDAD', 'ROLLO', 'BULTO'],
    items: [
      { n: 'Manguera Reforzada 1/2" x 25m con Boquilla', d: 'Manguera de 3 capas con trama antitorsión y conexiones de latón', u: 'ROLLO', p: 3.6, pr: 64900 },
      { n: 'Manguera Jardín 3/4" x 50m Servicio Pesado', d: 'Manguera de alto caudal para riego agrícola y limpieza', u: 'ROLLO', p: 8.9, pr: 148000 },
      { n: 'Cortacésped a Gasolina 140cc 4T Truper', d: 'Podadora con motor OHV, descarga lateral y bolsa recolectora', u: 'UNIDAD', p: 24.5, pr: 1150000 },
      { n: 'Guadañadora a Gasolina 52cc 2.5HP Husqvarna', d: 'Desbrozadora profesional con cuchilla 3 puntas y arnés ergonómico', u: 'UNIDAD', p: 7.8, pr: 890000 },
      { n: 'Tijera para Podar Ramas Bypass 8" Truper', d: 'Cizalla con hojas de acero al cromo vanadio tratadas térmicamente', u: 'UNIDAD', p: 0.32, pr: 32000 },
      { n: 'Tijera Cortasetos Telescópica 22"', d: 'Tijera de dos manos con mangos de aluminio extensibles', u: 'UNIDAD', p: 1.15, pr: 68000 },
      { n: 'Fumigadora Manual de Espalda 16 Litros Bellota', d: 'Bomba de pistón con lanza de fibra de vidrio y boquilla cónica', u: 'UNIDAD', p: 3.4, pr: 129000 },
      { n: 'Aspersor Giratorio 3 Brazos Metálico con Base', d: 'Rociador giratorio 360° para cobertura de césped hasta 12m', u: 'UNIDAD', p: 0.65, pr: 38900 },
      { n: 'Abono Orgánico Compostado Bulto 25kg', d: 'Enmienda natural enriquecida con microorganismos benéficos', u: 'BULTO', p: 25.0, pr: 22000 },
      { n: 'Tierra Negra Abonada para Plantas Bulto 20kg', d: 'Sustrato fértil tamizado listo para macetas y jardineras', u: 'BULTO', p: 20.0, pr: 18500 },
      { n: 'Alambre de Púas Calibre 14 x 400m Galvanizado', d: 'Cerramiento perimetral de acero de alta resistencia a la intemperie', u: 'ROLLO', p: 28.0, pr: 215000 },
      { n: 'Malla Gallinero Galvanizada 1" x 1.5x50m', d: 'Malla hexagonal de alambre dulce cincado para cerramientos livianos', u: 'ROLLO', p: 14.2, pr: 175000 },
      { n: 'Pala Redonda con Mango de Madera Herragro', d: 'Pala de punta templada para excavación y movimiento de tierras', u: 'UNIDAD', p: 1.9, pr: 44000 },
      { n: 'Pala Cuadrada Carbonera Herragro', d: 'Herramienta para recolección de materiales sueltos como arena o grava', u: 'UNIDAD', p: 2.1, pr: 46000 },
      { n: 'Rastrillo Metálico Curvo 14 Dientes sin Mango', d: 'Cabeza de forja para limpieza de piedras y nivelación de suelo', u: 'UNIDAD', p: 0.95, pr: 23500 },
      { n: 'Carretilla de Obra 5.5 Pies Cúbicos Tolva Cal 18', d: 'Buggy reforzado con llanta neumática de rodamiento industrial', u: 'UNIDAD', p: 14.5, pr: 198000 },
      { n: 'Maceta Plástica Redonda Terracota 40cm', d: 'Matero decorativo con protección UV y drenaje inferior', u: 'UNIDAD', p: 0.75, pr: 26000 },
      { n: 'Sopladora de Hojas Eléctrica 2400W Truper', d: 'Herramienta 2 en 1 aspiradora y trituradora de follaje seco', u: 'UNIDAD', p: 3.6, pr: 225000 },
      { n: 'Pistola para Riego Metálica 8 Funciones', d: 'Gatillo trasero con regulador de caudal continuo', u: 'UNIDAD', p: 0.38, pr: 29900 },
      { n: 'Malla Polisombra 80% Negra 4x50m Rollo', d: 'Tejido de polietileno para control de radiación solar en viveros', u: 'ROLLO', p: 18.0, pr: 289000 }
    ]
  },
  {
    id: 7,
    codigo: 'BOD-FER',
    slug: 'ferreteria_general',
    nombre: 'Ferretería General',
    prefijo: 'FER',
    unidades: ['CAJA', 'UNIDAD', 'PAR'],
    items: [
      { n: 'Cerradura Sobreponer Derecha Yale 101', d: 'Cerradura de golpe y llave para puertas principales de entrada', u: 'UNIDAD', p: 1.25, pr: 98000 },
      { n: 'Cerradura Pomo Tubular Alcoba Acero Inox Yale', d: 'Cilindro con llave exterior y seguro interior de perilla', u: 'UNIDAD', p: 0.55, pr: 42000 },
      { n: 'Cerradura Pomo Tubular Baño sin Llave Yale', d: 'Pomo con desaseguro de emergencia exterior para sanitarios', u: 'UNIDAD', p: 0.48, pr: 36000 },
      { n: 'Chazo Plástico 5/16" Caja x 100 unidades', d: 'Tarugo de polipropileno con aletas antigiro para mampostería', u: 'CAJA', p: 0.22, pr: 8500 },
      { n: 'Chazo Plástico 1/4" Caja x 100 unidades', d: 'Fijación para tornillos estándar en pared de bloque y ladrillo', u: 'CAJA', p: 0.16, pr: 6900 },
      { n: 'Chazo Puntilla Golpe 6x40mm Caja x 50 un', d: 'Anclaje rápido de clavo galvanizado con camisa de nylon', u: 'CAJA', p: 0.35, pr: 16500 },
      { n: 'Tornillo Drywall 6x1" Zincado Caja x 500 un', d: 'Tornillo punta de broca autorroscante fosfatado negro', u: 'CAJA', p: 0.85, pr: 19800 },
      { n: 'Tornillo Drywall 6x1-5/8" Caja x 500 un', d: 'Tornillo largo para fijación de doble placa yeso o madera', u: 'CAJA', p: 1.2, pr: 24500 },
      { n: 'Tornillo Goloso Ensamble 8x2" Caja x 200 un', d: 'Tornillo para madera cabeza avellanada Robertson zincada', u: 'CAJA', p: 0.95, pr: 18000 },
      { n: 'Perno Hexagonal Grado 5 3/8" x 2" con Tuerca x 25 un', d: 'Tornillería automotriz y estructural cincada', u: 'CAJA', p: 1.6, pr: 32000 },
      { n: 'Candado Latón Macizo 50mm Llave Multipunto Yale', d: 'Candado de seguridad con grillete de acero endurecido anticorte', u: 'UNIDAD', p: 0.42, pr: 49000 },
      { n: 'Candado Intemperie 40mm con Cubierta Caucho', d: 'Protección contra lluvia y polvo para rejas y portones', u: 'UNIDAD', p: 0.28, pr: 31000 },
      { n: 'Bisagra Omega 3x3 Acero Inoxidable Par', d: 'Par de bisagras de libro con pasador remachado y tornillería', u: 'PAR', p: 0.32, pr: 14500 },
      { n: 'Bisagra Parche Cazoleta 35mm Cierre Suave Par', d: 'Bisagra oculta con pistón hidráulico para muebles de cocina', u: 'PAR', p: 0.18, pr: 11900 },
      { n: 'Metro Cinta Métrica 5m x 19mm Stanley Global', d: 'Flexómetro de impacto con cinta protegida con polímero', u: 'UNIDAD', p: 0.26, pr: 24900 },
      { n: 'Metro Cinta Métrica 8m x 25mm Stanley FatMax', d: 'Flexómetro industrial con alcance sin doblarse de 3.3 metros', u: 'UNIDAD', p: 0.48, pr: 48000 },
      { n: 'Nivel Torpedo Magnético 9" Stanley', d: 'Nivel con 3 burbujas (45°, 90°, 180°) y base acanalada con imán', u: 'UNIDAD', p: 0.19, pr: 28500 },
      { n: 'Martillo de Uña Curva 16oz Mango Fibra Truper', d: 'Martillo carpintero con empuñadura de goma antideslizante', u: 'UNIDAD', p: 0.72, pr: 31000 },
      { n: 'Alicate Universal 8" Alta Palanca Stanley Pro', d: 'Pinza multifunción con filo de corte templado por inducción', u: 'UNIDAD', p: 0.38, pr: 38000 },
      { n: 'Hombre Solo Alicate de Presión 10" Irwin Vise-Grip', d: 'Mordaza curva con cortador de alambre y tornillo de ajuste', u: 'UNIDAD', p: 0.54, pr: 65000 }
    ]
  }
];

// Generar el catálogo expandido a 350 productos (50 por cada una de las 7 secciones)
export function generarCatalogo350() {
  const productos = [];
  const stockPorBodega = [];

  SECCIONES_CONFIG.forEach((sec) => {
    // 20 ítems artesanales base + 30 variantes específicas para completar 50 por sección
    for (let i = 1; i <= 50; i++) {
      const baseIndex = (i - 1) % sec.items.length;
      const base = sec.items[baseIndex];
      const varianteNum = Math.floor((i - 1) / sec.items.length) + 1;
      
      const sku = `${sec.prefijo}-${String(i).padStart(3, '0')}`;
      const nombre = varianteNum === 1 
        ? base.n 
        : `${base.n} (Ref. Serie ${varianteNum}00)`;
      const descripcion = `${base.d}. Marca certificada La Valenciana FERREHOGAR.`;
      const precio = Math.round(base.pr * (1 + (varianteNum - 1) * 0.08));

      productos.push({
        sku,
        codigo_barras: `770${sec.id}${String(i).padStart(6, '0')}`,
        nombre,
        descripcion,
        categoria_slug: sec.slug,
        unidad_medida: base.u,
        peso_unitario_kg: base.p,
        precio_unitario: precio,
        es_codigo_interno: false
      });

      // Distribuir stock: bodega principal (id de la sección) con stock alto (40 a 250 un),
      // y en bodega 7 (Ferretería General / mostrador) un pequeño remanente (5 a 20 un) para algunos productos
      const stockPrincipal = Math.floor(35 + (i * 7) % 180);
      stockPorBodega.push({
        sku,
        bodega_id: sec.id,
        cantidad: stockPrincipal
      });

      // Productos de alta rotación también tienen stock satélite en bodega 7 (mostrador)
      if (sec.id !== 7 && i % 3 === 0) {
        stockPorBodega.push({
          sku,
          bodega_id: 7,
          cantidad: Math.floor(4 + (i * 3) % 15)
        });
      }
    }
  });

  return { productos, stockPorBodega };
}

export const CATALOGO_INICIAL_350 = generarCatalogo350();
