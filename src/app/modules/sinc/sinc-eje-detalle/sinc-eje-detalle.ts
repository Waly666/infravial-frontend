import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { SincService } from '../../../core/services/sinc.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { SINC_HELP, HelpEntry } from './sinc-help.data';

declare const L: any;

// ─── Tipos ───────────────────────────────────────────────────────────────────
type BasicoTab = 'fotos' | 'prs' | 'propiedades' | 'puentes' | 'muros' | 'tuneles' | 'sitios' | 'drenaje';
type McTab = 'mcBerma' | 'mcCalzada' | 'mcCco' | 'mcCicloruta' | 'mcCuneta' |
             'mcDefensaVial' | 'mcIts' | 'mcDrenaje' | 'mcPeaje' | 'mcPesaje' |
             'mcLuminaria' | 'mcMuro' | 'mcPuente' | 'mcSenalV' |
             'mcSeparador' | 'mcTunel' | 'mcZona';
type Tab = BasicoTab | McTab;

/** Resultado de validación cliente con nombres de control HTML (`name=`) para foco y resaltado. */
interface SincValidacionError {
    message: string;
    fields: string[];
}

/** Geometría (mapa): no hay `name`; se resuelve a `.form-field-geo` en el panel. */
const SINC_CAMPO_GEO = '__sinc_geo__';
/** Bloque subida de foto en la pestaña activa. */
const SINC_CAMPO_FOTO = '__sinc_foto__';

// Mapa de tab id → slug de URL para la API Mc
const MC_CAPA: Record<McTab, string> = {
    mcBerma:       'mc-berma',
    mcCalzada:     'mc-calzada',
    mcCco:         'mc-cco',
    mcCicloruta:   'mc-cicloruta',
    mcCuneta:      'mc-cuneta',
    mcDefensaVial: 'mc-defensa-vial',
    mcIts:         'mc-dispositivo-its',
    mcDrenaje:     'mc-drenaje',
    mcPeaje:       'mc-estacion-peaje',
    mcPesaje:      'mc-estacion-pesaje',
    mcLuminaria:   'mc-luminaria',
    mcMuro:        'mc-muro',
    mcPuente:      'mc-puente',
    mcSenalV:      'mc-senal-vertical',
    mcSeparador:   'mc-separador',
    mcTunel:       'mc-tunel',
    mcZona:        'mc-zona-servicio'
};

// Tipo de geometría por tab Mc
const MC_GEO: Record<McTab, 'Point' | 'LineString' | 'Polygon'> = {
    mcBerma: 'LineString', mcCalzada: 'Polygon', mcCco: 'Polygon',
    mcCicloruta: 'Polygon', mcCuneta: 'LineString', mcDefensaVial: 'LineString',
    mcIts: 'Point', mcDrenaje: 'LineString', mcPeaje: 'Polygon', mcPesaje: 'Polygon',
    mcLuminaria: 'Point', mcMuro: 'LineString', mcPuente: 'Polygon',
    mcSenalV: 'Point', mcSeparador: 'Polygon', mcTunel: 'Polygon', mcZona: 'Polygon'
};

function isMcTab(tab: Tab): tab is McTab { return tab in MC_CAPA; }

@Component({
    selector: 'app-sinc-eje-detalle',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './sinc-eje-detalle.html',
    styleUrl: './sinc-eje-detalle.scss'
})
export class SincEjeDetalleComponent implements OnInit {
    /** Código de poste PR (compuesto); alineado con backend maxlength 40 */
    private static readonly SINC_PR_MAX_LEN = 40;

    idEje = '';
    eje:    any = null;
    /** Primer segmento de propiedades (nivel básico): NUMCARR y TIPOSUPERF → Mc SV. */
    propSnippetMcSv: { numCarr: number | null; tipoSuperfLabel: string } = { numCarr: null, tipoSuperfLabel: '' };
    resumen: any = {};
    loading = true;
    error   = '';
    apiUrl  = environment.apiUrl;

    tabActiva: Tab = 'fotos';
    seccion: 'basico' | 'mc' = 'basico';

    readonly tabsBasico: { id: Tab; label: string; icon: string; color: string }[] = [
        { id: 'fotos',       label: 'Fotos',           icon: 'photo_camera',         color: '#29b6f6' },
        { id: 'prs',         label: 'PRS',             icon: 'pin_drop',             color: '#26c6da' },
        { id: 'propiedades', label: 'Propiedades',     icon: 'layers',               color: '#26a69a' },
        { id: 'puentes',     label: 'Puentes',         icon: 'fort',                 color: '#42a5f5' },
        { id: 'muros',       label: 'Muros',           icon: 'bento',                color: '#7986cb' },
        { id: 'tuneles',     label: 'Túneles',         icon: 'ev_shadow',            color: '#90a4ae' },
        { id: 'sitios',      label: 'Sitios Críticos', icon: 'warning',              color: '#ffa726' },
        { id: 'drenaje',     label: 'Drenaje',         icon: 'water_drop',           color: '#66bb6a' }
    ];

    readonly tabsDetallado: { id: Tab; label: string; icon: string; color: string }[] = [
        { id: 'mcBerma',       label: 'Berma',          icon: 'remove',                color: '#ef9a9a' },
        { id: 'mcCalzada',     label: 'Calzada',        icon: 'road',                  color: '#ffb74d' },
        { id: 'mcCco',         label: 'CCO',            icon: 'control_camera',        color: '#ffd54f' },
        { id: 'mcCicloruta',   label: 'Cicloruta',      icon: 'directions_bike',       color: '#a5d6a7' },
        { id: 'mcCuneta',      label: 'Cuneta',         icon: 'water',                 color: '#80deea' },
        { id: 'mcDefensaVial', label: 'Defensa Vial',   icon: 'safety_divider',        color: '#ef5350' },
        { id: 'mcIts',         label: 'Disp. ITS',      icon: 'settings_remote',       color: '#26c6da' },
        { id: 'mcDrenaje',     label: 'Drenaje Mc',     icon: 'water_drop',            color: '#66bb6a' },
        { id: 'mcPeaje',       label: 'Est. Peaje',     icon: 'toll',                  color: '#ba68c8' },
        { id: 'mcPesaje',      label: 'Est. Pesaje',    icon: 'scale',                 color: '#9575cd' },
        { id: 'mcLuminaria',   label: 'Luminaria',      icon: 'lightbulb',             color: '#fff176' },
        { id: 'mcMuro',        label: 'Muro Mc',        icon: 'bento',                 color: '#7986cb' },
        { id: 'mcPuente',      label: 'Puente Mc',      icon: 'fort',                  color: '#42a5f5' },
        { id: 'mcSenalV',      label: 'Señal Vertical', icon: 'signpost',              color: '#a5d6a7' },
        { id: 'mcSeparador',   label: 'Separador',      icon: 'vertical_align_center', color: '#f48fb1' },
        { id: 'mcTunel',       label: 'Túnel Mc',       icon: 'ev_shadow',             color: '#b0bec5' },
        { id: 'mcZona',        label: 'Zona Servicio',  icon: 'local_gas_station',     color: '#ffcc80' }
    ];

    get tabs() {
        return this.seccion === 'mc' ? this.tabsDetallado : this.tabsBasico;
    }

    get esNivelDetallado(): boolean {
        return this.eje?.nivelInventario === 'detallado';
    }

    cambiarSeccion(s: 'basico' | 'mc') {
        this.seccion  = s;
        this.showForm = false;
        const primera = (s === 'mc' ? this.tabsDetallado : this.tabsBasico)[0].id;
        this.tabActiva = primera;
        this.cargarTab(primera);
    }

    dominios: any = {};

    // Datos por tab
    items:     any[] = [];
    loadingTab = false;

    // Formulario inline
    showForm   = false;
    editItem:  any  = null;
    subForm:   any  = {};
    savingForm = false;
    formError  = '';

    // Fotos sub-elemento
    fotosPreview:  any[]  = [];
    fotosArchivos: File[] = [];

    // Mapa
    mapaAbierto  = false;
    leafletMap:  any = null;
    marcadorRef: any = null;
    polylineRef: any = null;
    polygonRef:  any = null;
    marcadores:  any[] = [];   // coords [lat,lng] para LineString/Polygon
    geoMode: 'Point' | 'LineString' | 'Polygon' = 'Point';

    /** Catálogo señales verticales → alimenta Tipo_Señal (Mc), mismo criterio que ExistSenVert. */
    catalogoSenVert:     any[]   = [];
    filtroCatalogoSvMc:  string  = '';
    senVertSeleccionadaMc: any   = null;
    mostrarGaleriaSvMc:  boolean = false;

    /** Asistente Mc Señal vertical (4 pasos). */
    pasoWizardMcSv = 1;
    readonly totalPasosWizardMcSv = 4;
    readonly pasosWizardMcSvMeta: { n: number; label: string }[] = [
        { n: 1, label: 'Identificación' },
        { n: 2, label: 'Tablero y soporte' },
        { n: 3, label: 'PR, vía y territorio' },
        { n: 4, label: 'Geometría' }
    ];

    // Panel de ayuda contextual
    mostrarAyuda = false;

    get ayuda(): HelpEntry | null {
        return SINC_HELP[this.tabActiva] || null;
    }

    ayudaGeoIcon(geometria: string): string {
        if (geometria === 'Punto') return 'place';
        if (geometria === 'Polilínea' || geometria === 'Línea') return 'timeline';
        return 'pentagon';
    }

    constructor(
        private sincService: SincService,
        private catalogoService: CatalogoService,
        private authService: AuthService,
        private confirmDialog: ConfirmDialogService,
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.idEje = this.route.snapshot.paramMap.get('id') || '';
        this.sincService.getDominios().subscribe(d => this.dominios = d);
        this.catalogoService.getSenVertscat().subscribe({
            next: (res: any) => {
                this.catalogoSenVert = res.datos || [];
                if (this.tabActiva === 'mcSenalV' && this.showForm) {
                    this.restaurarSenVertMcDesdeTipoSenal();
                }
            },
            error: () => {}
        });
        this.cargarEje();
    }

    cargarEje() {
        this.loading = true;
        this.sincService.getEjeById(this.idEje).subscribe({
            next: (res) => {
                this.eje = res.eje;
                this.sincService.getPropiedadesByEje(this.idEje).subscribe({
                    next: (r2: any) => {
                        this.actualizarSnippetPropMcSv(r2.items || []);
                        this.finalizarCargaEjeTrasPropiedades();
                    },
                    error: () => {
                        this.actualizarSnippetPropMcSv([]);
                        this.finalizarCargaEjeTrasPropiedades();
                    }
                });
            },
            error: (err) => { this.error = err.message; this.loading = false; }
        });
    }

    private finalizarCargaEjeTrasPropiedades() {
        this.aplicarSeccionInicialDesdeEje();
        this.loading = false;
        this.cargarResumen();
        this.cargarTab(this.tabActiva);
    }

    private actualizarSnippetPropMcSv(items: any[]) {
        if (!items?.length) {
            this.propSnippetMcSv = { numCarr: null, tipoSuperfLabel: '' };
            return;
        }
        const sorted = [...items].sort(
            (a, b) => (Number(a.abscisaIni) || 0) - (Number(b.abscisaIni) || 0)
        );
        const p = sorted[0];
        const rawCarr = p.numCarr;
        const numCarr =
            rawCarr != null && rawCarr !== '' && Number.isFinite(Number(rawCarr))
                ? Number(rawCarr)
                : null;
        const ts = p.tipoSuperf != null && p.tipoSuperf !== '' ? Number(p.tipoSuperf) : NaN;
        const tipoSuperfLabels: Record<number, string> = {
            1: 'Destapado',
            2: 'Afirmado',
            3: 'Pavimento asfáltico',
            4: 'Tratamiento superficial',
            5: 'Pavimento rígido',
            6: 'Placa huella',
            7: 'Pavimento articulado',
            8: 'Otro'
        };
        this.propSnippetMcSv = {
            numCarr,
            tipoSuperfLabel: Number.isFinite(ts) ? tipoSuperfLabels[ts] ?? '' : ''
        };
    }

    /** Alinea sección (Básico / Mc) y la primera tab con el nivel guardado al crear el eje. */
    private aplicarSeccionInicialDesdeEje(): void {
        if (!this.eje) return;
        if (this.eje.nivelInventario === 'detallado') {
            this.seccion = 'mc';
            this.tabActiva = this.tabsDetallado[0].id;
        } else {
            this.seccion = 'basico';
            this.tabActiva = this.tabsBasico[0].id;
        }
    }

    cargarResumen() {
        this.sincService.getResumenEje(this.idEje).subscribe({
            next: (res) => this.resumen = res.resumen,
            error: () => {}
        });
    }

    setTab(tab: Tab) {
        this.tabActiva = tab;
        this.seccion   = isMcTab(tab) ? 'mc' : 'basico';
        this.showForm  = false;
        this.cargarTab(tab);
    }

    cargarTab(tab: Tab) {
        this.loadingTab = true;
        const obs$ = isMcTab(tab)
            ? this.sincService.getMcByEje(MC_CAPA[tab], this.idEje)
            : this.getBasicoObs(tab as BasicoTab);

        obs$.subscribe({
            next: (res: any) => {
                this.items = res.items || [];
                if (tab === 'propiedades') this.actualizarSnippetPropMcSv(this.items);
                this.loadingTab = false;
            },
            error: () => { this.loadingTab = false; }
        });
    }

    private getBasicoObs(tab: BasicoTab) {
        switch (tab) {
            case 'fotos':       return this.sincService.getFotosByEje(this.idEje);
            case 'prs':         return this.sincService.getPrsByEje(this.idEje);
            case 'propiedades': return this.sincService.getPropiedadesByEje(this.idEje);
            case 'puentes':     return this.sincService.getPuentesByEje(this.idEje);
            case 'muros':       return this.sincService.getMurosByEje(this.idEje);
            case 'tuneles':     return this.sincService.getTunelesByEje(this.idEje);
            case 'sitios':      return this.sincService.getSitiosByEje(this.idEje);
            case 'drenaje':     return this.sincService.getObrasByEje(this.idEje);
        }
    }

    // ─── FORMULARIO INLINE ────────────────────────────────────────────────────

    nuevoItem() {
        this.editItem  = null;
        this.subForm   = this.defaultForm(this.tabActiva);
        this.fotosPreview  = [];
        this.fotosArchivos = [];
        this.senVertSeleccionadaMc = null;
        this.filtroCatalogoSvMc    = '';
        this.mostrarGaleriaSvMc   = false;
        if (this.tabActiva === 'mcSenalV') this.pasoWizardMcSv = 1;
        this.showForm  = true;
        this.formError = '';
        setTimeout(() => this.limpiarMarcasValidacionEn(document.querySelector('.sub-form-panel')), 0);
    }

    editarItem(item: any) {
        this.editItem  = item;
        this.subForm   = { ...item };
        this.normalizarCamposPrEnFormulario(this.subForm);
        // <input type="date"> solo acepta 'yyyy-MM-DD'; el API suele devolver ISO (Date/string) y queda vacío.
        this.subForm.fecha = this.fechaParaInputDate(this.subForm.fecha);
        if (Object.prototype.hasOwnProperty.call(this.subForm, 'fechaInst')) {
            this.subForm.fechaInst = this.fechaParaInputDate(this.subForm.fechaInst);
        }
        const tabsFechaOp: McTab[] = [
            'mcBerma', 'mcCalzada', 'mcCco', 'mcCicloruta', 'mcCuneta', 'mcDefensaVial', 'mcIts',
            'mcDrenaje', 'mcPeaje', 'mcPesaje', 'mcLuminaria', 'mcMuro', 'mcPuente', 'mcSeparador',
            'mcTunel', 'mcZona'
        ];
        if (
            tabsFechaOp.includes(this.tabActiva as McTab) &&
            Object.prototype.hasOwnProperty.call(this.subForm, 'fechaInicioOperacion')
        ) {
            this.subForm.fechaInicioOperacion = this.fechaParaInputDate(this.subForm.fechaInicioOperacion);
        }
        if (
            this.tabActiva === 'mcPeaje' &&
            Object.prototype.hasOwnProperty.call(this.subForm, 'fechaInstalacion')
        ) {
            this.subForm.fechaInstalacion = this.fechaParaInputDate(this.subForm.fechaInstalacion);
        }
        if (this.tabActiva === 'mcSenalV') {
            if (Object.prototype.hasOwnProperty.call(this.subForm, 'fecInstal')) {
                this.subForm.fecInstal = this.fechaParaInputDate(this.subForm.fecInstal);
            }
            if (Object.prototype.hasOwnProperty.call(this.subForm, 'fecAccion')) {
                this.subForm.fecAccion = this.fechaParaInputDate(this.subForm.fecAccion);
            }
            if (this.subForm.codPr == null && this.subForm.numPr != null) {
                this.subForm.codPr = this.subForm.numPr;
            }
            this.restaurarSenVertMcDesdeTipoSenal();
            this.pasoWizardMcSv = 1;
            const jig = this.valoresTerritorioDesdeJornadaMcSv();
            if (!String(this.subForm.divipola ?? '').trim()) {
                const leg = String((this.subForm as any).codMunicipio ?? '').trim();
                this.subForm.divipola = leg || jig.divipola;
            }
            delete (this.subForm as any).codMunicipio;
            if (!String(this.subForm.codDepto ?? '').trim()) this.subForm.codDepto = jig.codDepto;
            if (!String(this.subForm.departamentoUbic ?? '').trim()) this.subForm.departamentoUbic = jig.departamentoUbic;
            if (!String(this.subForm.municipioUbic ?? '').trim()) this.subForm.municipioUbic = jig.municipioUbic;
            if (!this.subForm.idJornada && jig.idJornada) this.subForm.idJornada = jig.idJornada;
            const vig = this.valoresViaDesdeEjeMcSv();
            if (this.eje) {
                if (!String(this.subForm.codVia ?? '').trim()) this.subForm.codVia = vig.codVia;
                if (!String(this.subForm.nomVial ?? '').trim()) this.subForm.nomVial = vig.nomVial;
            }
            if (!String(this.subForm.sentido ?? '').trim() && vig.sentido) this.subForm.sentido = vig.sentido;
            if (!String(this.subForm.calzada ?? '').trim() && vig.calzada) this.subForm.calzada = vig.calzada;
            if ((this.subForm.carriles == null || this.subForm.carriles === '') && vig.carriles != null) {
                this.subForm.carriles = vig.carriles;
            }
            if (!String(this.subForm.tipoSup ?? '').trim() && vig.tipoSup) this.subForm.tipoSup = vig.tipoSup;
        }
        if (isMcTab(this.tabActiva) && this.tabActiva !== 'mcSenalV') {
            const tj = this.valoresJornadaTerritorioCrudosMc();
            if (this.tabActiva === 'mcSeparador') {
                delete (this.subForm as any).codDepto;
                delete (this.subForm as any).codMunicipio;
                if (!String(this.subForm.departamentoUbic ?? '').trim()) this.subForm.departamentoUbic = tj.departamentoUbic;
                if (!String(this.subForm.municipioUbic ?? '').trim()) this.subForm.municipioUbic = tj.municipioUbic;
                if (!this.subForm.idJornada && tj.idJornada) this.subForm.idJornada = tj.idJornada;
                const munL = this.longDesdeJornada(tj.codMunicipio);
                const depL = this.longDesdeJornada(tj.codDepto);
                if (this.subForm.municipio == null && munL != null) this.subForm.municipio = munL;
                if (this.subForm.departamento == null && depL != null) this.subForm.departamento = depL;
            } else {
                if (!String(this.subForm.codDepto ?? '').trim()) this.subForm.codDepto = tj.codDepto;
                if (!String(this.subForm.codMunicipio ?? '').trim()) this.subForm.codMunicipio = tj.codMunicipio;
                if (!String(this.subForm.departamentoUbic ?? '').trim()) this.subForm.departamentoUbic = tj.departamentoUbic;
                if (!String(this.subForm.municipioUbic ?? '').trim()) this.subForm.municipioUbic = tj.municipioUbic;
                if (!this.subForm.idJornada && tj.idJornada) this.subForm.idJornada = tj.idJornada;
            }
        }
        if (
            this.tabActiva === 'mcDefensaVial' &&
            (this.subForm.fechaInicioOperacion == null || this.subForm.fechaInicioOperacion === '') &&
            this.subForm.fecha
        ) {
            this.subForm.fechaInicioOperacion = this.subForm.fecha;
        }
        if (this.tabActiva === 'mcIts') {
            if (
                (this.subForm.fechaInicioOperacion == null || this.subForm.fechaInicioOperacion === '') &&
                this.subForm.fecha
            ) {
                this.subForm.fechaInicioOperacion = this.subForm.fecha;
            }
            if (this.subForm.punto == null && this.subForm.numPr != null) {
                this.subForm.punto = this.subForm.numPr;
            }
            const obsIts = String(this.subForm.obs ?? '').trim();
            if (!obsIts && this.subForm.descripcion != null && String(this.subForm.descripcion).trim() !== '') {
                this.subForm.obs = String(this.subForm.descripcion).trim();
            }
        }
        if (
            (this.tabActiva === 'puentes' || this.tabActiva === 'muros' || this.tabActiva === 'sitios' || this.tabActiva === 'drenaje' || isMcTab(this.tabActiva)) &&
            item.rutaFoto
        ) {
            const nom = (item.foto && String(item.foto).trim()) || String(item.rutaFoto).split('/').pop() || 'foto.jpg';
            this.fotosPreview = [{ url: this.apiUrl + item.rutaFoto, nombre: nom }];
        } else {
            this.fotosPreview = (item.fotos || []).map((u: string) => ({ url: this.apiUrl + u, nombre: u }));
        }
        this.fotosArchivos = [];
        this.normalizarCamposPrEnFormulario(this.subForm);
        this.showForm  = true;
        this.formError = '';
        setTimeout(() => this.limpiarMarcasValidacionEn(document.querySelector('.sub-form-panel')), 0);
    }

    /** Convierte codMunicipio / codDepto de jornada (string en BD) a Long para formularios numéricos. */
    private longDesdeJornada(raw: unknown): number | null {
        if (raw == null || raw === '') return null;
        const n = Number(String(raw).trim());
        if (!Number.isFinite(n) || n < 1) return null;
        return Math.floor(n);
    }

    /** AAAA-MM-DD para inputs date; usa la fecha de la jornada del eje (poblada en getEjeById). */
    private fechaCampoDesdeJornada(): string | null {
        const raw = this.eje?.idJornada?.fechaJornada;
        return this.fechaParaInputDate(raw);
    }

    /**
     * Convierte fecha del API (ISO string, Date) a 'yyyy-MM-dd' para [(ngModel)] en <input type="date">.
     * Si el string ya empieza por fecha calendario, se usan esos 10 caracteres (evita desfase por huso).
     */
    private fechaParaInputDate(raw: unknown): string | null {
        if (raw == null || raw === '') return null;
        if (typeof raw === 'string') {
            const t = raw.trim();
            const head = t.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
                return head;
            }
            const d = new Date(t);
            if (Number.isNaN(d.getTime())) return null;
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        if (raw instanceof Date) {
            if (Number.isNaN(raw.getTime())) return null;
            const y = raw.getUTCFullYear();
            const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
            const day = String(raw.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        return null;
    }

    private defaultForm(tab: Tab): any {
        const base = { idEje: this.idEje };
        if (isMcTab(tab)) {
            return this.defaultMcForm(tab, base);
        }
        switch (tab as BasicoTab) {
            case 'fotos':       return {
                ...base,
                codigoVia:       this.eje?.codigoVia        || '',
                numPr:           '',
                calzada:         null,
                fecha:           null,
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                foto:            '',
                rutaFoto:        '',
                ubicacion:       null,
                obs:             ''
            };
            case 'prs':         return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                numPr:           '',
                calzada:         null,
                distVerd:        null,
                fecha:           null,
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                ubicacion:       null,
                obs:             ''
            };
            case 'propiedades': return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                fecha:           this.fechaCampoDesdeJornada(),
                longitud:        null,
                tipoTerr:        null,
                pendiente:       null,
                tipoSuperf:      null,
                estado:          null,
                numCarr:         null,
                ancoCarr:        null,
                anchoBer:        null,
                anchoCunt:       null,
                anchoSepar:      null,
                abscisaIni:      null,
                abscisaFin:      null,
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                obs:             ''
            };
            case 'puentes':     return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                fecha:           this.fechaCampoDesdeJornada(),
                longitud:        null,
                distIni:         null,
                nombre:          '',
                anchoTable:      null,
                numLuces:        null,
                estadoSup:       null,
                estadoEst:       null,
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                foto:            '',
                rutaFoto:        '',
                ubicacion:       null,
                obs:             ''
            };
            case 'muros':       return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                fecha:           this.fechaCampoDesdeJornada(),
                distIni:         null,
                longitud:        null,
                altura:          null,
                anchoCor:        null,
                lado:            null,
                foto:            '',
                rutaFoto:        '',
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                ubicacion:       null,
                obs:             ''
            };
            case 'tuneles':     return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                fecha:           this.fechaCampoDesdeJornada(),
                distIni:         null,
                nombre:          '',
                longitud:        null,
                ancoCarr:        null,
                numCarr:         null,
                estado:          null,
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                ubicacion:       null,
                obs:             ''
            };
            case 'sitios':      return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                fecha:           this.fechaCampoDesdeJornada(),
                tipo:            null,
                severidad:       null,
                lado:            null,
                foto:            '',
                rutaFoto:        '',
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                ubicacion:       null,
                obs:             ''
            };
            case 'drenaje':     return {
                ...base,
                codigoVia:       this.eje?.codigoVia           || '',
                tipo:            null,
                material:        null,
                estadoServ:      null,
                estadoGen:       null,
                numSecc:         null,
                ancho:           null,
                longitud:        null,
                foto:            '',
                rutaFoto:        '',
                municipio:       this.eje?.idJornada?.municipio || '',
                departamento:    this.eje?.idJornada?.dpto      || '',
                codMunicipio:    this.eje?.idJornada?.codMunicipio    ?? null,
                codDepartamento: this.eje?.idJornada?.codDepto ?? null,
                ubicacion:       null,
                obs:             ''
            };
        }
    }

    private defaultMcForm(tab: McTab, base: any): any {
        const b =
            tab === 'mcSenalV'
                ? { ...base, foto: '', rutaFoto: '' }
                : { ...base, foto: '', rutaFoto: '', ...this.terrCamposDesdeJornadaMcParaSubForm(tab) };
        switch (tab) {
            case 'mcBerma':       return {
                ...b,
                idBerma:               null,
                unidadFuncional:       null,
                proyecto:              null,
                municipio:             this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:          this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:          '',
                fechaInicioOperacion:  this.fechaCampoDesdeJornada(),
                nivelTransito:         null,
                tipoPavimento:         null,
                puntoInicial:          '',
                distAPuntoInicial:     null,
                puntoFinal:            '',
                distAPuntoFinal:       null,
                longitud:              null,
                areaBerma:             null,
                anchoPromedio:         null,
                ubicacion:             null,
                obs:                   ''
            };
            case 'mcCalzada':     return {
                ...b,
                idCalzada:                null,
                unidadFuncional:          null,
                proyecto:                 null,
                municipio:                this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:             this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:             '',
                fechaInicioOperacion:     this.fechaCampoDesdeJornada(),
                nivelTransito:            null,
                tipoPavimento:            null,
                idEstructuraPavimento:    null,
                puntoInicial:             '',
                distAPuntoInicial:        null,
                puntoFinal:               '',
                distAPuntoFinal:          null,
                longitud:                 null,
                areaCalzada:              null,
                anchoPromedio:            null,
                tipoSubrasante:           null,
                materialSubrasante:       null,
                espesorSubrasante:        null,
                ubicacion:                null,
                obs:                      ''
            };
            case 'mcCco':         return {
                ...b,
                idCco:                 null,
                unidadFuncional:       null,
                proyecto:              null,
                municipio:             this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:          this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:          '',
                fechaInicioOperacion:  this.fechaCampoDesdeJornada(),
                puntoInicial:          '',
                distAPuntoInicial:     null,
                puntoFinal:            '',
                distAPuntoFinal:       null,
                longitud:              null,
                areaCco:               null,
                anchoPromedio:         null,
                estado:                null,
                ubicacion:             null,
                obs:                   ''
            };
            case 'mcCicloruta':   return {
                ...b,
                idCicloruta:              null,
                unidadFuncional:          null,
                proyecto:                 null,
                municipio:                this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:             this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:             '',
                fechaInicioOperacion:     this.fechaCampoDesdeJornada(),
                tipoPavimento:            null,
                idEstructuraPavimento:    null,
                puntoInicial:             '',
                distAPuntoInicial:        null,
                puntoFinal:               '',
                distAPuntoFinal:          null,
                longitud:                 null,
                areaCicloruta:            null,
                anchoPromedio:            null,
                tipoSubrasante:           null,
                materialSubrasante:       null,
                espesorSubrasante:        null,
                estado:                   null,
                ubicacion:                null,
                obs:                      ''
            };
            case 'mcCuneta':      return {
                ...b,
                idCuneta:             null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                seccion:              null,
                material:             null,
                areaSeccion:          null,
                porcPromSecObstruida: null,
                porcAceptacion:       null,
                estado:               null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcDefensaVial': return {
                ...b,
                idDefensaVial:        null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                estado:               null,
                numCaptafaro:         null,
                numModulos:           null,
                numPostes:            null,
                numSeparadores:       null,
                numTerminales:        null,
                pintura:              null,
                longitud:             null,
                material:             null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcIts':         return {
                ...b,
                idDispositivo:            null,
                unidadFuncional:          null,
                proyecto:                 null,
                municipio:                this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:             this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:             '',
                fechaInicioOperacion:     this.fechaCampoDesdeJornada(),
                tieneIPv6:                null,
                punto:                    '',
                distanciaAlPunto:         null,
                idPeaje:                  null,
                peaje:                    '',
                tienePagoElectronico:     null,
                nombre:                   null,
                tipo:                     null,
                estado:                   null,
                protocoloComunicacion:    null,
                tipoSuministroEnergetico: null,
                medioTransmision:         null,
                sentidoTrafico:           null,
                estadoGeneral:            null,
                ubicacion:                null,
                obs:                      ''
            };
            case 'mcDrenaje': return {
                ...b,
                idDrenaje:            null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                ancho:                null,
                diametro:             null,
                areaDrenaje:          null,
                tipoDrenaje:          null,
                material:             null,
                areaSeccion:          null,
                porcPromSecObstruida: null,
                porcAceptacion:       null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcPeaje': return {
                ...b,
                idPeaje:              null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                fechaInstalacion:     null,
                longitud:             null,
                areaPeaje:            null,
                anchoPromedio:        null,
                numEstacionPago:      null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcPesaje': return {
                ...b,
                idEstacionPesaje:     null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                areaEstacionPesaje:   null,
                anchoPromedio:        null,
                estado:               null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcLuminaria': return {
                ...b,
                idLuminaria:          null,
                unidadFuncional:      null,
                proyecto:             '',
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                punto:                '',
                distAPunto:           null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcMuro': return {
                ...b,
                idMuro:               null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                altura:               null,
                tipoMuro:             null,
                estadoMaterial:     null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcPuente': return {
                ...b,
                idPuente:             null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: this.fechaCampoDesdeJornada(),
                nombre:               '',
                tipoEstructura:       null,
                nivelTransito:        null,
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                areaPuente:           null,
                anchoPromedio:        null,
                numeroLuces:          null,
                luzMenor:             null,
                longitudTotal:        null,
                luzMayor:             null,
                anchoTablero:         null,
                galibo:               null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcSenalV': {
                const jt = this.valoresTerritorioDesdeJornadaMcSv();
                const vv = this.valoresViaDesdeEjeMcSv();
                return {
                    ...b,
                    idSenalVertical:  null,
                    idJornada:        jt.idJornada,
                    ansvId:           '',
                    codigoInterno:    '',
                    idSenal:          null,
                    claseSenal:       '',
                    tipoSenal:        '',
                    velSenal:         null,
                    ladoSenal:        '',
                    formaSenal:       '',
                    estadoSenal:      '',
                    ubicaSenal:       '',
                    dimSenal:         '',
                    faseSenal:        '',
                    soporteSenal:     '',
                    estadoSoporte:    '',
                    materialPlaca:    '',
                    laminaRefectante: '',
                    fecInstal:        null,
                    accionSenal:      '',
                    fecAccion:        null,
                    codPr:            '',
                    abscisaPr:        null,
                    entidadTerr:      '',
                    codDepto:         jt.codDepto,
                    departamentoUbic: jt.departamentoUbic,
                    municipioUbic:    jt.municipioUbic,
                    divipola:         jt.divipola,
                    codVia:           vv.codVia,
                    respVia:          '',
                    nomVial:          vv.nomVial,
                    claseVia:         '',
                    calzada:          vv.calzada,
                    carriles:         vv.carriles,
                    sentido:          vv.sentido,
                    nomSectorVia:     '',
                    tipoSup:          vv.tipoSup,
                    ubicacion:        null,
                    obs:              ''
                };
            }
            case 'mcSeparador': return {
                ...b,
                idSeparador:          null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: null,
                tipoPavimento:        null,
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                areaSeparador:        null,
                anchoPromedio:        null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcTunel': return {
                ...b,
                idTunel:              null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: null,
                nivelTransito:        null,
                tipoPavimento:        null,
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                longitud:             null,
                ubicacion:            null,
                obs:                  ''
            };
            case 'mcZona': return {
                ...b,
                idZonaServicio:       null,
                unidadFuncional:      null,
                proyecto:             null,
                municipio:            this.longDesdeJornada(this.eje?.idJornada?.codMunicipio),
                departamento:         this.longDesdeJornada(this.eje?.idJornada?.codDepto),
                codigoInvias:         '',
                fechaInicioOperacion: null,
                puntoInicial:         '',
                distAPuntoInicial:    null,
                puntoFinal:           '',
                distAPuntoFinal:      null,
                areaZonaServicio:     null,
                estado:               null,
                ubicacion:            null,
                obs:                  ''
            };
        }
    }

    cancelarForm() {
        const p = document.querySelector('.sub-form-panel');
        this.showForm = false;
        this.pasoWizardMcSv = 1;
        this.limpiarMarcasValidacionEn(p);
    }

    avanzarPasoMcSv() {
        if (this.pasoWizardMcSv < this.totalPasosWizardMcSv) this.pasoWizardMcSv++;
    }

    retrocederPasoMcSv() {
        if (this.pasoWizardMcSv > 1) this.pasoWizardMcSv--;
    }

    irPasoWizardMcSv(n: number) {
        if (n >= 1 && n <= this.totalPasosWizardMcSv) this.pasoWizardMcSv = n;
    }

    /**
     * Lectura de la jornada del eje: mismos conceptos que persisten en el documento Mc (idJornada, DANE, nombres).
     * El registro Mc se alimenta desde aquí al crear, al sincronizar y en guardar (ver aplicarTerritorioJornadaAlPayloadMcNoSv).
     * Mc SV usa divipola en lugar de codMunicipio en documento.
     */
    private valoresJornadaTerritorioCrudosMc(): {
        departamentoUbic: string;
        municipioUbic: string;
        codDepto: string;
        codMunicipio: string;
        idJornada: string | null;
    } {
        const j = this.eje?.idJornada;
        if (!j || typeof j !== 'object') {
            return {
                departamentoUbic: '',
                municipioUbic: '',
                codDepto: '',
                codMunicipio: '',
                idJornada: null
            };
        }
        const codMun = String((j as any).codMunicipio ?? '').trim();
        const codDep = String((j as any).codDepto ?? '').trim();
        const jid = (j as any)._id != null ? String((j as any)._id) : null;
        return {
            departamentoUbic: String((j as any).dpto ?? '').trim(),
            municipioUbic: String((j as any).municipio ?? '').trim(),
            codDepto: codDep,
            codMunicipio: codMun,
            idJornada: jid
        };
    }

    /**
     * Copia desde la jornada del eje hacia el subForm.
     * McSeparador: nombres + id jornada; Long municipio/departamento desde codMunicipio/codDepto de la jornada (sin guardar DANE como string en el doc).
     */
    private terrCamposDesdeJornadaMcParaSubForm(tab: McTab): Record<string, unknown> {
        const t = this.valoresJornadaTerritorioCrudosMc();
        if (tab === 'mcSeparador') {
            return {
                departamentoUbic: t.departamentoUbic,
                municipioUbic: t.municipioUbic,
                idJornada: t.idJornada,
                municipio: this.longDesdeJornada(t.codMunicipio),
                departamento: this.longDesdeJornada(t.codDepto)
            };
        }
        return { ...t };
    }

    /** Mc SV: divipola = código municipio (sin campo codMunicipio en documento). */
    private valoresTerritorioDesdeJornadaMcSv(): {
        departamentoUbic: string;
        municipioUbic: string;
        divipola: string;
        codDepto: string;
        idJornada: string | null;
    } {
        const t = this.valoresJornadaTerritorioCrudosMc();
        return {
            departamentoUbic: t.departamentoUbic,
            municipioUbic: t.municipioUbic,
            divipola: t.codMunicipio,
            codDepto: t.codDepto,
            idJornada: t.idJornada
        };
    }

    get idJornadaMcSvDisplay(): string {
        const t = this.valoresTerritorioDesdeJornadaMcSv();
        return t.idJornada || '— (sin jornada en el eje)';
    }

    get idJornadaMcTerritorioDisplay(): string {
        const t = this.valoresJornadaTerritorioCrudosMc();
        return t.idJornada || '— (sin jornada en el eje)';
    }

    /** Vuelve a copiar en el subForm los campos homónimos de la jornada (registro Mc alimentado desde jornada). */
    sincronizarTerritorioSubFormMcNoSv() {
        if (this.tabActiva === 'mcSenalV' || !isMcTab(this.tabActiva)) return;
        Object.assign(this.subForm, this.terrCamposDesdeJornadaMcParaSubForm(this.tabActiva));
        if (this.tabActiva === 'mcSeparador') {
            delete (this.subForm as any).codDepto;
            delete (this.subForm as any).codMunicipio;
        }
    }

    /** Antes de persistir: asegura en el payload los mismos territorio/id jornada que tiene la jornada del eje. */
    private aplicarTerritorioJornadaAlPayloadMcNoSv(payload: any) {
        const t = this.valoresJornadaTerritorioCrudosMc();
        if (this.tabActiva === 'mcSeparador') {
            if (t.idJornada) payload.idJornada = t.idJornada;
            payload.departamentoUbic = t.departamentoUbic;
            payload.municipioUbic = t.municipioUbic;
            const munL = this.longDesdeJornada(t.codMunicipio);
            const depL = this.longDesdeJornada(t.codDepto);
            if (munL != null) payload.municipio = munL;
            if (depL != null) payload.departamento = depL;
            delete payload.codDepto;
            delete payload.codMunicipio;
            return;
        }
        if (!t.idJornada) return;
        payload.idJornada = t.idJornada;
        payload.codDepto = t.codDepto;
        payload.codMunicipio = t.codMunicipio;
        payload.departamentoUbic = t.departamentoUbic;
        payload.municipioUbic = t.municipioUbic;
    }

    /** Repone de la jornada del eje (por si el eje se actualizó). */
    sincronizarTerritorioMcSvDesdeJornada() {
        const t = this.valoresTerritorioDesdeJornadaMcSv();
        this.subForm.departamentoUbic = t.departamentoUbic;
        this.subForm.municipioUbic    = t.municipioUbic;
        this.subForm.divipola         = t.divipola;
        this.subForm.codDepto         = t.codDepto;
        if (t.idJornada) this.subForm.idJornada = t.idJornada;
    }

    /**
     * Cod_Via, Nom_Vial, Sentido y Calzada (TIPOEJE+sentido) desde el eje; Carriles y Tipo_Sup desde el primer
     * registro de propiedades del eje (orden por abscisaIni). Se re-aplican al guardar cuando hay dato fuente.
     */
    private valoresViaDesdeEjeMcSv(): {
        codVia: string;
        nomVial: string;
        sentido: string;
        calzada: string;
        carriles: number | null;
        tipoSup: string;
    } {
        const e = this.eje;
        const codVia = String(e?.codigoVia ?? e?.codigoVia1 ?? '').trim();
        const nomVial = String(e?.nomVia ?? '').trim();
        const sentido = this.labelSentidoCircDesdeEjeMcSv();
        const calzada = this.labelCalzadaMcDesdeTipoEjeMcSv();
        const carriles = this.propSnippetMcSv?.numCarr ?? null;
        const tipoSup = String(this.propSnippetMcSv?.tipoSuperfLabel ?? '').trim();
        return { codVia, nomVial, sentido, calzada, carriles, tipoSup };
    }

    /** Misma codificación que Dm_SentidoCirc en Mc SV y SENTIDO en el eje (1–4). */
    private labelSentidoCircDesdeEjeMcSv(): string {
        const s = this.eje?.sentido;
        if (s == null || s === '') return '';
        const n = Number(s);
        const m: Record<number, string> = {
            1: 'A-B',
            2: 'B-A',
            3: 'Doble sentido',
            4: 'No aplica'
        };
        return m[n] ?? '';
    }

    /**
     * Dm_Calzada (Tabla 28): TIPOEJE del eje + sentido cuando hay calzada doble.
     * Calzada sencilla / ramal único / glorieta → «Calzada única».
     */
    private labelCalzadaMcDesdeTipoEjeMcSv(): string {
        const te = this.eje?.tipoEje;
        if (te == null || te === '') return '';
        const tipo = Number(te);
        const sent = Number(this.eje?.sentido);
        if (tipo === 1 || tipo === 3 || tipo === 4) return 'Calzada única';
        if (tipo === 2 || tipo === 5) {
            if (sent === 1) return 'Calzada sentido A-B de la vía';
            if (sent === 2) return 'Calzada sentido B-A de la vía';
        }
        return '';
    }

    mcSvCodONomViaReadonly(): boolean {
        return !!this.eje;
    }

    mcSvSentidoReadonly(): boolean {
        return !!this.labelSentidoCircDesdeEjeMcSv();
    }

    mcSvCalzadaReadonly(): boolean {
        return !!this.labelCalzadaMcDesdeTipoEjeMcSv();
    }

    mcSvCarrilesReadonly(): boolean {
        const n = this.propSnippetMcSv?.numCarr;
        return n != null && Number.isFinite(Number(n));
    }

    mcSvTipoSupReadonly(): boolean {
        return !!String(this.propSnippetMcSv?.tipoSuperfLabel ?? '').trim();
    }

    /** Jornada + vía + snippet de propiedades (vuelve a leer propiedades del API). */
    sincronizarContextoMcSvDesdeEje() {
        this.sincService.getPropiedadesByEje(this.idEje).subscribe({
            next: (r: any) => {
                this.actualizarSnippetPropMcSv(r.items || []);
                this.aplicarViaYJornadaMcSvAlSubForm();
            },
            error: () => {
                this.actualizarSnippetPropMcSv([]);
                this.aplicarViaYJornadaMcSvAlSubForm();
            }
        });
    }

    private aplicarViaYJornadaMcSvAlSubForm() {
        this.sincronizarTerritorioMcSvDesdeJornada();
        const v = this.valoresViaDesdeEjeMcSv();
        if (this.eje) {
            this.subForm.codVia = v.codVia;
            this.subForm.nomVial = v.nomVial;
        }
        if (v.sentido) this.subForm.sentido = v.sentido;
        if (v.calzada) this.subForm.calzada = v.calzada;
        if (v.carriles != null) this.subForm.carriles = v.carriles;
        if (v.tipoSup) this.subForm.tipoSup = v.tipoSup;
    }

    private valErr(message: string, ...fields: string[]): SincValidacionError {
        return { message, fields: fields.length ? fields : [] };
    }

    private limpiarMarcasValidacionEn(panel: Element | null) {
        if (!panel) return;
        panel.querySelectorAll('.form-field--sinc-invalid').forEach(el => el.classList.remove('form-field--sinc-invalid'));
        panel.querySelectorAll('.sinc-control-invalid').forEach(el => el.classList.remove('sinc-control-invalid'));
    }

    private aplicarMarcaInvalida(el: HTMLElement) {
        el.classList.add('sinc-control-invalid');
        (
            el.closest('.form-field') ||
            el.closest('.form-field-geo') ||
            el.closest('.fotoeje-via-badge')
        )?.classList.add('form-field--sinc-invalid');
    }

    private resolverCampoPanel(panel: HTMLElement, token: string): HTMLElement | null {
        if (token === SINC_CAMPO_GEO) {
            return panel.querySelector('.form-field-geo button.btn-secondary') as HTMLElement | null;
        }
        if (token === SINC_CAMPO_FOTO) {
            return panel.querySelector('.form-field--foto-puente .btn-upload-sm') as HTMLElement | null;
        }
        try {
            return panel.querySelector(`[name="${CSS.escape(token)}"]`) as HTMLElement | null;
        } catch {
            return panel.querySelector(`[name="${token}"]`) as HTMLElement | null;
        }
    }

    /** Tras error de validación: mensaje, resalta campos y lleva el foco al primero. */
    private aplicarValidacionFallida(message: string, fields: string[]) {
        this.formError = message;
        this.cdr.detectChanges();
        setTimeout(() => {
            const panel = document.querySelector('.sub-form-panel');
            if (!panel) return;
            this.limpiarMarcasValidacionEn(panel);
            let first: HTMLElement | null = null;
            for (const f of fields) {
                const el = this.resolverCampoPanel(panel as HTMLElement, f);
                if (el) {
                    this.aplicarMarcaInvalida(el);
                    if (!first) first = el;
                }
            }
            if (first) {
                if (first.tabIndex < 0 && first.getAttribute('tabindex') == null) {
                    first.setAttribute('tabindex', '-1');
                }
                first.focus({ preventScroll: true });
                first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }, 0);
    }

    /** Evita enviar GeoJSON incompleto (causa "Can't extract geo keys" en MongoDB 2dsphere). */
    private sanitizeGeoPayload(payload: any) {
        const u = payload.ubicacion;
        if (u === null || u === undefined) {
            delete payload.ubicacion;
            return;
        }
        if (typeof u !== 'object' || !u.type) {
            delete payload.ubicacion;
            return;
        }
        const c = u.coordinates;
        if (u.type === 'Point') {
            if (!Array.isArray(c) || c.length < 2 || !Number.isFinite(+c[0]) || !Number.isFinite(+c[1])) {
                delete payload.ubicacion;
            }
            return;
        }
        if (u.type === 'LineString') {
            if (!Array.isArray(c) || c.length < 2) {
                delete payload.ubicacion;
                return;
            }
            const ok = c.every(
                (p: any) =>
                    Array.isArray(p) &&
                    p.length >= 2 &&
                    Number.isFinite(+p[0]) &&
                    Number.isFinite(+p[1])
            );
            if (!ok) delete payload.ubicacion;
            return;
        }
        if (u.type === 'Polygon') {
            if (!Array.isArray(c) || !c[0] || !Array.isArray(c[0]) || c[0].length < 4) {
                delete payload.ubicacion;
            }
            return;
        }
        delete payload.ubicacion;
    }

    /** Tabla 7 — validación previa en cliente (PUENTES). */
    private validarPuentesCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaPuente');
        if (!p.fecha) return this.valErr('Indique la FECHA de toma en campo.', 'fecha');
        const L = Number(p.longitud);
        if (!Number.isFinite(L) || L < 1 || L > 4000) return this.valErr('LONGITUD: entre 1 y 4 000 m.', 'longitud');
        const di = Number(p.distIni);
        if (!Number.isFinite(di) || di < 0 || di > 250000) return this.valErr('DISTINI: entre 0 y 250 000 m.', 'distIni');
        const nom = String(p.nombre ?? '').trim();
        if (nom.length < 3 || nom.length > 100) return this.valErr('NOMBRE: entre 3 y 100 caracteres.', 'nombre');
        const at = Number(p.anchoTable);
        if (!Number.isFinite(at) || at < 2 || at > 30) return this.valErr('ANCHOTABLE: entre 2 y 30 m.', 'anchoTable');
        const nl = Number(p.numLuces);
        if (!Number.isFinite(nl) || nl !== Math.floor(nl) || nl < 0 || nl > 20) {
            return this.valErr('NUMLUCES: entero entre 0 y 20.', 'numLuces');
        }
        const es = Number(p.estadoSup);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 4) {
            return this.valErr('Seleccione estado superficie (1–4).', 'estadoSup');
        }
        const ee = Number(p.estadoEst);
        if (!Number.isFinite(ee) || ee !== Math.floor(ee) || ee < 1 || ee > 4) {
            return this.valErr('Seleccione estado estructura (1–4).', 'estadoEst');
        }
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipio');
        if (!Number.isFinite(cd) || cd < 1) return this.valErr('Indique COD_DEPARTAMENTO (DANE).', 'codDepartamento');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipio');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamento');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS al inicio del puente (sentido del abscisado).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Tabla 8 — validación previa en cliente (MUROS). */
    private validarMurosCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaMuro');
        if (!p.fecha) return this.valErr('Indique la FECHA de toma en campo.', 'fechaMuro');
        const di = Number(p.distIni);
        if (!Number.isFinite(di) || di < 0 || di > 250000) return this.valErr('DISTINI: entre 0 y 250 000 m.', 'distIniMuro');
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon < 2 || lon > 500) return this.valErr('LONGITUD: entre 2 y 500 m.', 'longitudMuro');
        const ld = Number(p.lado);
        if (!Number.isFinite(ld) || ld !== Math.floor(ld) || ld < 1 || ld > 2) return this.valErr('LADO: 1 o 2 (Tabla 8).', 'ladoMuro');
        const ac = Number(p.anchoCor);
        if (!Number.isFinite(ac) || ac < 0.1 || ac > 20) return this.valErr('ANCHOCOR: entre 0,1 y 20 m.', 'anchoCorMuro');
        const al = Number(p.altura);
        if (!Number.isFinite(al) || al < 0.1 || al > 50) return this.valErr('ALTURA: entre 0,1 y 50 m.', 'alturaMuro');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipioMuro');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamentoMuro');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipioMuro');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamentoMuro');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS al inicio del muro (sentido del abscisado).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Capa TUNELES — validación previa en cliente (manual Tabla). */
    private validarTunelesCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaTunel');
        if (!p.fecha) return this.valErr('Indique la FECHA de toma en campo.', 'fechaTunel');
        const di = Number(p.distIni);
        if (!Number.isFinite(di) || di < 0 || di > 250000) return this.valErr('DISTINI: entre 0 y 250 000 m.', 'distIniTunel');
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon < 2 || lon > 10000) return this.valErr('LONGITUD: entre 2 y 10 000 m.', 'longitudTunel');
        const nom = String(p.nombre ?? '').trim();
        if (nom.length < 3 || nom.length > 100) return this.valErr('NOMBRE: entre 3 y 100 caracteres.', 'nombreTunel');
        const nc = Number(p.numCarr);
        if (!Number.isFinite(nc) || nc !== Math.floor(nc) || nc < 1 || nc > 10) {
            return this.valErr('NUMCARR: entero entre 1 y 10.', 'numCarrTunel');
        }
        const ac = Number(p.ancoCarr);
        if (!Number.isFinite(ac) || ac < 1 || ac > 5) return this.valErr('ANCOCARR: entre 1 y 5 m.', 'ancoCarrTunel');
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADO: 1 Bueno · 2 Regular · 3 Malo.', 'estadoTunel');
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipioTunel');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamentoTunel');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipioTunel');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamentoTunel');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS al inicio del túnel (sentido del abscisado).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Tabla 10 — SITIOSCRITICOS. */
    private validarSitiosCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaSitio');
        if (!p.fecha) return this.valErr('Indique la FECHA de toma en campo.', 'fechaSitio');
        const ld = Number(p.lado);
        if (!Number.isFinite(ld) || ld !== Math.floor(ld) || ld < 1 || ld > 2) return this.valErr('LADO: 1 o 2 (Tabla 10).', 'ladoSitio');
        const tp = Number(p.tipo);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 9) return this.valErr('TIPO: entero entre 1 y 9.', 'tipoSitio');
        const sev = Number(p.severidad);
        if (!Number.isFinite(sev) || sev !== Math.floor(sev) || sev < 1 || sev > 4) {
            return this.valErr('SEVERIDAD: entre 1 y 4.', 'severidadSitio');
        }
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipioSitio');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamentoSitio');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipioSitio');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamentoSitio');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS al inicio del sitio crítico (sentido del abscisado).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Tabla 12 — OBRASDRENAJE (sin FECHA obligatoria en manual). */
    private validarObrasDrenajeCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaObd');
        const tp = Number(p.tipo);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 5) return this.valErr('TIPO: entero entre 1 y 5.', 'tipoObd');
        const mat = Number(p.material);
        if (!Number.isFinite(mat) || mat !== Math.floor(mat) || mat < 1 || mat > 5) {
            return this.valErr('MATERIAL: entero entre 1 y 5.', 'materialObd');
        }
        const es = Number(p.estadoServ);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADOSERV: entre 1 y 3.', 'estadoServObd');
        }
        const eg = Number(p.estadoGen);
        if (!Number.isFinite(eg) || eg !== Math.floor(eg) || eg < 1 || eg > 4) {
            return this.valErr('ESTADOGEN: entre 1 y 4.', 'estadoGenObd');
        }
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon < 1 || lon > 1000) return this.valErr('LONGITUD: entre 1 y 1 000 m.', 'longitudObd');
        const ns = Number(p.numSecc);
        if (!Number.isFinite(ns) || ns !== Math.floor(ns) || ns < 1 || ns > 10) {
            return this.valErr('NUMSECC: entero entre 1 y 10.', 'numSeccObd');
        }
        const an = Number(p.ancho);
        if (!Number.isFinite(an) || an < 0.1 || an > 10) return this.valErr('ANCHO: entre 0,1 y 10 m.', 'anchoObd');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipioObd');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamentoObd');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipioObd');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamentoObd');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS al inicio de la obra de drenaje.', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** FOTOEJE — nivel básico (formulario Fotos). */
    private validarFotoEjeCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoVia');
        const eNpF = this.errCodigoPr(p.numPr, 'numPr');
        if (eNpF) return eNpF;
        const cz = Number(p.calzada);
        if (!Number.isFinite(cz) || cz !== Math.floor(cz) || cz < 1 || cz > 3) {
            return this.valErr('Calzada: seleccione 1, 2 o 3.', 'calzada');
        }
        if (!p.fecha) return this.valErr('Indique la fecha de toma.', 'fecha');
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipio');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamento');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipio');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamento');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS de la toma fotográfica.', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** PRS — nivel básico (sin input CODIGOVIA en plantilla: foco en NUMPR si falla el código). */
    private validarPrsCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) {
            return this.valErr('CODIGOVIA: entre 4 y 25 caracteres (verifique el eje).', 'numPr');
        }
        const eNpP = this.errCodigoPr(p.numPr, 'numPr');
        if (eNpP) return eNpP;
        const cz = Number(p.calzada);
        if (!Number.isFinite(cz) || cz !== Math.floor(cz) || cz < 1 || cz > 3) {
            return this.valErr('Calzada: seleccione 1, 2 o 3.', 'calzada');
        }
        if (p.distVerd != null && p.distVerd !== '') {
            const dvn = Number(p.distVerd);
            if (!Number.isFinite(dvn) || dvn < 0 || dvn > 250000) {
                return this.valErr('Distancia verificada: entre 0 y 250 000 m.', 'distVerd');
            }
        }
        if (!p.fecha) return this.valErr('Indique la fecha de levantamiento.', 'fecha');
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipio');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamento');
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipio');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamento');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Marque el punto GPS del PRS.', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Tabla 5 — PROPIEDADES (nivel básico). La polilínea se toma del eje. */
    private validarPropiedadesCliente(p: any): SincValidacionError | null {
        const cv = String(p.codigoVia ?? '').trim();
        if (cv.length < 4 || cv.length > 25) return this.valErr('CODIGOVIA: entre 4 y 25 caracteres.', 'codigoViaText');
        if (!p.fecha) return this.valErr('Indique la FECHA de levantamiento.', 'fechaProp');
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon < 1 || lon > 250000) {
            return this.valErr('LONGITUD: entre 1 y 250 000 m.', 'longitudProp');
        }
        const tt = Number(p.tipoTerr);
        if (!Number.isFinite(tt) || tt !== Math.floor(tt) || tt < 1 || tt > 4) {
            return this.valErr('TIPOTERR: entero entre 1 y 4.', 'tipoTerrProp');
        }
        const pen = Number(p.pendiente);
        if (!Number.isFinite(pen) || pen < -45 || pen > 45) {
            return this.valErr('PENDIENTE: entre −45 y 45°.', 'pendienteProp');
        }
        const ts = Number(p.tipoSuperf);
        if (!Number.isFinite(ts) || ts !== Math.floor(ts) || ts < 1 || ts > 8) {
            return this.valErr('TIPOSUPERF: entero entre 1 y 8.', 'tipoSuperfProp');
        }
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 5) {
            return this.valErr('ESTADO: entero entre 1 y 5.', 'estadoProp');
        }
        const nc = Number(p.numCarr);
        if (!Number.isFinite(nc) || nc !== Math.floor(nc) || nc < 1 || nc > 10) {
            return this.valErr('NUMCARR: entero entre 1 y 10.', 'numCarrProp');
        }
        const ac = Number(p.ancoCarr);
        if (!Number.isFinite(ac) || ac < 1 || ac > 5) return this.valErr('ANCOCARR: entre 1 y 5 m.', 'ancoCarrProp');
        const ab = Number(p.anchoBer);
        if (!Number.isFinite(ab) || ab < 0 || ab > 6) return this.valErr('ANCHOBERMA: entre 0 y 6 m.', 'anchoBerProp');
        const acu = Number(p.anchoCunt);
        if (!Number.isFinite(acu) || acu < 0 || acu > 4) return this.valErr('ANCHOCUNT: entre 0 y 4 m.', 'anchoCuntProp');
        const asep = Number(p.anchoSepar);
        if (!Number.isFinite(asep) || asep < 0 || asep > 50) {
            return this.valErr('ANCHOSEPAR: entre 0 y 50 m.', 'anchoSeparProp');
        }
        const cm = Number(p.codMunicipio);
        const cd = Number(p.codDepartamento);
        if (!Number.isFinite(cm) || cm < 1) return this.valErr('Indique COD_MUNICIPIO (DANE).', 'codMunicipioProp');
        if (!Number.isFinite(cd) || cd < 1 || cd > 999) {
            return this.valErr('COD_DEPARTAMENTO: entre 1 y 999.', 'codDepartamentoProp');
        }
        const mu = String(p.municipio ?? '').trim();
        const de = String(p.departamento ?? '').trim();
        if (mu.length < 4 || mu.length > 25) return this.valErr('MUNICIPIO: entre 4 y 25 caracteres.', 'municipioProp');
        if (de.length < 4 || de.length > 25) return this.valErr('DEPARTAMENTO: entre 4 y 25 caracteres.', 'departamentoProp');
        const g = this.eje?.ubicacion;
        if (
            g?.type !== 'LineString' ||
            !Array.isArray(g.coordinates) ||
            g.coordinates.length < 2
        ) {
            return this.valErr(
                'El eje debe tener una polilínea (geometría) con al menos 2 puntos para registrar propiedades del tramo.',
                'codigoViaText'
            );
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obs');
        }
        return null;
    }

    /** Tabla 14 — BERMA (McBerma), geometría línea. */
    private validarMcBermaCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpBerma');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) {
            return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufBerma');
        }
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) {
            return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyBerma');
        }
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) {
            return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munBerma');
        }
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depBerma');
        }
        const nt = Number(p.nivelTransito);
        if (!Number.isFinite(nt) || nt !== Math.floor(nt) || nt < 1 || nt > 5) {
            return this.valErr('NIVEL TRÁNSITO: 1–5 (DmNivelTransito).', 'ntBerma');
        }
        const tp = Number(p.tipoPavimento);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 4) {
            return this.valErr('TIPO PAVIMENTO: 1–4 (DmTipoPavimento).', 'tpBerma');
        }
        const ePrBer = this.errPrSeg(p, 'piBerma', 'pfBerma', 'diBerma', 'dfBerma');
        if (ePrBer) return ePrBer;
        const lon = Number(p.longitud);
        const ar = Number(p.areaBerma);
        const ap = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: mayor que 0 (m).', 'lonBerma');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e9) return this.valErr('ÁREA BERMA: mayor que 0 (m²).', 'areaBerma');
        if (!Number.isFinite(ap) || ap <= 0 || ap > 500) {
            return this.valErr('ANCHO PROMEDIO: mayor que 0 (m); cociente área/longitud.', 'apBerma');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasBerma');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        if (u?.type !== 'LineString' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Defina la geometría como línea (borde de berma de PR a PR).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsBerma');
        }
        return null;
    }

    /** Tabla 15 — CALZADA (McCalzada), geometría polígono. */
    private validarMcCalzadaCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpCalz');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufCalz');
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) {
            return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyCalz');
        }
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munCalz');
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depCalz');
        }
        const nt = Number(p.nivelTransito);
        if (!Number.isFinite(nt) || nt !== Math.floor(nt) || nt < 1 || nt > 5) return this.valErr('NIVEL TRÁNSITO: 1–5 (DmNivelTransito).', 'ntCalz');
        const tp = Number(p.tipoPavimento);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 4) return this.valErr('TIPO PAVIMENTO: 1–4 (DmTipoPavimento).', 'tpCalz');
        const idEp = Number(p.idEstructuraPavimento);
        if (!Number.isFinite(idEp) || idEp !== Math.floor(idEp) || idEp < 1 || idEp > 43) {
            return this.valErr('ID ESTRUCTURA PAVIMENTO: elija un código 1–43 (DmMaterialEstructPav, Tabla 38).', 'idEpCalz');
        }
        const ePrCalz = this.errPrSeg(p, 'piCalz', 'pfCalz', 'diCalz', 'dfCalz');
        if (ePrCalz) return ePrCalz;
        const lon = Number(p.longitud);
        const ar = Number(p.areaCalzada);
        const ap = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: mayor que 0 (m).', 'lonCalz');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e9) return this.valErr('ÁREA CALZADA: mayor que 0 (m²).', 'areaCalz');
        if (!Number.isFinite(ap) || ap <= 0 || ap > 500) return this.valErr('ANCHO PROMEDIO: mayor que 0 (m); cociente área/longitud.', 'apCalz');
        const ts = Number(p.tipoSubrasante);
        const ms = Number(p.materialSubrasante);
        if (!Number.isFinite(ts) || ts !== Math.floor(ts) || ts < 1 || ts > 3) {
            return this.valErr('TIPO SUBRASANTE: 1–3 (DmTipoSubrasante, Tabla 56).', 'tsCalz');
        }
        if (!Number.isFinite(ms) || ms !== Math.floor(ms) || ms < 1 || ms > 11) {
            return this.valErr('MATERIAL SUBRASANTE: 1–11 (DmMaterialSubrasante, Tabla 39).', 'msCalz');
        }
        const es = Number(p.espesorSubrasante);
        if (!Number.isFinite(es) || es < 0 || es > 20) return this.valErr('ESPESOR SUBRASANTE: 0–20 m.', 'esCalz');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasCalz');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        const ring = u?.coordinates?.[0];
        if (u?.type !== 'Polygon' || !Array.isArray(ring) || ring.length < 4) {
            return this.valErr('Defina un polígono cerrado del área de calzada (mínimo 3 vértices + cierre).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsCalz');
        }
        return null;
    }

    /** Tabla 17 — CICLORUTA (McCicloruta), geometría polígono (sin nivel de tránsito). */
    private validarMcCiclorutaCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpCiclo');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufCiclo');
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) {
            return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyCiclo');
        }
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munCiclo');
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depCiclo');
        }
        const tp = Number(p.tipoPavimento);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 4) return this.valErr('TIPO PAVIMENTO: 1–4 (DmTipoPavimento).', 'tpCiclo');
        const idEp = Number(p.idEstructuraPavimento);
        if (!Number.isFinite(idEp) || idEp !== Math.floor(idEp) || idEp < 1 || idEp > 43) {
            return this.valErr('ID ESTRUCTURA PAVIMENTO: elija un código 1–43 (DmMaterialEstructPav, Tabla 38).', 'idEpCiclo');
        }
        const ePrCi = this.errPrSeg(p, 'piCiclo', 'pfCiclo', 'diCiclo', 'dfCiclo');
        if (ePrCi) return ePrCi;
        const lon = Number(p.longitud);
        const ar = Number(p.areaCicloruta);
        const ap = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: mayor que 0 (m).', 'lonCiclo');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e9) return this.valErr('ÁREA CICLORUTA: mayor que 0 (m²).', 'areaCiclo');
        if (!Number.isFinite(ap) || ap <= 0 || ap > 500) return this.valErr('ANCHO PROMEDIO: mayor que 0 (m); cociente área/longitud.', 'apCiclo');
        const ts = Number(p.tipoSubrasante);
        const ms = Number(p.materialSubrasante);
        if (!Number.isFinite(ts) || ts !== Math.floor(ts) || ts < 1 || ts > 3) {
            return this.valErr('TIPO SUBRASANTE: 1–3 (DmTipoSubrasante, Tabla 56).', 'tsCiclo');
        }
        if (!Number.isFinite(ms) || ms !== Math.floor(ms) || ms < 1 || ms > 11) {
            return this.valErr('MATERIAL SUBRASANTE: 1–11 (DmMaterialSubrasante, Tabla 39).', 'msCiclo');
        }
        const es = Number(p.espesorSubrasante);
        if (!Number.isFinite(es) || es < 0 || es > 20) return this.valErr('ESPESOR SUBRASANTE: 0–20 m.', 'esCiclo');
        const st = Number(p.estado);
        if (!Number.isFinite(st) || st !== Math.floor(st) || st < 1 || st > 3) return this.valErr('ESTADO: 1–3 (DmEstado).', 'estadoCiclo');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasCiclo');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        const ring = u?.coordinates?.[0];
        if (u?.type !== 'Polygon' || !Array.isArray(ring) || ring.length < 4) {
            return this.valErr('Defina un polígono cerrado del área de cicloruta (mínimo 3 vértices + cierre).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsCiclo');
        }
        return null;
    }

    /** Tabla 18 — CUNETA (McCuneta), geometría línea. */
    private validarMcCunetaCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpCun');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufCun');
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyCun');
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munCun');
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depCun');
        }
        const ePrCu = this.errPrSeg(p, 'piCun', 'pfCun', 'diCun', 'dfCun');
        if (ePrCu) return ePrCu;
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: mayor que 0 (m).', 'lonCun');
        const sec = Number(p.seccion);
        if (!Number.isFinite(sec) || sec !== Math.floor(sec) || sec < 1 || sec > 4) {
            return this.valErr('SECCIÓN: 1–4 (DmSeccion).', 'secCun');
        }
        const mat = Number(p.material);
        if (!Number.isFinite(mat) || mat !== Math.floor(mat) || mat < 1 || mat > 3) {
            return this.valErr('MATERIAL: 1–3 (DmMaterial).', 'matCun');
        }
        const ars = Number(p.areaSeccion);
        if (!Number.isFinite(ars) || ars <= 0 || ars > 1e6) return this.valErr('ÁREA SECCIÓN: mayor que 0 (m²).', 'areaSecCun');
        const po = Number(p.porcPromSecObstruida);
        const pa = Number(p.porcAceptacion);
        if (!Number.isFinite(po) || po < 0 || po > 100) {
            return this.valErr('% PROM. SEC. OBSTRUIDA: 0–100.', 'porcObsCun');
        }
        if (!Number.isFinite(pa) || pa < 0 || pa > 100) return this.valErr('% ACEPTACIÓN: 0–100.', 'porcAceCun');
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 4) return this.valErr('ESTADO: 1–4 (DmEstado).', 'estCun');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasCun');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        if (u?.type !== 'LineString' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Defina la geometría como línea (cuneta de PR a PR).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsCun');
        }
        return null;
    }

    /** Tabla 16 — CCO (McCco), geometría polígono. */
    private validarMcCcoCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpCco');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufCco');
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyCco');
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munCco');
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depCco');
        }
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADO: 1–3 (DmEstado / operación del CCO).', 'estadoCco');
        }
        const ePrCc = this.errPrSeg(p, 'piCco', 'pfCco', 'diCco', 'dfCco');
        if (ePrCc) return ePrCc;
        const lon = Number(p.longitud);
        const ar = Number(p.areaCco);
        const ap = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: mayor que 0 (m).', 'lonCco');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e9) return this.valErr('ÁREA CCO: mayor que 0 (m²).', 'areaCco');
        if (!Number.isFinite(ap) || ap <= 0 || ap > 500) return this.valErr('ANCHO PROMEDIO: mayor que 0 (m); cociente área/longitud.', 'apCco');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasCco');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        const ring = u?.coordinates?.[0];
        if (u?.type !== 'Polygon' || !Array.isArray(ring) || ring.length < 4) {
            return this.valErr('Defina un polígono cerrado del área del CCO (mínimo 3 vértices + cierre).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsCco');
        }
        return null;
    }

    /** Tabla 19 — DEFENSA VIAL (McDefensaVial), geometría línea. */
    private validarMcDefensaVialCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpDv');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) {
            return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufDv');
        }
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) {
            return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyDv');
        }
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) {
            return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munDv');
        }
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depDv');
        }
        const ePrDv = this.errPrSeg(p, 'piDv', 'pfDv', 'diDv', 'dfDv');
        if (ePrDv) return ePrDv;
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADO: 1–3 (DmEstado).', 'estDv');
        }
        const cntErr = (v: any, mensaje: string, campo: string): SincValidacionError | null => {
            const n = Number(v);
            if (!Number.isFinite(n) || n !== Math.floor(n) || n < 0 || n > 9999) {
                return this.valErr(mensaje, campo);
            }
            return null;
        };
        const e1 = cntErr(p.numCaptafaro, 'Nº captafaros: entero entre 0 y 9 999.', 'ncapDv');
        if (e1) return e1;
        const e2 = cntErr(p.numModulos, 'Nº módulos: entero entre 0 y 9 999.', 'nmodDv');
        if (e2) return e2;
        const e3 = cntErr(p.numPostes, 'Nº postes: entero entre 0 y 9 999.', 'npostDv');
        if (e3) return e3;
        const e4 = cntErr(p.numSeparadores, 'Nº separadores: entero entre 0 y 9 999.', 'nsepDv');
        if (e4) return e4;
        const e5 = cntErr(p.numTerminales, 'Nº terminales: entero entre 0 y 9 999.', 'ntermDv');
        if (e5) return e5;
        const pint = Number(p.pintura);
        if (!Number.isFinite(pint) || pint !== Math.floor(pint) || pint < 1 || pint > 2) {
            return this.valErr('PINTURA: 1 Sí · 2 No (DmPintura).', 'pintDv');
        }
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) {
            return this.valErr('LONGITUD: mayor que 0 (m).', 'lonDv');
        }
        const mat = Number(p.material);
        if (!Number.isFinite(mat) || mat !== Math.floor(mat) || mat < 1 || mat > 3) {
            return this.valErr('MATERIAL: 1–3 (DmMaterial).', 'matDv');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasDv');
        const foto = String(p.foto ?? '').trim();
        const rf = String(p.rutaFoto ?? '').trim();
        if (foto.length > 0 || rf.length > 0) {
            if (foto.length < 4 || foto.length > 50) {
                return this.valErr(
                    'FOTO: entre 4 y 50 caracteres, o deje la foto vacía para agregarla después.',
                    SINC_CAMPO_FOTO
                );
            }
            if (rf.length < 10 || rf.length > 250) {
                return this.valErr(
                    'RUTAFOTO: entre 10 y 250 caracteres, o quite la foto para completarla después.',
                    SINC_CAMPO_FOTO
                );
            }
        }
        const u = p.ubicacion;
        if (u?.type !== 'LineString' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Defina la geometría como línea (defensa vial de PR a PR).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: si se usa, entre 10 y 250 caracteres.', 'obsDv');
        }
        return null;
    }

    /** Tabla 14 — DISPOSITIVOS ITS (McDispositivoIts), geometría punto. */
    private validarMcDispositivoItsCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpIts');
        const uf = Number(p.unidadFuncional);
        const pr = Number(p.proyecto);
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) {
            return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1 (DmUnidadFuncional).', 'ufIts');
        }
        if (!Number.isFinite(pr) || pr !== Math.floor(pr) || pr < 1) {
            return this.valErr('PROYECTO: entero ≥ 1 (DmProyectoCarretero).', 'proyIts');
        }
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) {
            return this.valErr('MUNICIPIO: entero ≥ 1 (DmMunicipio).', 'munIts');
        }
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) {
            return this.valErr('DEPARTAMENTO: entero ≥ 1 (DmDepartamento).', 'depIts');
        }
        const ipv6 = Number(p.tieneIPv6);
        if (!Number.isFinite(ipv6) || ipv6 !== Math.floor(ipv6) || ipv6 < 1 || ipv6 > 2) {
            return this.valErr('TIENE IPv6: 1 Sí · 2 No (DmTieneIPv6).', 'ipv6Its');
        }
        const ePtIt = this.errCodigoPr(p.punto, 'puntoIts');
        if (ePtIt) return ePtIt;
        const dist = Number(p.distanciaAlPunto);
        if (!Number.isFinite(dist) || dist < 0 || dist > 9999) {
            return this.valErr('DISTANCIA AL PUNTO: 0–9 999 m.', 'distIts');
        }
        const tipo = Number(p.tipo);
        if (!Number.isFinite(tipo) || tipo !== Math.floor(tipo) || tipo < 1 || tipo > 12) {
            return this.valErr('TIPO: 1–12 (DmTipoDispositivoITS).', 'tipoIts');
        }
        const est = Number(p.estado);
        if (!Number.isFinite(est) || est !== Math.floor(est) || est < 1 || est > 4) {
            return this.valErr('ESTADO DISPOSITIVO: 1–4 (DmEstadoDispositivoITS).', 'estIts');
        }
        const prot = Number(p.protocoloComunicacion);
        if (!Number.isFinite(prot) || prot !== Math.floor(prot) || prot < 1 || prot > 9) {
            return this.valErr('PROTOCOLO COMUNICACIÓN: 1–9 (DmProtocoloComunicacion).', 'protIts');
        }
        const sum = Number(p.tipoSuministroEnergetico);
        if (!Number.isFinite(sum) || sum !== Math.floor(sum) || sum < 1 || sum > 6) {
            return this.valErr('SUMINISTRO ENERGÉTICO: 1–6 (DmTipoSuministroEnergetico).', 'sumIts');
        }
        const med = Number(p.medioTransmision);
        if (!Number.isFinite(med) || med !== Math.floor(med) || med < 1 || med > 8) {
            return this.valErr('MEDIO TRANSMISIÓN: 1–8 (DmMedioTransmision).', 'medIts');
        }
        const sent = Number(p.sentidoTrafico);
        if (!Number.isFinite(sent) || sent !== Math.floor(sent) || sent < 1 || sent > 4) {
            return this.valErr('SENTIDO TRÁFICO: 1–4 (DmSentidoTrafico).', 'sentIts');
        }
        const estGen = Number(p.estadoGeneral);
        if (!Number.isFinite(estGen) || estGen !== Math.floor(estGen) || estGen < 1 || estGen > 3) {
            return this.valErr('ESTADO GENERAL: 1–3 (DmEstado).', 'estGenIts');
        }
        const idPeaje = p.idPeaje;
        if (idPeaje != null && idPeaje !== '') {
            const ip = Number(idPeaje);
            if (!Number.isFinite(ip) || ip !== Math.floor(ip) || ip < 0 || ip > 9999) {
                return this.valErr('ID PEAJE: entero 0–9 999 o vacío.', 'idPeajeIts');
            }
        }
        const pago = p.tienePagoElectronico;
        if (pago != null && pago !== '') {
            const pg = Number(pago);
            if (!Number.isFinite(pg) || pg !== Math.floor(pg) || pg < 1 || pg > 2) {
                return this.valErr('PAGO ELECTRÓNICO: 1 Sí · 2 No o vacío.', 'pagoIts');
            }
        }
        const nom = p.nombre;
        if (nom != null && nom !== '') {
            const n = Number(nom);
            if (!Number.isFinite(n) || n !== Math.floor(n) || n < 1 || n > 9999) {
                return this.valErr('NOMBRE (código peaje): entero 1–9 999 o vacío.', 'nombreIts');
            }
        }
        const peajeTxt = String(p.peaje ?? '').trim();
        if (peajeTxt.length > 200) return this.valErr('PEAJE (texto): máximo 200 caracteres.', 'peajeIts');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máximo 80 caracteres.', 'inviasIts');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Defina la geometría como punto (ubicación del dispositivo ITS).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBSERVACIONES: si se usan, entre 10 y 250 caracteres.', 'obsIts');
        }
        return null;
    }

    /** Normaliza campos PR en payload antes de validar / enviar. */
    private trimPayloadPrCodigo(payload: any, keys: string[]) {
        for (const k of keys) {
            if (payload[k] == null || payload[k] === '') {
                payload[k] = null;
                continue;
            }
            const s = String(payload[k]).trim();
            payload[k] = s === '' ? null : s;
        }
    }

    private errCodigoPr(val: unknown, campoForm: string): SincValidacionError | null {
        const s = String(val ?? '').trim();
        if (!s) return this.valErr('Indique el código de poste PR.', campoForm);
        if (s.length > SincEjeDetalleComponent.SINC_PR_MAX_LEN) {
            return this.valErr(
                `Código PR: máximo ${SincEjeDetalleComponent.SINC_PR_MAX_LEN} caracteres.`,
                campoForm
            );
        }
        return null;
    }

    /** Al abrir edición: registros viejos pueden tener PR numérico en Mongo. */
    private normalizarCamposPrEnFormulario(f: Record<string, unknown>) {
        for (const k of ['puntoInicial', 'puntoFinal', 'punto', 'codPr', 'numPr']) {
            const v = f[k];
            if (v != null && v !== '' && typeof v === 'number') f[k] = String(v);
        }
    }

    private errUf4(p: any, uf: string, pr: string, mu: string, de: string): SincValidacionError | null {
        const u = Number(p.unidadFuncional);
        const r = Number(p.proyecto);
        const m = Number(p.municipio);
        const d = Number(p.departamento);
        if (!Number.isFinite(u) || u !== Math.floor(u) || u < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1.', uf);
        if (!Number.isFinite(r) || r !== Math.floor(r) || r < 1) return this.valErr('PROYECTO: entero ≥ 1.', pr);
        if (!Number.isFinite(m) || m !== Math.floor(m) || m < 1) return this.valErr('MUNICIPIO: entero ≥ 1.', mu);
        if (!Number.isFinite(d) || d !== Math.floor(d) || d < 1) return this.valErr('DEPARTAMENTO: entero ≥ 1.', de);
        return null;
    }

    /** UF / proyecto / municipio / departamento: opcionales; si se diligencia, entero ≥ 1 (Mc Separador). */
    private errUf4OpcionalMcSeparador(
        p: any,
        uf: string,
        pr: string,
        mu: string,
        de: string
    ): SincValidacionError | null {
        const checks: { raw: unknown; label: string; token: string }[] = [
            { raw: p.unidadFuncional, label: 'UNIDAD FUNCIONAL', token: uf },
            { raw: p.proyecto, label: 'PROYECTO', token: pr },
            { raw: p.municipio, label: 'MUNICIPIO', token: mu },
            { raw: p.departamento, label: 'DEPARTAMENTO', token: de }
        ];
        for (const c of checks) {
            if (c.raw == null || c.raw === '') continue;
            const n = Number(c.raw);
            if (!Number.isFinite(n) || n !== Math.floor(n) || n < 1) {
                return this.valErr(`${c.label}: si se indica, entero ≥ 1.`, c.token);
            }
        }
        return null;
    }

    private errPrSeg(
        p: any,
        pi: string,
        pf: string,
        di: string,
        df: string
    ): SincValidacionError | null {
        const e1 = this.errCodigoPr(p.puntoInicial, pi);
        if (e1) return e1;
        const e2 = this.errCodigoPr(p.puntoFinal, pf);
        if (e2) return e2;
        const x = Number(p.distAPuntoInicial);
        const y = Number(p.distAPuntoFinal);
        if (!Number.isFinite(x) || x < 0 || x > 9999) return this.valErr('DIST. A PUNTO INICIAL: 0–9 999 m.', di);
        if (!Number.isFinite(y) || y < 0 || y > 9999) return this.valErr('DIST. A PUNTO FINAL: 0–9 999 m.', df);
        return null;
    }

    private errPoligonoMc(u: any): SincValidacionError | null {
        if (u?.type !== 'Polygon' || !Array.isArray(u.coordinates) || !u.coordinates[0]) {
            return this.valErr('Defina la geometría como polígono cerrado.', SINC_CAMPO_GEO);
        }
        const ring = u.coordinates[0];
        if (!Array.isArray(ring) || ring.length < 4) {
            return this.valErr('Polígono: al menos 4 vértices en el anillo exterior (cerrado).', SINC_CAMPO_GEO);
        }
        return null;
    }

    private validarMcDrenajeCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpDr');
        const e1 = this.errUf4(p, 'ufDr', 'proyDr', 'munDr', 'depDr');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piDr', 'pfDr', 'diDr', 'dfDr');
        if (e2) return e2;
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonDr');
        const an = Number(p.ancho);
        const dm = Number(p.diametro);
        if (!Number.isFinite(an) || an < 0 || an > 1000) return this.valErr('ANCHO: 0–1 000 (cociente m).', 'anDr');
        if (!Number.isFinite(dm) || dm < 0 || dm > 100) return this.valErr('DIÁMETRO: 0–100 m o equivalente.', 'diaDr');
        const ad = Number(p.areaDrenaje);
        if (!Number.isFinite(ad) || ad <= 0 || ad > 1e8) return this.valErr('ÁREA DRENAJE: > 0 (m²).', 'areaDr');
        const td = Number(p.tipoDrenaje);
        if (!Number.isFinite(td) || td !== Math.floor(td) || td < 1 || td > 11) {
            return this.valErr('TIPO DRENAJE: 1–11 (DmTipoDrenaje).', 'tipoDr');
        }
        const mat = Number(p.material);
        if (!Number.isFinite(mat) || mat !== Math.floor(mat) || mat < 1 || mat > 3) {
            return this.valErr('MATERIAL: 1–3 (DmMaterial).', 'matDr');
        }
        const ars = Number(p.areaSeccion);
        if (!Number.isFinite(ars) || ars <= 0 || ars > 1e6) return this.valErr('ÁREA SECCIÓN: > 0 (m²).', 'areaSecDr');
        const po = Number(p.porcPromSecObstruida);
        const pa = Number(p.porcAceptacion);
        if (!Number.isFinite(po) || po < 0 || po > 100) return this.valErr('% SEC. OBSTRUIDA: 0–100.', 'porcObsDr');
        if (!Number.isFinite(pa) || pa < 0 || pa > 100) return this.valErr('% ACEPTACIÓN: 0–100.', 'porcAceDr');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasDr');
        const u = p.ubicacion;
        if (u?.type !== 'LineString' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Geometría: línea de PR a PR (Tabla 21).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: 10–250 caracteres si se usa.', 'obsDr');
        }
        return null;
    }

    private validarMcPeajeCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpPe');
        const e1 = this.errUf4(p, 'ufPe', 'proyPe', 'munPe', 'depPe');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piPe', 'pfPe', 'diPe', 'dfPe');
        if (e2) return e2;
        const lon = Number(p.longitud);
        const ap = Number(p.areaPeaje);
        const an = Number(p.anchoPromedio);
        const ne = Number(p.numEstacionPago);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonPe');
        if (!Number.isFinite(ap) || ap <= 0 || ap > 1e8) return this.valErr('ÁREA PEAJE: > 0 (m²).', 'areaPe');
        if (!Number.isFinite(an) || an <= 0 || an > 5000) return this.valErr('ANCHO PROMEDIO: > 0 (m).', 'anchoPe');
        if (!Number.isFinite(ne) || ne !== Math.floor(ne) || ne < 1 || ne > 999) {
            return this.valErr('Nº ESTACIONES PAGO: entero 1–999.', 'nepPe');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasPe');
        return this.errPoligonoMc(p.ubicacion);
    }

    private validarMcPesajeCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpPs');
        const e1 = this.errUf4(p, 'ufPs', 'proyPs', 'munPs', 'depPs');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piPs', 'pfPs', 'diPs', 'dfPs');
        if (e2) return e2;
        const lon = Number(p.longitud);
        const ar = Number(p.areaEstacionPesaje);
        const an = Number(p.anchoPromedio);
        const es = Number(p.estado);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonPs');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e8) return this.valErr('ÁREA ESTACIÓN: > 0 (m²).', 'areaPs');
        if (!Number.isFinite(an) || an <= 0 || an > 5000) return this.valErr('ANCHO PROMEDIO: > 0 (m).', 'anchoPs');
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADO: 1–3 (DmEstado).', 'estPs');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasPs');
        return this.errPoligonoMc(p.ubicacion);
    }

    private validarMcLuminariaCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpLu');
        const uf = Number(p.unidadFuncional);
        if (!Number.isFinite(uf) || uf !== Math.floor(uf) || uf < 1) return this.valErr('UNIDAD FUNCIONAL: entero ≥ 1.', 'ufLu');
        const mu = Number(p.municipio);
        const de = Number(p.departamento);
        if (!Number.isFinite(mu) || mu !== Math.floor(mu) || mu < 1) return this.valErr('MUNICIPIO: entero ≥ 1.', 'munLu');
        if (!Number.isFinite(de) || de !== Math.floor(de) || de < 1) return this.valErr('DEPARTAMENTO: entero ≥ 1.', 'depLu');
        const prt = String(p.proyecto ?? '').trim();
        if (prt.length > 200) return this.valErr('PROYECTO (texto): máx. 200.', 'proyLu');
        const ePtLu = this.errCodigoPr(p.punto, 'puntoLu');
        if (ePtLu) return ePtLu;
        const dst = Number(p.distAPunto);
        if (!Number.isFinite(dst) || dst < 0 || dst > 9999) return this.valErr('DIST. A PUNTO: 0–9 999 m.', 'distLu');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasLu');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Geometría: punto (Tabla 25).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: 10–250 si se usa.', 'obsLu');
        }
        return null;
    }

    private validarMcMuroCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpMu');
        const e1 = this.errUf4(p, 'ufMu', 'proyMu', 'munMu', 'depMu');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piMu', 'pfMu', 'diMu', 'dfMu');
        if (e2) return e2;
        const lon = Number(p.longitud);
        const al = Number(p.altura);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonMu');
        if (!Number.isFinite(al) || al <= 0 || al > 500) return this.valErr('ALTURA: > 0 (m).', 'altMu');
        const tm = Number(p.tipoMuro);
        if (!Number.isFinite(tm) || tm !== Math.floor(tm) || tm < 1 || tm > 7) {
            return this.valErr('TIPO MURO: 1–7 (DmTipoMuro).', 'tipoMu');
        }
        const em = Number(p.estadoMaterial);
        if (!Number.isFinite(em) || em !== Math.floor(em) || em < 1 || em > 3) {
            return this.valErr('ESTADO MATERIAL: 1–3 (DmEstado).', 'estMatMu');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasMu');
        const u = p.ubicacion;
        if (u?.type !== 'LineString' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Geometría: línea (Tabla 26).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: 10–250 si se usa.', 'obsMu');
        }
        return null;
    }

    private validarMcPuenteCliente(p: any): SincValidacionError | null {
        if (!p.fechaInicioOperacion) return this.valErr('Indique FECHA INICIO OPERACIÓN.', 'fechaOpPu');
        const e1 = this.errUf4(p, 'ufPu', 'proyPu', 'munPu', 'depPu');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piPu', 'pfPu', 'diPu', 'dfPu');
        if (e2) return e2;
        const nom = String(p.nombre ?? '').trim();
        if (nom.length < 2 || nom.length > 200) return this.valErr('NOMBRE: 2–200 caracteres.', 'nomPu');
        const te = Number(p.tipoEstructura);
        const nt = Number(p.nivelTransito);
        if (!Number.isFinite(te) || te !== Math.floor(te) || te < 1 || te > 7) {
            return this.valErr('TIPO ESTRUCTURA: 1–7 (DmTipoEstructPuente).', 'tipoEstPu');
        }
        if (!Number.isFinite(nt) || nt !== Math.floor(nt) || nt < 1 || nt > 5) {
            return this.valErr('NIVEL TRÁNSITO: 1–5 (DmNivelTransito).', 'nivPu');
        }
        const lon = Number(p.longitud);
        const ar = Number(p.areaPuente);
        const an = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonPu');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e8) return this.valErr('ÁREA PUENTE: > 0 (m²).', 'areaPu');
        if (!Number.isFinite(an) || an <= 0 || an > 500) return this.valErr('ANCHO PROMEDIO: > 0 (m).', 'anchoPu');
        const nl = Number(p.numeroLuces);
        const lm = Number(p.luzMenor);
        const lM = Number(p.luzMayor);
        const lt = Number(p.longitudTotal);
        const at = Number(p.anchoTablero);
        const ga = Number(p.galibo);
        const intGe0 = (n: number) => Number.isFinite(n) && n === Math.floor(n) && n >= 0 && n <= 9999999;
        if (!intGe0(nl)) return this.valErr('NÚMERO LUCES: entero ≥ 0.', 'nlPu');
        if (!intGe0(lm)) return this.valErr('LUZ MENOR: entero ≥ 0.', 'lmPu');
        if (!intGe0(lM)) return this.valErr('LUZ MAYOR: entero ≥ 0.', 'lMPu');
        if (!intGe0(ga)) return this.valErr('GÁLIBO: entero ≥ 0.', 'galPu');
        if (!Number.isFinite(lt) || lt <= 0 || lt > 200000) return this.valErr('LONGITUD TOTAL: > 0 (m).', 'ltPu');
        if (!Number.isFinite(at) || at <= 0 || at > 200) return this.valErr('ANCHO TABLERO: > 0 (m).', 'atPu');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasPu');
        const eg = this.errPoligonoMc(p.ubicacion);
        if (eg) return eg;
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: 10–250 si se usa.', 'obsPu');
        }
        return null;
    }

    private validarMcSenalVerticalCliente(p: any): SincValidacionError | null {
        const eCp = this.errCodigoPr(p.codPr, 'codPrSv');
        if (eCp) return eCp;
        const ab = Number(p.abscisaPr);
        if (!Number.isFinite(ab) || ab < 0 || ab > 9999) return this.valErr('ABSCISA_PR: 0–9 999 m.', 'abscSv');
        const ts = String(p.tipoSenal ?? '').trim();
        if (!ts) {
            return this.valErr('Indique el código de señal desde el catálogo de señales verticales.', 'tipoSvMc');
        }
        const codSv = this.extraerCodigoSenVertDeTipoSenal(ts);
        if (!codSv) {
            return this.valErr('Código señal: debe corresponder al catálogo (formato código — descripción).', 'tipoSvMc');
        }
        if (this.catalogoSenVert.length > 0 && !this.esCodigoEnCatalogoSenVert(codSv)) {
            return this.valErr('Código señal: debe existir en el catálogo de señales verticales.', 'tipoSvMc');
        }
        if (ts.length > 250) return this.valErr('TIPO_SEÑAL: máx. 250 caracteres.', 'tipoSvMc');
        const u = p.ubicacion;
        if (!u || u.type !== 'Point' || !Array.isArray(u.coordinates) || u.coordinates.length < 2) {
            return this.valErr('Geometría: punto (Tabla 28).', SINC_CAMPO_GEO);
        }
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBSERVACION: 10–250 si se usa.', 'obs');
        }
        return null;
    }

    private validarMcSeparadorCliente(p: any): SincValidacionError | null {
        const e1 = this.errUf4OpcionalMcSeparador(p, 'ufSep', 'proySep', 'munSep', 'depSep');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piSep', 'pfSep', 'diSep', 'dfSep');
        if (e2) return e2;
        const tp = Number(p.tipoPavimento);
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 4) {
            return this.valErr('TIPO PAVIMENTO: 1–4 (DmTipoPavimento).', 'tpSep');
        }
        const lon = Number(p.longitud);
        const ar = Number(p.areaSeparador);
        const an = Number(p.anchoPromedio);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonSep');
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e8) return this.valErr('ÁREA SEPARADOR: > 0 (m²).', 'areaSep');
        if (!Number.isFinite(an) || an <= 0 || an > 5000) return this.valErr('ANCHO PROMEDIO: > 0 (m).', 'anchoSep');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasSep');
        return this.errPoligonoMc(p.ubicacion);
    }

    private validarMcTunelCliente(p: any): SincValidacionError | null {
        const e1 = this.errUf4(p, 'ufTn', 'proyTn', 'munTn', 'depTn');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piTn', 'pfTn', 'diTn', 'dfTn');
        if (e2) return e2;
        const nt = Number(p.nivelTransito);
        const tp = Number(p.tipoPavimento);
        if (!Number.isFinite(nt) || nt !== Math.floor(nt) || nt < 1 || nt > 5) {
            return this.valErr('NIVEL TRÁNSITO: 1–5.', 'nivTn');
        }
        if (!Number.isFinite(tp) || tp !== Math.floor(tp) || tp < 1 || tp > 4) {
            return this.valErr('TIPO PAVIMENTO: 1–4.', 'tpTn');
        }
        const lon = Number(p.longitud);
        if (!Number.isFinite(lon) || lon <= 0 || lon > 100000) return this.valErr('LONGITUD: > 0 (m).', 'lonTn');
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasTn');
        const eg = this.errPoligonoMc(p.ubicacion);
        if (eg) return eg;
        const obs = p.obs;
        if (obs != null && String(obs).trim() !== '') {
            const o = String(obs).trim();
            if (o.length < 10 || o.length > 250) return this.valErr('OBS: 10–250 si se usa.', 'obsTn');
        }
        return null;
    }

    private validarMcZonaCliente(p: any): SincValidacionError | null {
        const e1 = this.errUf4(p, 'ufZo', 'proyZo', 'munZo', 'depZo');
        if (e1) return e1;
        const e2 = this.errPrSeg(p, 'piZo', 'pfZo', 'diZo', 'dfZo');
        if (e2) return e2;
        const ar = Number(p.areaZonaServicio);
        if (!Number.isFinite(ar) || ar <= 0 || ar > 1e8) return this.valErr('ÁREA ZONA: > 0 (m²).', 'areaZo');
        const es = Number(p.estado);
        if (!Number.isFinite(es) || es !== Math.floor(es) || es < 1 || es > 3) {
            return this.valErr('ESTADO: 1–3 (DmEstado).', 'estZo');
        }
        const ci = String(p.codigoInvias ?? '').trim();
        if (ci.length > 80) return this.valErr('CODIGO INVIAS: máx. 80.', 'inviasZo');
        return this.errPoligonoMc(p.ubicacion);
    }

    onFotoPuenteChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;
        const file = files[0];
        this.fotosArchivos = [file];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.fotosPreview = [{ url: e.target?.result as string, nombre: file.name }];
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    onFotoMuroChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;
        const file = files[0];
        this.fotosArchivos = [file];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.fotosPreview = [{ url: e.target?.result as string, nombre: file.name }];
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    onFotoSitioChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;
        const file = files[0];
        this.fotosArchivos = [file];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.fotosPreview = [{ url: e.target?.result as string, nombre: file.name }];
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    onFotoDrenajeChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;
        const file = files[0];
        this.fotosArchivos = [file];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.fotosPreview = [{ url: e.target?.result as string, nombre: file.name }];
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    async guardarItem() {
        this.savingForm = true;
        this.formError  = '';
        this.limpiarMarcasValidacionEn(document.querySelector('.sub-form-panel'));
        try {
            const payload: any = { ...this.subForm };
            delete payload.rutafoto;

            if (this.tabActiva === 'fotos') {
                this.trimPayloadPrCodigo(payload, ['numPr']);
                payload.calzada = payload.calzada != null && payload.calzada !== '' ? Number(payload.calzada) : null;
                payload.codMunicipio =
                    payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== ''
                        ? Number(payload.codDepartamento)
                        : null;
                const errFot = this.validarFotoEjeCliente(payload);
                if (errFot) {
                    this.aplicarValidacionFallida(errFot.message, errFot.fields);
                    return;
                }
            }

            if (this.tabActiva === 'prs') {
                this.trimPayloadPrCodigo(payload, ['numPr']);
                payload.calzada = payload.calzada != null && payload.calzada !== '' ? Number(payload.calzada) : null;
                payload.distVerd = payload.distVerd != null && payload.distVerd !== '' ? Number(payload.distVerd) : null;
                payload.codMunicipio =
                    payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== ''
                        ? Number(payload.codDepartamento)
                        : null;
                const errPrs = this.validarPrsCliente(payload);
                if (errPrs) {
                    this.aplicarValidacionFallida(errPrs.message, errPrs.fields);
                    return;
                }
            }

            if (this.tabActiva === 'propiedades') {
                const toNumPr = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumPr('longitud');
                toNumPr('tipoTerr');
                toNumPr('pendiente');
                toNumPr('tipoSuperf');
                toNumPr('estado');
                toNumPr('numCarr');
                toNumPr('ancoCarr');
                toNumPr('anchoBer');
                toNumPr('anchoCunt');
                toNumPr('anchoSepar');
                toNumPr('codMunicipio');
                toNumPr('codDepartamento');
                toNumPr('abscisaIni');
                toNumPr('abscisaFin');
                const errProp = this.validarPropiedadesCliente(payload);
                if (errProp) {
                    this.aplicarValidacionFallida(errProp.message, errProp.fields);
                    return;
                }
            }

            if (this.tabActiva === 'puentes') {
                if (this.fotosArchivos.length > 0) {
                    const fd = new FormData();
                    this.fotosArchivos.forEach(f => fd.append('fotos', f));
                    const upRes: any = await this.apiService.uploadFile('/upload/sinc-puentes', fd).toPromise();
                    const urls: string[] = upRes.urls || [];
                    if (!urls.length) {
                        this.aplicarValidacionFallida('No se pudo subir la fotografía del puente.', [SINC_CAMPO_FOTO]);
                        return;
                    }
                    payload.rutaFoto = urls[0];
                    let fn = (this.fotosArchivos[0].name || 'foto.jpg').trim();
                    if (fn.length > 50) fn = fn.slice(0, 50);
                    if (fn.length < 4) fn = 'img.jpg';
                    payload.foto = fn;
                }
                payload.estadoSup = payload.estadoSup != null && payload.estadoSup !== '' ? Number(payload.estadoSup) : null;
                payload.estadoEst = payload.estadoEst != null && payload.estadoEst !== '' ? Number(payload.estadoEst) : null;
                const errPuente = this.validarPuentesCliente(payload);
                if (errPuente) {
                    this.aplicarValidacionFallida(errPuente.message, errPuente.fields);
                    return;
                }
                const f0 = String(payload.foto ?? '').trim();
                const r0 = String(payload.rutaFoto ?? '').trim();
                if (!f0 && !r0) {
                    delete payload.foto;
                    delete payload.rutaFoto;
                }
            }

            if (this.tabActiva === 'muros') {
                if (this.fotosArchivos.length > 0) {
                    const fd = new FormData();
                    this.fotosArchivos.forEach(f => fd.append('fotos', f));
                    const upRes: any = await this.apiService.uploadFile('/upload/sinc-muros', fd).toPromise();
                    const urls: string[] = upRes.urls || [];
                    if (!urls.length) {
                        this.aplicarValidacionFallida('No se pudo subir la fotografía del muro.', [SINC_CAMPO_FOTO]);
                        return;
                    }
                    payload.rutaFoto = urls[0];
                    let fn = (this.fotosArchivos[0].name || 'foto.jpg').trim();
                    if (fn.length > 50) fn = fn.slice(0, 50);
                    if (fn.length < 4) fn = 'img.jpg';
                    payload.foto = fn;
                }
                payload.lado = payload.lado != null && payload.lado !== '' ? Number(payload.lado) : null;
                payload.distIni = payload.distIni != null && payload.distIni !== '' ? Number(payload.distIni) : null;
                payload.longitud = payload.longitud != null && payload.longitud !== '' ? Number(payload.longitud) : null;
                payload.altura = payload.altura != null && payload.altura !== '' ? Number(payload.altura) : null;
                payload.anchoCor = payload.anchoCor != null && payload.anchoCor !== '' ? Number(payload.anchoCor) : null;
                payload.codMunicipio = payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== '' ? Number(payload.codDepartamento) : null;
                const errMuro = this.validarMurosCliente(payload);
                if (errMuro) {
                    this.aplicarValidacionFallida(errMuro.message, errMuro.fields);
                    return;
                }
                const fm = String(payload.foto ?? '').trim();
                const rm = String(payload.rutaFoto ?? '').trim();
                if (!fm && !rm) {
                    delete payload.foto;
                    delete payload.rutaFoto;
                }
            }

            if (this.tabActiva === 'tuneles') {
                payload.estado = payload.estado != null && payload.estado !== '' ? Number(payload.estado) : null;
                payload.distIni = payload.distIni != null && payload.distIni !== '' ? Number(payload.distIni) : null;
                payload.longitud = payload.longitud != null && payload.longitud !== '' ? Number(payload.longitud) : null;
                payload.numCarr = payload.numCarr != null && payload.numCarr !== '' ? Number(payload.numCarr) : null;
                payload.ancoCarr = payload.ancoCarr != null && payload.ancoCarr !== '' ? Number(payload.ancoCarr) : null;
                payload.codMunicipio = payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== '' ? Number(payload.codDepartamento) : null;
                const errTunel = this.validarTunelesCliente(payload);
                if (errTunel) {
                    this.aplicarValidacionFallida(errTunel.message, errTunel.fields);
                    return;
                }
            }

            if (this.tabActiva === 'sitios') {
                if (this.fotosArchivos.length > 0) {
                    const fd = new FormData();
                    this.fotosArchivos.forEach(f => fd.append('fotos', f));
                    const upRes: any = await this.apiService.uploadFile('/upload/sinc-sitios', fd).toPromise();
                    const urls: string[] = upRes.urls || [];
                    if (!urls.length) {
                        this.aplicarValidacionFallida('No se pudo subir la fotografía del sitio crítico.', [SINC_CAMPO_FOTO]);
                        return;
                    }
                    payload.rutaFoto = urls[0];
                    let fn = (this.fotosArchivos[0].name || 'foto.jpg').trim();
                    if (fn.length > 50) fn = fn.slice(0, 50);
                    if (fn.length < 4) fn = 'img.jpg';
                    payload.foto = fn;
                }
                payload.lado = payload.lado != null && payload.lado !== '' ? Number(payload.lado) : null;
                payload.tipo = payload.tipo != null && payload.tipo !== '' ? Number(payload.tipo) : null;
                payload.severidad = payload.severidad != null && payload.severidad !== '' ? Number(payload.severidad) : null;
                payload.codMunicipio = payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== '' ? Number(payload.codDepartamento) : null;
                const errSitio = this.validarSitiosCliente(payload);
                if (errSitio) {
                    this.aplicarValidacionFallida(errSitio.message, errSitio.fields);
                    return;
                }
                const fs = String(payload.foto ?? '').trim();
                const rs = String(payload.rutaFoto ?? '').trim();
                if (!fs && !rs) {
                    delete payload.foto;
                    delete payload.rutaFoto;
                }
            }

            if (this.tabActiva === 'drenaje') {
                if (this.fotosArchivos.length > 0) {
                    const fd = new FormData();
                    this.fotosArchivos.forEach(f => fd.append('fotos', f));
                    const upRes: any = await this.apiService.uploadFile('/upload/sinc-drenaje', fd).toPromise();
                    const urls: string[] = upRes.urls || [];
                    if (!urls.length) {
                        this.aplicarValidacionFallida('No se pudo subir la fotografía de la obra de drenaje.', [SINC_CAMPO_FOTO]);
                        return;
                    }
                    payload.rutaFoto = urls[0];
                    let fn = (this.fotosArchivos[0].name || 'foto.jpg').trim();
                    if (fn.length > 50) fn = fn.slice(0, 50);
                    if (fn.length < 4) fn = 'img.jpg';
                    payload.foto = fn;
                }
                payload.tipo = payload.tipo != null && payload.tipo !== '' ? Number(payload.tipo) : null;
                payload.material = payload.material != null && payload.material !== '' ? Number(payload.material) : null;
                payload.estadoServ = payload.estadoServ != null && payload.estadoServ !== '' ? Number(payload.estadoServ) : null;
                payload.estadoGen = payload.estadoGen != null && payload.estadoGen !== '' ? Number(payload.estadoGen) : null;
                payload.numSecc = payload.numSecc != null && payload.numSecc !== '' ? Number(payload.numSecc) : null;
                payload.ancho = payload.ancho != null && payload.ancho !== '' ? Number(payload.ancho) : null;
                payload.longitud = payload.longitud != null && payload.longitud !== '' ? Number(payload.longitud) : null;
                payload.codMunicipio = payload.codMunicipio != null && payload.codMunicipio !== '' ? Number(payload.codMunicipio) : null;
                payload.codDepartamento =
                    payload.codDepartamento != null && payload.codDepartamento !== '' ? Number(payload.codDepartamento) : null;
                if (payload.fecha == null || payload.fecha === '') {
                    delete payload.fecha;
                }
                const errObd = this.validarObrasDrenajeCliente(payload);
                if (errObd) {
                    this.aplicarValidacionFallida(errObd.message, errObd.fields);
                    return;
                }
                const fo = String(payload.foto ?? '').trim();
                const ro = String(payload.rutaFoto ?? '').trim();
                if (!fo && !ro) {
                    delete payload.foto;
                    delete payload.rutaFoto;
                }
            }

            if (isMcTab(this.tabActiva) && this.tabActiva !== 'mcIts' && this.fotosArchivos.length > 0) {
                const fd = new FormData();
                this.fotosArchivos.forEach(f => fd.append('fotos', f));
                const upRes: any = await this.apiService.uploadFile('/upload/sinc-mc', fd).toPromise();
                const urls: string[] = upRes.urls || [];
                if (!urls.length) {
                    this.aplicarValidacionFallida('No se pudo subir la fotografía.', [SINC_CAMPO_FOTO]);
                    return;
                }
                payload.rutaFoto = urls[0];
                let fn = (this.fotosArchivos[0].name || 'foto.jpg').trim();
                if (fn.length > 50) fn = fn.slice(0, 50);
                if (fn.length < 4) fn = 'img.jpg';
                payload.foto = fn;
            }

            if (this.tabActiva === 'mcBerma') {
                if (!this.editItem) delete payload.idBerma;
                const toNum = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNum('unidadFuncional');
                toNum('proyecto');
                toNum('municipio');
                toNum('departamento');
                toNum('nivelTransito');
                toNum('tipoPavimento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNum('distAPuntoInicial');
                toNum('distAPuntoFinal');
                toNum('longitud');
                toNum('areaBerma');
                toNum('anchoPromedio');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errBer = this.validarMcBermaCliente(payload);
                if (errBer) {
                    this.aplicarValidacionFallida(errBer.message, errBer.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcCalzada') {
                if (!this.editItem) delete payload.idCalzada;
                const toNumC = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumC('unidadFuncional');
                toNumC('proyecto');
                toNumC('municipio');
                toNumC('departamento');
                toNumC('nivelTransito');
                toNumC('tipoPavimento');
                toNumC('idEstructuraPavimento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNumC('distAPuntoInicial');
                toNumC('distAPuntoFinal');
                toNumC('longitud');
                toNumC('areaCalzada');
                toNumC('anchoPromedio');
                toNumC('tipoSubrasante');
                toNumC('materialSubrasante');
                toNumC('espesorSubrasante');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errCal = this.validarMcCalzadaCliente(payload);
                if (errCal) {
                    this.aplicarValidacionFallida(errCal.message, errCal.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcCco') {
                if (!this.editItem) delete payload.idCco;
                const toNumCc = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumCc('unidadFuncional');
                toNumCc('proyecto');
                toNumCc('municipio');
                toNumCc('departamento');
                toNumCc('estado');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNumCc('distAPuntoInicial');
                toNumCc('distAPuntoFinal');
                toNumCc('longitud');
                toNumCc('areaCco');
                toNumCc('anchoPromedio');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errCco = this.validarMcCcoCliente(payload);
                if (errCco) {
                    this.aplicarValidacionFallida(errCco.message, errCco.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcCicloruta') {
                if (!this.editItem) delete payload.idCicloruta;
                const toNumCi = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumCi('unidadFuncional');
                toNumCi('proyecto');
                toNumCi('municipio');
                toNumCi('departamento');
                toNumCi('tipoPavimento');
                toNumCi('idEstructuraPavimento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNumCi('distAPuntoInicial');
                toNumCi('distAPuntoFinal');
                toNumCi('longitud');
                toNumCi('areaCicloruta');
                toNumCi('anchoPromedio');
                toNumCi('tipoSubrasante');
                toNumCi('materialSubrasante');
                toNumCi('espesorSubrasante');
                toNumCi('estado');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errCi = this.validarMcCiclorutaCliente(payload);
                if (errCi) {
                    this.aplicarValidacionFallida(errCi.message, errCi.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcCuneta') {
                if (!this.editItem) delete payload.idCuneta;
                const toNumCu = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumCu('unidadFuncional');
                toNumCu('proyecto');
                toNumCu('municipio');
                toNumCu('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNumCu('distAPuntoInicial');
                toNumCu('distAPuntoFinal');
                toNumCu('longitud');
                toNumCu('seccion');
                toNumCu('material');
                toNumCu('areaSeccion');
                toNumCu('porcPromSecObstruida');
                toNumCu('porcAceptacion');
                toNumCu('estado');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errCu = this.validarMcCunetaCliente(payload);
                if (errCu) {
                    this.aplicarValidacionFallida(errCu.message, errCu.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcDefensaVial') {
                if (!this.editItem) delete payload.idDefensaVial;
                const toNumDv = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumDv('unidadFuncional');
                toNumDv('proyecto');
                toNumDv('municipio');
                toNumDv('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toNumDv('distAPuntoInicial');
                toNumDv('distAPuntoFinal');
                toNumDv('estado');
                toNumDv('numCaptafaro');
                toNumDv('numModulos');
                toNumDv('numPostes');
                toNumDv('numSeparadores');
                toNumDv('numTerminales');
                toNumDv('pintura');
                toNumDv('longitud');
                toNumDv('material');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errDv = this.validarMcDefensaVialCliente(payload);
                if (errDv) {
                    this.aplicarValidacionFallida(errDv.message, errDv.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcIts') {
                if (!this.editItem) delete payload.idDispositivo;
                delete payload.numPr;
                delete payload.descripcion;
                const toNumIt = (k: string) => {
                    const x = payload[k];
                    payload[k] = x != null && x !== '' ? Number(x) : null;
                };
                toNumIt('unidadFuncional');
                toNumIt('proyecto');
                toNumIt('municipio');
                toNumIt('departamento');
                toNumIt('tieneIPv6');
                this.trimPayloadPrCodigo(payload, ['punto']);
                toNumIt('distanciaAlPunto');
                toNumIt('idPeaje');
                toNumIt('tienePagoElectronico');
                toNumIt('nombre');
                toNumIt('tipo');
                toNumIt('estado');
                toNumIt('protocoloComunicacion');
                toNumIt('tipoSuministroEnergetico');
                toNumIt('medioTransmision');
                toNumIt('sentidoTrafico');
                toNumIt('estadoGeneral');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                payload.peaje = String(payload.peaje ?? '').trim();
                if (payload.idPeaje === '' || payload.idPeaje == null) payload.idPeaje = null;
                if (payload.tienePagoElectronico === '' || payload.tienePagoElectronico == null) {
                    payload.tienePagoElectronico = null;
                }
                if (payload.nombre === '' || payload.nombre == null) payload.nombre = null;
                const errIt = this.validarMcDispositivoItsCliente(payload);
                if (errIt) {
                    this.aplicarValidacionFallida(errIt.message, errIt.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                if (payload.peaje === '') delete payload.peaje;
                delete payload.foto;
                delete payload.rutaFoto;
                payload.fecha = payload.fechaInicioOperacion;
            }

            const toN = (k: string) => {
                const x = payload[k];
                payload[k] = x != null && x !== '' ? Number(x) : null;
            };

            if (this.tabActiva === 'mcDrenaje') {
                if (!this.editItem) delete payload.idDrenaje;
                delete payload.numPr;
                delete payload.tipo;
                delete payload.numSecc;
                delete payload.estadoServ;
                delete payload.estadoGen;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('ancho');
                toN('diametro');
                toN('areaDrenaje');
                toN('tipoDrenaje');
                toN('material');
                toN('areaSeccion');
                toN('porcPromSecObstruida');
                toN('porcAceptacion');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errDr = this.validarMcDrenajeCliente(payload);
                if (errDr) {
                    this.aplicarValidacionFallida(errDr.message, errDr.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcPeaje') {
                if (!this.editItem) delete payload.idPeaje;
                delete payload.nombre;
                delete payload.numCarriles;
                delete payload.tipo;
                delete payload.estado;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('areaPeaje');
                toN('anchoPromedio');
                toN('numEstacionPago');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                if (payload.fechaInstalacion === '' || payload.fechaInstalacion == null) {
                    payload.fechaInstalacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errPe = this.validarMcPeajeCliente(payload);
                if (errPe) {
                    this.aplicarValidacionFallida(errPe.message, errPe.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcPesaje') {
                if (!this.editItem) delete payload.idEstacionPesaje;
                delete payload.nombre;
                delete payload.capacidadTn;
                delete payload.tipo;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('areaEstacionPesaje');
                toN('anchoPromedio');
                toN('estado');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errPs = this.validarMcPesajeCliente(payload);
                if (errPs) {
                    this.aplicarValidacionFallida(errPs.message, errPs.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcLuminaria') {
                if (!this.editItem) delete payload.idLuminaria;
                delete payload.numPr;
                delete payload.tipo;
                delete payload.potenciaW;
                delete payload.estado;
                delete payload.lado;
                toN('unidadFuncional');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['punto']);
                toN('distAPunto');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                payload.proyecto = String(payload.proyecto ?? '').trim();
                const errLu = this.validarMcLuminariaCliente(payload);
                if (errLu) {
                    this.aplicarValidacionFallida(errLu.message, errLu.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                if (payload.proyecto === '') delete payload.proyecto;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcMuro') {
                if (!this.editItem) delete payload.idMuro;
                delete payload.abscisaIni;
                delete payload.abscisaFin;
                delete payload.tipo;
                delete payload.material;
                delete payload.estado;
                delete payload.lado;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('altura');
                toN('tipoMuro');
                toN('estadoMaterial');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errMu = this.validarMcMuroCliente(payload);
                if (errMu) {
                    this.aplicarValidacionFallida(errMu.message, errMu.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcPuente') {
                if (!this.editItem) delete payload.idPuente;
                delete payload.numPr;
                delete payload.ancho;
                delete payload.numVias;
                delete payload.tipoEstruc;
                delete payload.material;
                delete payload.estadoSup;
                delete payload.estadoEst;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                toN('tipoEstructura');
                toN('nivelTransito');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('areaPuente');
                toN('anchoPromedio');
                toN('numeroLuces');
                toN('luzMenor');
                toN('longitudTotal');
                toN('luzMayor');
                toN('anchoTablero');
                toN('galibo');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                payload.nombre = String(payload.nombre ?? '').trim();
                const errPu = this.validarMcPuenteCliente(payload);
                if (errPu) {
                    this.aplicarValidacionFallida(errPu.message, errPu.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcSenalV') {
                if (!this.editItem) delete payload.idSenalVertical;
                delete payload.numPr;
                delete payload.estado;
                delete payload.lado;
                delete payload.fechaInst;
                const strTrim = (k: string) => {
                    if (payload[k] == null) return;
                    payload[k] = String(payload[k]).trim();
                    if (payload[k] === '') delete payload[k];
                };
                [
                    'ansvId', 'codigoInterno', 'claseSenal', 'tipoSenal', 'ladoSenal', 'formaSenal', 'estadoSenal',
                    'ubicaSenal', 'dimSenal', 'faseSenal', 'soporteSenal', 'estadoSoporte', 'materialPlaca',
                    'laminaRefectante', 'accionSenal', 'entidadTerr', 'codDepto',
                    'departamentoUbic', 'municipioUbic', 'divipola',
                    'codVia', 'respVia', 'nomVial', 'claseVia', 'calzada', 'sentido', 'nomSectorVia', 'tipoSup', 'codPr'
                ].forEach(strTrim);
                const jig = this.valoresTerritorioDesdeJornadaMcSv();
                if (jig.idJornada) {
                    payload.idJornada = jig.idJornada;
                    payload.codDepto = jig.codDepto;
                    payload.departamentoUbic = jig.departamentoUbic;
                    payload.municipioUbic = jig.municipioUbic;
                    payload.divipola = jig.divipola;
                }
                delete payload.codMunicipio;
                const vig = this.valoresViaDesdeEjeMcSv();
                if (this.eje) {
                    payload.codVia = vig.codVia;
                    payload.nomVial = vig.nomVial;
                }
                if (vig.sentido) payload.sentido = vig.sentido;
                if (vig.calzada) payload.calzada = vig.calzada;
                if (vig.carriles != null) payload.carriles = vig.carriles;
                if (vig.tipoSup) payload.tipoSup = vig.tipoSup;
                toN('idSenal');
                toN('velSenal');
                toN('carriles');
                toN('abscisaPr');
                if (payload.fecInstal === '' || payload.fecInstal == null) payload.fecInstal = null;
                if (payload.fecAccion === '' || payload.fecAccion == null) payload.fecAccion = null;
                const errSv = this.validarMcSenalVerticalCliente(payload);
                if (errSv) {
                    this.aplicarValidacionFallida(errSv.message, errSv.fields);
                    return;
                }
                payload.fecha = payload.fecInstal;
            }

            if (this.tabActiva === 'mcSeparador') {
                if (!this.editItem) delete payload.idSeparador;
                delete payload.abscisaIni;
                delete payload.abscisaFin;
                delete payload.ancho;
                delete payload.tipo;
                delete payload.material;
                delete payload.estado;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                toN('tipoPavimento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                toN('areaSeparador');
                toN('anchoPromedio');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errSep = this.validarMcSeparadorCliente(payload);
                if (errSep) {
                    this.aplicarValidacionFallida(errSep.message, errSep.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcTunel') {
                if (!this.editItem) delete payload.idTunel;
                delete payload.numPr;
                delete payload.nombre;
                delete payload.galibo;
                delete payload.numTubos;
                delete payload.tipo;
                delete payload.estado;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                toN('nivelTransito');
                toN('tipoPavimento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('longitud');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errTn = this.validarMcTunelCliente(payload);
                if (errTn) {
                    this.aplicarValidacionFallida(errTn.message, errTn.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (this.tabActiva === 'mcZona') {
                if (!this.editItem) delete payload.idZonaServicio;
                delete payload.nombre;
                delete payload.tipo;
                delete payload.areaM2;
                toN('unidadFuncional');
                toN('proyecto');
                toN('municipio');
                toN('departamento');
                this.trimPayloadPrCodigo(payload, ['puntoInicial', 'puntoFinal']);
                toN('distAPuntoInicial');
                toN('distAPuntoFinal');
                toN('areaZonaServicio');
                toN('estado');
                if (payload.fechaInicioOperacion === '' || payload.fechaInicioOperacion == null) {
                    payload.fechaInicioOperacion = null;
                }
                payload.codigoInvias = String(payload.codigoInvias ?? '').trim();
                const errZo = this.validarMcZonaCliente(payload);
                if (errZo) {
                    this.aplicarValidacionFallida(errZo.message, errZo.fields);
                    return;
                }
                if (payload.codigoInvias === '') delete payload.codigoInvias;
                payload.fecha = payload.fechaInicioOperacion;
            }

            if (isMcTab(this.tabActiva)) {
                const fm = String(payload.foto ?? '').trim();
                const rm = String(payload.rutaFoto ?? '').trim();
                if (!fm && !rm) {
                    delete payload.foto;
                    delete payload.rutaFoto;
                }
            }

            // Propiedades: la UI indica que la geometría es la polilínea del eje — copiarla aquí.
            if (this.tabActiva === 'propiedades') {
                const g = this.eje?.ubicacion;
                if (
                    g?.type === 'LineString' &&
                    Array.isArray(g.coordinates) &&
                    g.coordinates.length >= 2
                ) {
                    payload.ubicacion = {
                        type: 'LineString',
                        coordinates: g.coordinates.map((pair: number[]) => [
                            Number(pair[0]),
                            Number(pair[1])
                        ])
                    };
                } else {
                    delete payload.ubicacion;
                }
            } else if (payload.ubicacion === null || payload.ubicacion === undefined) {
                delete payload.ubicacion;
            }
            if (isMcTab(this.tabActiva) && this.tabActiva !== 'mcSenalV') {
                this.aplicarTerritorioJornadaAlPayloadMcNoSv(payload);
            }
            this.sanitizeGeoPayload(payload);
            if (this.editItem) {
                await this.doUpdate(this.tabActiva, this.editItem._id, payload);
            } else {
                await this.doCreate(this.tabActiva, payload);
            }
            const panelAntesCerrar = document.querySelector('.sub-form-panel');
            this.showForm = false;
            this.limpiarMarcasValidacionEn(panelAntesCerrar);
            this.cargarTab(this.tabActiva);
            this.cargarResumen();
        } catch (err: any) {
            this.formError = err?.error?.message || err?.message || 'Error al guardar';
        } finally {
            this.savingForm = false;
        }
    }

    private doCreate(tab: Tab, data: any): Promise<any> {
        if (isMcTab(tab)) return this.sincService.createMc(MC_CAPA[tab], data).toPromise();
        switch (tab as BasicoTab) {
            case 'fotos':       return this.sincService.createFotoEje(data).toPromise();
            case 'prs':         return this.sincService.createPrs(data).toPromise();
            case 'propiedades': return this.sincService.createPropiedades(data).toPromise();
            case 'puentes':     return this.sincService.createPuente(data).toPromise();
            case 'muros':       return this.sincService.createMuro(data).toPromise();
            case 'tuneles':     return this.sincService.createTunel(data).toPromise();
            case 'sitios':      return this.sincService.createSitio(data).toPromise();
            case 'drenaje':     return this.sincService.createObra(data).toPromise();
        }
    }

    private doUpdate(tab: Tab, id: string, data: any): Promise<any> {
        if (isMcTab(tab)) return this.sincService.updateMc(MC_CAPA[tab], id, data).toPromise();
        switch (tab as BasicoTab) {
            case 'fotos':       return this.sincService.updateFotoEje(id, data).toPromise();
            case 'prs':         return this.sincService.updatePrs(id, data).toPromise();
            case 'propiedades': return this.sincService.updatePropiedades(id, data).toPromise();
            case 'puentes':     return this.sincService.updatePuente(id, data).toPromise();
            case 'muros':       return this.sincService.updateMuro(id, data).toPromise();
            case 'tuneles':     return this.sincService.updateTunel(id, data).toPromise();
            case 'sitios':      return this.sincService.updateSitio(id, data).toPromise();
            case 'drenaje':     return this.sincService.updateObra(id, data).toPromise();
        }
    }

    eliminarItem(item: any) {
        this.confirmDialog.confirm({ title: '¿Eliminar este elemento?', variant: 'danger', icon: 'delete' }).subscribe(ok => {
            if (!ok) return;
            const del$ = isMcTab(this.tabActiva)
                ? this.sincService.deleteMc(MC_CAPA[this.tabActiva], item._id)
                : this.doDeleteBasico(this.tabActiva as BasicoTab, item._id);
            del$.subscribe({
                next: () => { this.cargarTab(this.tabActiva); this.cargarResumen(); },
                error: (err: any) => alert('Error: ' + err.message)
            });
        });
    }

    private doDeleteBasico(tab: BasicoTab, id: string) {
        switch (tab) {
            case 'fotos':       return this.sincService.deleteFotoEje(id);
            case 'prs':         return this.sincService.deletePrs(id);
            case 'propiedades': return this.sincService.deletePropiedades(id);
            case 'puentes':     return this.sincService.deletePuente(id);
            case 'muros':       return this.sincService.deleteMuro(id);
            case 'tuneles':     return this.sincService.deleteTunel(id);
            case 'sitios':      return this.sincService.deleteSitio(id);
            case 'drenaje':     return this.sincService.deleteObra(id);
        }
    }

    // ─── FOTOS SUB-ELEMENTO ───────────────────────────────────────────────────

    onFotoSub(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;
        const file = files[0];
        this.fotosArchivos = [file];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.fotosPreview = [{ url: e.target?.result as string, nombre: file.name }];
        };
        reader.readAsDataURL(file);
        input.value = '';
    }
    eliminarFotoSub(i: number) { this.fotosPreview.splice(i, 1); this.fotosArchivos.splice(i, 1); }

    // ─── Catálogo SenVert → Tipo_Señal (Mc) ───────────────────────────────────

    /** Código de catálogo a partir de Tipo_Señal guardado (`COD — descripción` o solo código). */
    extraerCodigoSenVertDeTipoSenal(raw: unknown): string {
        const t = String(raw ?? '').trim();
        if (!t) return '';
        const sep = ' — ';
        const i = t.indexOf(sep);
        return (i >= 0 ? t.slice(0, i) : t).trim();
    }

    private esCodigoEnCatalogoSenVert(cod: string): boolean {
        if (!cod) return false;
        return this.catalogoSenVert.some(s => String(s.codSenVert ?? '').trim() === cod);
    }

    /** Tras cargar edición: miniatura y estado de “seleccionada” para Tipo_Señal. */
    private restaurarSenVertMcDesdeTipoSenal(): void {
        const ts = String(this.subForm.tipoSenal ?? '').trim();
        const cod = this.extraerCodigoSenVertDeTipoSenal(ts);
        this.senVertSeleccionadaMc = null;
        if (!cod) return;
        const enCat = this.catalogoSenVert.find(s => String(s.codSenVert ?? '').trim() === cod);
        if (enCat) {
            this.senVertSeleccionadaMc = enCat;
            return;
        }
        const resto = ts.includes(' — ') ? ts.split(' — ').slice(1).join(' — ').trim() : ts;
        this.senVertSeleccionadaMc = { codSenVert: cod, descSenVert: resto || cod } as any;
    }

    get catalogoFiltradoMcSV(): any[] {
        if (!this.filtroCatalogoSvMc.trim()) return this.catalogoSenVert;
        const q = this.filtroCatalogoSvMc.toLowerCase();
        return this.catalogoSenVert.filter(s =>
            (s.codSenVert || '').toLowerCase().includes(q) ||
            (s.descSenVert || '').toLowerCase().includes(q) ||
            (s.clasificacion || '').toLowerCase().includes(q)
        );
    }

    seleccionarSenVertMcTipoSenal(sv: any) {
        this.senVertSeleccionadaMc = sv;
        this.subForm.tipoSenal = [sv.codSenVert, sv.descSenVert].filter(Boolean).join(' — ');
        if (!String(this.subForm.codigoInterno ?? '').trim()) {
            this.subForm.codigoInterno = String(sv.codSenVert ?? '').trim();
        }
        if (!String(this.subForm.claseSenal ?? '').trim() && sv.clasificacion) {
            this.subForm.claseSenal = String(sv.clasificacion).trim();
        }
        this.mostrarGaleriaSvMc   = false;
        this.filtroCatalogoSvMc   = '';
    }

    quitarSenVertMcTipoSenal() {
        this.senVertSeleccionadaMc = null;
        this.subForm.tipoSenal      = '';
    }

    getImgUrlMcSV(sv: any): string {
        if (!sv?.urlImgSenVert) return '';
        return `${this.apiUrl}${sv.urlImgSenVert}`;
    }

    // ─── MAPA (Point / LineString / Polygon) ─────────────────────────────────

    /** Punto en mapa SINC: divIcon (no depende de /marker-icon.png en el origen de la app). */
    private iconoMarcaPuntoSinc(L: any) {
        return L.divIcon({
            className: '',
            html:
                '<div style="width:32px;height:32px;background:#1e5eff;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);font-size:17px;line-height:1;">📍</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28],
        });
    }

    abrirMapa() {
        // Determinar modo de geometría según la tab activa
        if (isMcTab(this.tabActiva)) {
            this.geoMode = MC_GEO[this.tabActiva];
        } else {
            this.geoMode = this.tabActiva === 'propiedades' ? 'LineString' : 'Point';
        }
        this.marcadores = [];
        this.mapaAbierto = true;
        setTimeout(() => this.iniciarMapa(), 100);
    }

    iniciarMapa() {
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
        const el = document.getElementById('sinc-sub-mapa');
        if (!el) return;

        const centro = this.eje?.ubicacion?.coordinates?.[0]
            ? [this.eje.ubicacion.coordinates[0][1], this.eje.ubicacion.coordinates[0][0]]
            : [4.6, -74.1];

        this.leafletMap = L.map(el).setView(centro, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.leafletMap);

        // Eje de fondo
        if (this.eje?.ubicacion?.coordinates?.length > 1) {
            const coords = this.eje.ubicacion.coordinates.map((c: number[]) => [c[1], c[0]]);
            L.polyline(coords, { color: '#ef6c00', weight: 3, opacity: 0.5 }).addTo(this.leafletMap);
            this.leafletMap.fitBounds(L.polyline(coords).getBounds(), { padding: [30, 30] });
        }

        // Restaurar geometría existente
        if (this.subForm.ubicacion?.coordinates) {
            const geo = this.subForm.ubicacion;
            if (geo.type === 'Point') {
                const c = geo.coordinates;
                this.marcadorRef = L.marker([c[1], c[0]], { icon: this.iconoMarcaPuntoSinc(L) }).addTo(
                    this.leafletMap,
                );
            } else if (geo.type === 'LineString') {
                this.marcadores = geo.coordinates.map((c: number[]) => [c[1], c[0]]);
                this.dibujarGeo();
            } else if (geo.type === 'Polygon') {
                this.marcadores = geo.coordinates[0].slice(0, -1).map((c: number[]) => [c[1], c[0]]);
                this.dibujarGeo();
            }
        }

        this.leafletMap.on('click', (e: any) => {
            this.zone.run(() => {
                if (this.geoMode === 'Point') {
                    if (this.marcadorRef) this.leafletMap.removeLayer(this.marcadorRef);
                    this.marcadorRef = L.marker([e.latlng.lat, e.latlng.lng], {
                        icon: this.iconoMarcaPuntoSinc(L),
                    }).addTo(this.leafletMap);
                    this.subForm.ubicacion = { type: 'Point', coordinates: [e.latlng.lng, e.latlng.lat] };
                } else {
                    this.marcadores.push([e.latlng.lat, e.latlng.lng]);
                    this.dibujarGeo();
                }
            });
        });
    }

    dibujarGeo() {
        if (this.polylineRef) { this.leafletMap.removeLayer(this.polylineRef); this.polylineRef = null; }
        if (this.polygonRef)  { this.leafletMap.removeLayer(this.polygonRef);  this.polygonRef  = null; }
        if (this.marcadores.length < 2) return;

        if (this.geoMode === 'LineString') {
            this.polylineRef = L.polyline(this.marcadores, { color: '#4a9eff', weight: 3 }).addTo(this.leafletMap);
            this.leafletMap.fitBounds(this.polylineRef.getBounds(), { padding: [20, 20] });
        } else if (this.geoMode === 'Polygon' && this.marcadores.length >= 3) {
            this.polygonRef = L.polygon(this.marcadores, { color: '#4a9eff', weight: 2, fillOpacity: 0.15 }).addTo(this.leafletMap);
            this.leafletMap.fitBounds(this.polygonRef.getBounds(), { padding: [20, 20] });
        }
    }

    deshacerPunto() {
        if (!this.marcadores.length) return;
        this.marcadores.pop();
        this.dibujarGeo();
    }

    limpiarGeo() {
        this.marcadores = [];
        if (this.polylineRef) { this.leafletMap.removeLayer(this.polylineRef); this.polylineRef = null; }
        if (this.polygonRef)  { this.leafletMap.removeLayer(this.polygonRef);  this.polygonRef  = null; }
        if (this.marcadorRef) { this.leafletMap.removeLayer(this.marcadorRef); this.marcadorRef = null; }
        this.subForm.ubicacion = null;
    }

    confirmarGeo() {
        if (this.geoMode === 'Point') {
            if (!this.subForm.ubicacion) { alert('Haz clic en el mapa para marcar el punto.'); return; }
        } else if (this.geoMode === 'LineString') {
            if (this.marcadores.length < 2) { alert('Dibuja al menos 2 puntos.'); return; }
            this.subForm.ubicacion = { type: 'LineString', coordinates: this.marcadores.map(m => [m[1], m[0]]) };
        } else if (this.geoMode === 'Polygon') {
            if (this.marcadores.length < 3) { alert('Dibuja al menos 3 puntos.'); return; }
            const coords = this.marcadores.map(m => [m[1], m[0]]);
            coords.push(coords[0]); // cerrar polígono
            this.subForm.ubicacion = { type: 'Polygon', coordinates: [coords] };
        }
        this.mapaAbierto = false;
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }

    cerrarMapa() {
        this.mapaAbierto = false;
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    get esAdmin()      { return ['admin', 'supervisor'].includes(this.authService.getUsuario()?.rol); }
    get puedeEditar()  { return ['admin', 'supervisor', 'encuestador'].includes(this.authService.getUsuario()?.rol); }

    get geoLabel(): string {
        if (!this.subForm.ubicacion) return 'Sin geometría';
        const geo = this.subForm.ubicacion;
        if (geo.type === 'Point')      return `Punto: ${geo.coordinates[1].toFixed(5)}, ${geo.coordinates[0].toFixed(5)}`;
        if (geo.type === 'LineString') return `Línea: ${geo.coordinates.length} puntos`;
        if (geo.type === 'Polygon')    return `Polígono: ${(geo.coordinates[0]?.length || 1) - 1} vértices`;
        return '—';
    }

    get geoModeLabel(): string {
        return { Point: 'Marcar punto', LineString: 'Dibujar línea', Polygon: 'Dibujar polígono' }[this.geoMode];
    }

    tabLabel(tab: Tab): string { return this.tabs.find(t => t.id === tab)?.label || tab; }
    getTabIcon(tab: Tab): string { return this.tabs.find(t => t.id === tab)?.icon || 'list'; }

    resumenCount(tab: Tab): number {
        const map: Record<string, string> = {
            fotos: 'fotos', prs: 'prs', propiedades: 'propiedades', puentes: 'puentes',
            muros: 'muros', tuneles: 'tuneles', sitios: 'sitiosCriticos', drenaje: 'obrasDrenaje',
            // Mc tabs → slug de resumen
            mcBerma: 'mc-berma', mcCalzada: 'mc-calzada', mcCco: 'mc-cco',
            mcCicloruta: 'mc-cicloruta', mcCuneta: 'mc-cuneta', mcDefensaVial: 'mc-defensa-vial',
            mcIts: 'mc-dispositivo-its', mcDrenaje: 'mc-drenaje', mcPeaje: 'mc-estacion-peaje',
            mcPesaje: 'mc-estacion-pesaje', mcLuminaria: 'mc-luminaria', mcMuro: 'mc-muro',
            mcPuente: 'mc-puente', mcSenalV: 'mc-senal-vertical', mcSeparador: 'mc-separador',
            mcTunel: 'mc-tunel', mcZona: 'mc-zona-servicio'
        };
        return this.resumen[map[tab]] || 0;
    }

    labelDominio(lista: any[], v: number | null): string {
        if (v == null || v === ('' as any) || !lista) return '—';
        const n = Number(v);
        return lista.find((o: any) => o.v === v || o.v === n)?.l || String(v);
    }

    // Acceso rápido a dominios Mc
    mc(capa: string): any { return this.dominios?.mc?.[capa] || {}; }

    // ─── LABELS FIJOS SINC ───────────────────────────────────────────────────
    labelTipoSuperf(v: number | null): string {
        const m: Record<number,string> = {
            1:'Destapado', 2:'Afirmado', 3:'Pav. asfáltico',
            4:'Trat. superficial', 5:'Pav. rígido',
            6:'Placa huella', 7:'Pav. articulado', 8:'Otro'
        };
        return v != null ? (m[v] ?? String(v)) : '—';
    }

    labelTipoTerr(v: number | null): string {
        const m: Record<number,string> = {
            1:'Escarpado', 2:'Montañoso', 3:'Ondulado', 4:'Plano'
        };
        return v != null ? (m[v] ?? String(v)) : '—';
    }

    labelEstadoVia(v: number | null): string {
        const m: Record<number,string> = {
            1:'Bueno', 2:'Regular', 3:'Malo', 4:'Pésimo', 5:'Intransitable'
        };
        return v != null ? (m[v] ?? String(v)) : '—';
    }

    labelCalzada(v: number | null): string {
        return v === 1 ? 'A→B' : v === 2 ? 'B→A' : v === 3 ? 'Única' : '—';
    }

    labelEstadoSup(v: number | null): string {
        const m: Record<number,string> = { 1:'Bueno', 2:'Regular', 3:'Malo', 4:'Intransitable' };
        return v != null ? (m[v] ?? String(v)) : '—';
    }

    labelEstadoEst(v: number | null): string {
        const m: Record<number,string> = { 1:'Bueno', 2:'Regular', 3:'Malo', 4:'No funcional' };
        return v != null ? (m[v] ?? String(v)) : '—';
    }

    volver()    { this.router.navigate(['/sinc/ejes']); }
    editarEje() { this.router.navigate(['/sinc/ejes/editar', this.idEje]); }
}
