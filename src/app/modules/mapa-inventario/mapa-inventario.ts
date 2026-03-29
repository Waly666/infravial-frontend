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
import { ViaTramoService } from '../../core/services/via-tramo.service';
import { SenVertService } from '../../core/services/sen-vert.service';
import { SenHorService } from '../../core/services/sen-hor.service';
import { SemaforoService } from '../../core/services/semaforo.service';
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

/** Fin del día local (inclusive) para comparar fechas de inventario. */
function endOfLocalDayMs(d: Date): number {
    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999
    ).getTime();
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

    /** ms de inventario por _id de tramo (fechaInv o fechaCreación). */
    private tramoInvMsById = new Map<string, number>();
    /** Fines de día únicos ordenados (time-lapse). */
    timelapseCutoffs: number[] = [];
    /** Activa el filtro acumulado “hasta” la fecha del deslizador. */
    timelapseActivo = false;
    /** Índice en timelapseCutoffs. */
    timelapseIndex = 0;
    timelapsePlaying = false;
    private timelapsePlayTimer: ReturnType<typeof setInterval> | null = null;

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

    mapMode: MapaBaseMode = 'dark';

    private map: L.Map | null = null;
    private baseLayer: L.TileLayer | null = null;
    private layerTramos = L.layerGroup();
    private layerSV = L.layerGroup();
    private layerSH = L.layerGroup();
    private layerSem = L.layerGroup();

    constructor(
        private viaTramoService: ViaTramoService,
        private senVertService: SenVertService,
        private senHorService: SenHorService,
        private semaforoService: SemaforoService,
        private jornadaService: JornadaService,
        public router: Router
    ) {}

    ngOnInit(): void {
        this.jornadaService.getActiva().subscribe({
            next: (res) => (this.jornada = res.jornada),
            error: () => (this.jornada = null)
        });
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.initMap(), 0);
    }

    ngOnDestroy(): void {
        this.stopTimelapsePlay();
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
        return [...this.tramos, ...this.senVert, ...this.senHor, ...this.semaforos];
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

    onTimelapseToggle(): void {
        if (!this.timelapseActivo) this.stopTimelapsePlay();
        if (
            this.timelapseActivo &&
            this.timelapseCutoffs.length &&
            this.timelapseIndex >= this.timelapseCutoffs.length
        ) {
            this.timelapseIndex = this.timelapseCutoffs.length - 1;
        }
        this.redrawMap();
    }

    onTimelapseSliderChange(): void {
        this.redrawMap();
    }

    toggleTimelapsePlay(): void {
        if (!this.timelapseActivo || !this.timelapseCutoffs.length) return;
        if (this.timelapsePlaying) {
            this.stopTimelapsePlay();
            return;
        }
        this.timelapsePlaying = true;
        this.timelapsePlayTimer = setInterval(() => {
            if (this.timelapseIndex < this.timelapseCutoffs.length - 1) {
                this.timelapseIndex++;
            } else {
                this.stopTimelapsePlay();
            }
            this.redrawMap();
        }, 1800);
    }

    stopTimelapsePlay(): void {
        this.timelapsePlaying = false;
        if (this.timelapsePlayTimer != null) {
            clearInterval(this.timelapsePlayTimer);
            this.timelapsePlayTimer = null;
        }
    }

    timelapseLabel(): string {
        if (!this.timelapseCutoffs.length || !this.timelapseActivo) return '—';
        const ms = this.timelapseCutoffs[this.timelapseIndex];
        if (ms == null) return '—';
        return new Date(ms).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    private tramoInventoryMs(t: any): number | null {
        const raw = t?.fechaInv || t?.fechaCreacion;
        if (!raw) return null;
        const ms = new Date(raw).getTime();
        return Number.isNaN(ms) ? null : ms;
    }

    private rebuildTramoInvIndex(): void {
        this.tramoInvMsById.clear();
        for (const t of this.tramos) {
            const m = this.tramoInventoryMs(t);
            if (m != null) this.tramoInvMsById.set(String(t._id), m);
        }
    }

    private rebuildTimelapseCutoffs(): void {
        const byDay = new Map<string, number>();
        for (const t of this.tramos) {
            const m = this.tramoInventoryMs(t);
            if (m == null) continue;
            const d = new Date(m);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            byDay.set(key, endOfLocalDayMs(d));
        }
        this.timelapseCutoffs = Array.from(byDay.values()).sort((a, b) => a - b);
        if (this.timelapseIndex >= this.timelapseCutoffs.length) {
            this.timelapseIndex = Math.max(0, this.timelapseCutoffs.length - 1);
        }
    }

    private getTimelapseCutoffMs(): number | null {
        if (!this.timelapseActivo || !this.timelapseCutoffs.length) return null;
        return this.timelapseCutoffs[this.timelapseIndex] ?? null;
    }

    private passesTimelapseTramo(t: any): boolean {
        const c = this.getTimelapseCutoffMs();
        if (c == null) return true;
        const inv = this.tramoInventoryMs(t);
        if (inv == null) return true;
        return inv <= c;
    }

    private tramoIdFromChild(r: any): string | null {
        const v = r?.idViaTramo;
        if (!v) return null;
        if (typeof v === 'object' && v._id != null) return String(v._id);
        return String(v);
    }

    private passesTimelapseChild(r: any): boolean {
        const c = this.getTimelapseCutoffMs();
        if (c == null) return true;
        const tid = this.tramoIdFromChild(r);
        if (!tid) return false;
        let inv = this.tramoInvMsById.get(tid);
        if (inv == null && typeof r.idViaTramo === 'object' && r.idViaTramo) {
            const m = this.tramoInventoryMs(r.idViaTramo);
            if (m != null) inv = m;
        }
        if (inv == null) return true;
        return inv <= c;
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
                ) &&
                this.tramoMatchesSearch(t, qRaw) &&
                this.passesTimelapseTramo(t)
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
            return (
                this.vertMatchesSearch(r, qRaw) && this.passesTimelapseChild(r)
            );
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
            return (
                this.horMatchesSearch(r, qRaw) && this.passesTimelapseChild(r)
            );
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
            return (
                this.semMatchesSearch(r, qRaw) && this.passesTimelapseChild(r)
            );
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
                .pipe(catchError(() => of({ registros: [] })))
        }).subscribe({
            next: ({ tr, sv, sh, sem }) => {
                this.tramos = tr.tramos || [];
                this.senVert = sv.registros || [];
                this.senHor = sh.registros || [];
                this.semaforos = sem.registros || [];
                this.rebuildTramoInvIndex();
                this.rebuildTimelapseCutoffs();
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
        ${row('Andén der.', t.andenDer)}
        ${row('Ancho total perfil', t.anchoTotalPerfil)}`;
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
        const fase = t.fase != null && String(t.fase).trim() !== '' ? String(t.fase) : '—';
        const accion = t.accion != null && String(t.accion).trim() !== '' ? String(t.accion) : '—';
        const geoAsp = this.tramoGeometriaAsfaltoHtml(t);
        return `<div class="map-popup">
      <div class="map-popup-tag">Tramo</div>
      <strong>${esc(t.via || '—')}</strong>
      <dl class="map-popup-dl">
        <dt>Fecha inventario</dt><dd>${esc(fi)}</dd>
        <dt>Nomenclatura</dt><dd>${esc(nom)}</dd>
        <dt>Departamento</dt><dd>${esc(t.departamento || '—')}</dd>
        <dt>Municipio</dt><dd>${esc(t.municipio || '—')}</dd>
        <dt>Coordenadas</dt><dd><code>${esc(coords)}</code> <span class="map-popup-coord-hint">(lat, lng)</span></dd>
        <dt>ZAT</dt><dd>${esc(z)}</dd>
        <dt>Tipo vía</dt><dd>${esc(t.tipoVia || '—')}</dd>
        <dt>Fase</dt><dd>${esc(fase)}</dd>
        <dt>Acción</dt><dd>${esc(accion)}</dd>
        <dt>Estado vía</dt><dd>${esc(this.estadoViaTramoTexto(t))}</dd>
        <dt>Capa rodadura</dt><dd>${esc(t.capaRodadura || '—')}</dd>
        ${geoAsp}
        <dt>Longitud</dt><dd>${esc(t.longitud_m != null ? t.longitud_m + ' m' : '—')}</dd>
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

    conteos(): { tr: number; sv: number; sh: number; sem: number } {
        return {
            tr: this.filteredTramos().length,
            sv: this.filteredVert().length,
            sh: this.filteredHor().length,
            sem: this.filteredSemaforos().length
        };
    }
}
