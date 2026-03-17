import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-usuario-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './usuario-lista.html',
    styleUrl: './usuario-lista.scss'
})
export class UsuarioListaComponent implements OnInit {

    usuarios:    any[]   = [];
    loading:     boolean = true;
    error:       string  = '';
    editando:    boolean = false;
    creando:     boolean = false;
    usuarioEdit: any     = null;
    busqueda:    string  = '';

    roles = ['admin', 'supervisor', 'encuestador', 'invitado'];

    nuevoUsuario: any = {
        user:      '',
        nombres:   '',
        apellidos: '',
        password:  '',
        rol:       'encuestador',
        mail:      '',
        activo:    true
    };

    constructor(
        private usuarioService: UsuarioService,
        private authService:    AuthService,
        public  router:         Router
    ) {}

    ngOnInit() { this.loadUsuarios(); }

    loadUsuarios() {
        this.loading = true;
        this.usuarioService.getAll().subscribe({
            next: (res) => {
                this.usuarios = res.users;
                this.loading  = false;
            },
            error: () => {
                this.error   = 'Error al cargar usuarios';
                this.loading = false;
            }
        });
    }

    get usuariosFiltrados() {
        if (!this.busqueda) return this.usuarios;
        const q = this.busqueda.toLowerCase();
        return this.usuarios.filter(u =>
            u.nombres?.toLowerCase().includes(q) ||
            u.apellidos?.toLowerCase().includes(q) ||
            u.user?.includes(q) ||
            u.rol?.includes(q)
        );
    }

    abrirCrear() {
        this.nuevoUsuario = { user: '', nombres: '', apellidos: '', password: '', rol: 'encuestador', mail: '', activo: true };
        this.creando = true;
    }

    guardarNuevo() {
        if (!this.nuevoUsuario.user || !this.nuevoUsuario.nombres || !this.nuevoUsuario.password) {
            alert('Cédula, nombres y contraseña son obligatorios');
            return;
        }
        this.usuarioService.create(this.nuevoUsuario).subscribe({
            next: () => {
                this.creando = false;
                this.loadUsuarios();
            },
            error: (err) => alert(err.error?.message || 'Error al crear usuario')
        });
    }

    editar(u: any) {
        this.usuarioEdit          = { ...u };
        this.usuarioEdit.password = '';
        this.editando             = true;
    }

    guardarEdicion() {
        if (!this.usuarioEdit.nombres) {
            alert('El nombre es obligatorio');
            return;
        }
        const data: any = {
            nombres:   this.usuarioEdit.nombres,
            apellidos: this.usuarioEdit.apellidos,
            rol:       this.usuarioEdit.rol,
            mail:      this.usuarioEdit.mail,
            activo:    this.usuarioEdit.activo
        };
        if (this.usuarioEdit.password) {
            data.password = this.usuarioEdit.password;
        }
        this.usuarioService.update(this.usuarioEdit._id, data).subscribe({
            next: () => {
                this.editando = false;
                this.loadUsuarios();
            },
            error: (err) => alert(err.error?.message || 'Error al actualizar')
        });
    }

    eliminar(id: string, nombre: string) {
        if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
        this.usuarioService.delete(id).subscribe({
            next: () => this.loadUsuarios(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }

    cerrarModal() {
        this.editando = false;
        this.creando  = false;
    }

    getRolClass(rol: string): string {
        const clases: any = {
            admin:       'badge-admin',
            supervisor:  'badge-supervisor',
            encuestador: 'badge-encuestador',
            invitado:    'badge-invitado'
        };
        return clases[rol] || '';
    }
}