import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    inject,
} from '@angular/core';

/**
 * Mapa Leaflet de solo lectura bajo las coordenadas del formulario.
 * - Un punto: [previewLat] + [previewLng] (+ pointEmoji opcional).
 * - Línea (vía tramo): añadir previewLat2 / previewLng2.
 */
@Directive({
    selector: '[appGeoPreviewMap]',
    standalone: true,
})
export class GeoPreviewMapDirective implements OnChanges, AfterViewInit, OnDestroy {
    private readonly host = inject(ElementRef<HTMLElement>);

    @Input() previewLat: number | null | undefined = null;
    @Input() previewLng: number | null | undefined = null;
    @Input() previewLat2: number | null | undefined = null;
    @Input() previewLng2: number | null | undefined = null;
    @Input() pointEmoji = '📍';
    @Input() previewZoom = 17;
    /** Si aún no hay punto del tramo: centrar el mapa aquí (ej. municipio DIVIPOL). */
    @Input() fallbackCenterLat: number | null | undefined = null;
    @Input() fallbackCenterLng: number | null | undefined = null;
    @Input() fallbackZoom = 12;

    private map: any = null;
    private layers: any[] = [];
    private raf = 0;

    ngOnChanges(_changes: SimpleChanges): void {
        this.scheduleRefresh();
    }

    ngAfterViewInit(): void {
        this.scheduleRefresh();
    }

    ngOnDestroy(): void {
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        this.teardown();
    }

    private scheduleRefresh(): void {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            this.refresh();
        });
    }

    private teardown(): void {
        this.layers = [];
        if (this.map) {
            try {
                this.map.remove();
            } catch {
                /* ignore */
            }
            this.map = null;
        }
    }

    private refresh(): void {
        const L = (window as any).L;
        const el = this.host.nativeElement;
        if (!L || !el) return;

        const lat1 = this.previewLat;
        const lng1 = this.previewLng;
        const lat2 = this.previewLat2;
        const lng2 = this.previewLng2;

        const nLat1 = lat1 != null ? Number(lat1) : NaN;
        const nLng1 = lng1 != null ? Number(lng1) : NaN;
        const nLat2 = lat2 != null ? Number(lat2) : NaN;
        const nLng2 = lng2 != null ? Number(lng2) : NaN;

        const has1 = lat1 != null && lng1 != null && Number.isFinite(nLat1) && Number.isFinite(nLng1);
        const has2 = has1 && lat2 != null && lng2 != null && Number.isFinite(nLat2) && Number.isFinite(nLng2);

        const fbLat = this.fallbackCenterLat;
        const fbLng = this.fallbackCenterLng;
        const nFbLat = fbLat != null ? Number(fbLat) : NaN;
        const nFbLng = fbLng != null ? Number(fbLng) : NaN;
        const hasFallback =
            !has1 &&
            fbLat != null &&
            fbLng != null &&
            Number.isFinite(nFbLat) &&
            Number.isFinite(nFbLng);

        if (!has1 && hasFallback) {
            el.classList.remove('geo-preview-map--empty');
            if (el.querySelector('.geo-preview-map__placeholder')) {
                el.innerHTML = '';
            }
            const z = Number.isFinite(Number(this.fallbackZoom)) ? Number(this.fallbackZoom) : 12;
            if (!this.map) {
                this.map = L.map(el, { zoomControl: true, attributionControl: true }).setView(
                    [nFbLat, nFbLng],
                    z,
                );
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap',
                }).addTo(this.map);
                setTimeout(() => this.map?.invalidateSize(), 100);
                setTimeout(() => this.map?.invalidateSize(), 400);
            } else {
                this.map.setView([nFbLat, nFbLng], z);
            }
            for (const layer of this.layers) {
                try {
                    this.map.removeLayer(layer);
                } catch {
                    /* ignore */
                }
            }
            this.layers = [];
            setTimeout(() => this.map?.invalidateSize(), 50);
            return;
        }

        if (!has1) {
            this.teardown();
            el.classList.add('geo-preview-map--empty');
            el.innerHTML =
                '<span class="geo-preview-map__placeholder">Seleccione municipio (DIVIPOL) para ver el mapa del territorio y luego marque el tramo.</span>';
            return;
        }

        el.classList.remove('geo-preview-map--empty');
        if (el.querySelector('.geo-preview-map__placeholder')) {
            el.innerHTML = '';
        }

        const la1 = nLat1;
        const lo1 = nLng1;

        if (!this.map) {
            this.map = L.map(el, { zoomControl: true, attributionControl: true }).setView(
                [la1, lo1],
                this.previewZoom,
            );
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(this.map);
            setTimeout(() => this.map?.invalidateSize(), 100);
            setTimeout(() => this.map?.invalidateSize(), 400);
        }

        for (const layer of this.layers) {
            try {
                this.map.removeLayer(layer);
            } catch {
                /* ignore */
            }
        }
        this.layers = [];

        if (has2) {
            const la2 = nLat2;
            const lo2 = nLng2;
            const line = L.polyline(
                [
                    [la1, lo1],
                    [la2, lo2],
                ],
                { color: '#4a9eff', weight: 4, opacity: 0.85 },
            ).addTo(this.map);
            const m1 = L.marker([la1, lo1], {
                icon: this.markerAB(L, '#4caf82', 'A'),
            }).addTo(this.map);
            const m2 = L.marker([la2, lo2], {
                icon: this.markerAB(L, '#e05c5c', 'B'),
            }).addTo(this.map);
            this.layers.push(line, m1, m2);
            this.map.fitBounds(L.latLngBounds([la1, lo1], [la2, lo2]), {
                padding: [28, 28],
                maxZoom: 18,
            });
        } else {
            this.map.setView([la1, lo1], this.previewZoom);
            const icon = L.divIcon({
                html: `<div style="background:#1976d2;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${this.pointEmoji}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: '',
            });
            const m = L.marker([la1, lo1], { icon }).addTo(this.map);
            this.layers.push(m);
        }
    }

    private markerAB(L: any, color: string, label: string): any {
        return L.divIcon({
            html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            className: '',
        });
    }
}
