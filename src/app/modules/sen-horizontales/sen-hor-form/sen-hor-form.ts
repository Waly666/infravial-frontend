import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
    filtrarTramosPickerPorBusqueda,
    filtrarTramosPorMunicipioJornada,
    nomenclaturaSearchText
} from '../../../shared/utils/geo-list-filters';
import {
    TramoGeoPipe,
    TramoNomenclaturaPipe,
    MongoIdPipe
} from '../../../shared/pipes/tramo-display.pipe';

@Component({
    selector: 'app-sen-hor-form',
    standalone: true,
    imports: [CommonModule, FormsModule, TramoGeoPipe, TramoNomenclaturaPipe, MongoIdPipe],
    templateUrl: './sen-hor-form.html',
    styleUrls: [
        './sen-hor-form.scss',
        '../../../shared/styles/tramo-picker-labels.scss',
        '../../../shared/styles/tramo-seleccionado-panel.scss'
    ]
})
export class SenHorFormComponent implements OnInit {

    pasoActual  = 1;
    totalPasos  = 4;
    modoEdicion = false;
    idEdicion:  string | null = null;
    loading     = false;
    error       = '';
    apiUrl      = environment.apiUrl;

    jornada:   any   = null;
    tramos:    any[] = [];
    catalogoDemarcaciones: any[] = [];
    catalogoUbicSH: any[] = [];
    obsSH:     any[] = [];

    mostrarGaleria  = false;
    filtroCatalogo  = '';
    demSeleccionada: any = null;

    mostrarTramos   = false;
    tramoSeleccionado: any = null;
    busquedaTramo   = '';

    mapaAbierto = false;
    leafletMap:  any = null;
    marcador:    any = null;

    fotoPreview:  string  = '';
    fotoArchivo:  File | null = null;

    form: any = {
        idJornada:    '',
        idViaTramo:   '',
        municipio:    '',
        supervisor:   '',

        ubicacion: { type: 'Point', coordinates: [] },
        lat: null,
        lng: null,

        codSeHor:          '',
        tipoDem:           '',
        estadoDem:         '',
        tipoPintura:       '',
        material:          '',
        fechaInst:         '',
        fase:              '',
        accion:            '',
        fechaAccion:       '',
        ubicResTramo:      '',
        reflectOptima:     '',
        retroreflectividad:'',
        color:             '',
        claseDemLinea:     '',
        claseDemPunto:     '',

        obs1: '', obs2: '', obs3: '',
        obs4: '', obs5: '', obs6: '',
        notas:     '',
        urlFotoSH: ''
    };

    tiposDem     = ['Demarcación a nivel', 'Demarcación Elevada'];
    estadosDem   = ['Buena', 'Regular', 'Mala', 'No se encontro señal', 'No Registra'];
    materiales   = ['Ceramico', 'Caucho', 'Metallico', 'Sintetico', 'Hormigon', 'Pintura', 'Plastico'];
    fases        = ['Inventario', 'Programación', 'Diseño', 'Por definir'];
    reflectOpts  = ['Si', 'No', 'N/A'];
    tiposPintura  = ['Si', 'No', 'N/A', 'No hay Información del elemento Aplicado', 'Base agua tipo A-I', 'Base agua tipo A-II', 'Base solvente tipo B-I', 'Base solvente tipo B-II', 'Sin solvente plástico frio tipo C', 'Termoplástica'];
    clasesLinea   = ['Linea Longitudinal', 'Linea Transversal', 'Demarcacion para cruces', 'Demarcacion Lineas de Estacionamiento', 'Demarcacion de Paraderos', 'Simbolos', 'Leyendas', 'Otras', 'N/A'];
    clasesPunto   = ['Demarcación elevada', 'Demarcación para cruces', 'Demarcación paraderos', 'Demarcación simbolos y leyendas', 'Otras demarcaciones', 'N/A'];
    acciones      = ['Repintar', 'Borrar', 'Mantenimiento', 'Retiro', 'Reemplazo', 'Reposicion', 'Instalacion', 'Otro'];

    constructor(
        private senHorService:   SenHorService,
        private jornadaService:  JornadaService,
        private viaTramoService: ViaTramoService,
        private catalogoService: CatalogoService,
        private api:             ApiService,
        private authService:     AuthService,
        private route:           ActivatedRoute,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.idEdicion   = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!this.idEdicion;
        this.loadJornada();
        this.loadCatalogos();
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

    loadCatalogos() {
        this.catalogoService.getDemarcaciones().subscribe({
            next: (res) => this.catalogoDemarcaciones = res.datos
        });
        this.catalogoService.getUbicSenHor().subscribe({
            next: (res) => this.catalogoUbicSH = res.datos
        });
        this.catalogoService.getObsSH().subscribe({
            next: (res) => this.obsSH = res.datos
        });
    }

    loadRegistro() {
        this.senHorService.getById(this.idEdicion!).subscribe({
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
                if (r.codSeHor) {
                    this.demSeleccionada = this.catalogoDemarcaciones.find(
                        d => d.codDem === r.codSeHor
                    );
                }
                ['obs1','obs2','obs3','obs4','obs5','obs6'].forEach(o => {
                    if (this.form[o]?._id) this.form[o] = this.form[o]._id;
                });
            }
        });
    }

    // ── WIZARD ────────────────────────────────────
    get progreso(): number { return (this.pasoActual / this.totalPasos) * 100; }
    siguiente() { if (this.pasoActual < this.totalPasos) this.pasoActual++; }
    anterior()  { if (this.pasoActual > 1) this.pasoActual--; }
    irAPaso(n: number) { this.pasoActual = n; }

    // ── TRAMO ─────────────────────────────────────
    get tramosFiltrados() {
        const base = filtrarTramosPorMunicipioJornada(this.tramos, this.jornada);
        return filtrarTramosPickerPorBusqueda(base, this.busquedaTramo || '');
    }

    seleccionarTramo(t: any) {
        this.form.idViaTramo   = t._id;
        this.tramoSeleccionado = t;
        this.busquedaTramo     = nomenclaturaSearchText(t) || '';
        this.mostrarTramos     = false;
    }

    // ── GALERÍA DEMARCACIONES ─────────────────────
    get catalogoFiltrado() {
        if (!this.filtroCatalogo) return this.catalogoDemarcaciones;
        const q = this.filtroCatalogo.toLowerCase();
        return this.catalogoDemarcaciones.filter(d =>
            d.codDem?.toLowerCase().includes(q) ||
            d.descripcion?.toLowerCase().includes(q) ||
            d.claseDem?.toLowerCase().includes(q)
        );
    }

    seleccionarDem(d: any) {
        this.demSeleccionada  = d;
        this.form.codSeHor    = d.codDem;
        this.mostrarGaleria   = false;
        this.filtroCatalogo   = '';
    }

    getImgUrl(d: any): string {
        if (!d?.urlDemImg) return '';
        return `${this.apiUrl}${d.urlDemImg}`;
    }

    // ── MAPA ──────────────────────────────────────
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

        this.leafletMap = L.map('leaflet-map-sh').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        if (this.form.lat && this.form.lng) {
            this.agregarMarcador(L, this.form.lat, this.form.lng);
        }

        this.leafletMap.on('click', (e: any) => {
            this.form.lat = e.latlng.lat;
            this.form.lng = e.latlng.lng;
            this.agregarMarcador(L, e.latlng.lat, e.latlng.lng);
        });
    }

    agregarMarcador(L: any, lat: number, lng: number) {
        if (this.marcador) this.leafletMap.removeLayer(this.marcador);
        const icon = L.divIcon({
            html: `<div style="background:#4a9eff;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚦</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15], className: ''
        });
        this.marcador = L.marker([lat, lng], { icon }).addTo(this.leafletMap);
        this.marcador.bindPopup(`Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
    }

    // ── FOTO ──────────────────────────────────────
    onFotoSeleccionada(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => { this.fotoPreview = e.target.result; };
        reader.readAsDataURL(file);
        this.fotoArchivo = file;
    }

    removeFoto() {
        this.fotoPreview = '';
        this.fotoArchivo = null;
    }

    // ── GUARDAR ───────────────────────────────────
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

        ['obs1','obs2','obs3','obs4','obs5','obs6'].forEach(campo => {
            if (this.form[campo] === '' || this.form[campo] === undefined) {
                this.form[campo] = null;
            }
        });

        const formData = { ...this.form };
        delete formData.logUltimaMod;

        const obs$ = this.modoEdicion
            ? this.senHorService.update(this.idEdicion!, formData)
            : this.senHorService.create(formData);

        obs$.subscribe({
            next: (res: any) => {
                const idRegistro = res.registro._id;

                if (this.fotoArchivo) {
                    const fd = new FormData();
                    fd.append('foto', this.fotoArchivo);
                    this.api.uploadFile<any>(`/upload/sen-hor`, fd).subscribe({
                        next: (r: any) => {
                            this.api.put(`/sen-hor/${idRegistro}`, {
                                urlFotoSH: r.urls[0]
                            }).subscribe();
                        }
                    });
                }

                this.loading = false;
                if (seguirAgregando) {
                    this.resetForm();
                } else {
                    this.router.navigate(['/sen-horizontales']);
                }
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al guardar';
            }
        });
    }

    resetForm() {
        this.demSeleccionada  = null;
        this.tramoSeleccionado = null;
        this.fotoPreview      = '';
        this.fotoArchivo      = null;
        this.pasoActual       = 1;
        this.form = {
            ...this.form,
            idViaTramo: '', codSeHor: '', tipoDem: '', estadoDem: '',
            tipoPintura: '', material: '', fechaInst: '', fase: '',
            accion: '', fechaAccion: '', ubicResTramo: '', reflectOptima: '',
            retroreflectividad: '', color: '', claseDemLinea: '', claseDemPunto: '',
            obs1: '', obs2: '', obs3: '', obs4: '', obs5: '', obs6: '',
            notas: '', urlFotoSH: '',
            ubicacion: { type: 'Point', coordinates: [] },
            lat: null, lng: null
        };
        this.error = '';
    }
}
