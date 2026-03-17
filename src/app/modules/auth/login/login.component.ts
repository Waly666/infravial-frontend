import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponentComponent {
    user     = '';
    password = '';
    error    = '';
    loading  = false;
    showPass = false;

    constructor(private authService: AuthService, private router: Router) {}

    login() {
        if (!this.user || !this.password) {
            this.error = 'Ingresa tu cédula y contraseña';
            return;
        }

        this.loading = true;
        this.error   = '';

        this.authService.login(this.user, this.password).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al iniciar sesión';
            }
        });
    }
}
