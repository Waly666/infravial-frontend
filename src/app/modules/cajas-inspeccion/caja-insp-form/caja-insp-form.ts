import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
    nomenclaturaSearchText,
    textBlobMatchesQuery
} from '../../../shared/utils/geo-list-filters';
import { TramoGeoPipe, TramoViaNomPipe } from '../../../shared/pipes/tramo-display.pipe';

@Component({
    selector: 'app-caja-insp-form',
    standalone: true,
    imports: [CommonModule, FormsModule, TramoGeoPipe, TramoViaNomPipe],
    templateUrl: './caja-insp-form.html',
    styleUrls: ['./caja-insp-form.scss', '../../../shared/styles/tramo-picker-labels.scss']
})
export class CajaInspFormComponent implements OnInit {

    pasoActual  = 1;
    totalPasos  = 3;
    modoEdicion = false;
    idEdicion:  string | null = null;
    loading     = false;
    error       = '';
    apiUrl      = environment.apiUrl;

    jornada:   any   = null;
    tramos:    any[] = [];
    mostrarTramos    = false;
    tramoSeleccionado: any = null;
    busquedaTramo    = '';

    mapaAbierto = false;
    leafletMap:  any = null;
    marcador:    any = null;

    fotoCaja:    File | null = null;
    previewCaja  = '';

    form: any = {
        idJornada:      '',
        idViaTramo:     '',
        municipio:      '',
        supervisor:     '',

        ubicacion: { type: 'Point', coordinates: [] },
        lat: null,
        lng: null,

        materialCaja:   '',
        fase:           '',
        accion:         '',
        implementacion: '',
        estadoCaja:     '',
        tapa:           false,
        estadoTapa:     '',
        notas:          '',
        urlFotoCaja:    ''
    };

    materiales     = ['Concreto', 'Plastico', 'Otro material'];
    fases          = ['Inventario', 'Programación', 'Diseño', 'Por definir'];
    acciones       = ['Mantenimiento', 'Retiro', 'Reemplazo', 'Reubicacion', 'Instalacion', 'Inventario', 'Para definir', 'Otro'];
    implementaciones = ['Temporal', 'Definitiva'];
    estadoOpts     = ['Bueno', 'Regular', 'Malo'];
    estadosTapa    = ['Bueno', 'Regular', 'Malo', 'No existe tapa'];

    constructor(
        private cajaInspService: CajaInspService,
        private jornadaService:  JornadaService,
        private viaTramoService: ViaTramoService,
        private api:             ApiService,
        private authService:     AuthService,
        private route:           ActivatedRoute,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.idEdicion   = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!this.idEdicion;
        this.loadJornada();
        if (this.modoEdicion) setTimeout(() => this.loadRegistro(), 800);
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada        = res.jornada;
                this.form.idJornada = res.jornada._id;
                this.form.municipio = res.jornada.municipio;
                this.form.supervisor= res.jornada.supervisor;
                this.loadTramos();
            },
            error: () => this.jornada = null
        });
    }

    loadTramos() {
        this.viaTramoService.getAll().subscribe({
            next: (res) => {
                this.tramos = res.tramos;
                if (this.modoEdicion && this.form.idViaTramo && !this.tramoSeleccionado) {
                    this.tramoSeleccionado = this.tramos.find(
                        t => t._id === this.form.idViaTramo || t._id === this.form.idViaTramo?._id
                    );
                }
            },
            error: () => this.tramos = []
        });
    }

    loadRegistro() {
        this.cajaInspService.getById(this.idEdicion!).subscribe({
            next: (res) => {
                const r = res.registro;
                this.form = { ...this.form, ...r };
                if (r.ubicacion?.coordinates?.length === 2) {
                    this.form.lng = r.ubicacion.coordinates[0];
                    this.form.lat = r.ubicacion.coordinates[1];
                }
                if (r.idViaTramo) {
                    this.tramoSeleccionado = typeof r.idViaTramo === 'object'
                        ? r.idViaTramo
                        : this.tramos.find(t => t._id === r.idViaTramo);
                    this.form.idViaTramo = r.idViaTramo?._id || r.idViaTramo;
                }
            }
        });
    }

    get progreso(): number { return (this.pasoActual / this.totalPasos) * 100; }
    siguiente() { if (this.pasoActual < this.totalPasos) this.pasoActual++; }
    anterior()  { if (this.pasoActual > 1) this.pasoActual--; }
    irAPaso(n: number) { this.pasoActual = n; }

    get tramosFiltrados() {
        const qRaw = (this.busquedaTramo || '').trim();
        if (!qRaw) return this.tramos;
        return this.tramos.filter(t => {
            const blob = [
                t.via,
                t.municipio,
                t.departamento,
                nomenclaturaSearchText(t)
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
        });
    }

    seleccionarTramo(t: any) {
        this.form.idViaTramo   = t._id;
        this.tramoSeleccionado = t;
        this.busquedaTramo     = t.via || t.nomenclatura?.completa || '';
        this.mostrarTramos     = false;
    }

    abrirMapa() {
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

        this.leafletMap = L.map('leaflet-map-ci').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        if (this.form.lat && this.form.lng) this.agregarMarcador(L, this.form.lat, this.form.lng);

        this.leafletMap.on('click', (e: any) => {
            this.form.lat = e.latlng.lat;
            this.form.lng = e.latlng.lng;
            this.agregarMarcador(L, e.latlng.lat, e.latlng.lng);
        });
    }

    agregarMarcador(L: any, lat: number, lng: number) {
        if (this.marcador) this.leafletMap.removeLayer(this.marcador);
        const icon = L.divIcon({
            html: `<div style="background:#e05c5c;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">📦</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15], className: ''
        });
        this.marcador = L.marker([lat, lng], { icon }).addTo(this.leafletMap);
        this.marcador.bindPopup(`Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
    }

    onFotoCaja(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => { this.previewCaja = e.target.result; };
        reader.readAsDataURL(file);
        this.fotoCaja = file;
    }

    guardar(seguirAgregando = false) {
        if (!this.form.idViaTramo) {
            this.error = 'Selecciona un tramo de vía';
            return;
        }

        this.loading = true;
        this.error   = '';

        if (this.form.lat && this.form.lng) {
            this.form.ubicacion = {
                type: 'Point',
                coordinates: [parseFloat(this.form.lng), parseFloat(this.form.lat)]
            };
        }

        const formData = { ...this.form };
        delete formData.logUltimaMod;

        if (!formData.tapa) {
            formData.estadoTapa = null;
        }
        if (!this.form.tapa) {
            this.form.estadoTapa = null;
        }
        const obs$ = this.modoEdicion
            ? this.cajaInspService.update(this.idEdicion!, formData)
            : this.cajaInspService.create(formData);

        obs$.subscribe({
            next: (res: any) => {
                const id = res.registro._id;

                if (this.fotoCaja) {
                    const fd = new FormData();
                    fd.append('foto', this.fotoCaja);
                    this.api.uploadFile<any>(`/upload/via-tramo`, fd).subscribe({
                        next: (r: any) => {
                            this.api.put(`/cajas-inspeccion/${id}`, { urlFotoCaja: r.urls[0] }).subscribe();
                        }
                    });
                }

                this.loading = false;
                if (seguirAgregando) {
                    this.resetForm();
                } else {
                    this.router.navigate(['/cajas-inspeccion']);
                }
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al guardar';
            }
        });
    }

    resetForm() {
        this.tramoSeleccionado = null;
        this.fotoCaja          = null;
        this.previewCaja       = '';
        this.pasoActual        = 1;
        this.form = {
            ...this.form,
            idViaTramo: '', materialCaja: '', fase: '', accion: '',
            implementacion: '', estadoCaja: '', tapa: false,
            estadoTapa: '', notas: '', urlFotoCaja: '',
            ubicacion: { type: 'Point', coordinates: [] },
            lat: null, lng: null
        };
        this.error = '';
    }
}

