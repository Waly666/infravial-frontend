import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SenVertService } from '../../../core/services/sen-vert.service';
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
    selector: 'app-sen-vert-form',
    standalone: true,
    imports: [CommonModule, FormsModule, TramoGeoPipe, TramoNomenclaturaPipe, MongoIdPipe],
    templateUrl: './sen-vert-form.html',
    styleUrls: [
        './sen-vert-form.scss',
        '../../../shared/styles/tramo-picker-labels.scss',
        '../../../shared/styles/tramo-seleccionado-panel.scss'
    ]
})
export class SenVertFormComponent implements OnInit {

    // Wizard
    pasoActual  = 1;
    totalPasos  = 5;
    modoEdicion = false;
    idEdicion:  string | null = null;
    loading     = false;
    error       = '';
    apiUrl      = environment.apiUrl;
    busquedaTramo = '';
    mostrarTramos = false;
    tramoSeleccionado: any = null;

    // Datos
    jornada:  any   = null;
    tramos:   any[] = [];
    catalogoSenVert: any[] = [];
    senVertSeleccionada: any = null;
    obsSV:    any[] = [];

    // Galería
    mostrarGaleria  = false;
    filtroCatalogo  = '';

    // Mapa
    mapaAbierto = false;
    leafletMap:  any = null;
    marcador:    any = null;

    // Fotos
    fotoPreview:  string  = '';
    fotoArchivo:  File | null = null;

    // Formulario
    form: any = {
        // Paso 1
        idJornada:    '',
        idViaTramo:   '',
        municipio:    '',
        departamento: '',
        supervisor:   '',

        // Paso 2 - Geoespacial
        ubicacion: { type: 'Point', coordinates: [] },
        lat: null,
        lng: null,

        // Paso 3 - Señal
        codSe:        '',
        estado:       '',
        matPlaca:     '',
        ubicEspacial: '',
        obstruccion:  '',
        fechaInst:    '',
        forma:        '',
        orientacion:  '',
        reflecOptima: '',
        dimTablero:   '',
        ubicPerVial:  '',
        fase:         '',
        accion:       '',
        ubicLateral:  null,
        diagUbicLat:  '',
        altura:       null,
        diagAltura:   '',
        banderas:     '',
        leyendas:     '',

        // Paso 4 - Fallas y soporte
        falla1: '',
        falla2: '',
        falla3: '',
        falla4: '',
        falla5: '',
        tipoSoporte:    '',
        sistemaSoporte: '',
        estadoSoporte:  '',
        estadoAnclaje:  '',

        // Paso 5 - Obs y fotos
        obs1: '', obs2: '', obs3: '',
        obs4: '', obs5: '',
        notas: '',
        urlFotoSenVert: '',
        fotos: []
    };

    // Enumeraciones
    estados       = ['Bueno', 'Regular', 'Malo'];
    matPlacas     = ['Poliester reforzado', 'Acero galvanizado', 'Aluminio', 'Material Flexible', 'Otro'];
    ubicEspaciales= ['A nivel', 'Elevada'];
    obstrucciones = ['Vegetación', 'Árboles', 'Construcciones', 'Vallas', 'Vehículos estacionados', 'N/A'];
    formas        = ['Circular', 'Octogonal', 'Rectangular', 'Cuadrangular', 'Romboidal', 'Triangular', 'Casa', 'Cruz', 'Escudo', 'Combinacion'];
    orientaciones = ['Optima', 'Deficiente', 'N/A'];
    reflecOpts    = ['Si', 'No', 'N/A'];
    ubicPerViales = ['Izquierda', 'Derecha', 'Sobre la calzada', 'En el Separador'];
    fases         = ['Inventario', 'Programación', 'Diseño', 'Por definir'];
    acciones      = ['Mantenimiento', 'Cambio', 'Reubicación', 'Retiro', 'Reposición', 'Reinstalación', 'Ninguno', 'Mantenimiento y reubicación', 'Para definir', 'Otro'];
    diagOpts      = ['Optima', 'Regular', 'Mala', 'N/A'];
    banderasOpts  = ['Dirección', 'Confirmación', 'Preseñalización', 'N/A'];
    fallasOpts    = ['Desgaste', 'Desproporción de tablero', 'Oxidación', 'Paral doblado', 'Tablero doblado', 'Elementos ajenos', 'Vandalizada', 'N/A'];
    tiposSoporte  = ['Portico', 'Poste en Angulo de hierro', 'Tubo galvanizado', 'Adherido a superficie', 'Otro', 'Postes de semaforo', 'Mensula corta de semaforo', 'Mensula larga sujeta a poste lateral de semaforo', 'Cable de suspension de semaforo', 'Portico de semaforo', 'Postes y pedestales en islas de semaforo'];
    sistemasSop   = ['Tipo H', 'Duplex', 'Movil', 'Poste abatible', 'Elevado', 'Simple', 'Poste en angulo de hierro'];
    estadosSop    = ['Bueno', 'Regular', 'Malo'];

    constructor(
        private senVertService:  SenVertService,
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
                this.jornada           = res.jornada;
                this.form.idJornada    = res.jornada._id;
                this.form.municipio    = res.jornada.municipio;
                this.form.departamento = res.jornada.dpto;
                this.form.supervisor   = res.jornada.supervisor;
                this.loadTramos();
            },
            error: () => this.jornada = null
        });
    }

    loadTramos() {
        this.viaTramoService.getAll().subscribe({
            next: (res) => this.tramos = res.tramos,
            error: ()   => this.tramos = []
        });
    }

    loadCatalogos() {
        this.catalogoService.getSenVertscat().subscribe({
            next: (res) => this.catalogoSenVert = res.datos
        });
        this.catalogoService.getObsSV().subscribe({
            next: (res) => this.obsSV = res.datos
        });
    }

    loadRegistro() {
        this.senVertService.getById(this.idEdicion!).subscribe({
            next: (res) => {
                const r = res.registro;
                this.form = { ...this.form, ...r };
        // ← Recuperar tramo seleccionado
                if (r.idViaTramo) {
                    this.tramoSeleccionado = typeof r.idViaTramo === 'object' 
                        ? r.idViaTramo 
                        : this.tramos.find(t => t._id === r.idViaTramo);
                    this.form.idViaTramo = r.idViaTramo?._id || r.idViaTramo;
                }

                if (r.ubicacion?.coordinates?.length === 2) {
                    this.form.lng = r.ubicacion.coordinates[0];
                    this.form.lat = r.ubicacion.coordinates[1];
                }
                if (r.codSe) {
                    this.senVertSeleccionada = this.catalogoSenVert.find(
                        s => s.codSenVert === r.codSe
                    );
                }
                ['obs1','obs2','obs3','obs4','obs5'].forEach(o => {
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


    /** Tramos del municipio de la jornada; búsqueda solo por nomenclatura (o ID Mongo pegado). */
    get tramosFiltrados() {
        const base = filtrarTramosPorMunicipioJornada(this.tramos, this.jornada);
        return filtrarTramosPickerPorBusqueda(base, this.busquedaTramo || '');
    }

    // ── GALERÍA ──────────────────────────────────
    get catalogoFiltrado() {
        if (!this.filtroCatalogo) return this.catalogoSenVert;
        const q = this.filtroCatalogo.toLowerCase();
        return this.catalogoSenVert.filter(s =>
            s.codSenVert?.toLowerCase().includes(q) ||
            s.descSenVert?.toLowerCase().includes(q) ||
            s.clasificacion?.toLowerCase().includes(q)
        );
    }

    seleccionarSenVert(s: any) {
        this.senVertSeleccionada = s;
        this.form.codSe          = s.codSenVert;
        this.mostrarGaleria      = false;
        this.filtroCatalogo      = '';
    }

    getImgUrl(s: any): string {
        if (!s?.urlImgSenVert) return '';
        return `${this.apiUrl}${s.urlImgSenVert}`;
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

        this.leafletMap = L.map('leaflet-map-sv').setView([lat, lng], 16);
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
            html: `<div style="background:#f0a500;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚧</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15], className: ''
        });
        this.marcador = L.marker([lat, lng], { icon }).addTo(this.leafletMap);
        this.marcador.bindPopup(`Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
    }

    // ── FOTOS ─────────────────────────────────────
      onFotoSeleccionada(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.fotoPreview = e.target.result;
        };
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
        if (!this.form.codSe) {
            this.error = 'Selecciona una señal vertical';
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

        ['obs1','obs2','obs3','obs4','obs5'].forEach(campo => {
            if (this.form[campo] === '' || this.form[campo] === undefined) {
                this.form[campo] = null;
            }
        });

        const formData = { ...this.form };
        delete formData.fotos;
        delete formData.logUltimaMod;

        // ← AQUÍ
        console.log('FALLAS:', formData.falla1, formData.falla2, formData.falla3);

        const obs$ = this.modoEdicion
            ? this.senVertService.update(this.idEdicion!, formData)
            : this.senVertService.create(formData);

        obs$.subscribe({
            next: (res: any) => {
                const idRegistro = res.registro._id;

                if (this.fotoArchivo) {
                const fd = new FormData();
                fd.append('foto', this.fotoArchivo);
                this.api.uploadFile<any>(`/upload/sen-vert`, fd).subscribe({
                    next: (r: any) => {
                        this.api.put(`/sen-vert/${idRegistro}`, { 
                            urlFotoSenVert: r.urls[0] 
                        }).subscribe();
                    }
                });
            }

                this.loading = false;
                if (seguirAgregando) {
                    this.resetForm();
                } else {
                    this.router.navigate(['/sen-verticales']);
                }
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al guardar';
            }
        });
    }

    resetForm() {
    this.senVertSeleccionada = null;
    this.fotoPreview         = '';
    this.fotoArchivo         = null;
    this.pasoActual          = 1;
    this.form = {
        ...this.form,
        codSe: '', estado: '', matPlaca: '', ubicEspacial: '',
        obstruccion: '', fechaInst: '', forma: '', orientacion: '',
        reflecOptima: '', dimTablero: '', ubicPerVial: '', fase: '',
        accion: '', ubicLateral: null, diagUbicLat: '', altura: null,
        diagAltura: '', banderas: '', leyendas: '',
        falla1: '', falla2: '', falla3: '', falla4: '', falla5: '',
        tipoSoporte: '', sistemaSoporte: '', estadoSoporte: '', estadoAnclaje: '',
        obs1: '', obs2: '', obs3: '', obs4: '', obs5: '',
        notas: '', urlFotoSenVert: '',
        ubicacion: { type: 'Point', coordinates: [] },
        lat: null, lng: null
    };
    this.error = '';
}
seleccionarTramo(t: any) {
    this.form.idViaTramo  = t._id;
    this.tramoSeleccionado = t;
    this.busquedaTramo    = nomenclaturaSearchText(t) || '';
    this.mostrarTramos    = false;
}
}