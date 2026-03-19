import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ControlSemService } from "../../../core/services/control-sem.service";
import { AuthService } from "../../../core/services/auth.service";
import { JornadaService } from "../../../core/services/jornada.service";

@Component({
    selector: "app-control-sem-lista",
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: "./control-sem-lista.html",
    styleUrl: "./control-sem-lista.scss"
})
export class ControlSemListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = "";
    jornada:   any     = null;
    busqueda:  string  = "";

    constructor(
        private controlSemService: ControlSemService,
        private jornadaService:    JornadaService,
        private authService:       AuthService,
        public  router:            Router
    ) {}

    ngOnInit() {
        this.loadJornada();
        this.loadRegistros();
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });
    }

    loadRegistros() {
        this.loading = true;
        this.controlSemService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = "Error al cargar controladores";
                this.loading = false;
            }
        });
    }

    get registrosFiltrados() {
        if (!this.busqueda) return this.registros;
        const q = this.busqueda.toLowerCase();
        return this.registros.filter(r =>
            r.idViaTramo?.via?.toLowerCase().includes(q) ||
            r.tipoControlador?.toLowerCase().includes(q) ||
            r.estadoControlador?.toLowerCase().includes(q)
        );
    }

    nuevo()            { this.router.navigate(["/control-semaforo/nuevo"]); }
    editar(id: string) { this.router.navigate(["/control-semaforo/editar", id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm("Eliminar este controlador semafórico?")) return;
        this.controlSemService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || "Error al eliminar")
        });
    }
}
