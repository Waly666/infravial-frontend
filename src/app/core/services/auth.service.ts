import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient, private router: Router) {}

    login(user: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/login`, { user, password }).pipe(
            tap((res: any) => {
                localStorage.setItem('accessToken',  res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
                localStorage.setItem('usuario',      JSON.stringify(res.usuario));
            })
        );
    }

    refreshToken(): Observable<any> {
        const refreshToken = localStorage.getItem('refreshToken');
        return this.http.post(`${this.apiUrl}/auth/refresh`, { refreshToken });
    }

    logout(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    setToken(token: string): void {
        localStorage.setItem('accessToken', token);
    }

    getUsuario(): any {
        const u = localStorage.getItem('usuario');
        return u ? JSON.parse(u) : null;
    }

    getRol(): string {
        return this.getUsuario()?.rol || '';
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    isAdmin(): boolean {
        return this.getRol() === 'admin';
    }

    isSupervisor(): boolean {
        return this.getRol() === 'supervisor';
    }

    isEncuestador(): boolean {
        return this.getRol() === 'encuestador';
    }
}