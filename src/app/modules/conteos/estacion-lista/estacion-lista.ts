import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConteoService } from '../../../core/services/conteo.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import * as L from 'leaflet';

const TIPOS_NOM  = ['Calle', 'Carrera', 'Diagonal', 'Transversal', 'Avenida', 'Manzana', 'Sin_Nomenclatura'];
const CONECTORES = ['con', 'entre'];

@Component({
    selector: 'app-estacion-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estacion-lista.html',
    styleUrl: './estacion-lista.scss'
})
export class EstacionListaComponent implements OnInit, OnDestroy {

    estaciones: any[] = [];
    jornadas:   any[] = [];
    loading    = true;
    error      = '';
    busqueda   = '';
    idJornadaSel = '';

    // Modal
    modal       = false;
    modoEdicion = false;
    idEdicion: string | null = null;
    guardando   = false;
    errorModal  = '';

    tiposNom  = TIPOS_NOM;
    conectores = CONECTORES;

    nom = {
        tipoVia1: '', numero1: '', conector: '',
        tipoVia2: '', numero2: '', conector2: '',
        tipoVia3: '', numero3: '', completa: ''
    };

    form: any = {
        nomenclatura: '',
        nomPartes: {},
        departamento: '',
        municipio:    '',
        localidad:    '',
        supervisor:   '',
        creadoPor:    '',
        poligono:     []
    };

    // Mapa leaflet dentro del modal
    private mapa: L.Map | null = null;
    private poliLayer: L.Polygon | null = null;
    private markersLayer: L.LayerGroup = L.layerGroup();
    poligonoCoords: { lat: number; lng: number }[] = [];

    constructor(
        private svc:        ConteoService,
        private authSvc:    AuthService,
        private confirmDlg: ConfirmDialogService,
        public  router:     Router
    ) {}

    ngOnInit() {
        this.cargar();
        this.svc.getJornadasEnProceso().subscribe({ next: (r) => this.jornadas = r.datos || [], error: () => { this.jornadas = []; } });
    }

    ngOnDestroy() {
        this.destroyMap();
    }

    cargar() {
        this.loading = true;
        this.svc.getEstaciones().subscribe({
            next: (r) => { this.estaciones = r.datos; this.loading = false; },
            error: (e) => { this.error = e?.error?.message || 'Error'; this.loading = false; }
        });
    }

    get filtradas() {
        const q = this.busqueda.toLowerCase();
        return this.estaciones.filter(e =>
            !q || JSON.stringify(e).toLowerCase().includes(q)
        );
    }

    // ── NOMENCLATURA ───────────────────────────────────────────────────────────
    actualizarNomenclatura() {
        let completa = '';
        if (this.nom.tipoVia1 && this.nom.numero1) completa += `${this.nom.tipoVia1} ${this.nom.numero1}`;
        if (this.nom.conector)                     completa += ` ${this.nom.conector} `;
        if (this.nom.tipoVia2 && this.nom.numero2) completa += `${this.nom.tipoVia2} ${this.nom.numero2}`;
        if (this.nom.conector2)                    completa += ` ${this.nom.conector2} `;
        if (this.nom.tipoVia3 && this.nom.numero3) completa += `${this.nom.tipoVia3} ${this.nom.numero3}`;
        this.nom.completa = completa.trim();
        this.form.nomenclatura = this.nom.completa;
    }

    // ── MAPA POLÍGONO ──────────────────────────────────────────────────────────
    initMap() {
        setTimeout(async () => {
            const el = document.getElementById('mapa-poligono-el');
            if (!el || this.mapa) return;

            // Centro inicial: primer punto del polígono existente, o municipio de la jornada, o fallback Colombia
            let center: [number, number] = [4.7, -74.07];
            let zoom = 13;

            if (this.poligonoCoords.length > 0) {
                center = [this.poligonoCoords[0].lat, this.poligonoCoords[0].lng];
                zoom = 16;
            } else if (this.form.municipio) {
                try {
                    const q = encodeURIComponent(`${this.form.municipio}, ${this.form.departamento || ''}, Colombia`);
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
                    const data = await res.json();
                    if (data?.[0]) {
                        center = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                        zoom = 14;
                    }
                } catch (_) {}
            }

            this.mapa = L.map(el, { zoomControl: true }).setView(center, zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap', maxZoom: 19
            }).addTo(this.mapa);

            this.agregarRosaVientos(this.mapa);
            this.markersLayer.addTo(this.mapa);
            this.redrawPoligono();

            this.mapa.on('click', (ev: L.LeafletMouseEvent) => {
                this.poligonoCoords.push({ lat: ev.latlng.lat, lng: ev.latlng.lng });
                this.form.poligono = [...this.poligonoCoords];
                this.redrawPoligono();
            });
        }, 80);
    }

    private agregarRosaVientos(map: L.Map) {
        const Rosa = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd() {
                const div = L.DomUtil.create('div', 'rosa-vientos');
                div.innerHTML = `
                <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
                    <!-- Flechas cardinales -->
                    <!-- Norte -->
                    <polygon points="45,4 40,30 45,24 50,30" fill="#e05c5c"/>
                    <!-- Sur -->
                    <polygon points="45,86 40,60 45,66 50,60" fill="rgba(180,200,255,0.7)"/>
                    <!-- Este -->
                    <polygon points="86,45 60,40 66,45 60,50" fill="rgba(180,200,255,0.7)"/>
                    <!-- Oeste -->
                    <polygon points="4,45 30,40 24,45 30,50" fill="rgba(180,200,255,0.7)"/>
                    <!-- Círculo central -->
                    <circle cx="45" cy="45" r="5" fill="#4a9eff" opacity="0.9"/>
                    <!-- Letras -->
                    <text x="45" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="#e05c5c" font-family="sans-serif">N</text>
                    <text x="45" y="84" text-anchor="middle" font-size="10" font-weight="700" fill="rgba(180,200,255,0.85)" font-family="sans-serif">S</text>
                    <text x="79" y="49" text-anchor="middle" font-size="10" font-weight="700" fill="rgba(180,200,255,0.85)" font-family="sans-serif">E</text>
                    <text x="11" y="49" text-anchor="middle" font-size="10" font-weight="700" fill="rgba(180,200,255,0.85)" font-family="sans-serif">O</text>
                </svg>`;
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        new Rosa().addTo(map);
    }

    private redrawPoligono() {
        if (!this.mapa) return;
        this.markersLayer.clearLayers();
        if (this.poliLayer) { this.mapa.removeLayer(this.poliLayer); this.poliLayer = null; }

        this.poligonoCoords.forEach((p, i) => {
            const m = L.circleMarker([p.lat, p.lng], {
                radius: 6, color: '#4a9eff', fillColor: '#4a9eff', fillOpacity: 0.9, weight: 2
            }).addTo(this.markersLayer);
            m.bindTooltip(`${i + 1}`, { permanent: true, className: 'marker-label', direction: 'top' });
        });

        if (this.poligonoCoords.length >= 3) {
            const latlngs = this.poligonoCoords.map(p => [p.lat, p.lng] as [number, number]);
            this.poliLayer = L.polygon(latlngs, {
                color: '#4a9eff', fillColor: '#4a9eff', fillOpacity: 0.15, weight: 2
            }).addTo(this.mapa);
        }
    }

    quitarUltimoPunto() {
        this.poligonoCoords.pop();
        this.form.poligono = [...this.poligonoCoords];
        this.redrawPoligono();
    }

    limpiarPoligono() {
        this.poligonoCoords = [];
        this.form.poligono  = [];
        this.redrawPoligono();
    }

    private destroyMap() {
        if (this.mapa) { this.mapa.remove(); this.mapa = null; }
    }

    // ── MODAL ──────────────────────────────────────────────────────────────────
    abrirCrear() {
        this.modoEdicion = false;
        this.idEdicion   = null;
        this.errorModal  = '';
        this.idJornadaSel = '';
        this.nom = { tipoVia1: '', numero1: '', conector: '', tipoVia2: '', numero2: '', conector2: '', tipoVia3: '', numero3: '', completa: '' };
        this.poligonoCoords = [];
        this.destroyMap();
        this.form = {
            nomenclatura: '',
            nomPartes: {},
            departamento: '',
            municipio:    '',
            localidad:    '',
            supervisor:   '',
            creadoPor:    this.authSvc.getUsuario()?.nombre || '',
            poligono:     []
        };
        this.modal = true;
        this.initMap();
    }

    onJornadaChange() {
        const j = this.jornadas.find(j => j._id === this.idJornadaSel);
        if (j) {
            this.form.departamento = j.dpto       || '';
            this.form.municipio    = j.municipio  || '';
            this.form.localidad    = j.localidad  || '';
            this.form.supervisor   = j.supervisor || '';
            // re-centrar mapa si ya está abierto
            if (this.mapa && j.municipio) {
                const q = encodeURIComponent(`${j.municipio}, ${j.dpto || ''}, Colombia`);
                fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
                    .then(r => r.json()).then(data => {
                        if (data?.[0]) this.mapa!.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 14);
                    }).catch(() => {});
            }
        } else {
            this.form.departamento = this.form.municipio = this.form.localidad = this.form.supervisor = '';
        }
    }

    abrirEditar(e: any) {
        this.modoEdicion = true;
        this.idEdicion   = e._id;
        this.errorModal  = '';
        this.destroyMap();

        const p = e.nomPartes || {};
        this.nom = {
            tipoVia1: p.tipoVia1 || '', numero1: p.numero1 || '',
            conector: p.conector || '',
            tipoVia2: p.tipoVia2 || '', numero2: p.numero2 || '',
            conector2: p.conector2 || '',
            tipoVia3: p.tipoVia3 || '', numero3: p.numero3 || '',
            completa: e.nomenclatura || ''
        };
        this.poligonoCoords = (e.poligono || []).map((c: any) => ({ lat: c.lat, lng: c.lng }));

        this.form = {
            nomenclatura: e.nomenclatura,
            nomPartes: { ...p },
            departamento: e.departamento,
            municipio:    e.municipio,
            localidad:    e.localidad,
            supervisor:   e.supervisor,
            creadoPor:    e.creadoPor,
            poligono:     [...this.poligonoCoords]
        };
        this.modal = true;
        this.initMap();
    }

    guardar() {
        if (!this.nom.completa && !this.form.nomenclatura) {
            this.errorModal = 'La nomenclatura es requerida';
            return;
        }
        this.guardando = true;
        const payload = {
            ...this.form,
            nomenclatura: this.nom.completa || this.form.nomenclatura,
            nomPartes: { ...this.nom },
            poligono: this.poligonoCoords
        };

        const obs = this.modoEdicion
            ? this.svc.updateEstacion(this.idEdicion!, payload)
            : this.svc.createEstacion(payload);

        obs.subscribe({
            next: () => {
                this.destroyMap();
                this.modal = false;
                this.guardando = false;
                this.cargar();
            },
            error: (e) => {
                this.errorModal = e?.error?.message || 'Error';
                this.guardando = false;
            }
        });
    }

    cerrarModal() {
        this.destroyMap();
        this.modal = false;
    }

    eliminar(e: any) {
        this.confirmDlg.confirm({
            title: '¿Eliminar estación?',
            message: `Se eliminará "${e.nomenclatura}" de forma permanente. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger',
            icon: 'delete'
        }).subscribe(ok => {
            if (!ok) return;
            this.svc.deleteEstacion(e._id).subscribe({
                next: () => this.cargar(),
                error: (err) => this.confirmDlg.confirm({
                    title: 'Error al eliminar',
                    message: err?.error?.message || 'No se pudo eliminar la estación.',
                    confirmText: 'Entendido',
                    variant: 'danger',
                    icon: 'warning',
                    showCancel: false
                }).subscribe()
            });
        });
    }

    verConteos(e: any) {
        this.router.navigate(['/conteos/conteos'], { queryParams: { idEstacion: e._id, nomEstacion: e.nomenclatura } });
    }

    isAdmin()      { return this.authSvc.getUsuario()?.rol === 'admin'; }
    isSupervisor() { const r = this.authSvc.getUsuario()?.rol; return r === 'admin' || r === 'supervisor'; }
}
