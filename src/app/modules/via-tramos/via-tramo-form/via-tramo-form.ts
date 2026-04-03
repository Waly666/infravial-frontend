import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { SenVertService } from '../../../core/services/sen-vert.service';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { ControlSemService } from '../../../core/services/control-sem.service';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { GeoPreviewMapDirective } from '../../../shared/directives/geo-preview-map.directive';

@Component({
    selector: 'app-via-tramo-form',
    standalone: true,
    imports: [CommonModule, FormsModule, GeoPreviewMapDirective],
    templateUrl: './via-tramo-form.html',
    styleUrl: './via-tramo-form.scss'
})
export class ViaTramoFormComponent implements OnInit {

    // Wizard (paso 11 = inventario vinculado, solo edición)
    pasoActual  = 1;
    modoEdicion = false;
    idEdicion:  string | null = null;
    loading     = false;
    error       = '';
    apiUrl      = environment.apiUrl;
    esquemaSeleccionado: any = null;
    /** Galería de esquemas (mismo patrón que señales V/H) */
    mostrarGaleriaEsquema = false;
    filtroEsquemaGaleria  = '';

    // Mapa
    mapaAbierto = false;
    marcadores:  any[] = [];
    leafletMap:  any   = null;
    mapaRef:     any   = null;
    lineaRef:    any   = null;

    // Fotos
    fotosPreview:  any[]   = [];
    fotosArchivos: File[]  = [];

    // Pendiente
    pendienteBase:   number = 0;
    pendienteAltura: number = 0;

    // Jornada activa
    jornada: any = null;

    /** Paso 11: registros del inventario ligados a este tramo (solo lectura). */
    relLoading = false;
    relError = '';
    semaforosRel: any[] = [];
    controlSemRel: any = null;
    cajasRel: any[] = [];
    senVertRel: any[] = [];
    senHorRel: any[] = [];

    // Catálogos
    zats:      any[] = [];
    comunas:   any[] = [];
    barrios:   any[] = [];
    esquemas:  any[] = [];
    obsVias:   any[] = [];
    preguntas: any[] = [];

    // Formulario
    form: any = {
        idJornada:     '',
        fechaInv:      '',
        municipio:     '',
        departamento:  '',
        supervisor:    '',
        localidad:     '',
        tipoLocalidad: '',

        ubicacion:  { type: 'LineString', coordinates: [] },
        lat_inicio: null,
        lng_inicio: null,
        lat_fin:    null,
        lng_fin:    null,
        longitud_m: 0,
        altitud:    null,

        via:          '',
        tipoUbic:     '',
        calzada:      '',
        tipoVia:      '',
        sector:       '',
        zona:         '',
        claseVia:     '',
        nomenclatura: {
            tipoVia1: '', numero1: '', conector: '',
            tipoVia2: '', numero2: '', conector2: '',
            tipoVia3: '', numero3: '', completa: ''
        },

        entidadVia:      '',
        respVia:         '',
        encuestador:     '',
        zat:             '',
        comuna:          '',
        barrio:          '',
        ubiCicloRuta:    '',
        sentidoCardinal: '',
        carriles:        null,
        perfilEsquema:   '',

        anteJardinIzq: 0, andenIzq: 0, zonaVerdeIzq: 0,
        areaServIzq: 0, sardIzqCalzA: 0, cicloRutaIzq: 0,
        bahiaEstIzq: 0, sardDerCalzA: 0, cunetaIzq: 0,
        bermaIzq: 0, calzadaIzq: 0,
        anteJardinDer: 0, andenDer: 0, zonaVerdeDer: 0,
        areaServDer: 0, sardDerCalzB: 0, cicloRutaDer: 0,
        bahiaEstDer: 0, sardIzqCalzB: 0, cunetaDer: 0,
        bermaDer: 0, calzadaDer: 0,
        separadorZonaVerdeIzq: 0, separadorPeatonal: 0,
        separadorCicloRuta: 0, separadorZonaVerdeDer: 0,
        anchoTotalPerfil: 0,
        pendiente: 0,

        clasPorCompetencia:   '',
        clasPorFuncionalidad: '',
        clasNacional:         '',
        clasPrelacion:        '',
        clasMunPbot:          '',

        disenioGeometrico:  '',
        inclinacionVia:     '',
        sentidoVial:        '',
        capaRodadura:       '',
        estadoVia:          '',
        estadoVia2:         [],
        condicionesVia:     '',
        iluminacArtificial: false,
        estadoIluminacion:  '',
        visibilidad:        '',
        visDisminuida:      '',

        danos: [
            { dano: '', clase: '', tipo: '' },
            { dano: '', clase: '', tipo: '' },
            { dano: '', clase: '', tipo: '' },
            { dano: '', clase: '', tipo: '' },
            { dano: '', clase: '', tipo: '' }
        ],

        respuestas: [],
        fotos: [],
        obs1: '', obs2: '', obs3: '',
        obs4: '', obs5: '', obs6: '',
        notas: ''
    };

    // Enumeraciones
    tiposLocalidad         = ['Cabecera Municipal', 'Corregimiento', 'Inspección', 'Centro Poblado'];
    /** Campo BD: tipoUbic — etiqueta en formulario: "Diseño" */
    tiposUbic = [
        'Glorieta',
        'Interseccion',
        'Paso A Nivel',
        'Ponton',
        'Cicloruta',
        'Paso elevado',
        'Paso Inferior',
        'Peatonal',
        'Puente',
        'Tramo de Via',
        'Tunel'
    ];
    tiposVia               = ['Urbana', 'Rural'];
    sectoresVia            = ['Residencial', 'Industrial', 'Comercial'];
    zonasVia               = ['Escolar', 'Deportiva', 'Turística', 'Privada', 'Militar', 'Hospitalaria'];
    /** Valores nuevos; legado para tramos ya guardados */
    sentidosVialNuevos     = ['Un sentido', 'Doble Sentido', 'Reversible', 'Contraflujo', 'Ciclo vía'];
    sentidosVialLegado     = ['Unidireccional', 'Bidireccional', 'Sin_Definir'];
    clasesVia              = ['Autopista', 'Via rural sin separador', 'Via rural con separador', 'Via convencional urbana sin separador', 'Via convencional urbana con separador', 'Via Urbana peatonal', 'Fuera de clasificacion'];

    /** Tramos con sentido vial distinto a listas (histórico / texto libre) */
    sentidoVialFueraLista(): boolean {
        const v = this.form?.sentidoVial;
        if (v == null || v === '') return false;
        const all = [...this.sentidosVialNuevos, ...this.sentidosVialLegado];
        return !all.includes(v);
    }
    tiposNomenclatura      = ['Calle', 'Carrera', 'Diagonal', 'Transversal', 'Avenida', 'Manzana', 'Sin_Nomenclatura'];
    conectores             = ['con', 'entre'];
    ubiCicloRutas          = ['En el separador', 'En la calzada', 'Al lado del Anden', 'N/A'];
    capaRodaduras          = ['Asfalto', 'Afirmado', 'Adoquin', 'Empedrado', 'Concreto Rigido', 'Tierra', 'Vegetación', 'Gravilla', 'Otro'];
    estadosVia             = ['Bueno', 'Regular', 'Malo'];
    estadosVia2            = ['Con huecos', 'Derrumbe', 'En reparación', 'Hundimiento', 'Inundada', 'Parchada', 'Rizada', 'Fisurada'];
    condicionesVia         = ['Aceite', 'Húmeda', 'Lodo', 'Alcantarilla destapada', 'Material organico', 'Material suelto', 'Seca', 'Otra'];
    visDisminuidas         = ['Caseta', 'Construccion', 'Vallas', 'Árbol', 'Vegetación', 'Vehículos Estacionados', 'Poste', 'Otro'];
    danosOpciones          = ['Perdida De Agregado En Tratamiento Superficial', 'Descascaramiento (Peladuras)', 'Ojo De Pescado', 'Exudacion De Asfalto', 'Pulimento (Agregado)', 'Cabeza Dura', 'Baches Profundos', 'Ondulaciones', 'Grieta Longitudinal', 'Grieta Transversal', 'Falla De Bloque', 'Piel de cocodrilo'];
    clasesDano             = ['Deterioro Superficie', 'Deterioro Estructura'];
    tiposDano              = ['Desprendimiento', 'Alisamiento', 'Exposicion de agregados', 'Deformaciones', 'Agrietamientos'];
    clasPorCompetencias    = ['Carreteras Nacionales', 'Carreteras departamentales - Red de segundo orden', 'Carreteras veredales o caminos vecinales - Red Terciaria', 'Carreteras distritales y municipales'];
    clasPorFuncionalidades = ['Primarias', 'Secundarias', 'Terciarias'];

    constructor(
        private viaTramoService: ViaTramoService,
        private jornadaService:  JornadaService,
        private catalogoService: CatalogoService,
        private authService:     AuthService,
        private semaforoService: SemaforoService,
        private senVertService:  SenVertService,
        private senHorService:   SenHorService,
        private cajaInspService: CajaInspService,
        private controlSemService: ControlSemService,
        private api:             ApiService,
        private route:           ActivatedRoute,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.idEdicion   = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!this.idEdicion;
        this.loadJornada();
        this.loadCatalogos();
        if (this.modoEdicion) {
            setTimeout(() => this.loadTramo(), 800);
        }
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada            = res.jornada;
                this.form.idJornada     = res.jornada._id;
                this.form.fechaInv      = res.jornada.fechaJornada;
                this.form.municipio     = res.jornada.municipio;
                this.form.departamento  = res.jornada.dpto;
                this.form.supervisor    = res.jornada.supervisor;
                this.form.localidad     = res.jornada.localidad;
                this.form.tipoLocalidad = res.jornada.tipoLocalidad;
            },
            error: () => this.jornada = null
        });
    }

    loadCatalogos() {
        const filtroMun = this.jornada ? { munDivipol: this.jornada.codMunicipio } : {};
        this.catalogoService.getZats(filtroMun).subscribe({ next: r => this.zats = r.datos });
        this.catalogoService.getComunas(filtroMun).subscribe({ next: r => this.comunas = r.datos });
        this.catalogoService.getBarrios(filtroMun).subscribe({ next: r => this.barrios = r.datos });
        this.catalogoService.getEsquemasPerfil().subscribe({ next: r => this.esquemas = r.datos });
        this.catalogoService.getObsVias().subscribe({ next: r => this.obsVias = r.datos });
        this.api.get<any>('/catalogos/preguntas-enc').subscribe({
            next: r => {
                this.preguntas = r.datos;
                this.form.respuestas = this.preguntas.map((p: any) => ({
                    idPregunta:  p._id,
                    consecutivo: p.consecutivo,
                    valorRta:    ''
                }));
            }
        });
    }

    loadTramo() {
        this.viaTramoService.getById(this.idEdicion!).subscribe({
            next: (res) => {
                const t = res.tramo;
                this.form = { ...this.form, ...t };

                if (t.zat?._id)           this.form.zat          = t.zat._id;
                if (t.comuna?._id)        this.form.comuna        = t.comuna._id;
                if (t.barrio?._id)        this.form.barrio        = t.barrio._id;
                if (t.perfilEsquema?._id) {
                    this.form.perfilEsquema  = t.perfilEsquema._id;
                    this.esquemaSeleccionado = t.perfilEsquema;
                }
                if (t.obs1?._id) this.form.obs1 = t.obs1._id;
                if (t.obs2?._id) this.form.obs2 = t.obs2._id;
                if (t.obs3?._id) this.form.obs3 = t.obs3._id;
                if (t.obs4?._id) this.form.obs4 = t.obs4._id;
                if (t.obs5?._id) this.form.obs5 = t.obs5._id;
                if (t.obs6?._id) this.form.obs6 = t.obs6._id;

                if (t.ubicacion?.coordinates?.length === 2) {
                    this.form.lat_inicio = t.ubicacion.coordinates[0][1];
                    this.form.lng_inicio = t.ubicacion.coordinates[0][0];
                    this.form.lat_fin    = t.ubicacion.coordinates[1][1];
                    this.form.lng_fin    = t.ubicacion.coordinates[1][0];
                }
                // Asegurar que danos tenga al menos 5 elementos
                if (!this.form.danos || this.form.danos.length === 0) {
                    this.form.danos = [
                        { dano: '', clase: '', tipo: '' },
                        { dano: '', clase: '', tipo: '' },
                        { dano: '', clase: '', tipo: '' },
                        { dano: '', clase: '', tipo: '' },
                        { dano: '', clase: '', tipo: '' }
                    ];
                } else {
                    // Completar hasta 5 si hay menos
                    while (this.form.danos.length < 5) {
                        this.form.danos.push({ dano: '', clase: '', tipo: '' });
                    }
                }

                // Cargar respuestas encuesta
                this.api.get<any>(`/encuesta-vial/tramo/${t._id}`).subscribe({
                    next: (resp) => {
                        const respuestas = resp.respuestas || [];
                        const cargarRespuestas = () => {
                            if (this.preguntas.length > 0) {
                                this.form.respuestas = this.preguntas.map((p: any) => {
                                    const r = respuestas.find((r: any) =>
                                        r.idPregunta?._id === p._id || r.idPregunta === p._id
                                    );
                                    return {
                                        idPregunta:  p._id,
                                        consecutivo: p.consecutivo,
                                        valorRta:    r?.valorRta || ''
                                    };
                                });
                            } else {
                                setTimeout(cargarRespuestas, 300);
                            }
                        };
                        cargarRespuestas();
                    }
                });

                this.loadRelacionados();
            }
        });
    }

    /** Carga semáforos, control del tramo, cajas, señales V/H para el paso 11. */
    loadRelacionados() {
        if (!this.idEdicion) return;
        const id = this.idEdicion;
        this.relLoading = true;
        this.relError = '';
        forkJoin({
            semaforos: this.semaforoService.getAll({ idViaTramo: id }).pipe(catchError(() => of({ registros: [] }))),
            controlSem: this.controlSemService.getByTramo(id).pipe(catchError(() => of({ registro: null }))),
            cajas: this.cajaInspService.getAll({ idViaTramo: id }).pipe(catchError(() => of({ registros: [] }))),
            senVert: this.senVertService.getAll({ idViaTramo: id }).pipe(catchError(() => of({ registros: [] }))),
            senHor: this.senHorService.getAll({ idViaTramo: id }).pipe(catchError(() => of({ registros: [] })))
        })
            .pipe(finalize(() => (this.relLoading = false)))
            .subscribe({
                next: (r) => {
                    this.semaforosRel = r.semaforos?.registros ?? [];
                    this.controlSemRel = r.controlSem?.registro ?? null;
                    this.cajasRel = r.cajas?.registros ?? [];
                    this.senVertRel = r.senVert?.registros ?? [];
                    this.senHorRel = r.senHor?.registros ?? [];
                },
                error: () => {
                    this.relError = 'No se pudo cargar el inventario vinculado.';
                }
            });
    }

    // ── WIZARD ────────────────────────────────────
    get totalPasos(): number {
        return this.modoEdicion ? 11 : 10;
    }

    /** Texto corto por paso; en la barra se muestra como «1. Datos jornada», etc. */
    get pasosWizard(): { n: number; label: string }[] {
        const pasos: { n: number; label: string }[] = [
            { n: 1, label: 'Datos jornada' },
            { n: 2, label: 'Georreferenciación' },
            { n: 3, label: 'Identificación vía' },
            { n: 4, label: 'Datos generales' },
            { n: 5, label: 'Medidas perfil' },
            { n: 6, label: 'Clasificación vial' },
            { n: 7, label: 'Características vía' },
            { n: 8, label: 'Daños rodadura' },
            { n: 9, label: 'Encuesta seguridad vial' },
            { n: 10, label: 'Fotos y observaciones' }
        ];
        if (this.modoEdicion) {
            pasos.push({ n: 11, label: 'Inventario vinculado' });
        }
        return pasos;
    }

    get progreso(): number { return (this.pasoActual / this.totalPasos) * 100; }
    siguiente() { if (this.pasoActual < this.totalPasos) this.pasoActual++; }
    anterior()  { if (this.pasoActual > 1) this.pasoActual--; }
    /** Evita que *ngFor destruya/recreé los botones en cada CD (el getter devuelve array nuevo). */
    trackWizardPaso(_index: number, p: { n: number; label: string }): number {
        return p.n;
    }

    irAPaso(n: number) {
        if (n === 11 && !this.modoEdicion) return;
        this.pasoActual = n;
    }

    irEditarSemaforo(id: string) {
        this.router.navigate(['/semaforos/editar', id]);
    }
    irEditarControlSem(id: string) {
        this.router.navigate(['/control-semaforo/editar', id]);
    }
    irEditarCaja(id: string) {
        this.router.navigate(['/cajas-inspeccion/editar', id]);
    }
    irEditarSenVert(id: string) {
        this.router.navigate(['/sen-verticales/editar', id]);
    }
    irEditarSenHor(id: string) {
        this.router.navigate(['/sen-horizontales/editar', id]);
    }

    // ── NOMENCLATURA ──────────────────────────────
    actualizarNomenclatura() {
    const n = this.form.nomenclatura;
    let completa = '';
    if (n.tipoVia1 && n.numero1) completa += `${n.tipoVia1} ${n.numero1}`;
    if (n.conector)              completa += ` ${n.conector} `;
    if (n.tipoVia2 && n.numero2) completa += `${n.tipoVia2} ${n.numero2}`;
    if (n.conector2)             completa += ` ${n.conector2} `;
    if (n.tipoVia3 && n.numero3) completa += `${n.tipoVia3} ${n.numero3}`;
    n.completa = completa.trim();

    // ← Auto-completar campo "via" con tipoVia1 + numero1
    if (n.tipoVia1 && n.numero1) {
        this.form.via = `${n.tipoVia1} ${n.numero1}`;
    }
}

    onTipoVia1Change() {
        const tipo = this.form.nomenclatura.tipoVia1;
        if (tipo === 'Calle' || tipo === 'Diagonal') {
            this.form.sentidoCardinal = 'Oriente - Occidente';
        } else if (tipo === 'Carrera' || tipo === 'Transversal') {
            this.form.sentidoCardinal = 'Norte - Sur';
        } else {
            this.form.sentidoCardinal = '';
        }
        this.actualizarNomenclatura();
    }

    // ── MEDIDAS ───────────────────────────────────
    get mostrarCalzadaDer(): boolean {
        return this.form.calzada === 'Dos' || this.form.calzada === 'Tres';
    }

    get mostrarSeparador(): boolean {
        return this.form.calzada === 'Dos' || this.form.calzada === 'Tres';
    }

    get esquemasFiltrados(): any[] {
        if (!this.form.calzada) return this.esquemas;
        return this.esquemas.filter(e => e.calzada === this.form.calzada);
    }

    calcularAncho() {
        const f = this.form;
        const total =
            (f.andenIzq            || 0) + (f.zonaVerdeIzq       || 0) +
            (f.anteJardinIzq       || 0) + (f.sardIzqCalzA       || 0) +
            (f.cicloRutaIzq        || 0) + (f.areaServIzq        || 0) +
            (f.bahiaEstIzq         || 0) + (f.sardDerCalzA       || 0) +
            (f.cunetaIzq           || 0) + (f.bermaIzq           || 0) +
            (f.calzadaIzq          || 0) + (f.andenDer           || 0) +
            (f.zonaVerdeDer        || 0) + (f.anteJardinDer      || 0) +
            (f.sardIzqCalzB        || 0) + (f.cicloRutaDer       || 0) +
            (f.areaServDer         || 0) + (f.bahiaEstDer        || 0) +
            (f.sardDerCalzB        || 0) + (f.cunetaDer          || 0) +
            (f.bermaDer            || 0) + (f.calzadaDer         || 0) +
            (f.separadorPeatonal   || 0) + (f.separadorZonaVerdeIzq || 0) +
            (f.separadorCicloRuta  || 0) + (f.separadorZonaVerdeDer || 0);

        this.form.anchoTotalPerfil = Math.round(total * 100) / 100;
        this.calcularClasificacion();
    }

    calcularClasificacion() {
        const ancho = this.form.anchoTotalPerfil;
        if      (ancho >= 60) this.form.clasNacional = 'V1';
        else if (ancho > 45)  this.form.clasNacional = 'V2';
        else if (ancho > 30)  this.form.clasNacional = 'V3';
        else if (ancho > 25)  this.form.clasNacional = 'V4';
        else if (ancho > 18)  this.form.clasNacional = 'V5';
        else if (ancho > 16)  this.form.clasNacional = 'V6';
        else if (ancho > 13)  this.form.clasNacional = 'V7';
        else if (ancho > 10)  this.form.clasNacional = 'V8';
        else                  this.form.clasNacional = 'V9';

        if (this.form.tipoVia === 'Urbana') {
            if      (ancho >= 30) this.form.clasPrelacion = 'Autopistas';
            else if (ancho >= 26) this.form.clasPrelacion = 'Arterias';
            else if (ancho >= 20) this.form.clasPrelacion = 'Principales';
            else if (ancho >= 17) this.form.clasPrelacion = 'Secundarias';
            else if (ancho > 12)  this.form.clasPrelacion = 'Ordinarias';
            else if (ancho > 8)   this.form.clasPrelacion = 'Ciclorutas';
            else                  this.form.clasPrelacion = 'Peatonales';
        } else if (this.form.tipoVia === 'Rural') {
            if      (ancho >= 30) this.form.clasPrelacion = 'Autopistas';
            else if (ancho >= 26) this.form.clasPrelacion = 'Carreteras principales';
            else if (ancho >= 20) this.form.clasPrelacion = 'Carreteras secundarias';
            else if (ancho >= 17) this.form.clasPrelacion = 'Carreteables';
            else if (ancho > 12)  this.form.clasPrelacion = 'Privadas';
            else                  this.form.clasPrelacion = 'Peatonales';
        }
    }

    onCalzadaChange() {
        if (this.form.calzada === 'Una') {
            ['anteJardinDer','andenDer','zonaVerdeDer','areaServDer','sardDerCalzB',
             'cicloRutaDer','bahiaEstDer','sardIzqCalzB','cunetaDer','bermaDer','calzadaDer',
             'separadorZonaVerdeIzq','separadorPeatonal','separadorCicloRuta','separadorZonaVerdeDer'
            ].forEach(c => this.form[c] = 0);
        }
        this.form.perfilEsquema  = '';
        this.esquemaSeleccionado = null;
        this.calcularAncho();
    }

    toggleEstadoVia2(val: string) {
        const idx = this.form.estadoVia2.indexOf(val);
        if (idx === -1) this.form.estadoVia2.push(val);
        else            this.form.estadoVia2.splice(idx, 1);
    }

    isEstadoVia2Selected(val: string): boolean {
        return this.form.estadoVia2.includes(val);
    }

    // ── GUARDAR ───────────────────────────────────
    guardar() {
        if (!this.form.idJornada) {
            this.error = 'No hay jornada activa';
            return;
        }

        this.loading = true;
        this.error   = '';

        // Coordenadas GeoJSON
        if (this.form.lat_inicio && this.form.lng_inicio &&
            this.form.lat_fin    && this.form.lng_fin) {
            this.form.ubicacion = {
                type: 'LineString',
                coordinates: [
                    [parseFloat(this.form.lng_inicio), parseFloat(this.form.lat_inicio)],
                    [parseFloat(this.form.lng_fin),    parseFloat(this.form.lat_fin)]
                ]
            };
        }

        // Encuestador
        const usuario = this.authService.getUsuario();
        this.form.encuestador = `${usuario?.nombres} ${usuario?.apellidos}`.trim();

        // Convertir objetos a IDs
        ['zat','comuna','barrio','perfilEsquema'].forEach(campo => {
            if (this.form[campo] && typeof this.form[campo] === 'object') {
                this.form[campo] = this.form[campo]._id;
            }
        });

        // Limpiar ObjectIds vacíos
        ['obs1','obs2','obs3','obs4','obs5','obs6',
         'zat','comuna','barrio','perfilEsquema'].forEach(campo => {
            if (this.form[campo] === '' || this.form[campo] === undefined) {
                this.form[campo] = null;
            }
        });

        // Filtrar daños vacíos
        this.form.danos = this.form.danos.filter((d: any) => d.dano);

        // Guardar respuestas por separado
        const respuestas = [...(this.form.respuestas || [])];
        const jsonStr = JSON.stringify(this.form);
        console.log('TAMAÑO PAYLOAD:', jsonStr.length, 'bytes');
        console.log('FORM KEYS:', Object.keys(this.form));
        Object.keys(this.form).forEach(k => {

        const size = JSON.stringify(this.form[k])?.length || 0;
            if (size > 1000) console.log(`CAMPO PESADO: ${k} = ${size} bytes`);
        });
        // Eliminar campos pesados que maneja el backend
        delete this.form.logUltimaMod;
        delete this.form.fotos;
        

        delete this.form.respuestas;
        delete this.form.fotos;  // ← aquí

        const obs$ = this.modoEdicion
            ? this.viaTramoService.update(this.idEdicion!, this.form)
            : this.viaTramoService.create(this.form);

        obs$.subscribe({
            next: (res: any) => {
                console.log('RESPUESTA GUARDAR:', res);
                const idTramo = res.tramo._id;
                console.log('ID TRAMO:', idTramo);

                // Guardar encuesta
                const respuestasValidas = respuestas.filter((r: any) => r.valorRta);
                if (respuestasValidas.length > 0) {
                    this.api.post('/encuesta-vial', {
                        idTramoVia: idTramo,
                        respuestas: respuestasValidas
                    }).subscribe({
                        next: () => console.log('Encuesta guardada'),
                        error: (err) => console.error('Error encuesta:', err)
                    });
                }

                // Subir fotos
                // Subir fotos por separado como FormData
               if (this.fotosArchivos.length > 0) {
                    const fd = new FormData();
                    this.fotosArchivos.forEach((file: File) => {
                        fd.append('foto', file);
                    });
                    this.api.uploadFile<any>(`/upload/via-tramo`, fd).subscribe({
                        next: (r: any) => {
                            console.log('RESPUESTA FOTOS:', r);
                            this.api.put(`/via-tramos/${idTramo}`, { fotos: r.urls }).subscribe({
                                next: (res) => console.log('FOTOS GUARDADAS EN TRAMO:', res),
                                error: (err) => console.error('Error guardando URLs:', err)
                            });
                        },
                        error: (err) => console.error('Error fotos:', err)
                    });
}

                this.loading = false;
                this.router.navigate(['/via-tramos']);
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al guardar';
            }
        });
    }

    // ── ESQUEMA ───────────────────────────────────
    onEsquemaChange() {
        this.esquemaSeleccionado = this.esquemas.find(e => e._id === this.form.perfilEsquema) || null;
    }

    get esquemasGaleriaFiltrados(): any[] {
        const base = this.esquemasFiltrados;
        const q = (this.filtroEsquemaGaleria || '').trim().toLowerCase();
        if (!q) return base;
        return base.filter(
            (e) =>
                String(e.codEsquema ?? '')
                    .toLowerCase()
                    .includes(q) ||
                String(e.calzada ?? '')
                    .toLowerCase()
                    .includes(q)
        );
    }

    seleccionarEsquemaDesdeGaleria(e: any) {
        this.form.perfilEsquema = e._id;
        this.esquemaSeleccionado = e;
        this.mostrarGaleriaEsquema = false;
        this.filtroEsquemaGaleria = '';
    }

    esquemaGaleriaSeleccionId(e: any): boolean {
        return e && String(this.form.perfilEsquema || '') === String(e._id || '');
    }

    getEsquemaImgUrl(): string {
        if (!this.esquemaSeleccionado?.urlImgEsq) return '';
        return `${this.apiUrl}${this.esquemaSeleccionado.urlImgEsq}`;
    }

    getEsquemaImgUrlItem(e: any): string {
        if (!e?.urlImgEsq) return '';
        return `${this.apiUrl}${e.urlImgEsq}`;
    }

    // ── MAPA ──────────────────────────────────────
    async abrirMapa() {
        this.mapaAbierto = true;
        setTimeout(() => this.iniciarMapa(), 200);
    }

    cerrarMapa() {
        this.mapaAbierto = false;
        if (this.leafletMap) {
            this.leafletMap.remove();
            this.leafletMap = null;
        }
    }

    async iniciarMapa() {
        const L = (window as any).L;
        let lat = 4.6097, lng = -74.0817;
        try {
            const municipio = this.jornada?.municipio || '';
            const depto     = this.jornada?.dpto || '';
            const url       = `https://nominatim.openstreetmap.org/search?q=${municipio},${depto},Colombia&format=json&limit=1`;
            const res       = await fetch(url);
            const data      = await res.json();
            if (data.length > 0) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            }
        } catch(e) {}

        this.leafletMap = L.map('leaflet-map').setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        if (this.form.lat_inicio && this.form.lng_inicio)
            this.agregarMarcador(L, this.form.lat_inicio, this.form.lng_inicio, 'inicio');
        if (this.form.lat_fin && this.form.lng_fin)
            this.agregarMarcador(L, this.form.lat_fin, this.form.lng_fin, 'fin');
        if (this.form.lat_inicio && this.form.lat_fin)
            this.dibujarLinea(L);

        let clicks = (this.form.lat_inicio && this.form.lat_fin) ? 2 :
                      this.form.lat_inicio ? 1 : 0;

        this.leafletMap.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            if (clicks === 0 || clicks === 2) {
                this.marcadores.forEach((m: any) => this.leafletMap.removeLayer(m));
                this.marcadores = [];
                if (this.lineaRef) this.leafletMap.removeLayer(this.lineaRef);
                this.form.lat_inicio = null;
                this.form.lng_inicio = null;
                this.form.lat_fin    = null;
                this.form.lng_fin    = null;
                clicks = 0;
            }
            if (clicks === 0) {
                this.form.lat_inicio = lat;
                this.form.lng_inicio = lng;
                this.agregarMarcador(L, lat, lng, 'inicio');
                clicks = 1;
            } else if (clicks === 1) {
                this.form.lat_fin = lat;
                this.form.lng_fin = lng;
                this.agregarMarcador(L, lat, lng, 'fin');
                this.dibujarLinea(L);
                this.calcularDistancia();
                clicks = 2;
            }
        });
    }

    agregarMarcador(L: any, lat: number, lng: number, tipo: string) {
        const color = tipo === 'inicio' ? '#4caf82' : '#e05c5c';
        const label = tipo === 'inicio' ? 'A' : 'B';
        const icon  = L.divIcon({
            html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${label}</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14], className: ''
        });
        const marker = L.marker([lat, lng], { icon }).addTo(this.leafletMap);
        marker.bindPopup(`<b>${tipo === 'inicio' ? 'Inicio' : 'Fin'}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
        this.marcadores.push(marker);
    }

    dibujarLinea(L: any) {
        if (this.lineaRef) this.leafletMap.removeLayer(this.lineaRef);
        this.lineaRef = L.polyline([
            [this.form.lat_inicio, this.form.lng_inicio],
            [this.form.lat_fin,    this.form.lng_fin]
        ], { color: '#4a9eff', weight: 4, opacity: 0.8 }).addTo(this.leafletMap);
    }

    calcularDistancia() {
        const R    = 6371000;
        const lat1 = this.form.lat_inicio * Math.PI / 180;
        const lat2 = this.form.lat_fin    * Math.PI / 180;
        const dLat = (this.form.lat_fin - this.form.lat_inicio) * Math.PI / 180;
        const dLng = (this.form.lng_fin - this.form.lng_inicio) * Math.PI / 180;
        const a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1) * Math.cos(lat2) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
        const c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        this.form.longitud_m = Math.round(R * c);
    }

    calcularPendiente() {
        if (this.pendienteBase > 0) {
            this.form.pendiente = Math.round((this.pendienteAltura / this.pendienteBase) * 100 * 100) / 100;
        } else {
            this.form.pendiente = 0;
        }
    }

    // ── FOTOS ─────────────────────────────────────
    onFotosSeleccionadas(event: any) {
        const files = Array.from(event.target.files) as File[];
        files.forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.fotosPreview.push({ url: e.target.result, nombre: file.name });
            };
            reader.readAsDataURL(file);
            this.fotosArchivos.push(file);
        });
    }

    removeFoto(index: number) {
        this.fotosPreview.splice(index, 1);
        this.fotosArchivos.splice(index, 1);
    }
}