import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-auditoria-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './auditoria-lista.html',
    styleUrl: './auditoria-lista.scss'
})
export class AuditoriaListaComponent implements OnInit {

    registros: any[]  = [];
    loading:   boolean = true;
    error:     string  = '';
    busqueda:  string  = '';
    filtroMetodo  = '';
    filtroUsuario = '';
    usuarios:     any[] = [];

    constructor(
        private auditService: AuditService,
        private authService:  AuthService,
        public  router:       Router
    ) {}

    ngOnInit() {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.loadRegistros();
    }

      loadRegistros() {
          this.loading = true;
          this.auditService.getAll().subscribe({
              next: (res: any) => {
                  this.registros = res.logs || [];
                  this.loading   = false;
              },
              error: () => {
                  this.error   = 'Error al cargar auditoría';
                  this.loading = false;
              }
          });
      }

    get registrosFiltrados() {
          let lista = this.registros;
          
          if (this.busqueda) {
              const q = this.busqueda.toLowerCase();
              lista = lista.filter((r: any) =>
                  r.user?.user?.toLowerCase().includes(q) ||
                  r.user?.nombres?.toLowerCase().includes(q) ||
                  r.ruta?.toLowerCase().includes(q)
              );
          }
          if (this.filtroMetodo) {
              lista = lista.filter((r: any) => r.metodo === this.filtroMetodo);
          }
          if (this.filtroUsuario) {
              lista = lista.filter((r: any) => r.user?._id === this.filtroUsuario);
          }
          return lista;
      }

      get usuariosUnicos() {
          const mapa = new Map();
          this.registros.forEach((r: any) => {
              if (r.user?._id) mapa.set(r.user._id, r.user);
          });
          return Array.from(mapa.values());
      }

    getBadgeMetodo(metodo: string): string {
        switch(metodo) {
            case 'GET':    return 'badge-get';
            case 'POST':   return 'badge-post';
            case 'PUT':    return 'badge-put';
            case 'DELETE': return 'badge-delete';
            default:       return '';
        }
    }

    getBadgeStatus(status: number): string {
        if (status >= 200 && status < 300) return 'badge-bueno';
        if (status >= 400 && status < 500) return 'badge-regular';
        return 'badge-malo';
    }
}