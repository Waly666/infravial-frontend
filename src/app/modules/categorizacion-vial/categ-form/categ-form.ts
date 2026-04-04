import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategorizacionVialService, CategorizacionVial, ScoringPreview } from '../../../core/services/categorizacion-vial.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { GeoPreviewMapDirective } from '../../../shared/directives/geo-preview-map.directive';

/** yyyy-MM-DD local (input type="date") */
function isoDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Definición de una opción de respuesta para un criterio */
interface Opcion {
    valor: 'A' | 'B' | 'C';
    etiqueta: string;
    descripcion: string;
    orden: number;
}

/** Mapa de opciones por criterio */
const OPCIONES: Record<string, Opcion[]> = {
    funcionalidad: [
        {
            valor: 'A', orden: 1,
            etiqueta: 'Primaria (1er Orden)',
            descripcion: 'Conecta capitales de departamento, grandes centros económicos o hace parte de corredores nacionales / internacionales. Tráfico de largo recorrido.'
        },
        {
            valor: 'B', orden: 2,
            etiqueta: 'Secundaria (2do Orden)',
            descripcion: 'Conecta municipios entre sí o con la capital del departamento. Sirve de acceso a cabeceras municipales importantes. Tráfico regional.'
        },
        {
            valor: 'C', orden: 3,
            etiqueta: 'Terciaria (3er Orden)',
            descripcion: 'Conecta veredas, inspecciones de policía o zonas de producción agrícola con la cabecera municipal o con vías de orden superior. Tráfico local.'
        }
    ],
    tpd: [
        {
            valor: 'A', orden: 1,
            etiqueta: '> 5 000 vehículos / día',
            descripcion: 'Tráfico Promedio Diario (TPD) superior a 5 000 vehículos. Flujo alto.'
        },
        {
            valor: 'B', orden: 2,
            etiqueta: '500 – 5 000 vehículos / día',
            descripcion: 'TPD entre 500 y 5 000 vehículos. Flujo intermedio.'
        },
        {
            valor: 'C', orden: 3,
            etiqueta: '< 500 vehículos / día',
            descripcion: 'TPD inferior a 500 vehículos. Flujo bajo.'
        }
    ],
    disenoGeometrico: [
        {
            valor: 'A', orden: 1,
            etiqueta: 'Estándar alto (≥ 80 km/h)',
            descripcion: 'Calzada pavimentada con 2 o más carriles, curvas de gran radio, velocidad de diseño ≥ 80 km/h. Buenas distancias de visibilidad.'
        },
        {
            valor: 'B', orden: 2,
            etiqueta: 'Estándar intermedio (40 – 80 km/h)',
            descripcion: 'Calzada pavimentada, condiciones de diseño intermedias, velocidad de diseño entre 40 y 80 km/h.'
        },
        {
            valor: 'C', orden: 3,
            etiqueta: 'Estándar básico (< 40 km/h)',
            descripcion: 'Vía sin pavimentar o con diseño geométrico básico, velocidad de diseño inferior a 40 km/h.'
        }
    ],
    poblacion: [
        {
            valor: 'A', orden: 1,
            etiqueta: '> 500 000 habitantes',
            descripcion: 'La vía sirve a municipios o regiones con más de 500 000 habitantes.'
        },
        {
            valor: 'B', orden: 2,
            etiqueta: '25 000 – 500 000 habitantes',
            descripcion: 'La vía sirve a municipios con población entre 25 000 y 500 000 habitantes.'
        },
        {
            valor: 'C', orden: 3,
            etiqueta: '< 25 000 habitantes',
            descripcion: 'La vía sirve a municipios o centros con menos de 25 000 habitantes.'
        }
    ]
};

/** Pesos de cada criterio por opción */
const PESOS: Record<string, Record<string, number>> = {
    funcionalidad:    { A: 40, B: 25, C: 10 },
    tpd:              { A: 20, B: 10, C:  5 },
    disenoGeometrico: { A: 20, B: 10, C:  5 },
    poblacion:        { A: 20, B: 10, C:  5 }
};

const LEAFLET_MAP_ID = 'leaflet-map-categ-vial';

/**
 * Enunciados de la matriz oficial (MinTransporte — documento tipo “MATRIZ CATEGORIZACIÓN”).
 * Referencia para el usuario; la calificación operativa sigue siendo A / B / C según la guía.
 */
export const MATRIZ_OFICIAL_PARTE1_INTRO =
    'A continuación deberá marcar según el conocimiento de la vía con una X según corresponda (ver numeral 5.1 de la guía para realizar la Categorización de la Red Vial Nacional). A continuación, se realizan una serie de preguntas con el fin de clasificar la vía.';

export const MATRIZ_OFICIAL_PARTE1_CONTEXTO =
    'El primer paso para categorizar una vía, es conocer muy bien cuál es la vía que se va a categorizar y verificar si la misma está o no incluida en la Red a cargo de la nación (Consultar la Resolución 339 del INVIAS año 1999 y Decreto 1735 del MT año 2001) lo cual permitirá determinar si forma parte de una troncal o transversal, igualmente se debe verificar si forma parte de la red del Plan Vial Regional de algún departamento. (Ver numeral 3 de la guía para realizar la Categorización de la Red Vial Nacional). Para conexiones entre capitales de departamento con veredas o poblaciones menores, se debe tomar la población menor.';

export const MATRIZ_OFICIAL_PARTE1_ITEMS: string[] = [
    'Calzada sencilla menor o igual a 6,00 m',
    'Calzada sencilla entre 6,01 m y 7,29 m',
    'Calzada sencilla mayor o igual a 7,30 m',
    'Doble calzada',
    'a) ¿Es una vía Troncal o Transversal? (Consultar la Resolución 339 del INVIAS año 1999 y Decreto 1735 del MT año 2001 o los que los modifiquen).',
    'b) El tramo a categorizar forma parte de una vía que conecta dos capitales de departamento.',
    'c) Conecta un paso fronterizo principal (establecido formalmente como tal) con una ciudad capital o una zona de producción o de consumo (*).',
    'd) ¿Conecta una ciudad principal con una zona de producción o de consumo (*) o con algún puerto marítimo o puerto fluvial que genere trasbordo intermodal? (*) De acuerdo con lo definido en el artículo 12 de la Ley 105 de 1993.',
    'e) La vía conecta: 1) Una capital de departamento con una cabecera municipal o 2) Dos o más municipios entre sí o se encuentra incluida dentro de las vías clasificadas en el plan vial regional del departamento. (Consultar el plan vial regional del departamento).',
    'f) La vía realiza interconexión únicamente a nivel veredal o entre la vereda y la capital de departamento o la vereda y una cabecera municipal o la vereda y una vía de primer o segundo orden.'
];

export const MATRIZ_OFICIAL_PARTE3_INTRO =
    'A continuación, usted deberá clasificar por medio de una X, la geometría de la vía (ver numerales 3,2 y 5,3 de la guía para categorización de la Red Vial Nacional).';

export const MATRIZ_OFICIAL_PARTE3_NOTA =
    'En InfraVial, tras valorar el tramo según esa guía, registre abajo una sola opción (A, B o C) que consolide el resultado del criterio de diseño geométrico para efectos de ponderación (20 pts máx.).';

@Component({
    selector: 'app-categ-form',
    standalone: true,
    imports: [CommonModule, FormsModule, GeoPreviewMapDirective],
    templateUrl: './categ-form.html',
    styleUrl: './categ-form.scss'
})
export class CategFormComponent implements OnInit, OnDestroy {

    modoEdicion = false;
    editId: string | null = null;
    guardando  = false;
    errorMsg   = '';

    /** Jornada activa (centro del mapa, como en vía-tramos) */
    jornada: any = null;

    mapaAbierto = false;
    marcadores:  any[] = [];
    leafletMap:  any   = null;
    lineaRef:    any   = null;

    /** Búsqueda incremental DIVIPOL (mismo API que catálogos ZAT/comunas/barrios) */
    busquedaDivipol   = '';
    resultadosDivipol: any[] = [];
    mostrarDivipol    = false;
    buscandoDivipol   = false;
    private divipolSearchTimer: ReturnType<typeof setTimeout> | null = null;

    /** Centro del mapa según municipio + departamento (Nominatim), sin buscar a mano */
    muniCenterLat: number | null = null;
    muniCenterLng: number | null = null;
    readonly muniMapZoom = 13;

    // Formulario
    form: CategorizacionVial = {
        idJornada:        null,
        nombreVia:        '',
        departamento:     '',
        municipio:        '',
        munDivipol:       null,
        deptoDivipol:     null,
        codigoPR:         '',
        longitud_km:      undefined,
        ancho_m:          undefined,
        observaciones:    '',
        lat_inicio:       null,
        lng_inicio:       null,
        lat_fin:          null,
        lng_fin:          null,
        longitud_tramo_m: null,
        fechaClasificacion: isoDateLocal(new Date()),
        nombreFuncionario:  '',
        entidadFuncionario: '',
        funcionalidad:    'A',
        tpd:              'A',
        tpdValor:         undefined,
        disenoGeometrico: 'A',
        poblacion:        'A',
        poblacionValor:   undefined
    };

    /** true si municipio/depto/códigos vienen de una jornada vinculada (no buscar DIVIPOL aparte). */
    get datosTerritorioDesdeJornada(): boolean {
        return !!this.form.idJornada;
    }

    private idJornadaSoloString(): string | null {
        const v = this.form.idJornada as unknown;
        if (v == null || v === '') return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null && '_id' in (v as object)) {
            return String((v as { _id: string })._id);
        }
        return String(v);
    }

    // Scoring en tiempo real (calculado en frontend, igual que en backend)
    scoring: ScoringPreview = {
        ptsPrimerOrden:  0,
        ptsSegundoOrden: 0,
        ptsTercerOrden:  0,
        clasificacion:   'PRIMARIA'
    };

    readonly OPCIONES = OPCIONES;

    readonly matrizParte1Intro     = MATRIZ_OFICIAL_PARTE1_INTRO;
    readonly matrizParte1Contexto = MATRIZ_OFICIAL_PARTE1_CONTEXTO;
    readonly matrizParte1Items    = MATRIZ_OFICIAL_PARTE1_ITEMS;
    readonly matrizParte3Intro    = MATRIZ_OFICIAL_PARTE3_INTRO;
    readonly matrizParte3Nota     = MATRIZ_OFICIAL_PARTE3_NOTA;

    readonly criterios = [
        { key: 'funcionalidad',    label: 'Funcionalidad',       peso: 40, icono: 'route' },
        { key: 'tpd',              label: 'Tráfico Promedio Diario (TPD)', peso: 20, icono: 'directions_car' },
        { key: 'disenoGeometrico', label: 'Diseño Geométrico',   peso: 20, icono: 'straighten' },
        { key: 'poblacion',        label: 'Población',           peso: 20, icono: 'groups' }
    ];

    constructor(
        private svc:    CategorizacionVialService,
        private route:  ActivatedRoute,
        private router: Router,
        private jornadaService: JornadaService,
        private catalogoService: CatalogoService
    ) {}

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!id;
        this.editId      = id;

        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada = res.jornada;
                if (!this.modoEdicion && this.jornada?.municipio) {
                    this.aplicarJornadaComoDivipol();
                }
            },
            error: () => { this.jornada = null; }
        });

        if (id) {
            this.svc.getById(id).subscribe({
                next: (doc) => {
                    const jid = doc.idJornada as unknown;
                    const idNorm =
                        jid != null && typeof jid === 'object' && '_id' in (jid as object)
                            ? String((jid as { _id: string })._id)
                            : jid != null
                              ? String(jid)
                              : null;
                    this.form = { ...this.form, ...doc, idJornada: idNorm };
                    this.normalizarCoordsEnFormulario();
                    this.syncBusquedaDivipolDesdeFormulario();
                    this.actualizarCentroMapaDesdeMunicipio();
                    if (doc.fechaClasificacion) {
                        const fd = new Date(doc.fechaClasificacion);
                        if (!isNaN(fd.getTime())) this.form.fechaClasificacion = isoDateLocal(fd);
                    }
                    this.recalcular();
                },
                error: () => this.router.navigate(['/categorizacion-vial'])
            });
        } else {
            this.recalcular();
        }
    }

    ngOnDestroy(): void {
        if (this.divipolSearchTimer) clearTimeout(this.divipolSearchTimer);
    }

    /** Centra la codificación en la jornada activa (como contexto en vía-tramos). */
    private aplicarJornadaComoDivipol(): void {
        const j = this.jornada;
        if (!j?.municipio) return;
        if (j._id) this.form.idJornada = String(j._id);
        this.form.municipio    = j.municipio;
        this.form.departamento = j.dpto || '';
        this.form.munDivipol   = j.codMunicipio
            ? String(j.codMunicipio).replace(/\D/g, '').padStart(5, '0').slice(-5)
            : null;
        this.form.deptoDivipol = j.codDepto
            ? String(j.codDepto).replace(/\D/g, '').padStart(2, '0').slice(-2)
            : null;
        this.busquedaDivipol = j.dpto ? `${j.municipio} — ${j.dpto}` : j.municipio;
        this.actualizarCentroMapaDesdeMunicipio();
    }

    /** Geocodifica municipio + departamento y centra la vista previa / mapa modal. */
    private actualizarCentroMapaDesdeMunicipio(): void {
        const mun = (this.form.municipio || '').trim();
        const dep = (this.form.departamento || '').trim();
        if (!mun) {
            this.muniCenterLat = this.muniCenterLng = null;
            return;
        }
        const q = encodeURIComponent(dep ? `${mun}, ${dep}, Colombia` : `${mun}, Colombia`);
        fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
            .then((r) => r.json())
            .then((data) => {
                if (data?.length > 0) {
                    this.muniCenterLat = parseFloat(data[0].lat);
                    this.muniCenterLng = parseFloat(data[0].lon);
                } else {
                    this.muniCenterLat = this.muniCenterLng = null;
                }
            })
            .catch(() => {
                this.muniCenterLat = this.muniCenterLng = null;
            });
    }

    private syncBusquedaDivipolDesdeFormulario(): void {
        if (this.form.municipio && this.form.departamento) {
            this.busquedaDivipol = `${this.form.municipio} — ${this.form.departamento}`;
        } else if (this.form.municipio) {
            this.busquedaDivipol = this.form.municipio;
        } else {
            this.busquedaDivipol = '';
        }
    }

    onBusquedaDivipolInput(): void {
        if (this.datosTerritorioDesdeJornada) return;
        const t = this.busquedaDivipol.trim();
        if (t.length === 0) {
            this.limpiarSeleccionDivipol();
            this.mostrarDivipol = false;
            this.resultadosDivipol = [];
            return;
        }
        this.buscarDivipolDebounced();
    }

    private limpiarSeleccionDivipol(): void {
        if (this.datosTerritorioDesdeJornada) return;
        this.form.municipio = '';
        this.form.departamento = '';
        this.form.munDivipol = null;
        this.form.deptoDivipol = null;
        this.muniCenterLat = this.muniCenterLng = null;
    }

    private buscarDivipolDebounced(): void {
        if (this.divipolSearchTimer) clearTimeout(this.divipolSearchTimer);
        if (this.busquedaDivipol.trim().length < 2) {
            this.resultadosDivipol = [];
            this.mostrarDivipol = false;
            return;
        }
        this.divipolSearchTimer = setTimeout(() => {
            this.divipolSearchTimer = null;
            const query = this.busquedaDivipol.trim();
            if (query.length < 2) return;
            this.buscandoDivipol = true;
            this.catalogoService.buscarDivipol(query).subscribe({
                next: (res) => {
                    this.resultadosDivipol = res.datos || [];
                    this.mostrarDivipol = this.resultadosDivipol.length > 0;
                    this.buscandoDivipol = false;
                },
                error: () => { this.buscandoDivipol = false; }
            });
        }, 280);
    }

    seleccionarDivipol(item: any): void {
        this.form.idJornada = null;
        this.form.municipio    = item.divipolMunicipio;
        this.form.departamento = item.divipolDepto;
        this.form.munDivipol   = String(item.divipolMunCod || '').padStart(5, '0').slice(-5);
        this.form.deptoDivipol = String(item.divipolDeptoCod || '').padStart(2, '0').slice(-2);
        this.busquedaDivipol   = `${item.divipolMunicipio} — ${item.divipolDepto}`;
        this.mostrarDivipol    = false;
        this.resultadosDivipol = [];
        this.actualizarCentroMapaDesdeMunicipio();
    }

    /** Tramo con inicio y fin en mapa: la longitud en km debe coincidir con la geodésica. */
    tramoGeorefCompleto(): boolean {
        return (
            this.form.lat_inicio != null &&
            this.form.lng_inicio != null &&
            this.form.lat_fin != null &&
            this.form.lng_fin != null
        );
    }

    /** Asegura null en coords ausentes y recalcula longitud geodésica si hay dos puntos. */
    private normalizarCoordsEnFormulario(): void {
        const n = (v: unknown) => (v !== undefined && v !== null && v !== '' ? Number(v) : null);
        this.form.lat_inicio = n(this.form.lat_inicio) as any;
        this.form.lng_inicio = n(this.form.lng_inicio) as any;
        this.form.lat_fin    = n(this.form.lat_fin) as any;
        this.form.lng_fin    = n(this.form.lng_fin) as any;
        if (
            this.form.lat_inicio != null && this.form.lng_inicio != null &&
            this.form.lat_fin != null && this.form.lng_fin != null
        ) {
            this.calcularDistanciaTramo();
        } else {
            this.form.longitud_tramo_m = null;
        }
    }

    /** Distancia en línea recta A–B solo para mostrar (la vía real suele ser más larga por curvas). */
    longitudGeodesicaKm(): number | null {
        if (this.form.longitud_tramo_m == null) return null;
        return Math.round((this.form.longitud_tramo_m / 1000) * 1000) / 1000;
    }

    private calcularDistanciaTramo(): void {
        if (
            this.form.lat_inicio == null || this.form.lng_inicio == null ||
            this.form.lat_fin == null || this.form.lng_fin == null
        ) {
            this.form.longitud_tramo_m = null;
            return;
        }
        const R = 6371000;
        const lat1 = this.form.lat_inicio * Math.PI / 180;
        const lat2 = this.form.lat_fin * Math.PI / 180;
        const dLat = (this.form.lat_fin - this.form.lat_inicio) * Math.PI / 180;
        const dLng = (this.form.lng_fin - this.form.lng_inicio) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        this.form.longitud_tramo_m = Math.round(R * c);
    }

    // ── Cálculo local (espejo del backend) ──────────────────────────────────
    recalcular(): void {
        const ORDEN_MAP: Record<string, number> = { A: 1, B: 2, C: 3 };
        const pts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

        const crit = ['funcionalidad', 'tpd', 'disenoGeometrico', 'poblacion'] as const;
        crit.forEach(c => {
            const opcion = (this.form as any)[c] as string;
            const orden  = ORDEN_MAP[opcion];
            const puntos = PESOS[c][opcion];
            pts[orden] += puntos;
        });

        const funcOrden = ORDEN_MAP[(this.form.funcionalidad as string)];
        const maxPts    = Math.max(pts[1], pts[2], pts[3]);

        let clasificacion: 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA';
        const NAMES: Record<number, 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA'> = {
            1: 'PRIMARIA', 2: 'SECUNDARIA', 3: 'TERCIARIA'
        };

        const empates = [1, 2, 3].filter(o => pts[o] === maxPts);
        if (empates.length === 1) {
            clasificacion = NAMES[empates[0]];
        } else {
            // Empate → gana funcionalidad si su orden está entre los empatados
            clasificacion = empates.includes(funcOrden) ? NAMES[funcOrden] : NAMES[empates[0]];
        }

        this.scoring = {
            ptsPrimerOrden:  pts[1],
            ptsSegundoOrden: pts[2],
            ptsTercerOrden:  pts[3],
            clasificacion
        };
    }

    onCriterioChange(): void { this.recalcular(); }

    // ── Guardar ─────────────────────────────────────────────────────────────
    guardar(): void {
        if (!this.form.nombreVia || !this.form.departamento || !this.form.municipio) {
            this.errorMsg = 'Nombre de vía, departamento y municipio son obligatorios.';
            return;
        }
        const lk = this.form.longitud_km;
        const km = Number(lk);
        if (lk === null || lk === undefined || Number.isNaN(km) || km <= 0) {
            this.errorMsg = 'Indique la longitud del tramo en km según el eje vial (recorrido real, no solo la línea recta del mapa).';
            return;
        }

        this.guardando = true;
        this.errorMsg  = '';

        const payload: CategorizacionVial = {
            ...this.form,
            idJornada: this.idJornadaSoloString(),
            fechaClasificacion: this.form.fechaClasificacion
                ? new Date(this.form.fechaClasificacion + 'T12:00:00').toISOString()
                : undefined
        };
        if (payload.lat_inicio == null || payload.lng_inicio == null) {
            payload.lat_inicio = payload.lng_inicio = payload.lat_fin = payload.lng_fin = null;
            payload.longitud_tramo_m = null;
        } else if (payload.lat_fin == null || payload.lng_fin == null) {
            payload.lat_fin = payload.lng_fin = null;
            payload.longitud_tramo_m = null;
        }

        const obs = this.modoEdicion && this.editId
            ? this.svc.update(this.editId, payload)
            : this.svc.create(payload);

        obs.subscribe({
            next: () => this.router.navigate(['/categorizacion-vial']),
            error: (err) => {
                this.errorMsg = err?.error?.message || 'Error al guardar.';
                this.guardando = false;
            }
        });
    }

    cancelar(): void { this.router.navigate(['/categorizacion-vial']); }

    descargarMatriz(format: 'xlsx' | 'pdf'): void {
        if (!this.editId) return;
        this.svc.downloadMatrizBlob(this.editId, format).subscribe({
            next: (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const base = (this.form.nombreVia || 'categorizacion')
                    .replace(/[^\w\-+.áéíóúñÁÉÍÚÓÑüÜ ]/g, '')
                    .trim()
                    .slice(0, 48)
                    .replace(/\s+/g, '_');
                a.download = `Matriz_categorizacion_${base}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.errorMsg =
                    'No se pudo generar el documento. Intente de nuevo.';
            }
        });
    }

    // ── Helpers de vista ────────────────────────────────────────────────────
    pctBar(pts: number): number { return Math.min(100, (pts / 100) * 100); }

    badgeClasif(c: string): string {
        if (c === 'PRIMARIA')   return 'badge-primaria';
        if (c === 'SECUNDARIA') return 'badge-secundaria';
        return 'badge-terciaria';
    }

    labelClasif(c: string): string {
        if (c === 'PRIMARIA')   return '1er Orden — Primaria';
        if (c === 'SECUNDARIA') return '2do Orden — Secundaria';
        return '3er Orden — Terciaria';
    }

    opcionSeleccionada(criterio: string): Opcion | undefined {
        const val = (this.form as any)[criterio];
        return OPCIONES[criterio]?.find(o => o.valor === val);
    }

    ptsCriterio(criterio: string): number {
        const val = (this.form as any)[criterio] as string;
        return PESOS[criterio]?.[val] ?? 0;
    }

    // ── Mapa (mismo flujo que vía-tramos) ────────────────────────────────────
    abrirMapa(): void {
        this.mapaAbierto = true;
        setTimeout(() => {
            void this.iniciarMapa();
        }, 200);
    }

    cerrarMapa(): void {
        this.mapaAbierto = false;
        if (this.leafletMap) {
            this.leafletMap.remove();
            this.leafletMap = null;
        }
        this.marcadores = [];
        this.lineaRef = null;
    }

    private async iniciarMapa(): Promise<void> {
        const L = (window as any).L;
        if (!L) return;
        let lat = 4.6097;
        let lng = -74.0817;
        if (this.muniCenterLat != null && this.muniCenterLng != null) {
            lat = this.muniCenterLat;
            lng = this.muniCenterLng;
        } else {
            try {
                const municipio = this.form.municipio || this.jornada?.municipio || '';
                const depto     = this.form.departamento || this.jornada?.dpto || '';
                if (municipio || depto) {
                    const q = encodeURIComponent(`${municipio},${depto},Colombia`);
                    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
                    const res  = await fetch(url);
                    const data = await res.json();
                    if (data.length > 0) {
                        lat = parseFloat(data[0].lat);
                        lng = parseFloat(data[0].lon);
                    }
                }
            } catch { /* centro por defecto */ }
        }

        if (!document.getElementById(LEAFLET_MAP_ID)) return;
        if (this.leafletMap) {
            this.leafletMap.remove();
            this.leafletMap = null;
        }
        this.leafletMap = L.map(LEAFLET_MAP_ID).setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        this.marcadores = [];
        if (this.form.lat_inicio != null && this.form.lng_inicio != null) {
            this.agregarMarcador(L, this.form.lat_inicio, this.form.lng_inicio, 'inicio');
        }
        if (this.form.lat_fin != null && this.form.lng_fin != null) {
            this.agregarMarcador(L, this.form.lat_fin, this.form.lng_fin, 'fin');
        }
        if (
            this.form.lat_inicio != null && this.form.lng_inicio != null &&
            this.form.lat_fin != null && this.form.lng_fin != null
        ) {
            this.dibujarLinea(L);
        }

        let clicks =
            this.form.lat_inicio != null && this.form.lat_fin != null ? 2 :
            this.form.lat_inicio != null ? 1 : 0;

        this.leafletMap.on('click', (e: any) => {
            const { lat: clat, lng: clng } = e.latlng;
            if (clicks === 0 || clicks === 2) {
                this.marcadores.forEach((m: any) => this.leafletMap.removeLayer(m));
                this.marcadores = [];
                if (this.lineaRef) this.leafletMap.removeLayer(this.lineaRef);
                this.lineaRef = null;
                this.form.lat_inicio = this.form.lng_inicio = null;
                this.form.lat_fin = this.form.lng_fin = null;
                this.form.longitud_tramo_m = null;
                clicks = 0;
            }
            if (clicks === 0) {
                this.form.lat_inicio = clat;
                this.form.lng_inicio = clng;
                this.form.longitud_tramo_m = null;
                this.agregarMarcador(L, clat, clng, 'inicio');
                clicks = 1;
            } else if (clicks === 1) {
                this.form.lat_fin = clat;
                this.form.lng_fin = clng;
                this.agregarMarcador(L, clat, clng, 'fin');
                this.dibujarLinea(L);
                this.calcularDistanciaTramo();
                clicks = 2;
            }
        });
    }

    private agregarMarcador(L: any, mlat: number, mlng: number, tipo: string): void {
        const color = tipo === 'inicio' ? '#4caf82' : '#e05c5c';
        const label = tipo === 'inicio' ? 'A' : 'B';
        const icon = L.divIcon({
            html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${label}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            className: ''
        });
        const marker = L.marker([mlat, mlng], { icon }).addTo(this.leafletMap);
        marker
            .bindPopup(
                `<b>${tipo === 'inicio' ? 'Inicio' : 'Fin'}</b><br>Lat: ${mlat.toFixed(6)}<br>Lng: ${mlng.toFixed(6)}`
            )
            .openPopup();
        this.marcadores.push(marker);
    }

    private dibujarLinea(L: any): void {
        if (
            this.form.lat_inicio == null || this.form.lng_inicio == null ||
            this.form.lat_fin == null || this.form.lng_fin == null
        ) {
            return;
        }
        if (this.lineaRef) this.leafletMap.removeLayer(this.lineaRef);
        this.lineaRef = L.polyline(
            [
                [this.form.lat_inicio, this.form.lng_inicio],
                [this.form.lat_fin, this.form.lng_fin]
            ],
            { color: '#4a9eff', weight: 4, opacity: 0.8 }
        ).addTo(this.leafletMap);
    }
}
