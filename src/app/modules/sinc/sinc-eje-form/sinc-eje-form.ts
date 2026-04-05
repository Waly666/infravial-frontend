import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SincService } from '../../../core/services/sinc.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { SINC_HELP, HelpEntry } from '../sinc-eje-detalle/sinc-help.data';

declare const L: any;

const SINC_EJE_JORNADA = '__sinc_jornada__';
const SINC_EJE_GEO = '__sinc_geo__';

@Component({
    selector: 'app-sinc-eje-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './sinc-eje-form.html',
    styleUrl: './sinc-eje-form.scss'
})
export class SincEjeFormComponent implements OnInit {

    paso = 1;
    modoEdicion = false;
    idEdicion: string | null = null;
    loading = false;
    error   = '';
    apiUrl  = environment.apiUrl;

    jornada: any = null;
    dominios: any = {};

    // Modelo
    form: any = {
        idJornada:       '',
        codigoVia:       '',
        codigoVia1:      '',
        nomVia:          '',
        tipoRed:         null,
        tipoEje:         null,
        sentido:         null,
        categoria:       null,
        concesion:       false,
        codigoConcesion: '',
        nivelInventario: 'basico',
        longitud_m:      null,
        ubicacion:       null,
        obs:             ''
    };

    nivelSugerido: 'basico' | 'detallado' | null = null;

    // Mapa
    mapaAbierto = false;
    leafletMap:  any = null;
    polylineRef: any = null;
    marcadores:  any[] = [];  // coordenadas [lat, lng]

    // Fotos
    fotosPreview:  any[]  = [];
    fotosArchivos: File[] = [];

    // Ayuda contextual
    mostrarAyuda = false;
    readonly ayuda: HelpEntry = SINC_HELP['eje'];

    constructor(
        private sincService: SincService,
        private jornadaService: JornadaService,
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.idEdicion = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!this.idEdicion;

        this.sincService.getDominios().subscribe(d => this.dominios = d);

        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada = res.jornada;
                this.form.idJornada = res.jornada?._id || '';
            },
            error: () => {}
        });

        if (this.modoEdicion) {
            this.sincService.getEjeById(this.idEdicion!).subscribe({
                next: (res) => {
                    const e = res.eje;
                    this.form = {
                        idJornada:       e.idJornada?._id || e.idJornada,
                        codigoVia:       e.codigoVia || '',
                        codigoVia1:      e.codigoVia1 || '',
                        nomVia:          e.nomVia || '',
                        tipoRed:         e.tipoRed   ?? null,
                        tipoEje:         e.tipoEje   ?? null,
                        sentido:         e.sentido   ?? null,
                        categoria:       e.categoria ?? null,
                        concesion:       e.concesion || false,
                        codigoConcesion: e.codigoConcesion || '',
                        nivelInventario: e.nivelInventario || 'basico',
                        longitud_m:      e.longitud_m || null,
                        ubicacion:       e.ubicacion  || null,
                        obs:             e.obs || ''
                    };
                    if (e.ubicacion?.coordinates?.length) {
                        this.marcadores = e.ubicacion.coordinates.map((c: number[]) => [c[1], c[0]]);
                    }
                },
                error: (err) => this.error = err.message
            });
        }
    }

    // ─── MAPA ─────────────────────────────────────────────────────────────────

    abrirMapa() {
        this.mapaAbierto = true;
        setTimeout(() => this.iniciarMapa(), 100);
    }

    iniciarMapa() {
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }

        const el = document.getElementById('sinc-mapa');
        if (!el) return;

        this.leafletMap = L.map(el).setView([4.6, -74.1], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        // Redibujar línea existente
        if (this.marcadores.length > 1) {
            this.dibujarLinea();
        }

        this.leafletMap.on('click', (e: any) => {
            this.zone.run(() => {
                this.marcadores.push([e.latlng.lat, e.latlng.lng]);
                this.dibujarLinea();
            });
        });
    }

    dibujarLinea() {
        if (this.polylineRef) this.leafletMap.removeLayer(this.polylineRef);
        if (this.marcadores.length < 2) return;
        this.polylineRef = L.polyline(this.marcadores, { color: '#ef6c00', weight: 4 }).addTo(this.leafletMap);
        this.leafletMap.fitBounds(this.polylineRef.getBounds(), { padding: [30, 30] });

        // Calcular longitud aproximada
        let dist = 0;
        for (let i = 1; i < this.marcadores.length; i++) {
            dist += L.latLng(this.marcadores[i - 1]).distanceTo(L.latLng(this.marcadores[i]));
        }
        this.form.longitud_m = Math.round(dist);
    }

    deshacerUltimoPunto() {
        if (!this.marcadores.length) return;
        this.marcadores.pop();
        this.dibujarLinea();
    }

    limpiarLinea() {
        this.marcadores = [];
        if (this.polylineRef) { this.leafletMap.removeLayer(this.polylineRef); this.polylineRef = null; }
        this.form.longitud_m = null;
    }

    confirmarGeometria() {
        if (this.marcadores.length < 2) {
            alert('Dibuja al menos 2 puntos para definir el eje.');
            return;
        }
        this.form.ubicacion = {
            type: 'LineString',
            coordinates: this.marcadores.map(m => [m[1], m[0]])
        };
        this.mapaAbierto = false;
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }

    cerrarMapa() {
        this.mapaAbierto = false;
        if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }

    // ─── FOTOS ────────────────────────────────────────────────────────────────

    onFotoSeleccionada(event: any) {
        const files: FileList = event.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.fotosPreview.push({ url: e.target.result, nombre: file.name });
            };
            reader.readAsDataURL(file);
            this.fotosArchivos.push(file);
        }
    }

    eliminarFoto(i: number) {
        this.fotosPreview.splice(i, 1);
        this.fotosArchivos.splice(i, 1);
    }

    private limpiarMarcasValidacionEje(root: Element | null) {
        if (!root) return;
        root.querySelectorAll('.form-field--sinc-invalid').forEach(el => el.classList.remove('form-field--sinc-invalid'));
        root.querySelectorAll('.sinc-control-invalid').forEach(el => el.classList.remove('sinc-control-invalid'));
    }

    private aplicarMarcaInvalidaEje(el: HTMLElement) {
        el.classList.add('sinc-control-invalid');
        (el.closest('.form-field') || el.closest('.geo-status'))?.classList.add('form-field--sinc-invalid');
    }

    private resolverCampoEjeForm(root: HTMLElement, token: string): HTMLElement | null {
        if (token === SINC_EJE_JORNADA) {
            return document.querySelector('.page-container .error-banner') as HTMLElement | null;
        }
        if (token === SINC_EJE_GEO) {
            return root.querySelector('.geo-status button.btn-secondary') as HTMLElement | null;
        }
        try {
            return root.querySelector(`[name="${CSS.escape(token)}"]`) as HTMLElement | null;
        } catch {
            return root.querySelector(`[name="${token}"]`) as HTMLElement | null;
        }
    }

    private aplicarValidacionFallidaEje(message: string, fields: string[]) {
        this.error = message;
        this.cdr.detectChanges();
        setTimeout(() => {
            const root = document.querySelector('form.sinc-form') as HTMLElement | null;
            if (!root) return;
            this.limpiarMarcasValidacionEje(root);
            let first: HTMLElement | null = null;
            for (const f of fields) {
                const el = this.resolverCampoEjeForm(root, f);
                if (el) {
                    this.aplicarMarcaInvalidaEje(el);
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

    // ─── GUARDAR ──────────────────────────────────────────────────────────────

    async guardar() {
        const formRoot = document.querySelector('form.sinc-form');
        this.limpiarMarcasValidacionEje(formRoot);
        if (!this.form.codigoVia?.trim()) {
            this.aplicarValidacionFallidaEje('El Código de Vía es requerido.', ['codigoVia']);
            return;
        }
        if (!this.form.idJornada) {
            this.aplicarValidacionFallidaEje('Debe haber una jornada activa.', [SINC_EJE_JORNADA]);
            return;
        }

        this.loading = true;
        this.error   = '';

        try {
            let fotosUrls: string[] = [];

            if (this.fotosArchivos.length > 0) {
                const fd = new FormData();
                this.fotosArchivos.forEach(f => fd.append('fotos', f));
                const upRes: any = await this.apiService.uploadFile('/upload/sinc-ejes', fd).toPromise();
                fotosUrls = upRes.urls || [];
            }

            const payload = { ...this.form };
            if (fotosUrls.length > 0) payload.fotos = fotosUrls;

            if (this.modoEdicion) {
                await this.sincService.updateEje(this.idEdicion!, payload).toPromise();
            } else {
                await this.sincService.createEje(payload).toPromise();
            }

            this.router.navigate(['/sinc/ejes']);
        } catch (err: any) {
            this.error = err?.error?.message || err?.message || 'Error al guardar';
        } finally {
            this.loading = false;
        }
    }

    // ─── NIVEL DE INVENTARIO ──────────────────────────────────────────────────

    onTipoRedChange() {
        this.actualizarNivelSugerido();
    }

    onConcesionChange() {
        this.actualizarNivelSugerido();
    }

    private actualizarNivelSugerido() {
        const esRedPrimaria = this.form.tipoRed === 1;
        const esConcesion   = this.form.concesion === true;
        if (esRedPrimaria || esConcesion) {
            this.nivelSugerido = 'detallado';
        } else {
            this.nivelSugerido = 'basico';
        }
    }

    aplicarNivelSugerido() {
        if (this.nivelSugerido) {
            this.form.nivelInventario = this.nivelSugerido;
            this.nivelSugerido = null;
        }
    }

    cancelar() { this.router.navigate(['/sinc/ejes']); }

    get tieneGeometria(): boolean {
        return this.form.ubicacion?.coordinates?.length > 1;
    }
}
