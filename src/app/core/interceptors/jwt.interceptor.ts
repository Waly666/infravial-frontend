import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    const token = authService.getToken();

    const authReq = token ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    }) : req;

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 403) {
                const data    = error.error;
                const isToken = data?.message?.toLowerCase().includes('token');

                if (isToken) {
                    return authService.refreshToken().pipe(
                        switchMap((res: any) => {
                            authService.setToken(res.accessToken);
                            const retryReq = req.clone({
                                setHeaders: { Authorization: `Bearer ${res.accessToken}` }
                            });
                            return next(retryReq);
                        }),
                        catchError(err => {
                            authService.logout();
                            router.navigate(['/login']);
                            return throwError(() => err);
                        })
                    );
                }
            }

            if (error.status === 401) {
                authService.logout();
                router.navigate(['/login']);
            }

            return throwError(() => error);
        })
    );
};