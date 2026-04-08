import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./modules/auth/login/login').then(m => m.LoginComponent)
    },
    {
        path: 'via-tramos/reporte/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/via-tramos/reporte-via-tramo/reporte-via-tramo').then(m => m.ReporteViaTramoComponent)
    },
    {
        path: 'semaforos/reporte/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/semaforos/reporte-semaforo/reporte-semaforo').then(m => m.ReporteSemaforoComponent)
    },
        {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./modules/dashboard/dashboard/dashboard-layout').then(m => m.DashboardLayoutComponent),
                children: [
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./modules/dashboard/dashboard/dashboard-home').then(m => m.DashboardHomeComponent)
                    },
                    {
                        path: 'jornadas',
                        loadComponent: () => import('./modules/jornadas/jornada-lista/jornada-lista').then(m => m.JornadaListaComponent)
                    },
                    {
                        path: 'jornadas/nueva',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/jornadas/jornada-form/jornada-form').then(m => m.JornadaFormComponent)
                    },
                    {
                        path: 'via-tramos',
                        loadComponent: () => import('./modules/via-tramos/via-tramo-lista/via-tramo-lista').then(m => m.ViaTramoListaComponent)
                    },
                    {
                        path: 'via-tramos/estadisticas',
                        canActivate: [roleGuard],
                        data: { roles: ['admin', 'supervisor'] },
                        loadComponent: () =>
                            import('./modules/via-tramos/via-tramo-estadisticas/via-tramo-estadisticas').then(
                                m => m.ViaTramoEstadisticasComponent
                            )
                    },
                    {
                        path: 'via-tramos/nuevo',
                        loadComponent: () => import('./modules/via-tramos/via-tramo-form/via-tramo-form').then(m => m.ViaTramoFormComponent)
                    },
                    {
                        path: 'via-tramos/editar/:id',
                        loadComponent: () => import('./modules/via-tramos/via-tramo-form/via-tramo-form').then(m => m.ViaTramoFormComponent)
                    },
                    {
                        path: 'via-tramos/:id/inventario',
                        loadComponent: () =>
                            import('./modules/via-tramos/via-tramo-inventario/via-tramo-inventario').then(
                                m => m.ViaTramoInventarioComponent
                            )
                    },
                    {
                        path: 'mapa-inventario',
                        canActivate: [roleGuard],
                        data: { roles: ['admin', 'supervisor', 'encuestador'] },
                        loadComponent: () => import('./modules/mapa-inventario/mapa-inventario').then(m => m.MapaInventarioComponent)
                    },
                    {
                        path: 'sen-verticales',
                        loadComponent: () => import('./modules/sen-verticales/sen-vert-lista/sen-vert-lista').then(m => m.SenVertListaComponent)
                    },
                    {
                        path: 'sen-verticales/estadisticas',
                        canActivate: [roleGuard],
                        data: { roles: ['admin', 'supervisor'] },
                        loadComponent: () =>
                            import('./modules/sen-verticales/sen-vert-estadisticas/sen-vert-estadisticas').then(
                                m => m.SenVertEstadisticasComponent
                            )
                    },
                    {
                        path: 'sen-verticales/nuevo',
                        loadComponent: () => import('./modules/sen-verticales/sen-vert-form/sen-vert-form').then(m => m.SenVertFormComponent)
                    },
                    {
                        path: 'sen-verticales/editar/:id',
                        loadComponent: () => import('./modules/sen-verticales/sen-vert-form/sen-vert-form').then(m => m.SenVertFormComponent)
                    },
                    {
                        path: 'sen-verticales/reporte/:id',
                        loadComponent: () => import('./modules/sen-verticales/reporte-sen-vert/reporte-sen-vert').then(m => m.ReporteSenVertComponent)
                    },
                    {
                        path: 'sen-horizontales',
                        loadComponent: () => import('./modules/sen-horizontales/sen-hor-lista/sen-hor-lista').then(m => m.SenHorListaComponent)
                    },
                    {
                        path: 'sen-horizontales/estadisticas',
                        canActivate: [roleGuard],
                        data: { roles: ['admin', 'supervisor'] },
                        loadComponent: () =>
                            import('./modules/sen-horizontales/sen-hor-estadisticas/sen-hor-estadisticas').then(
                                m => m.SenHorEstadisticasComponent
                            )
                    },
                    {
                        path: 'sen-horizontales/nuevo',
                        loadComponent: () => import('./modules/sen-horizontales/sen-hor-form/sen-hor-form').then(m => m.SenHorFormComponent)
                    },
                    {
                        path: 'sen-horizontales/editar/:id',
                        loadComponent: () => import('./modules/sen-horizontales/sen-hor-form/sen-hor-form').then(m => m.SenHorFormComponent)
                    },
                    {
                        path: 'sen-horizontales/reporte/:id',
                        loadComponent: () => import('./modules/sen-horizontales/reporte-sen-hor/reporte-sen-hor').then(m => m.ReporteSenHorComponent)
                    },
                    {
                        path: 'semaforos',
                        loadComponent: () => import('./modules/semaforos/semaforo-lista/semaforo-lista').then(m => m.SemaforoListaComponent)
                    },
                    {
                        path: 'semaforos/nuevo',
                        loadComponent: () => import('./modules/semaforos/semaforo-form/semaforo-form').then(m => m.SemaforoFormComponent)
                    },
                    {
                        path: 'semaforos/editar/:id',
                        loadComponent: () => import('./modules/semaforos/semaforo-form/semaforo-form').then(m => m.SemaforoFormComponent)
                    },
                    {
                        path: 'control-semaforo',
                        loadComponent: () => import('./modules/control-semaforo/control-sem-lista/control-sem-lista').then(m => m.ControlSemListaComponent)
                    },
                    {
                        path: 'control-semaforo/nuevo',
                        loadComponent: () => import('./modules/control-semaforo/control-sem-form/control-sem-form').then(m => m.ControlSemFormComponent)
                    },
                    {
                        path: 'control-semaforo/editar/:id',
                        loadComponent: () => import('./modules/control-semaforo/control-sem-form/control-sem-form').then(m => m.ControlSemFormComponent)
                    },
                    {
                        path: 'cajas-inspeccion',
                        loadComponent: () => import('./modules/cajas-inspeccion/caja-insp-lista/caja-insp-lista').then(m => m.CajaInspListaComponent)
                    },
                    {
                        path: 'cajas-inspeccion/nuevo',
                        loadComponent: () => import('./modules/cajas-inspeccion/caja-insp-form/caja-insp-form').then(m => m.CajaInspFormComponent)
                    },
                    {
                        path: 'cajas-inspeccion/editar/:id',
                        loadComponent: () => import('./modules/cajas-inspeccion/caja-insp-form/caja-insp-form').then(m => m.CajaInspFormComponent)
                    },
                    {
                        path: 'encuesta-vial/:idTramo',
                        loadComponent: () => import('./modules/encuesta-vial/encuesta-form/encuesta-form').then(m => m.EncuestaFormComponent)
                    },
                    {
                        path: 'catalogos',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/catalogos/catalogo-lista/catalogo-lista').then(m => m.CatalogoListaComponent)
                    },
                    {
                        path: 'usuarios',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/usuarios/usuario-lista/usuario-lista').then(m => m.UsuarioListaComponent)
                    },
                    {
                        path: 'auditoria',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/auditoria/auditoria-lista/auditoria-lista').then(m => m.AuditoriaListaComponent)
                    },
                    {
                        path: 'respaldos',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/backups/backup-admin/backup-admin').then(m => m.BackupAdminComponent)
                    },
                    {
                        path: 'data-transfer',
                        canActivate: [roleGuard],
                        data: { roles: ['admin'] },
                        loadComponent: () => import('./modules/data-transfer/data-transfer').then(m => m.DataTransferComponent)
                    },
                    {
                        path: 'categorizacion-vial',
                        loadComponent: () => import('./modules/categorizacion-vial/categ-lista/categ-lista').then(m => m.CategListaComponent)
                    },
                    {
                        path: 'categorizacion-vial/nueva',
                        loadComponent: () => import('./modules/categorizacion-vial/categ-form/categ-form').then(m => m.CategFormComponent)
                    },
                    {
                        path: 'categorizacion-vial/editar/:id',
                        loadComponent: () => import('./modules/categorizacion-vial/categ-form/categ-form').then(m => m.CategFormComponent)
                    },
                    {
                        path: 'sinc/ejes',
                        loadComponent: () => import('./modules/sinc/sinc-eje-lista/sinc-eje-lista').then(m => m.SincEjeListaComponent)
                    },
                    {
                        path: 'sinc/ejes/nuevo',
                        loadComponent: () => import('./modules/sinc/sinc-eje-form/sinc-eje-form').then(m => m.SincEjeFormComponent)
                    },
                    {
                        path: 'sinc/ejes/editar/:id',
                        loadComponent: () => import('./modules/sinc/sinc-eje-form/sinc-eje-form').then(m => m.SincEjeFormComponent)
                    },
                    {
                        path: 'sinc/ejes/:id',
                        loadComponent: () => import('./modules/sinc/sinc-eje-detalle/sinc-eje-detalle').then(m => m.SincEjeDetalleComponent)
                    },
                    {
                        path: 'reportes',
                        canActivate: [roleGuard],
                        data: { roles: ['admin', 'supervisor'] },
                        loadComponent: () => import('./modules/reportes/reporte-lista/reporte-lista').then(m => m.ReporteListaComponent)
                    },
                    // ── Conteos Vehiculares ────────────────────────────────────
                    {
                        path: 'conteos/proyectos',
                        loadComponent: () => import('./modules/conteos/proyecto-lista/proyecto-lista').then(m => m.ProyectoListaComponent)
                    },
                    {
                        path: 'conteos/estaciones',
                        loadComponent: () => import('./modules/conteos/estacion-lista/estacion-lista').then(m => m.EstacionListaComponent)
                    },
                    {
                        path: 'conteos/conteos',
                        loadComponent: () => import('./modules/conteos/conteo-lista/conteo-lista').then(m => m.ConteoListaComponent)
                    },
                    {
                        path: 'conteos/sesion/:idConteo',
                        loadComponent: () => import('./modules/conteos/conteo-sesion/conteo-sesion').then(m => m.ConteoSesionComponent)
                    },
                    {
                        path: 'conteos/panel/:idConteo',
                        loadComponent: () => import('./modules/conteos/conteo-panel/conteo-panel').then(m => m.ConteoPanelComponent)
                    },
                    {
                        path: '',
                        redirectTo: 'dashboard',
                        pathMatch: 'full'
                    }
                ]
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];