import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
    user     = '';
    password = '';
    error    = '';
    loading  = false;
    showPass = false;

    private animFrame: any;

    constructor(private authService: AuthService, private router: Router) {}

    ngOnInit() {
        this.initMatrix();
    }

    ngOnDestroy() {
        cancelAnimationFrame(this.animFrame);
    }

    initMatrix() {
        const canvas  = document.getElementById('matrix') as HTMLCanvasElement;
        const ctx     = canvas.getContext('2d')!;

        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        const chars   = 'INFRAVIAL01アイウエオカキクケコ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const fontSize = 14;
        const cols    = Math.floor(canvas.width / fontSize);
        const drops: number[] = Array(cols).fill(1);

        const draw = () => {
            ctx.fillStyle = 'rgba(5, 13, 26, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#1a6fff';
            ctx.font      = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillStyle = Math.random() > 0.95 ? '#7dbeff' : '#1a5fcc';
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            this.animFrame = setTimeout(() => requestAnimationFrame(draw), 50);
        };

        draw();
    }

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