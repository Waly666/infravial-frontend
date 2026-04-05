import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { catchError, forkJoin, of } from 'rxjs';

/* Marcador por defecto de Leaflet: sin esto el bundle resuelve mal las URLs de las imágenes. */
const _LEAFLET_ICON_BASE = 'https://unpkg.com/leaflet@1.9.4/dist/images';
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${_LEAFLET_ICON_BASE}/marker-icon-2x.png`,
    iconUrl: `${_LEAFLET_ICON_BASE}/marker-icon.png`,
    shadowUrl: `${_LEAFLET_ICON_BASE}/marker-shadow.png`,
});
import { ViaTramoService } from '../../core/services/via-tramo.service';
import { SenVertService } from '../../core/services/sen-vert.service';
import { SenHorService } from '../../core/services/sen-hor.service';
import { SemaforoService } from '../../core/services/semaforo.service';
import { ControlSemService } from '../../core/services/control-sem.service';
import { JornadaService } from '../../core/services/jornada.service';
import {
    geoDepartamentos,
    geoMunicipios,
    geoZatOptions,
    matchesGeoFilters,
    nomenclaturaSearchText,
    rowZatLabel,
    textBlobMatchesQuery
} from '../../shared/utils/geo-list-filters';
import { environment } from '../../../environments/environment';
import {
    googleStreetViewUrl,
    latLngFromUbicacion
} from '../../shared/utils/street-view';
import {
    absoluteApiBaseForExport,
    applyGeoJsonFieldSelection,
    buildCollection,
    downloadGeoJson,
    featureFromControlSem,
    featureFromSenHor,
    featureFromSenVert,
    featureFromSemaforo,
    featureFromViaTramo,
    anchoTotalPerfilM,
    type GeoJsonFeature
} from '../../shared/utils/geojson-export';
import {
    capaPropertyToTab,
    defaultSelectionForTab,
    FOTO_INDEXADA_KEY,
    GEOJSON_EXPORT_TABS,
    GEOJSON_FIELD_ROWS,
    loadExportFieldPrefs,
    saveExportFieldPrefs,
    type GeoJsonExportTab
} from '../../shared/utils/geojson-export-config';

export type MapaBaseMode = 'dark' | 'paper' | 'satellite';

function esc(s: unknown): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function absPhoto(path: string | null | undefined): string | null {
    if (!path || !String(path).trim()) return null;
    const p = String(path).trim();
    if (/^https?:\/\//i.test(p)) return p;
    const base = environment.apiUrl.replace(/\/$/, '');
    return base + (p.startsWith('/') ? p : '/' + p);
}

/** GeoJSON LineString coordinates → Leaflet [lat,lng][] */
function lineToLatLngs(coords: number[][] | undefined): L.LatLngExpression[] | null {
    if (!coords?.length) return null;
    const out: L.LatLngExpression[] = [];
    for (const c of coords) {
        if (c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
            out.push([c[1], c[0]]);
        }
    }
    return out.length ? out : null;
}

function pointToLatLng(c: number[] | undefined): L.LatLngExpression | null {
    if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
        return null;
    }
    return [c[1], c[0]];
}

@Component({
    selector: 'app-mapa-inventario',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './mapa-inventario.html',
    styleUrl: './mapa-inventario.scss'
})
export class MapaInventarioComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapHost', { static: false }) mapHost!: ElementRef<HTMLDivElement>;

    jornada: any = null;
    loading = true;
    error = '';

    tramos: any[] = [];
    senVert: any[] = [];
    senHor: any[] = [];
    semaforos: any[] = [];
    controlSemaforicos: any[] = [];

    /** Selector de exportación GeoJSON (respeta filtros del mapa). */
    exportCapa: '' | 'via_tramos' | 'sen_vert' | 'sen_hor' | 'semaforos' | 'control_sem' | 'todo' =
        '';

    /** Campos exportables por tipo (persistido en localStorage). */
    exportFieldByTab = loadExportFieldPrefs();
    readonly geoExportTabs = GEOJSON_EXPORT_TABS;
    readonly geoFieldRows = GEOJSON_FIELD_ROWS;
    showGeoFieldsModal = false;
    geoFieldsTabActivo: GeoJsonExportTab = 'via_tramos';
    private draftFieldByTab = new Map<GeoJsonExportTab, Set<string>>();

    busqueda = '';
    filtroDepartamento = '';
    filtroMunicipio = '';
    filtroZat = '';
    filtroCodigoSv = '';
    filtroCodigoSh = '';

    showTramos = true;
    showSenVert = true;
    showSenHor = true;
    showSemaforos = true;
    showControlSem = true;

    mapMode: MapaBaseMode = 'dark';

    private map: L.Map | null = null;
    private baseLayer: L.TileLayer | null = null;
    private layerTramos = L.layerGroup();
    private layerSV = L.layerGroup();
    private layerSH = L.layerGroup();
    private layerSem = L.layerGroup();
    private layerControlSem = L.layerGroup();

    constructor(
        private viaTramoService: ViaTramoService,
        private senVertService: SenVertService,
        private senHorService: SenHorService,
        private semaforoService: SemaforoService,
        private controlSemService: ControlSemService,
        private jornadaService: JornadaService,
        public router: Router
    ) {}

    ngOnInit(): void {
        this.jornadaService.getActiva().subscribe({
            next: (res) => (this.jornada = res.jornada),
            error: () => (this.jornada = null)
        });
    }

    openGeoFieldsModal(): void {
        this.draftFieldByTab = new Map();
        for (const t of GEOJSON_EXPORT_TABS) {
            const cur = this.exportFieldByTab.get(t.id);
            this.draftFieldByTab.set(
                t.id,
                cur ? new Set(cur) : defaultSelectionForTab(t.id)
            );
        }
        this.geoFieldsTabActivo = 'via_tramos';
        this.showGeoFieldsModal = true;
    }

    closeGeoFieldsModal(): void {
        this.showGeoFieldsModal = false;
    }

    saveGeoFieldsModal(): void {
        for (const t of GEOJSON_EXPORT_TABS) {
            const d = this.draftFieldByTab.get(t.id);
            if (d) this.exportFieldByTab.set(t.id, new Set(d));
        }
        saveExportFieldPrefs(this.exportFieldByTab);
        this.closeGeoFieldsModal();
    }

    isGeoDraftChecked(tab: GeoJsonExportTab, key: string): boolean {
        return this.draftFieldByTab.get(tab)?.has(key) ?? false;
    }

    toggleGeoDraft(tab: GeoJsonExportTab, key: string): void {
        const row = GEOJSON_FIELD_ROWS[tab].find((r) => r.key === key);
        if (row?.required) return;
        const s = this.draftFieldByTab.get(tab);
        if (!s) return;
        if (s.has(key)) s.delete(key);
        else s.add(key);
    }

    selectAllGeoDraft(tab: GeoJsonExportTab): void {
        this.draftFieldByTab.set(tab, defaultSelectionForTab(tab));
    }

    /** Solo ID (y obligatorios). */
    selectMinimalGeoDraft(tab: GeoJsonExportTab): void {
        const s = new Set<string>();
        for (const r of GEOJSON_FIELD_ROWS[tab]) {
            if (r.required) s.add(r.key);
        }
        this.draftFieldByTab.set(tab, s);
    }

    resetGeoFieldsDefaults(): void {
        for (const t of GEOJSON_EXPORT_TABS) {
            this.draftFieldByTab.set(t.id, defaultSelectionForTab(t.id));
        }
    }

    private filterFeatureProps(f: GeoJsonFeature): GeoJsonFeature {
        const capaVal = String((f.properties as { capa?: string })?.capa ?? '');
        const tab = capaPropertyToTab(capaVal);
        const sel =
            this.exportFieldByTab.get(tab) ?? defaultSelectionForTab(tab);
        return {
            ...f,
            properties: applyGeoJsonFieldSelection(
                f.properties as Record<string, unknown>,
                sel,
                FOTO_INDEXADA_KEY
            )
        };
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.initMap(), 0);
    }

    ngOnDestroy(): void {
        this.map?.remove();
        this.map = null;
    }

    private initMap(): void {
        const el = this.mapHost?.nativeElement;
        if (!el) return;

        this.map = L.map(el, { zoomControl: true }).setView([6.25, -75.58], 12);
        this.applyBasemap(this.mapMode);
        this.layerTramos.addTo(this.map);
        this.layerSV.addTo(this.map);
        this.layerSH.addTo(this.map);
        this.layerSem.addTo(this.map);
        this.layerControlSem.addTo(this.map);

        this.loadData();

        setTimeout(() => this.map?.invalidateSize(), 200);
        this.scheduleInvalidateSize();
    }

    /** Leaflet needs size after flex/scroll layout settles; single call is often too early. */
    private scheduleInvalidateSize(): void {
        const tick = () => {
            this.map?.invalidateSize();
            requestAnimationFrame(() => this.map?.invalidateSize());
        };
        setTimeout(tick, 120);
        setTimeout(tick, 350);
    }

    private basemapFor(mode: MapaBaseMode): L.TileLayer {
        const opt = { maxZoom: 20, maxNativeZoom: 19 };
        if (mode === 'dark') {
            return L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                {
                    ...opt,
                    attribution:
                        '&copy; OpenStreetMap &copy; <a href="https://carto.com/">CARTO</a>'
                }
            );
        }
        if (mode === 'paper') {
            return L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                {
                    ...opt,
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                }
            );
        }
        return L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                ...opt,
                attribution:
                    'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
            }
        );
    }

    setMapMode(mode: MapaBaseMode): void {
        this.mapMode = mode;
        if (!this.map) return;
        this.applyBasemap(mode);
    }

    private applyBasemap(mode: MapaBaseMode): void {
        if (!this.map) return;
        if (this.baseLayer) {
            this.map.removeLayer(this.baseLayer);
            this.baseLayer = null;
        }
        this.baseLayer = this.basemapFor(mode);
        this.baseLayer.addTo(this.map);
    }

    get allGeoRows(): any[] {
        return [
            ...this.tramos,
            ...this.senVert,
            ...this.senHor,
            ...this.semaforos,
            ...this.controlSemaforicos
        ];
    }

    get departamentosDisponibles(): string[] {
        return geoDepartamentos(this.allGeoRows);
    }

    get municipiosDisponibles(): string[] {
        return geoMunicipios(this.allGeoRows, this.filtroDepartamento);
    }

    get zatsDisponibles(): Array<{ value: string; label: string }> {
        return geoZatOptions(
            this.allGeoRows,
            this.filtroDepartamento,
            this.filtroMunicipio
        );
    }

    get codigosSvDisponibles(): string[] {
        const set = new Set<string>();
        for (const r of this.senVert) {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                continue;
            }
            const c = (r.codSe || '').trim();
            if (c) set.add(c);
        }
        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, 'es', { numeric: true })
        );
    }

    get codigosShDisponibles(): string[] {
        const set = new Set<string>();
        for (const r of this.senHor) {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                continue;
            }
            const c = (r.codSeHor || '').trim();
            if (c) set.add(c);
        }
        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, 'es', { numeric: true })
        );
    }

    onDepartamentoChange(): void {
        this.filtroMunicipio = '';
        this.filtroZat = '';
        this.filtroCodigoSv = '';
        this.filtroCodigoSh = '';
        this.redrawMap();
    }

    onMunicipioChange(): void {
        this.filtroZat = '';
        this.filtroCodigoSv = '';
        this.filtroCodigoSh = '';
        this.redrawMap();
    }

    onZatChange(): void {
        this.filtroCodigoSv = '';
        this.filtroCodigoSh = '';
        this.redrawMap();
    }

    onCodigoSenalChange(): void {
        this.redrawMap();
    }

    onBusquedaChange(): void {
        this.redrawMap();
    }

    onLayerToggle(): void {
        this.redrawMap();
    }

    /** ObjectId del documento en API (string completa), no el resumen por código de catálogo. */
    private mongoIdRegistro(r: any): string {
        if (!r || r._id == null || r._id === '') return '—';
        const id = r._id;
        if (typeof id === 'string') return id;
        if (typeof id === 'object' && id !== null) {
            const o = id as { $oid?: string; toHexString?: () => string };
            if (o.$oid != null) return String(o.$oid);
            if (typeof o.toHexString === 'function') return o.toHexString();
            const s = String(id);
            if (s !== '[object Object]') return s;
        }
        return String(id);
    }

    private tramoMatchesSearch(t: any, qRaw: string): boolean {
        const z = rowZatLabel(t);
        const blob = [
            t.via,
            t.municipio,
            t.departamento,
            nomenclaturaSearchText(t),
            z !== '—' ? z : ''
        ].join(' ');
        return textBlobMatchesQuery(blob, qRaw);
    }

    private vertMatchesSearch(r: any, qRaw: string): boolean {
        const z = rowZatLabel(r);
        const blob = [
            r.codSe,
            r.estado,
            r.fase,
            r.accion,
            r.matPlaca,
            r.idViaTramo?.via,
            r.idViaTramo?.municipio,
            r.idViaTramo?.departamento,
            nomenclaturaSearchText(r),
            z !== '—' ? z : ''
        ].join(' ');
        return textBlobMatchesQuery(blob, qRaw);
    }

    private horMatchesSearch(r: any, qRaw: string): boolean {
        const z = rowZatLabel(r);
        const blob = [
            r.codSeHor,
            r.tipoDem,
            r.estadoDem,
            r.color,
            r.fase,
            r.accion,
            r.idViaTramo?.via,
            r.idViaTramo?.municipio,
            r.idViaTramo?.departamento,
            nomenclaturaSearchText(r),
            z !== '—' ? z : ''
        ].join(' ');
        return textBlobMatchesQuery(blob, qRaw);
    }

    private filteredTramos(): any[] {
        const qRaw = this.busqueda.trim();
        return this.tramos.filter(
            (t) =>
                matchesGeoFilters(
                    t,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                ) && this.tramoMatchesSearch(t, qRaw)
        );
    }

    private filteredVert(): any[] {
        const qRaw = this.busqueda.trim();
        const fc = this.filtroCodigoSv.trim();
        return this.senVert.filter((r) => {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                return false;
            }
            if (fc && (r.codSe || '').trim() !== fc) return false;
            return this.vertMatchesSearch(r, qRaw);
        });
    }

    private filteredHor(): any[] {
        const qRaw = this.busqueda.trim();
        const fc = this.filtroCodigoSh.trim();
        return this.senHor.filter((r) => {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                return false;
            }
            if (fc && (r.codSeHor || '').trim() !== fc) return false;
            return this.horMatchesSearch(r, qRaw);
        });
    }

    private semMatchesSearch(r: any, qRaw: string): boolean {
        const z = rowZatLabel(r);
        const ne = r.numExterno != null ? String(r.numExterno) : '';
        const blob = [
            ne,
            r.sitio,
            r.claseSem,
            r.estadoGenPint,
            r.fase,
            r.accion,
            r.idViaTramo?.via,
            r.idViaTramo?.municipio,
            r.idViaTramo?.departamento,
            nomenclaturaSearchText(r),
            z !== '—' ? z : ''
        ].join(' ');
        return textBlobMatchesQuery(blob, qRaw);
    }

    private filteredSemaforos(): any[] {
        const qRaw = this.busqueda.trim();
        return this.semaforos.filter((r) => {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                return false;
            }
            return this.semMatchesSearch(r, qRaw);
        });
    }

    private controlMatchesSearch(r: any, qRaw: string): boolean {
        const z = rowZatLabel(r);
        const ne = r.numExterno != null ? String(r.numExterno) : '';
        const blob = [
            ne,
            r.serialControlador,
            r.modelo,
            r.fabricante,
            r.claseControlador,
            r.fase,
            r.accion,
            r.idViaTramo?.via,
            r.idViaTramo?.municipio,
            r.idViaTramo?.departamento,
            nomenclaturaSearchText(r),
            z !== '—' ? z : ''
        ].join(' ');
        return textBlobMatchesQuery(blob, qRaw);
    }

    private filteredControlSem(): any[] {
        const qRaw = this.busqueda.trim();
        return this.controlSemaforicos.filter((r) => {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                return false;
            }
            return this.controlMatchesSearch(r, qRaw);
        });
    }

    loadData(): void {
        this.loading = true;
        this.error = '';
        forkJoin({
            tr: this.viaTramoService
                .getAll()
                .pipe(catchError(() => of({ tramos: [] }))),
            sv: this.senVertService
                .getAll()
                .pipe(catchError(() => of({ registros: [] }))),
            sh: this.senHorService
                .getAll()
                .pipe(catchError(() => of({ registros: [] }))),
            sem: this.semaforoService
                .getAll()
                .pipe(catchError(() => of({ registros: [] }))),
            cs: this.controlSemService
                .getAll()
                .pipe(catchError(() => of({ registros: [] })))
        }).subscribe({
            next: ({ tr, sv, sh, sem, cs }) => {
                this.tramos = tr.tramos || [];
                this.senVert = sv.registros || [];
                this.senHor = sh.registros || [];
                this.semaforos = sem.registros || [];
                this.controlSemaforicos = cs.registros || [];
                this.loading = false;
                setTimeout(() => this.redrawMap(), 0);
                this.scheduleInvalidateSize();
            },
            error: () => {
                this.error = 'No se pudieron cargar los datos del mapa.';
                this.loading = false;
            }
        });
    }

    redrawMap(): void {
        if (!this.map) return;

        this.layerTramos.clearLayers();
        this.layerSV.clearLayers();
        this.layerSH.clearLayers();
        this.layerSem.clearLayers();
        this.layerControlSem.clearLayers();

        const bounds = L.latLngBounds([] as L.LatLngTuple[]);
        let hasBounds = false;
        const extend = (ll: L.LatLngExpression) => {
            bounds.extend(ll as L.LatLngTuple);
            hasBounds = true;
        };

        if (this.showTramos) {
            for (const t of this.filteredTramos()) {
                const coords = t.ubicacion?.coordinates as number[][] | undefined;
                const latlngs = lineToLatLngs(coords);
                if (!latlngs?.length) continue;
                const popup = this.popupTramo(t);

                const hit = L.polyline(latlngs, {
                    color: '#000',
                    weight: 13,
                    opacity: 0,
                    interactive: true
                });
                hit.bindPopup(popup, { maxWidth: 320 });
                hit.addTo(this.layerTramos);

                const poly = L.polyline(latlngs, {
                    color: '#34d399',
                    weight: 6,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                poly.bindPopup(popup, { maxWidth: 320 });
                poly.addTo(this.layerTramos);

                const mid = latlngs[Math.floor(latlngs.length / 2)];
                const hub = L.circleMarker(mid, {
                    radius: 8,
                    color: '#047857',
                    weight: 2,
                    fillColor: '#34d399',
                    fillOpacity: 0.95
                });
                hub.bindPopup(popup, { maxWidth: 320 });
                hub.addTo(this.layerTramos);

                latlngs.forEach((x) => extend(x));
            }
        }

        if (this.showSenVert) {
            for (const r of this.filteredVert()) {
                const ll = pointToLatLng(r.ubicacion?.coordinates);
                if (!ll) continue;
                const m = L.circleMarker(ll, {
                    radius: 7,
                    color: '#7c3aed',
                    weight: 2,
                    fillColor: '#c4b5fd',
                    fillOpacity: 0.9
                });
                m.bindPopup(this.popupSenVert(r), { maxWidth: 320 });
                m.addTo(this.layerSV);
                extend(ll);
            }
        }

        if (this.showSenHor) {
            for (const r of this.filteredHor()) {
                const ll = pointToLatLng(r.ubicacion?.coordinates);
                if (!ll) continue;
                const m = L.circleMarker(ll, {
                    radius: 7,
                    color: '#1d4ed8',
                    weight: 2,
                    fillColor: '#93c5fd',
                    fillOpacity: 0.9
                });
                m.bindPopup(this.popupSenHor(r), { maxWidth: 320 });
                m.addTo(this.layerSH);
                extend(ll);
            }
        }

        if (this.showSemaforos) {
            for (const r of this.filteredSemaforos()) {
                const ll = pointToLatLng(r.ubicacion?.coordinates);
                if (!ll) continue;
                const m = L.circleMarker(ll, {
                    radius: 8,
                    color: '#dc2626',
                    weight: 2,
                    fillColor: '#fca5a5',
                    fillOpacity: 0.95
                });
                m.bindPopup(this.popupSemaforo(r), { maxWidth: 320 });
                m.addTo(this.layerSem);
                extend(ll);
            }
        }

        if (this.showControlSem) {
            for (const r of this.filteredControlSem()) {
                const ll = pointToLatLng(r.ubicacion?.coordinates);
                if (!ll) continue;
                const m = L.circleMarker(ll, {
                    radius: 8,
                    color: '#b45309',
                    weight: 2,
                    fillColor: '#fbbf24',
                    fillOpacity: 0.95
                });
                m.bindPopup(this.popupControlSem(r), { maxWidth: 320 });
                m.addTo(this.layerControlSem);
                extend(ll);
            }
        }

        if (hasBounds && bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
        }

        setTimeout(() => this.map?.invalidateSize(), 50);
        setTimeout(() => this.map?.invalidateSize(), 280);
    }

    /** Texto de coordenadas (WGS84); LineString usa punto medio de la polilínea. */
    private coordsTexto(ubicacion: unknown): string {
        const ll = latLngFromUbicacion(ubicacion as { coordinates?: unknown });
        if (!ll) return '—';
        return `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;
    }

    private nomenclaturaDesdeTramo(vt: unknown): string {
        if (!vt || typeof vt !== 'object') return '—';
        const n = (vt as { nomenclatura?: { completa?: string } }).nomenclatura;
        const c = n?.completa;
        return c != null && String(c).trim() !== '' ? String(c) : '—';
    }

    /** Estado de vía: principal + lista secundaria (huecos, fisurada, etc.). */
    private estadoViaTramoTexto(t: any): string {
        const ev = (t?.estadoVia || '').toString().trim();
        const e2 = Array.isArray(t?.estadoVia2)
            ? t.estadoVia2.filter((x: unknown) => x != null && String(x).trim() !== '').map(String)
            : [];
        const parts: string[] = [];
        if (ev) parts.push(ev);
        if (e2.length) parts.push(e2.join(', '));
        return parts.length ? parts.join(' · ') : '—';
    }

    private capaRodaduraEsAsfalto(t: any): boolean {
        const c = (t?.capaRodadura || '').toString().trim().toLowerCase();
        return c.includes('asfalto');
    }

    private medidaMetro(v: unknown): string {
        if (v == null || v === '') return '—';
        const n = Number(v);
        if (!Number.isFinite(n)) return '—';
        return `${n} m`;
    }

    /** Filas extra del listado cuando la capa de rodadura es asfalto (geometría de calzadas). */
    private tramoGeometriaAsfaltoHtml(t: any): string {
        if (!this.capaRodaduraEsAsfalto(t)) return '';
        const row = (label: string, val: unknown, esTexto = false) =>
            `<dt>${esc(label)}</dt><dd>${esc(esTexto ? (val != null && String(val).trim() !== '' ? String(val) : '—') : this.medidaMetro(val))}</dd>`;
        return `
        ${row('Calzadas (config.)', t.calzada, true)}
        ${row('Ancho calzada izq.', t.calzadaIzq)}
        ${row('Ancho calzada der.', t.calzadaDer)}
        ${row('Berma izq.', t.bermaIzq)}
        ${row('Berma der.', t.bermaDer)}
        ${row('Cuneta izq.', t.cunetaIzq)}
        ${row('Cuneta der.', t.cunetaDer)}
        ${row('Andén izq.', t.andenIzq)}
        ${row('Andén der.', t.andenDer)}`;
    }

    private popupTramo(t: any): string {
        const foto =
            Array.isArray(t.fotos) && t.fotos[0]
                ? absPhoto(t.fotos[0])
                : null;
        const img = foto
            ? `<div class="map-popup-imgwrap"><img src="${esc(foto)}" alt="" class="map-popup-img" /></div>`
            : '';
        const z = rowZatLabel(t);
        const fi = t.fechaInv
            ? new Date(t.fechaInv).toLocaleDateString('es-CO')
            : '—';
        const coords = this.coordsTexto(t.ubicacion);
        const nom = this.nomenclaturaDesdeTramo(t);
        const anchoProf = anchoTotalPerfilM(t);
        const geoAsp = this.tramoGeometriaAsfaltoHtml(t);
        return `<div class="map-popup">
      <div class="map-popup-tag">Tramo</div>
      <div class="map-popup-mongo-id"><code>${esc(this.mongoIdRegistro(t))}</code></div>
      <strong>${esc(t.via || '—')}</strong>
      <dl class="map-popup-dl">
        <dt>Fecha inventario</dt><dd>${esc(fi)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(t.departamento || '—')}</dd>
        <dt>Municipio</dt><dd>${esc(t.municipio || '—')}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
        <dt>Diseño</dt><dd>${esc(t.tipoUbic || '—')}</dd>
        <dt>Tipo vía</dt><dd>${esc(t.tipoVia || '—')}</dd>
        <dt>Sector</dt><dd>${esc(t.sector || '—')}</dd>
        <dt>Zona</dt><dd>${esc(t.zona || '—')}</dd>
        <dt>Estado vía</dt><dd>${esc(this.estadoViaTramoTexto(t))}</dd>
        <dt>Capa rodadura</dt><dd>${esc(t.capaRodadura || '—')}</dd>
        ${geoAsp}
        <dt>Longitud del tramo</dt><dd>${esc(t.longitud_m != null && t.longitud_m !== '' ? t.longitud_m + ' m' : '—')}</dd>
        <dt>Ancho total perfil</dt><dd>${esc(anchoProf != null ? anchoProf + ' m' : '—')}</dd>
      </dl>
      ${img}
      ${this.popupStreetViewBlock(t.ubicacion)}
    </div>`;
    }

    private popupSenVert(r: any): string {
        const foto = absPhoto(r.urlFotoSenVert);
        const img = foto
            ? `<div class="map-popup-imgwrap"><img src="${esc(foto)}" alt="" class="map-popup-img" /></div>`
            : '';
        const vt = r.idViaTramo;
        const via = vt?.via || '—';
        const dpto = vt?.departamento || '—';
        const mun = vt?.municipio || '—';
        const nom = this.nomenclaturaDesdeTramo(vt);
        const coords = this.coordsTexto(r.ubicacion);
        const z = rowZatLabel(r);
        return `<div class="map-popup">
      <div class="map-popup-tag map-popup-tag-sv">Señal vertical</div>
      <div class="map-popup-mongo-id"><code>${esc(this.mongoIdRegistro(r))}</code></div>
      <strong>${esc(r.codSe || '—')}</strong>
      <dl class="map-popup-dl">
        <dt>Fase</dt><dd>${esc(r.fase || '—')}</dd>
        <dt>Acción</dt><dd>${esc(r.accion || '—')}</dd>
        <dt>Estado</dt><dd>${esc(r.estado || '—')}</dd>
        <dt>Vía / tramo</dt><dd>${esc(via)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(dpto)}</dd>
        <dt>Municipio</dt><dd>${esc(mun)}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
        <dt>Material placa</dt><dd>${esc(r.matPlaca || '—')}</dd>
        <dt>Orientación</dt><dd>${esc(r.orientacion || '—')}</dd>
      </dl>
      ${img}
      ${this.popupStreetViewBlock(r.ubicacion)}
    </div>`;
    }

    private popupSenHor(r: any): string {
        const foto = absPhoto(r.urlFotoSH);
        const img = foto
            ? `<div class="map-popup-imgwrap"><img src="${esc(foto)}" alt="" class="map-popup-img" /></div>`
            : '';
        const vt = r.idViaTramo;
        const via = vt?.via || '—';
        const dpto = vt?.departamento || '—';
        const mun = vt?.municipio || '—';
        const nom = this.nomenclaturaDesdeTramo(vt);
        const coords = this.coordsTexto(r.ubicacion);
        const z = rowZatLabel(r);
        return `<div class="map-popup">
      <div class="map-popup-tag map-popup-tag-sh">Señal horizontal</div>
      <div class="map-popup-mongo-id"><code>${esc(this.mongoIdRegistro(r))}</code></div>
      <strong>${esc(r.codSeHor || '—')}</strong>
      <dl class="map-popup-dl">
        <dt>Fase</dt><dd>${esc(r.fase || '—')}</dd>
        <dt>Acción</dt><dd>${esc(r.accion || '—')}</dd>
        <dt>Tipo demarcación</dt><dd>${esc(r.tipoDem || '—')}</dd>
        <dt>Estado demarcación</dt><dd>${esc(r.estadoDem || '—')}</dd>
        <dt>Color</dt><dd>${esc(r.color || '—')}</dd>
        <dt>Vía / tramo</dt><dd>${esc(via)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(dpto)}</dd>
        <dt>Municipio</dt><dd>${esc(mun)}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
      </dl>
      ${img}
      ${this.popupStreetViewBlock(r.ubicacion)}
    </div>`;
    }

    private popupControlSem(r: any): string {
        const f1 = absPhoto(r.urlFotoControlador);
        const f2 = absPhoto(r.urlFotoArmario);
        const img1 = f1
            ? `<div class="map-popup-imgwrap"><img src="${esc(f1)}" alt="" class="map-popup-img" /></div>`
            : '';
        const img2 = f2
            ? `<div class="map-popup-imgwrap"><img src="${esc(f2)}" alt="" class="map-popup-img" /></div>`
            : '';
        const vt = r.idViaTramo;
        const via = vt?.via || '—';
        const dpto = vt?.departamento || '—';
        const mun = vt?.municipio || '—';
        const nom = this.nomenclaturaDesdeTramo(vt);
        const coords = this.coordsTexto(r.ubicacion);
        const z = rowZatLabel(r);
        const label =
            r.numExterno != null ? `Control Nº ${r.numExterno}` : 'Control semafórico';
        return `<div class="map-popup">
      <div class="map-popup-tag map-popup-tag-cs">Control semafórico</div>
      <div class="map-popup-mongo-id"><code>${esc(this.mongoIdRegistro(r))}</code></div>
      <strong>${esc(label)}</strong>
      <dl class="map-popup-dl">
        <dt>Estado controlador</dt><dd>${esc(r.estadoControlador || '—')}</dd>
        <dt>Tipo</dt><dd>${esc(r.tipoControlador || '—')}</dd>
        <dt>Serial</dt><dd>${esc(r.serialControlador || '—')}</dd>
        <dt>Modelo</dt><dd>${esc(r.modelo || '—')}</dd>
        <dt>Vía / tramo</dt><dd>${esc(via)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(dpto)}</dd>
        <dt>Municipio</dt><dd>${esc(mun)}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
      </dl>
      ${img1}${img2}
      ${this.popupStreetViewBlock(r.ubicacion)}
    </div>`;
    }

    private popupSemaforo(r: any): string {
        const foto = absPhoto(r.urlFotoSemaforo);
        const img = foto
            ? `<div class="map-popup-imgwrap"><img src="${esc(foto)}" alt="" class="map-popup-img" /></div>`
            : '';
        const vt = r.idViaTramo;
        const via = vt?.via || '—';
        const dpto = vt?.departamento || '—';
        const mun = vt?.municipio || '—';
        const nom = this.nomenclaturaDesdeTramo(vt);
        const coords = this.coordsTexto(r.ubicacion);
        const z = rowZatLabel(r);
        return `<div class="map-popup">
      <div class="map-popup-tag map-popup-tag-sem">Semáforo</div>
      <div class="map-popup-mongo-id"><code>${esc(this.mongoIdRegistro(r))}</code></div>
      <strong>${esc(r.numExterno != null ? 'Nº ' + r.numExterno : r.sitio || '—')}</strong>
      <dl class="map-popup-dl">
        <dt>Estado pintura</dt><dd>${esc(r.estadoGenPint || '—')}</dd>
        <dt>Vía / tramo</dt><dd>${esc(via)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(dpto)}</dd>
        <dt>Municipio</dt><dd>${esc(mun)}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
        <dt>Sitio</dt><dd>${esc(r.sitio || '—')}</dd>
      </dl>
      ${img}
      ${this.popupStreetViewBlock(r.ubicacion)}
    </div>`;
    }

    private popupStreetViewBlock(ubicacion: unknown): string {
        const ll = latLngFromUbicacion(ubicacion as { coordinates?: unknown });
        if (!ll) return '';
        const href = googleStreetViewUrl(ll.lat, ll.lng);
        return `<div class="map-popup-sv"><a class="map-popup-sv-link" href="${href}" target="_blank" rel="noopener noreferrer">Street View</a></div>`;
    }

    conteos(): { tr: number; sv: number; sh: number; sem: number; cs: number } {
        return {
            tr: this.filteredTramos().length,
            sv: this.filteredVert().length,
            sh: this.filteredHor().length,
            sem: this.filteredSemaforos().length,
            cs: this.filteredControlSem().length
        };
    }

    private baseExportApi(): string {
        return absoluteApiBaseForExport(environment.apiUrl);
    }

    /** Descarga GeoJSON según `exportCapa` (mismos filtros que el mapa). */
    ejecutarExportGeoJson(): void {
        const capa = this.exportCapa;
        if (!capa) return;
        const base = this.baseExportApi();
        const stamp = new Date().toISOString().slice(0, 10);

        const pick = <T>(xs: (T | null)[]): T[] =>
            xs.filter((x): x is T => x != null);

        const pipe = (fs: GeoJsonFeature[]) =>
            fs.map((f) => this.filterFeatureProps(f));

        if (capa === 'via_tramos') {
            const feats = pipe(
                pick(this.filteredTramos().map((t) => featureFromViaTramo(t, base)))
            );
            downloadGeoJson(
                buildCollection('infravial_via_tramos', feats),
                `infravial_via_tramos_${stamp}.geojson`
            );
            return;
        }
        if (capa === 'sen_vert') {
            const feats = pipe(
                pick(this.filteredVert().map((r) => featureFromSenVert(r, base)))
            );
            downloadGeoJson(
                buildCollection('infravial_senales_verticales', feats),
                `infravial_sen_vert_${stamp}.geojson`
            );
            return;
        }
        if (capa === 'sen_hor') {
            const feats = pipe(
                pick(this.filteredHor().map((r) => featureFromSenHor(r, base)))
            );
            downloadGeoJson(
                buildCollection('infravial_senales_horizontales', feats),
                `infravial_sen_hor_${stamp}.geojson`
            );
            return;
        }
        if (capa === 'semaforos') {
            const feats = pipe(
                pick(
                    this.filteredSemaforos().map((r) =>
                        featureFromSemaforo(r, base)
                    )
                )
            );
            downloadGeoJson(
                buildCollection('infravial_semaforos', feats),
                `infravial_semaforos_${stamp}.geojson`
            );
            return;
        }
        if (capa === 'control_sem') {
            const feats = pipe(
                pick(
                    this.filteredControlSem().map((r) =>
                        featureFromControlSem(r, base)
                    )
                )
            );
            downloadGeoJson(
                buildCollection('infravial_control_semaforico', feats),
                `infravial_control_semaforico_${stamp}.geojson`
            );
            return;
        }
        if (capa === 'todo') {
            const feats = pipe(
                pick([
                    ...this.filteredTramos().map((t) =>
                        featureFromViaTramo(t, base)
                    ),
                    ...this.filteredVert().map((r) =>
                        featureFromSenVert(r, base)
                    ),
                    ...this.filteredHor().map((r) => featureFromSenHor(r, base)),
                    ...this.filteredSemaforos().map((r) =>
                        featureFromSemaforo(r, base)
                    ),
                    ...this.filteredControlSem().map((r) =>
                        featureFromControlSem(r, base)
                    )
                ])
            );
            downloadGeoJson(
                buildCollection('infravial_mapa_completo', feats),
                `infravial_mapa_completo_${stamp}.geojson`
            );
        }
    }
}
