/**
 * sinc-help.data.ts
 * Contenido de ayuda por capa, extraído de la
 * "Metodología SINC Versión 5" – Ministerio de Transporte de Colombia.
 */

export interface HelpCampo {
    nombre: string;
    desc: string;
    oblig?: boolean;
    dominio?: string;
}

export interface CapaDetallado {
    no: number;
    capa: string;
    nombre: string;
    geometria: string;
}

export interface HelpEntry {
    titulo: string;
    emoji: string;
    color: string;
    definicion: string;
    geometria: string;
    geoDesc: string;
    campos: HelpCampo[];
    tips: string[];
    refManual: string;
    /** Texto introductorio del nivel detallado */
    nivelEspecificidadDetallado?: string;
    /** Tabla de capas del nivel detallado (Metodología SINC v5) */
    capasDetallado?: CapaDetallado[];
}

export const SINC_HELP: Record<string, HelpEntry> = {

    // ─── EJE VIAL PRINCIPAL ───────────────────────────────────────────────────

    eje: {
        titulo: 'Eje Vial (EJE)',
        emoji: '🛣️',
        color: '#4a9eff',
        definicion: 'Unidad básica de inventario vial del SINC. Representa un segmento continuo de vía con características homogéneas de administración y tipo de red. Cada eje se identifica con un Código de Vía único asignado por la entidad territorial conforme a la Resolución 339/1999 del Ministerio de Transporte.',
        geometria: 'Línea',
        geoDesc: 'Polilínea sobre el eje central de la vía, desde el punto de inicio hasta el punto final. Debe capturarse sobre la calzada principal siguiendo su trazado real.',
        campos: [
            { nombre: 'Código de Vía (CODIGOVIA)', desc: 'Identificador único del eje, asignado por la entidad territorial. Obligatorio y no repetible. Formato recomendado: DDDMM-TIPO-NNN.', oblig: true },
            { nombre: 'Código Alterno (CODIGOVIA1)', desc: 'Segundo código de identificación cuando la vía tiene denominación doble (p. ej. nombre popular vs. código oficial).', oblig: false },
            { nombre: 'Nombre de la Vía (NOMVIA)', desc: 'Denominación popular o toponímica del eje (p. ej. "Vía Bogotá-Villavicencio", "Calle 80").', oblig: false },
            { nombre: 'Tipo de Red', desc: '1 = Red Primaria (INVIAS/ANI) · 2 = Red Secundaria (departamental) · 3 = Red Terciaria (municipal/rural).', oblig: true, dominio: 'tipoRed' },
            { nombre: 'Tipo de Eje', desc: 'Clasifica el eje según su función: Troncal, Transversal, Acceso, Variante, etc.', oblig: false, dominio: 'tipoEje' },
            { nombre: 'Sentido', desc: '1 = Un sentido A→B · 2 = Un sentido B→A · 3 = Doble sentido. Determina la dirección del inventario.', oblig: false, dominio: 'sentido' },
            { nombre: 'Categoría', desc: 'Categoría funcional de la vía según capacidad y volumen de tránsito esperado.', oblig: false, dominio: 'categoria' },
            { nombre: 'Concesión', desc: 'Indica si la vía está bajo contrato de concesión (ANI, departamental u otro). Activa el campo Código de Concesión.', oblig: false },
            { nombre: 'Código de Concesión', desc: 'Identificador del contrato de concesión. Solo aplica cuando el campo Concesión = Sí.', oblig: false },
            { nombre: 'Nivel de Inventario', desc: 'Básico: capas generales para red secundaria y terciaria no concesionada. Detallado: capas adicionales según Metodología SINC v5 para el alcance indicado en la sección "Nivel de especificidad detallado" de esta ayuda.', oblig: true },
            { nombre: 'Longitud (m)', desc: 'Longitud total del eje en metros. Se calcula automáticamente al dibujar la geometría en el mapa.', oblig: false },
            { nombre: 'Geometría (LineString)', desc: 'Polilínea digital del eje. Se captura haciendo clic en el mapa sobre la calzada principal.', oblig: false },
            { nombre: 'Fotos', desc: 'Imágenes panorámicas del tramo representativas del estado general de la vía.', oblig: false },
            { nombre: 'Observaciones', desc: 'Notas libres del encuestador sobre condiciones especiales, dificultades de acceso, temporada de afectación, etc.', oblig: false },
        ],
        tips: [
            'El Código de Vía debe ser único por entidad — verifique con el catastro vial antes de crear un nuevo eje.',
            'Use Nivel Detallado cuando corresponda al alcance del manual (véase el recuadro "Nivel de especificidad detallado"); el sistema sugiere el nivel al elegir Tipo de Red y concesión.',
            'La longitud se calcula automáticamente al confirmar la geometría en el mapa; no la edite manualmente a menos que sea necesario.',
            'Capture al menos una foto al inicio y una al final del eje para documentar el estado del tramo.',
            'Las vías en concesión suelen requerir Nivel Detallado según la Metodología SINC v5.',
        ],
        nivelEspecificidadDetallado:
            'Las capas geográficas para reportar en este nivel aplican para la red vial primaria concesionada y no concesionada, y para la red vial secundaria y terciaria que esté concesionada. A continuación, el manual relaciona los elementos a reportar con los respectivos nombres de los archivos asociados a las capas geográficas y el tipo de geometría (Metodología SINC v5, pág. 24 y siguientes). En InfraVial, use el eje con «Nivel Detallado» y la sección Mc del inventario para diligenciar esas capas.',
        capasDetallado: [
            { no: 1,  capa: 'EJES',           nombre: 'Eje de las vías',                    geometria: 'Polilínea' },
            { no: 2,  capa: 'FOTOEJE',         nombre: 'Foto de la vía',                     geometria: 'Punto'     },
            { no: 3,  capa: 'PRS',             nombre: 'Puntos de referencia lineal',         geometria: 'Punto'     },
            { no: 4,  capa: 'PROPIEDADES',     nombre: 'Propiedades de las vías',             geometria: 'Polilínea' },
            { no: 5,  capa: 'PUENTES',         nombre: 'Puentes y pontones',                  geometria: 'Punto'     },
            { no: 6,  capa: 'TUNELES',         nombre: 'Túneles',                             geometria: 'Polilínea' },
            { no: 7,  capa: 'VARIANTES',       nombre: 'Variantes y pasos alternativos',      geometria: 'Polilínea' },
            { no: 8,  capa: 'SITIOSCRITICOS',  nombre: 'Sitios Críticos de inestabilidad',    geometria: 'Punto'     },
            { no: 9,  capa: 'OBRASDRENAJE',    nombre: 'Obras de drenaje',                    geometria: 'Punto'     },
            { no: 10, capa: 'INTERSECCIONES',  nombre: 'Intersecciones viales',               geometria: 'Punto'     },
            { no: 11, capa: 'SENALESVERT',     nombre: 'Señales verticales',                  geometria: 'Punto'     },
            { no: 12, capa: 'DEMARCACIONES',   nombre: 'Demarcaciones horizontales',          geometria: 'Polilínea' },
            { no: 13, capa: 'SEMAFOROS',       nombre: 'Semáforos',                           geometria: 'Punto'     },
            { no: 14, capa: 'LUMINARIA',       nombre: 'Luminarias',                          geometria: 'Punto'     },
        ],
        refManual: 'Sección 3 – Estructura del SINC · Tabla 1 – Capa EJE',
    },

    // ─── BÁSICO ──────────────────────────────────────────────────────────────

    fotos: {
        titulo: 'Foto del Eje (FOTOEJE)',
        emoji: '📷',
        color: '#29b6f6',
        definicion: 'Registro fotográfico digital del estado de la vía. Se debe presentar un registro en donde se capture el inicio y fin de cada vía, así mismo el eje o sección transversal de la misma cada 1 000 metros aproximadamente, o una foto en un tramo entre dos PR, obteniendo un registro visual claro que permita verificar las condiciones reportadas en la capa PROPIEDADES. Las fotografías deben estar en formato digital JPG y la ruta de ubicación de la imagen debe estar debidamente consignada en el campo RUTAFOTO.',
        geometria: 'Punto',
        geoDesc: 'Punto geolocalizado en el lugar exacto donde fue tomada la fotografía, sobre la calzada de la vía.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'CODIGOVIA del registro asociado en la capa EJES. Texto de 4 a 25 caracteres. Se auto-llena del eje seleccionado.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma de información en campo. Texto de 10 caracteres en formato AAAA-MM-DD.', oblig: true },
            { nombre: 'NUMPR', desc: 'Número del PR comenzando en 0 desde el punto inicial de la vía. Número entre 0 y 400.', oblig: true },
            { nombre: 'FOTO', desc: 'Nombre del archivo fotográfico. Texto de 4 a 50 caracteres. Se genera automáticamente al cargar el archivo.', oblig: true },
            { nombre: 'RUTAFOTO', desc: 'URL de ubicación del archivo fotográfico en formato JPG. Texto de 10 a 250 caracteres. Se genera automáticamente al cargar el archivo.', oblig: true },
            { nombre: 'CALZADA', desc: '1 = Calzada sentido A-B · 2 = Calzada sentido B-A · 3 = Calzada única. Número entre 1 y 3.', oblig: true },
            { nombre: 'COD_MUNICIPIO', desc: 'Código DANE del municipio de localización de la vía (DmMunicipio).', oblig: true },
            { nombre: 'COD_DEPARTAMENTO', desc: 'Código DANE del departamento de localización de la vía (DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO', desc: 'Nombre del municipio. Texto de 4 a 25 caracteres.', oblig: true },
            { nombre: 'DEPARTAMENTO', desc: 'Nombre del departamento. Texto de 4 a 25 caracteres.', oblig: true },
            { nombre: 'OBS', desc: 'Observación. Información adicional que no pueda incluirse en los demás campos. Texto de 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'Capture siempre una foto al inicio y otra al final de cada vía.',
            'Tome una foto cada 1 000 m o al menos una entre cada par de PR consecutivos.',
            'La fotografía debe mostrar claramente la calzada y sus condiciones de superficie para poder verificar los datos de PROPIEDADES.',
            'Use exclusivamente formato JPG; registre correctamente la ruta (RUTAFOTO) para que el sistema pueda ubicar la imagen.',
            'MUNICIPIO y DEPARTAMENTO se pre-llenan automáticamente desde la jornada activa; verifique que sean correctos.',
        ],
        refManual: 'Tabla 3 – Capa FOTOEJE',
    },

    prs: {
        titulo: 'Puntos de Referencia Secundarios (PRS)',
        emoji: '📍',
        color: '#26c6da',
        definicion: 'Sistema de referenciación lineal de la vía mediante hitos físicos (postes o mojones). Permiten ubicar cualquier elemento vial con la combinación "NUMPR + distancia en metros desde ese PR" (ej. PR 12 + 350 m). En vías sin postes previos los puntos se establecen cada 1 km exacto desde el inicio. El punto debe ubicarse exactamente sobre el registro de la capa EJES y solo aplica en registros cuyo SENTIDO sea diferente de 4 (No aplica).',
        geometria: 'Punto',
        geoDesc: 'Punto ubicado exactamente sobre el eje de la vía (capa EJES), en el lugar físico del hito o poste de referencia.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'CODIGOVIA del registro asociado en la capa EJES. Texto de 4 a 25 caracteres. Se auto-llena del eje seleccionado.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma de información en campo. Texto de 10 caracteres en formato AAAA-MM-DD.', oblig: true },
            { nombre: 'NUMPR', desc: 'Número del PR comenzando en 0 desde el punto inicial de la vía. Número entre 0 y 400.', oblig: true },
            { nombre: 'CALZADA', desc: '1 = Calzada sentido A-B · 2 = Calzada sentido B-A · 3 = Calzada única. Número entre 1 y 3.', oblig: true },
            { nombre: 'DISTVERD', desc: 'Distancia verdadera (considerando altitudes) a través de la vía desde su inicio hasta este PR, en metros. Número entre 0 y 250 000.', oblig: true },
            { nombre: 'COD_MUNICIPIO', desc: 'Código DANE del municipio de localización de la vía (DmMunicipio).', oblig: true },
            { nombre: 'COD_DEPARTAMENTO', desc: 'Código DANE del departamento de localización de la vía (DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO', desc: 'Nombre del municipio. Texto de 4 a 25 caracteres.', oblig: true },
            { nombre: 'DEPARTAMENTO', desc: 'Nombre del departamento. Texto de 4 a 25 caracteres.', oblig: true },
            { nombre: 'OBS', desc: 'Observación. Información adicional que no pueda incluirse en los demás campos. Texto de 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'Una vía de 15 km tendrá 16 puntos PRS por calzada (PR 0 al PR 15).',
            'En doble calzada con tramos no paralelos, el punto del PR con el mismo número debe ser consistente entre calzadas.',
            'La distancia verdadera (DISTVERD) difiere de la lineal porque considera la altimetría del terreno.',
            'MUNICIPIO y DEPARTAMENTO se pre-llenan desde la jornada activa; verifique que sean correctos.',
        ],
        refManual: 'Tabla 4 – Capa PRS · Ilustraciones 5 y 6',
    },

    propiedades: {
        titulo: 'Propiedades de la Vía (PROPIEDADES)',
        emoji: '🗂️',
        color: '#26a69a',
        definicion:
            'Describe las características físicas homogéneas de cada segmento de vía (Tabla 5, SINC v5). Por cada registro en la capa EJES debe existir al menos un registro en PROPIEDADES. Si todos los atributos son iguales en todo el eje, basta un registro; si cambian a lo largo de la vía, se crean nuevos registros según los umbrales de cambio. Los anchos ANCHOBERMA, ANCHOCUNT y ANCHOSEPAR se diligencian siempre: si el elemento no existe en la calzada, el valor es 0.',
        geometria: 'Polilínea',
        geoDesc:
            'En InfraVial la polilínea almacenada es la del eje (EJES) para mapa e índice geográfico. La segmentación lógica por atributos se documenta con LONGITUD del tramo y, opcionalmente, ABSCISAI y ABSCISAF en kilómetros sobre el eje.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'Texto 4–25 caracteres. Mismo código que el registro asociado en EJES.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma en campo. Formato AAAA-MM-DD (10 caracteres). Al crear un registro nuevo se propone la fecha de la jornada del eje; puede cambiarla si aplica.', oblig: true },
            { nombre: 'LONGITUD', desc: 'Longitud verdadera del segmento en metros (1–250 000), considerando altimetría.', oblig: true },
            { nombre: 'TIPOTERR', desc: '1 Escarpado · 2 Montañoso · 3 Ondulado · 4 Plano. Entero 1–4.', oblig: true },
            { nombre: 'PENDIENTE', desc: 'Grados sexagesimales; + ascenso / − descenso (inicio → fin del eje). Entre −45 y 45.', oblig: true },
            {
                nombre: 'TIPOSUPERF',
                desc: '1 Destapado · 2 Afirmado · 3 Pav. asfáltico · 4 Trat. superficial · 5 Pav. rígido · 6 Placa huella · 7 Pav. articulado · 8 Otro. Entero 1–8.',
                oblig: true,
            },
            {
                nombre: 'ESTADO',
                desc: '1 Bueno · 2 Regular · 3 Malo · 4 Pésimo · 5 Intransitable (Tabla 6 — definición de daño y nivel de servicio).',
                oblig: true,
            },
            { nombre: 'NUMCARR', desc: 'Número de carriles de la calzada. Entero 1–10.', oblig: true },
            { nombre: 'ANCOCARR', desc: 'Ancho promedio de carriles en metros (1–5). Umbral de cambio: 0,50 m.', oblig: true },
            {
                nombre: 'ANCHOBERMA',
                desc: 'Suma del ancho de bermas en la calzada (m). 0 si no hay; si hay, 0,4–6. Umbral de cambio: 0,20 m.',
                oblig: true,
            },
            {
                nombre: 'ANCHOCUNT',
                desc: 'Suma del ancho de cunetas (m). 0 si no hay; si hay, 0,1–4. Umbral de cambio: 0,20 m.',
                oblig: true,
            },
            {
                nombre: 'ANCHOSEPAR',
                desc: 'Separador adicional en la misma calzada y sentido (m). 0 si no hay; si hay, 0,1–50. Umbral: 0,50 m. No incluye el separador entre calzadas A-B y B-A.',
                oblig: true,
            },
            { nombre: 'COD_MUNICIPIO', desc: 'Código DANE del municipio (DmMunicipio).', oblig: true },
            { nombre: 'COD_DEPARTAMENTO', desc: 'Código DANE del departamento (DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO', desc: 'Nombre del municipio. Texto 4–25 caracteres.', oblig: true },
            { nombre: 'DEPARTAMENTO', desc: 'Nombre del departamento. Texto 4–25 caracteres.', oblig: true },
            { nombre: 'ABSCISAI / ABSCISAF', desc: 'Opcional. Kilómetros inicio/fin del segmento sobre el eje (alinear con divisiones de EJES).', oblig: false },
            { nombre: 'OBS', desc: 'Opcional. Si se usa: 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'FECHA se rellena con la fecha de la jornada al agregar un registro; ajústela si la toma real fue otro día.',
            'Umbrales para crear un nuevo registro cuando cambia el tramo: PENDIENTE ±1,15°; ANCOCARR ±0,50 m; ANCHOBERMA ±0,20 m; ANCHOCUNT ±0,20 m; ANCHOSEPAR ±0,50 m.',
            'ESTADO 1 Bueno: circulación segura. 2 Regular: irregularidades que afectan comodidad. 3 Malo: golpeteo y vibración frecuentes. 4 Pésimo: desplazamientos y saltos, circulación peligrosa. 5 Intransitable: no permite paso de vehículos.',
            'En doble calzada, ANCHOBERMA es la suma de bermas de esa calzada; ANCHOSEPAR es el que separa una calzada adicional en el mismo sentido (ilustraciones 8 y 9 del manual).',
            'El separador ancho entre calzadas en sentidos opuestos (A-B y B-A) no se reporta en ANCHOSEPAR.',
            'MUNICIPIO y DEPARTAMENTO se pueden pre-llenar desde la jornada; verifique códigos y nombres DANE.',
        ],
        refManual: 'Tabla 5 – Capa PROPIEDADES · Tabla 6 – Estados · Ilustraciones 7, 8 y 9',
    },

    puentes: {
        titulo: 'Puentes (PUENTES)',
        emoji: '🏰',
        color: '#42a5f5',
        definicion:
            'Estructura vial que permite el cruce sobre un obstáculo (río, quebrada, vía, etc.). El punto se debe tomar al inicio del puente o pontón en el sentido del abscisado. Las características de la calzada del puente deben estar almacenadas en el correspondiente registro de la capa PROPIEDADES: en algunos casos pueden ser iguales a las existentes antes y después del puente y en otros casos pueden ser diferentes (Tabla 7, Metodología SINC v5).',
        geometria: 'Punto',
        geoDesc:
            'Punto georreferenciado al inicio del puente o pontón, en el sentido del abscisado, sobre el eje EJES.',
        campos: [
            {
                nombre: 'CODIGOVIA',
                desc: 'Texto. CODIGOVIA del registro asociado en la capa EJES. Texto de 4 a 25 caracteres.',
                oblig: true,
            },
            {
                nombre: 'FECHA',
                desc: 'Texto. Fecha de toma de información en campo asociada al registro. 10 caracteres en formato AAAA-MM-DD. Al crear un registro se propone la fecha de la jornada; puede corregirla.',
                oblig: true,
            },
            {
                nombre: 'LONGITUD',
                desc: 'Real. Longitud verdadera (considerando altitudes) del puente en metros. Número entre 1 y 4 000.',
                oblig: true,
            },
            {
                nombre: 'DISTINI',
                desc: 'Real. Distancia verdadera a través de la vía desde su inicio hasta el inicio del puente, en metros. Número entre 0 y 250 000.',
                oblig: true,
            },
            {
                nombre: 'NOMBRE',
                desc: 'Texto. Nombre del puente. Texto de 3 a 100 caracteres.',
                oblig: true,
            },
            {
                nombre: 'ANCHOTABLE',
                desc: 'Real. Ancho del tablero en metros. Número entre 2 y 30.',
                oblig: true,
            },
            {
                nombre: 'NUMLUCES',
                desc: 'Entero. Número de luces (vanos). Número entre 0 y 20.',
                oblig: true,
            },
            {
                nombre: 'Estado superficie (ESTADOSUP)',
                desc: 'Entero. Estado de la capa de rodadura. 1 Bueno · 2 Regular · 3 Malo · 4 Intransitable.',
                oblig: true,
            },
            {
                nombre: 'Estado estructura (ESTADOEST)',
                desc: 'Entero. Estado a nivel estructural. 1 Bueno · 2 Regular · 3 Malo · 4 No funcional.',
                oblig: true,
            },
            {
                nombre: 'FOTO',
                desc: 'Texto. Nombre de la foto (4 a 50 caracteres). En InfraVial se asigna al subir el JPG. Opcional: puede dejarse vacío y completarse después editando el registro.',
                oblig: false,
            },
            {
                nombre: 'RUTAFOTO',
                desc: 'Texto. URL del JPG (10 a 250 caracteres). Se genera al subir. Opcional si aún no hay fotografía.',
                oblig: false,
            },
            {
                nombre: 'COD_MUNICIPIO',
                desc: 'Entero. Código DANE del municipio de localización de la vía (DmMunicipio).',
                oblig: true,
            },
            {
                nombre: 'COD_DEPARTAMENTO',
                desc: 'Entero. Código DANE del departamento de localización de la vía (DmDepartamento).',
                oblig: true,
            },
            {
                nombre: 'MUNICIPIO',
                desc: 'Texto. Nombre del municipio. Texto de 4 a 25 caracteres.',
                oblig: true,
            },
            {
                nombre: 'DEPARTAMENTO',
                desc: 'Texto. Nombre del departamento. Texto de 4 a 25 caracteres.',
                oblig: true,
            },
            {
                nombre: 'OBS',
                desc: 'Texto. Observación: información adicional que no pueda incluirse en los demás campos. Si se usa: 10 a 250 caracteres.',
                oblig: false,
            },
        ],
        tips: [
            'La fotografía del puente (FOTO / RUTAFOTO) es opcional al crear el registro: puede guardar y adjuntar la imagen después al editar.',
            'El punto GPS es el inicio del puente en sentido del abscisado, no el centro del tablero.',
            'Estado superficie describe la rodadura; estado estructura describe el comportamiento estructural: revise ambos según el manual.',
            'Calzada, superficie y anchos del tramo sobre el puente van en PROPIEDADES (Tabla 5), no en PUENTES.',
            'Un estado estructura “No funcional” implica riesgo estructural grave: documente y escale según protocolo de su entidad.',
        ],
        refManual: 'Tabla 7 – Campos y características de la capa PUENTES',
    },

    muros: {
        titulo: 'Muros de Contención (MUROS)',
        emoji: '▦',
        color: '#7986cb',
        definicion: 'Estructura que evita que una masa de materia (generalmente tierra o roca en pendiente) se precipite o derrumbe sobre la vía. El punto se toma al inicio del muro en el sentido del abscisado.',
        geometria: 'Punto',
        geoDesc: 'Punto al inicio del muro, asociado al registro del eje (EJES) y al CODIGOVIA.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'Texto 4–25 caracteres. Código de vía del eje asociado.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma en campo. Formato AAAA-MM-DD (10 caracteres).', oblig: true },
            { nombre: 'LONGITUD', desc: 'Longitud verdadera del muro (considerando altitudes), en metros. Entre 2 y 500.', oblig: true },
            { nombre: 'DISTINI', desc: 'Distancia verdadera desde el inicio de la vía hasta el inicio del muro, en metros. Entre 0 y 250 000.', oblig: true },
            { nombre: 'LADO', desc: 'Entero 1 o 2: 1 = lado en sentido A→B · 2 = lado en sentido B→A.', oblig: true },
            { nombre: 'ANCHOCOR', desc: 'Ancho promedio del muro en la corona (m). Entre 0,1 y 20.', oblig: true },
            { nombre: 'ALTURA', desc: 'Altura promedio del muro (m). Entre 0,1 y 50.', oblig: true },
            { nombre: 'FOTO', desc: 'Nombre de la foto. Texto 4–50 caracteres si se adjunta imagen.', oblig: false },
            { nombre: 'RUTAFOTO', desc: 'URL del JPG (10–250 caracteres) si hay foto.', oblig: false },
            { nombre: 'COD_MUNICIPIO / COD_DEPARTAMENTO', desc: 'Códigos DANE de localización (DmMunicipio / DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO / DEPARTAMENTO', desc: 'Nombres: texto 4–25 caracteres cada uno.', oblig: true },
            { nombre: 'OBS', desc: 'Observación adicional. Si se usa: 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'FOTO y RUTAFOTO son opcionales al crear: puede guardar el registro y subir la imagen después al editar.',
            'En nivel Detallado (McMuro) se agregan tipo de muro, material y estado según el manual.',
            'Revise deformaciones estructurales: pérdida de verticalidad o agrietamientos pueden indicar falla.',
        ],
        refManual: 'Tabla 8 – Campos y características de la capa MUROS',
    },

    tuneles: {
        titulo: 'Túneles (TUNELES)',
        emoji: '🚇',
        color: '#90a4ae',
        definicion: 'Estructura subterránea que permite el paso de la vía a través de un obstáculo geográfico (montaña, colina, etc.). El punto se toma al inicio del túnel en el sentido del abscisado.',
        geometria: 'Punto',
        geoDesc: 'Punto al inicio del túnel (portal en sentido del abscisado), asociado al eje EJES y CODIGOVIA.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'Texto 4–25 caracteres. Código de vía del eje asociado.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma en campo. Formato AAAA-MM-DD.', oblig: true },
            { nombre: 'LONGITUD', desc: 'Longitud verdadera del túnel (m), entre 2 y 10 000.', oblig: true },
            { nombre: 'DISTINI', desc: 'Distancia desde el inicio de la vía hasta el inicio del túnel (m), entre 0 y 250 000.', oblig: true },
            { nombre: 'NOMBRE', desc: 'Nombre del túnel. Texto 3–100 caracteres.', oblig: true },
            { nombre: 'NUMCARR', desc: 'Número de carriles. Entero entre 1 y 10.', oblig: true },
            { nombre: 'ANCOCARR', desc: 'Ancho promedio de los carriles (m), entre 1 y 5.', oblig: true },
            { nombre: 'ESTADO', desc: '1 = Bueno · 2 = Regular · 3 = Malo (estado visual).', oblig: true },
            { nombre: 'COD_MUNICIPIO / COD_DEPARTAMENTO', desc: 'Códigos DANE (DmMunicipio / DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO / DEPARTAMENTO', desc: 'Nombres: texto 4–25 caracteres cada uno.', oblig: true },
            { nombre: 'OBS', desc: 'Observación adicional. Si se usa: 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'En nivel Detallado (McTunel) se agregan gálibo, tubos, tipo de túnel y otros atributos del manual.',
            'El gálibo en McTunel es la altura libre mínima útil para el paso de vehículos.',
        ],
        refManual: 'Tabla – Capa TUNELES (campos básicos)',
    },

    sitios: {
        titulo: 'Sitios Críticos de Inestabilidad (SITIOSCRITICOS)',
        emoji: '⚠️',
        color: '#ffa726',
        definicion: 'Puntos donde se identifican amenazas geotécnicas o de inestabilidad que pueden afectar la operación segura de la vía. El punto se toma al inicio del sitio crítico en el sentido del abscisado.',
        geometria: 'Punto',
        geoDesc: 'Punto al inicio del sitio, asociado al eje EJES y CODIGOVIA.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'Texto 4–25 caracteres. Código de vía del eje asociado.', oblig: true },
            { nombre: 'FECHA', desc: 'Fecha de toma en campo. Formato AAAA-MM-DD.', oblig: true },
            { nombre: 'LADO', desc: '1 = sentido A→B · 2 = sentido B→A (lado de la vía del punto crítico).', oblig: true },
            { nombre: 'TIPO', desc: 'Entero 1–9: hundimiento/banca, detritos, abultamiento, cambios de forma, deformación estructuras, erosión, derrumbes, deslizamientos, grietas de tracción.', oblig: true },
            { nombre: 'SEVERIDAD', desc: '1 sin daño o insignificante · 2 daño pequeño sin reparación · 3 daño pequeño con reparación · 4 daño grave reparación urgente.', oblig: true },
            { nombre: 'FOTO', desc: 'Nombre de la foto (4–50) si adjunta imagen.', oblig: false },
            { nombre: 'RUTAFOTO', desc: 'URL del JPG (10–250) si hay foto.', oblig: false },
            { nombre: 'COD_MUNICIPIO / COD_DEPARTAMENTO', desc: 'Códigos DANE (DmMunicipio / DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO / DEPARTAMENTO', desc: 'Nombres: texto 4–25 caracteres cada uno.', oblig: true },
            { nombre: 'OBS', desc: 'Observación adicional. Si se usa: 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'FOTO y RUTAFOTO son opcionales al crear: puede guardar y subir la imagen después al editar.',
            'Detritos en la vía pueden ser antecedentes de caídas masivas de roca o deslizamientos.',
            'Las grietas de tracción favorecen infiltración y reducción de resistencia en el plano de falla.',
            'Árboles inclinados, postes desviados o cercas tensionadas indican posible movimiento de terreno.',
        ],
        refManual: 'Tabla 10 – Campos y características de la capa SITIOSCRITICOS (severidad · Tabla 11)',
    },

    drenaje: {
        titulo: 'Obras de Drenaje (OBRASDRENAJE)',
        emoji: '💧',
        color: '#66bb6a',
        definicion: 'Sistema de tuberías, sumideros o trampas con sus conexiones que permiten el desalojo de aguas (principalmente pluviales) y evitan el peligroso aquaplaning. Incluye alcantarillas, box culverts, bateas y cruces de cuerpos de agua.',
        geometria: 'Punto',
        geoDesc: 'Punto en el inicio de la obra sobre el eje EJES. En cruce de cuerpo de agua superficial debe levantarse el punto aunque en época seca no haya flujo.',
        campos: [
            { nombre: 'CODIGOVIA', desc: 'Texto 4–25 caracteres. Código de vía del eje asociado.', oblig: true },
            { nombre: 'ESTADOSERV', desc: '1 = Colmatada · 2 = Medianamente colmatada · 3 = Limpia.', oblig: true },
            { nombre: 'ESTADOGEN', desc: '1 = Bueno · 2 = Regular · 3 = Malo · 4 = No funcional.', oblig: true },
            { nombre: 'TIPO', desc: '1 = Box culvert · 2 = Tubería (alcantarilla) · 3 = Bateas · 4 = Cruce cuerpo de agua superficial · 5 = Otro.', oblig: true },
            { nombre: 'MATERIAL', desc: '1 = Concreto · 2 = PVC · 3 = Madera · 4 = Metálica · 5 = Otro.', oblig: true },
            { nombre: 'LONGITUD', desc: 'Longitud de la obra (m). Entre 1 y 1 000.', oblig: true },
            { nombre: 'NUMSECC', desc: 'Número de secciones. Entero entre 1 y 10.', oblig: true },
            { nombre: 'ANCHO', desc: 'Ancho de la obra o diámetro de la alcantarilla (m). Entre 0,1 y 10.', oblig: true },
            { nombre: 'FOTO / RUTAFOTO', desc: 'Nombre y URL del JPG si adjunta imagen; opcional al crear.', oblig: false },
            { nombre: 'COD_MUNICIPIO / COD_DEPARTAMENTO', desc: 'Códigos DANE (DmMunicipio / DmDepartamento).', oblig: true },
            { nombre: 'MUNICIPIO / DEPARTAMENTO', desc: 'Nombres: texto 4–25 caracteres cada uno.', oblig: true },
            { nombre: 'OBS', desc: 'Observación adicional. Si se usa: 10 a 250 caracteres.', oblig: false },
        ],
        tips: [
            'FOTO y RUTAFOTO son opcionales al crear: puede guardar la obra y subir la imagen después al editar.',
            'Si en verano no hay flujo en un cruce de cuerpo de agua, el manual indica que igual debe levantarse el punto.',
            'En nivel Detallado (McDrenaje) se agregan otros atributos (diámetro, sección, obstrucción, etc.).',
        ],
        refManual: 'Tabla 12 – Campos y características de la capa OBRASDRENAJE',
    },

    // ─── Mc DETALLADO ────────────────────────────────────────────────────────

    mcBerma: {
        titulo: 'Mc Berma',
        emoji: '➖',
        color: '#ef9a9a',
        definicion: 'De acuerdo con el art. 2° del Código Nacional de Tránsito (Ley 769/2002), la berma es la parte de la estructura de la vía destinada al soporte lateral de la calzada para peatones, semovientes y ocasionalmente estacionamiento o tránsito de emergencia. Corresponde a elementos delimitados de poste a poste de referencia.',
        geometria: 'Línea (LineString)',
        geoDesc: 'Traza el borde exterior de la berma a lo largo de la vía, de PR a PR. Precisión submétrica recomendada.',
        campos: [
            { nombre: 'IdBerma', desc: 'Código del elemento autogenerado por el sistema al crear el registro.', oblig: false },
            { nombre: 'UnidadFuncional', desc: 'DmUnidadFuncional (Long). Unidad funcional del elemento; catálogo sincronizable desde Aniscopio.', oblig: true },
            { nombre: 'Proyecto', desc: 'DmProyectoCarretero (Long). Proyecto carretero.', oblig: true },
            { nombre: 'Municipio / Departamento', desc: 'DmMunicipio y DmDepartamento (Long).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS, si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Fecha de inicio de operación del elemento.', oblig: true },
            { nombre: 'NivelTransito', desc: 'DmNivelTransito (Short).', oblig: true },
            { nombre: 'TipoPavimento', desc: 'DmTipoPavimento (Short).', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial', desc: 'Poste de referencia inicial (km cerrados) y metros desde ese PR.', oblig: true },
            { nombre: 'PuntoFinal / DistAPuntoFinal', desc: 'Poste de referencia final y metros desde ese PR.', oblig: true },
            { nombre: 'Longitud', desc: 'Longitud del elemento en metros.', oblig: true },
            { nombre: 'AreaBerma', desc: 'Área en m².', oblig: true },
            { nombre: 'AnchoPromedio', desc: 'Cociente área / longitud (m).', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Nombre del archivo y URL tras subir la evidencia (opcional al crear).', oblig: false },
        ],
        tips: [
            'La geometría es línea, no polígono.',
            'Los dominios Long (UF, proyecto, municipio, departamento) pueden poblarse desde Aniscopio; mientras tanto se captura el identificador numérico.',
            'La fotografía es opcional: puede guardar el registro y adjuntar imagen después al editar.',
        ],
        refManual: 'Tabla 14 – Campos y características de la capa BERMA',
    },

    mcCalzada: {
        titulo: 'Mc Calzada',
        emoji: '🛣️',
        color: '#ffb74d',
        definicion: 'La calzada es la parte de la carretera destinada a la circulación de automóviles y que, según su tamaño, puede incluir uno o varios carriles. Corresponde a elementos de calzada delimitados de poste a poste de referencia.',
        geometria: 'Polígono',
        geoDesc: 'Polígono que delimita el área de la calzada de PR a PR. Permite área, longitud y ancho promedio (área/longitud).',
        campos: [
            { nombre: 'IdCalzada', desc: 'Código autogenerado por el sistema.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long asociados a Dm* (Aniscopio).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'NivelTransito / TipoPavimento', desc: 'DmNivelTransito y DmTipoPavimento.', oblig: true },
            { nombre: 'IdEstructuraPavimento', desc: 'Código según DmMaterialEstructPav (Tabla 38): el formulario lista código y descripción (p. ej. MP 25, BG-27); en BD se guarda el número 1–43.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'PR en km cerrados y metros desde cada PR.', oblig: true },
            { nombre: 'Longitud / AreaCalzada / AnchoPromedio', desc: 'Metros, m² y cociente área/longitud.', oblig: true },
            { nombre: 'TipoSubrasante / MaterialSubrasante / EspesorSubrasante', desc: 'DmTipoSubrasante (Tabla 56: Natural, Estabilizado, Terraplen), DmMaterialSubrasante (Tabla 39: A-1…A-7) y espesor en m.', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Nombre y URL de evidencia fotográfica.', oblig: false },
        ],
        tips: [
            'El polígono debe cerrarse (primer y último vértice iguales) con al menos cuatro puntos en el anillo exterior.',
            'Los catálogos Long pueden integrarse desde Aniscopio; mientras tanto se captura el id numérico.',
            'Id estructura pavimento: lista desplegable con DmMaterialEstructPav (Tabla 38, códigos 1–43).',
            'FOTO / RUTAFOTO: opcional al crear; puede subir la imagen luego al editar.',
        ],
        refManual: 'Tabla 15 – Campos y características de la capa CALZADA',
    },

    mcCco: {
        titulo: 'Mc Centro de Control de Operaciones (CCO)',
        emoji: '🎛️',
        color: '#ffd54f',
        definicion: 'El CCO permite el monitoreo del tránsito desde un sistema integrado, donde es posible evaluar la fluidez, flujo y volumen de vehículos de forma amplia e integral. Corresponde a elementos CCO delimitados de poste a poste de referencia. Es exigible exclusivamente a la Agencia Nacional de Infraestructura (ANI).',
        geometria: 'Polígono',
        geoDesc: 'Polígono que delimita el área del CCO de PR a PR.',
        campos: [
            { nombre: 'IdCco', desc: 'Código del elemento autogenerado por el sistema al crear el registro.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long asociados a DmUnidadFuncional, DmProyectoCarretero, DmMunicipio y DmDepartamento (Aniscopio / noche).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS, si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Fecha de inicio de operación del elemento.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'Postes de referencia (km cerrados) y metros desde cada PR.', oblig: true },
            { nombre: 'Longitud', desc: 'Longitud del elemento en metros.', oblig: true },
            { nombre: 'AreaCco', desc: 'Área del elemento en m².', oblig: true },
            { nombre: 'AnchoPromedio', desc: 'Cociente área / longitud (m).', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (Short): operativo del CCO (p. ej. operativo / parcial / no operativo según dominio).', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Nombre del archivo y URL tras subir la evidencia (opcional al crear).', oblig: false },
        ],
        tips: [
            'Tabla 16: misma lógica de catálogos Long que Berma/Calzada; las listas pueden poblarse desde Aniscopio.',
            'La fotografía es opcional: puede guardar el registro y adjuntar imagen después al editar.',
            'Otras entidades distintas de la ANI no tienen la capa como exigible; pueden omitirla o usarla de forma voluntaria.',
        ],
        refManual: 'Tabla 16 – Campos y características de la capa CCO',
    },

    mcCicloruta: {
        titulo: 'Mc Cicloruta',
        emoji: '🚲',
        color: '#a5d6a7',
        definicion: 'De acuerdo con el artículo 2° del Código Nacional de Tránsito (Ley 769/2002), la cicloruta es la vía o sección de la calzada destinada al tránsito de bicicletas en forma exclusiva. Corresponde a elementos cicloruta delimitados de poste a poste de referencia.',
        geometria: 'Polígono',
        geoDesc: 'Polígono que delimita el área de la cicloruta de PR a PR.',
        campos: [
            { nombre: 'IdCicloruta', desc: 'Código autogenerado por el sistema.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long (Dm*; actualización nocturna desde Aniscopio).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'TipoPavimento', desc: 'DmTipoPavimento (Short).', oblig: true },
            { nombre: 'IdEstructuraPavimento', desc: 'Código según DmMaterialEstructPav (Tabla 38): el formulario lista código y descripción (p. ej. MP 25, BG-27); en BD se guarda el número 1–43.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'PR en km cerrados y metros desde cada PR.', oblig: true },
            { nombre: 'Longitud / AreaCicloruta / AnchoPromedio', desc: 'Metros, m² y cociente área/longitud.', oblig: true },
            { nombre: 'TipoSubrasante / MaterialSubrasante / EspesorSubrasante', desc: 'DmTipoSubrasante (Tabla 56: Natural, Estabilizado, Terraplen), DmMaterialSubrasante (Tabla 39: A-1…A-7) y espesor en m.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (Short): estado del elemento (Bueno · Regular · Malo en el dominio actual).', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Evidencia fotográfica opcional al crear.', oblig: false },
        ],
        tips: [
            'Tabla 17: estructura análoga a Calzada, sin campo de nivel de tránsito.',
            'Id estructura pavimento: misma lista DmMaterialEstructPav (Tabla 38) que en Calzada.',
            'El polígono debe cerrarse (primer y último vértice iguales) con al menos cuatro puntos en el anillo exterior.',
            'FOTO / RUTAFOTO: opcional al crear; puede subir la imagen luego al editar.',
        ],
        refManual: 'Tabla 17 – Campos y características de la capa CICLORUTA',
    },

    mcCuneta: {
        titulo: 'Mc Cuneta',
        emoji: '〰️',
        color: '#80deea',
        definicion: 'La cuneta es la zanja a los lados de un camino o vía de circulación para recoger el agua de la lluvia. Corresponde a elementos cuneta delimitados de poste a poste de referencia.',
        geometria: 'Línea (LineString)',
        geoDesc: 'Traza el eje de la cuneta de PR a PR.',
        campos: [
            { nombre: 'IdCuneta', desc: 'Código autogenerado por el sistema.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long (Dm*; Aniscopio).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'PR en km cerrados y metros desde cada PR.', oblig: true },
            { nombre: 'Longitud', desc: 'Longitud del elemento en metros.', oblig: true },
            { nombre: 'Sección', desc: 'DmSeccion (forma de sección transversal).', oblig: true },
            { nombre: 'Material', desc: 'DmMaterial de la sección.', oblig: true },
            { nombre: 'AreaSeccion', desc: 'Área de la sección en m².', oblig: true },
            { nombre: 'PorcPromSecObstruida / PorcAceptacion', desc: 'Porcentajes 0–100.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (estado general).', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Evidencia opcional al crear.', oblig: false },
        ],
        tips: [
            'Tabla 18: los porcentajes se validan entre 0 y 100.',
            'La geometría es línea (no polígono), alineada al trazado de la cuneta entre PRs.',
            'FOTO / RUTAFOTO: opcional al crear; puede subir la imagen luego al editar.',
        ],
        refManual: 'Tabla 18 – Campos y características de la capa CUNETA',
    },

    mcDefensaVial: {
        titulo: 'Mc Defensa Vial',
        emoji: '🛡️',
        color: '#ef5350',
        definicion: 'La defensa vial es una barrera metálica que responde a problemas de seguridad vial: reduce el ingreso de vehículos a otras calzadas o fuera de la vía y redirige el vehículo en una colisión. Corresponde a elementos delimitados de poste a poste de referencia.',
        geometria: 'Línea (LineString)',
        geoDesc: 'Traza la defensa entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdDefensaVial', desc: 'Código autogenerado por el sistema al guardar.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long (Dm*; sincronizados con Aniscopio).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'PR en km cerrados y metros desde cada PR.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (Short).', oblig: true },
            { nombre: 'NumCaptafaro / NumModulos / NumPostes / NumSeparadores / NumTerminales', desc: 'Conteos enteros 0–9 999.', oblig: true },
            { nombre: 'Pintura', desc: 'DmPintura (1 Sí · 2 No).', oblig: true },
            { nombre: 'Longitud', desc: 'Longitud del elemento en metros.', oblig: true },
            { nombre: 'Material', desc: 'DmMaterial (misma escala que cuneta).', oblig: true },
            { nombre: 'Foto / Ruta foto', desc: 'Evidencia opcional al crear.', oblig: false },
        ],
        tips: [
            'Tabla 19: validación alineada al manual SINC (geometría línea, dominios numéricos).',
            'FOTO / RUTAFOTO: opcional al crear; puede subir la imagen luego al editar.',
            'Terminales y captafaros son críticos para la eficacia de la barrera.',
        ],
        refManual: 'Tabla 19 – Campos y características de la capa DEFENSA VIAL',
    },

    mcIts: {
        titulo: 'Mc Dispositivo ITS',
        emoji: '📡',
        color: '#26c6da',
        definicion: 'Los sistemas inteligentes de transporte (ITS) son una amplia gama de sistemas de información y tecnologías electrónicas y de comunicación (inalámbrica o cableada) que mejoran la seguridad vial, la movilidad, la calidad de vida y la productividad, mediante tecnologías avanzadas en infraestructura y vehículos. Corresponde a los elementos dispositivos ITS.',
        geometria: 'Punto',
        geoDesc: 'Punto en la ubicación del dispositivo sobre o junto al eje vial.',
        campos: [
            { nombre: 'IdDispositivo', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UnidadFuncional / Proyecto / Municipio / Departamento', desc: 'Long (Dm*; Aniscopio).', oblig: true },
            { nombre: 'CodigoInvias', desc: 'Código INVIAS si aplica.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'TieneIPv6', desc: 'DmTieneIPv6 (Sí / No).', oblig: true },
            { nombre: 'Punto / DistanciaAlPunto', desc: 'PR (km cerrados) y metros al poste.', oblig: true },
            { nombre: 'IdPeaje / Peaje / TienePagoElectronico / Nombre', desc: 'Datos asociados a peaje cuando aplica (Short/Text/Dm).', oblig: false },
            { nombre: 'Tipo', desc: 'DmTipoDispositivoITS.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstadoDispositivoITS (operación del dispositivo).', oblig: true },
            { nombre: 'ProtocoloComunicacion / TipoSuministroEnergetico / MedioTransmision / SentidoTrafico', desc: 'Long/Short según dominios del manual.', oblig: true },
            { nombre: 'EstadoGeneral', desc: 'DmEstado (estado general del elemento).', oblig: true },
            { nombre: 'Observaciones', desc: 'Campo obs en BD; si se usa, 10–250 caracteres.', oblig: false },
        ],
        tips: [
            'Tabla 14: sin FOTO en el modelo manual; el formulario no solicita imagen y al guardar se eliminan foto/ruta heredadas.',
            'Registros antiguos (numPr, descripcion): al editar, PR pasa a Punto y la descripción puede copiarse a observaciones.',
        ],
        refManual: 'Tabla 14 – Campos y características de la capa ITS · Tabla 49 – DmTipoDispositivoITS',
    },

    mcDrenaje: {
        titulo: 'Mc Drenaje',
        emoji: '🌊',
        color: '#66bb6a',
        definicion:
            'Sistema de tuberías, sumideros o trampas con sus conexiones que permite el desalojo de líquidos (generalmente pluviales) y evita el aquaplaning. Corresponde a elementos drenaje delimitados de poste a poste de referencia (Tabla 21).',
        geometria: 'Línea (LineString)',
        geoDesc: 'Línea entre PR inicial y PR final que representa el tramo de drenaje inventariado.',
        campos: [
            { nombre: 'IdDrenaje', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · dominios Dm* (Aniscopio).', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Fecha de inicio de operación del elemento.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Poste km cerrado y metros al poste en inicio y fin.', oblig: true },
            { nombre: 'Longitud (m)', desc: 'Longitud del elemento.', oblig: true },
            { nombre: 'Ancho (m)', desc: 'Área / longitud.', oblig: true },
            { nombre: 'Diámetro (m)', desc: 'Diámetro cuando aplica.', oblig: true },
            { nombre: 'Área drenaje (m²)', desc: 'Área del elemento.', oblig: true },
            { nombre: 'Tipo drenaje / Material', desc: 'DmTipoDrenaje · DmMaterial (sección).', oblig: true },
            { nombre: 'Área sección (m²)', desc: 'Área de la sección.', oblig: true },
            { nombre: '% sección obstruida / % aceptación', desc: 'Porcentajes según manual.', oblig: true },
        ],
        tips: [
            'El manual indica geometría punto; en Mc se usa línea PR–PR para alinear con cunetas y demás elementos lineales del eje.',
            'Use % obstrucción y % aceptación para priorizar mantenimiento.',
        ],
        refManual: 'Tabla 21 – Capa DRENAJE',
    },

    mcPeaje: {
        titulo: 'Mc Estación de Peaje',
        emoji: '🛂',
        color: '#ba68c8',
        definicion:
            'Instalaciones existentes y/o por instalar o reubicar para el recaudo de peajes. Polígono delimitado de poste a poste (Tabla 22).',
        geometria: 'Polígono',
        geoDesc: 'Polígono que cubre la huella de la estación, entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdPeaje', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · dominios Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Inicio de operación del elemento.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento lineal de referencia.', oblig: true },
            { nombre: 'Fecha instalación', desc: 'Fecha de instalación.', oblig: false },
            { nombre: 'Longitud (m) · Área (m²) · Ancho promedio (m)', desc: 'Ancho promedio = área / longitud.', oblig: true },
            { nombre: 'Nº estaciones de pago', desc: 'Long según manual.', oblig: true },
        ],
        tips: ['El polígono debe cubrir la plataforma completa de la estación.', 'Tabla 22 no incluye nombre ni tipo de peaje en el listado de campos.'],
        refManual: 'Tabla 22 – Capa ESTACIÓN PEAJE',
    },

    mcPesaje: {
        titulo: 'Mc Estación de Pesaje',
        emoji: '⚖️',
        color: '#9575cd',
        definicion:
            'Instalaciones para pesaje de vehículos, en el número y características definidos, incluyendo terrenos donde queden situadas. Polígono PR–PR (Tabla 23).',
        geometria: 'Polígono',
        geoDesc: 'Polígono que cubre el área de la estación de pesaje.',
        campos: [
            { nombre: 'IdEstacionPesaje', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · dominios Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Inicio de operación.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento de referencia.', oblig: true },
            { nombre: 'Longitud (m) · Área (m²) · Ancho promedio (m)', desc: 'Ancho promedio = área / longitud.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (Bueno · Regular · Malo).', oblig: true },
        ],
        tips: ['El polígono debe incluir básculas y zonas de maniobra asociadas.', 'Sin campos “nombre”, “capacidad” ni “tipo” en la Tabla 23.'],
        refManual: 'Tabla 23 – Capa ESTACIÓN PESAJE',
    },

    mcLuminaria: {
        titulo: 'Mc Luminaria',
        emoji: '💡',
        color: '#fff176',
        definicion:
            'Aparatos que filtran, distribuyen o transforman la luz de las lámparas, con accesorios de alimentación. Punto en PR + metros (Tabla 25).',
        geometria: 'Punto',
        geoDesc: 'Punto en la ubicación de la luminaria; PR (km cerrado) y distancia en metros.',
        campos: [
            { nombre: 'IdLuminaria', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'Unidad funcional', desc: 'Short según manual.', oblig: true },
            { nombre: 'Proyecto', desc: 'Texto (actualización nocturna Aniscopio).', oblig: false },
            { nombre: 'Municipio / Departamento', desc: 'Long.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Inicio de operación.', oblig: true },
            { nombre: 'Punto (PR) + DistAPunto (m)', desc: 'Referencia lineal del elemento.', oblig: true },
        ],
        tips: ['Proyecto es texto en la Tabla 25, distinto de otras capas Mc (Long).', 'Sin tipo, potencia ni lado en el esquema Tabla 25.'],
        refManual: 'Tabla 25 – Capa LUMINARIA',
    },

    mcMuro: {
        titulo: 'Mc Muro',
        emoji: '🧱',
        color: '#7986cb',
        definicion:
            'Estructura que evita el deslizamiento de tierra o roca sobre la vía. Línea delimitada de poste a poste (Tabla 26).',
        geometria: 'Línea (LineString)',
        geoDesc: 'Línea a lo largo del muro entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdMuro', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Inicio de operación.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento PR–PR.', oblig: true },
            { nombre: 'Longitud (m) · Altura (m)', desc: 'Dimensiones del elemento.', oblig: true },
            { nombre: 'Tipo muro', desc: 'DmTipoMuro.', oblig: true },
            { nombre: 'Estado material', desc: 'DmEstado.', oblig: true },
        ],
        tips: ['Inspeccione grietas y pérdida de verticalidad.', 'Tabla 26 no incluye “lado” ni material separado del tipo de muro.'],
        refManual: 'Tabla 26 – Capa MUROS',
    },

    mcPuente: {
        titulo: 'Mc Puente',
        emoji: '🌉',
        color: '#42a5f5',
        definicion:
            'Puentes vehiculares o peatonales delimitados de poste a poste. Polígono según Tabla 27.',
        geometria: 'Polígono',
        geoDesc: 'Polígono de la huella del puente entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdPuente', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Inicio de operación.', oblig: true },
            { nombre: 'Nombre', desc: 'Nombre del puente.', oblig: true },
            { nombre: 'Tipo estructura / Nivel tránsito', desc: 'DmTipoEstructPuente · DmNivelTransito.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento PR–PR.', oblig: true },
            { nombre: 'Longitud · Área · Ancho promedio', desc: 'm, m²; ancho promedio = área / longitud.', oblig: true },
            { nombre: 'Nº luces · Luz menor · Longitud total · Luz mayor', desc: 'Valores numéricos según manual.', oblig: true },
            { nombre: 'Ancho tablero · Gálibo', desc: 'Metros y valor gálibo (Long en manual).', oblig: true },
        ],
        tips: ['Revise estribos, pilas y apoyos en campo.', 'El manual no define estados de superficie/estructura en la Tabla 27 para este esquema.'],
        refManual: 'Tabla 27 – Capa PUENTES',
    },

    mcSenalV: {
        titulo: 'Mc Señal Vertical',
        emoji: '🪧',
        color: '#a5d6a7',
        definicion:
            'Señal vertical en punto (Tabla 28): dominios Dm* con listas cerradas servidas por la API (ENM); excepción Departamento/Divipola (texto hasta integración DANE). Código de señal desde catálogo SenVert.',
        geometria: 'Punto',
        geoDesc: 'Coordenada del punto de la señal; referencia lineal Cod_PR + Abscisa_PR.',
        campos: [
            { nombre: 'ANSV_ID · Codigo_Interno · ID_Señal', desc: 'Identificación ANSV, código interno y autonumérico de captura.', oblig: false },
            { nombre: 'Clase_Señal · Vel_Señal', desc: 'Dm_ClaseSeñal; velocidad Short si aplica.', oblig: false },
            { nombre: 'Código señal', desc: 'Catálogo SenVert (campo visible); validación y foco de error.', oblig: true },
            { nombre: 'Tipo_Señal', desc: 'Dm_TipoSenalVertical: texto guardado código — descripción desde el mismo catálogo.', oblig: true },
            { nombre: 'Lado · Forma · Estado · Ubica · Dim · Fase · Soporte · Estado soporte · Material placa · Lamina reflectante', desc: 'Dominios Dm* indicados en Tabla 28.', oblig: false },
            { nombre: 'Fec_Instal · Accion_Señal · Fec_Accion', desc: 'Fechas opcionales; acción y fecha de acción si aplica.', oblig: false },
            { nombre: 'Cod_PR · Abscisa_PR · Entidad_Terr · Depto · Municipio · Divipola', desc: 'Contexto lineal y territorial; Divipola = código municipio DANE de la jornada (no hay campo duplicado cod municipio).', oblig: true },
            { nombre: 'Cod_Via · Nom_Vial · Sentido · Calzada', desc: 'Desde el eje (CODIGOVIA/NOMVIA, SENTIDO, TIPOEJE→Dm_Calzada). Re-aplicados al guardar.', oblig: false },
            { nombre: 'Carriles · Tipo_Sup', desc: 'NUMCARR y TIPOSUPERF del primer segmento en Propiedades (abscisaIni mínima), si existe.', oblig: false },
            { nombre: 'Clase_Via · Nom_Sector_Via · Resp_Via', desc: 'Dm_ClaseVia y texto libre; no vienen del eje.', oblig: false },
            { nombre: 'Observacion', desc: 'Campo común OBS al pie del formulario (10–250 caracteres si se usa).', oblig: false },
            { nombre: 'IdSenalVertical', desc: 'Autogenerado al guardar.', oblig: false },
        ],
        tips: [
            'Código señal: solo desde el catálogo (galería); Tipo_Señal muestra el valor completo guardado.',
            'Campos con (Dm_* · ENM): desplegable con valores del dominio en backend (contrastar con tablas del PDF oficial).',
            'Foto opcional: bloque FOTO/RUTAFOTO común debajo del formulario.',
        ],
        refManual: 'Tabla 28 – Capa SEÑAL VERTICAL',
    },

    mcSeparador: {
        titulo: 'Mc Separador',
        emoji: '⬌',
        color: '#f48fb1',
        definicion:
            'Elementos separador en polígono delimitados de poste a poste (Tabla 29).',
        geometria: 'Polígono',
        geoDesc: 'Polígono del área del separador entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdSeparador', desc: 'Text. Código del elemento autogenerado por el sistema.', oblig: false },
            {
                nombre: 'Id jornada · Nombre departamento · Nombre municipio (en registro)',
                desc: 'Mismos datos que en la jornada del eje: el registro se alimenta desde la jornada (sin códigos DANE en esta capa).',
                oblig: false,
            },
            { nombre: 'UnidadFuncional', desc: 'Long · DmUnidadFuncional. Opcional. Tabla actualizada desde Aniscopio.', oblig: false },
            { nombre: 'Proyecto', desc: 'Long · DmProyectoCarretero. Opcional. Tabla actualizada desde Aniscopio.', oblig: false },
            {
                nombre: 'Municipio',
                desc: 'Long · DmMunicipio. Opcional. La UI precarga con el código municipio de la jornada (convertido a número) hasta definir regla exacta con Aniscopio.',
                oblig: false,
            },
            {
                nombre: 'Departamento',
                desc: 'Long · DmDepartamento. Opcional. La UI precarga con el código departamento de la jornada (convertido a número).',
                oblig: false,
            },
            { nombre: 'CodigoInvias', desc: 'Text. Opcional.', oblig: false },
            { nombre: 'FechaInicioOperacion', desc: 'Date. Opcional.', oblig: false },
            { nombre: 'TipoPavimento', desc: 'Short · DmTipoPavimento.', oblig: true },
            { nombre: 'PuntoInicial / DistAPuntoInicial / PuntoFinal / DistAPuntoFinal', desc: 'Short PR + Double (m).', oblig: true },
            { nombre: 'Longitud / AreaSeparador / AnchoPromedio', desc: 'Double (m, m²); ancho = área / longitud.', oblig: true },
        ],
        tips: [
            'Tabla 29: no lista material ni estado del separador como campos aparte.',
            'Cubra toda la franja física del separador en el polígono.',
            'Desde la jornada se copian nombres, id jornada y (como propuesta) los Long Municipio/Departamento a partir de los códigos de la jornada; ajústelos si el catálogo Dm no coincide con ese criterio.',
        ],
        refManual: 'Tabla 29 – Capa SEPARADOR',
    },

    mcTunel: {
        titulo: 'Mc Túnel',
        emoji: '🚇',
        color: '#b0bec5',
        definicion: 'Túnel vial en polígono, delimitado de poste a poste (Tabla 30).',
        geometria: 'Polígono',
        geoDesc: 'Polígono de la huella del túnel entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdTunel', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Opcional. Vacía al crear; no se precarga desde la jornada. Diligenciar cuando exista dato.', oblig: false },
            { nombre: 'Nivel tránsito · Tipo pavimento', desc: 'DmNivelTransito · DmTipoPavimento.', oblig: true },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento PR–PR.', oblig: true },
            { nombre: 'Longitud (m)', desc: 'Longitud del elemento.', oblig: true },
        ],
        tips: [
            'La Tabla 30 no incluye nombre, gálibo ni número de tubos.',
            'Para doble túnel puede registrar dos polígonos o ejes distintos.',
            'Fecha inicio operación: opcional al crear; no usar la fecha de la jornada como sustituto.',
        ],
        refManual: 'Tabla 30 – Capa TÚNEL',
    },

    mcZona: {
        titulo: 'Mc Zona de Servicio',
        emoji: '⛽',
        color: '#ffcc80',
        definicion:
            'Zonas de servicio al usuario (combustible, descanso, etc.) en polígono PR–PR (Tabla 31).',
        geometria: 'Polígono',
        geoDesc: 'Polígono del área de la zona entre PR inicial y PR final.',
        campos: [
            { nombre: 'IdZonaServicio', desc: 'Código autogenerado al guardar.', oblig: false },
            { nombre: 'UF / Proyecto / Municipio / Departamento', desc: 'Long · Dm*.', oblig: true },
            { nombre: 'Código INVIAS', desc: 'Texto opcional.', oblig: false },
            { nombre: 'Fecha inicio operación', desc: 'Opcional. Vacía al crear; no se precarga desde la jornada.', oblig: false },
            { nombre: 'PR inicial / final + distancias (m)', desc: 'Segmento PR–PR.', oblig: true },
            { nombre: 'Área zona servicio (m²)', desc: 'Área del polígono.', oblig: true },
            { nombre: 'Estado', desc: 'DmEstado (estado general).', oblig: true },
        ],
        tips: [
            'La Tabla 31 no define nombre ni “tipo” de zona en el listado de campos.',
            'Incluya predio completo cuando aplique.',
            'Fecha inicio operación: opcional al crear; no usar la fecha de la jornada como sustituto.',
        ],
        refManual: 'Tabla 31 – Capa ZONA DE SERVICIO',
    },
};

/** Resumen del concepto PRS para mostrar en cualquier contexto */
export const PRS_CONCEPTO = `
**PRS = Punto de Referencia Secundario**

Es el sistema de referenciación lineal del SINC. Combina el número del hito físico más cercano
(poste naranja) con los metros de distancia desde ese poste.

Ejemplo: **PRS 12+350** = a 350 m del hito kilométrico 12.

Se establecen cada ~1 km desde el inicio de la vía.
`;
