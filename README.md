# INFRAVIAL — Frontend

Aplicación web (**SPA**) del sistema de inventario vial: dashboard, formularios de captura, listas con filtros geográficos, reportes, mapa Leaflet, importación administrativa y gestión de respaldos. Consume la **API REST** del backend mediante JWT.

Generada con **Angular CLI 21** y **TypeScript 5.9**.

---

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| **Angular 21** | Framework SPA (standalone components, router) |
| **RxJS 7** | Programación reactiva y llamadas HTTP |
| **Angular Forms** | Formularios template-driven y reactivos donde aplica |
| **Angular Material + CDK** | Componentes UI (diálogos, selects, etc.) |
| **Chart.js 4** | Gráficos del dashboard |
| **Leaflet 1.9** | Mapa de inventario (tramos, señales, semáforos, time-lapse) |
| **QRCode** | Generación de códigos en reportes/flujos que lo requieran |
| **HttpClient + interceptor JWT** | API autenticada (`core/interceptors/jwt.interceptor.ts`) |

---

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm** (el proyecto declara `packageManager` en `package.json`)

---

## Instalación

```bash
cd frontend
npm install
```

---

## Configuración de la API

Editar `src/environments/environment.ts` y `environment.development.ts`:

```typescript
export const environment = {
    production: true,  // o false en development
    apiUrl: 'http://localhost:3000'  // URL base del backend (sin barra final)
};
```

El `HttpClient` concatena `apiUrl` + ruta (`/auth/login`, `/via-tramos`, etc.).

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` / `ng serve` | Servidor de desarrollo (por defecto `http://localhost:4200`) |
| `npm run build` | Build producción → `dist/` |
| `npm run watch` | Build desarrollo en modo watch |
| `npm test` | Pruebas unitarias (configuración del proyecto) |

---

## Estructura relevante (`src/app/`)

```
app/
├── core/              # Servicios singleton (auth, api, backup, servicios de dominio)
├── modules/           # Funcionalidad por área (lazy loading)
│   ├── dashboard/
│   ├── via-tramos/
│   ├── sen-verticales/
│   ├── sen-horizontales/
│   ├── semaforos/
│   ├── control-semaforo/
│   ├── cajas-inspeccion/
│   ├── catalogos/
│   ├── mapa-inventario/
│   ├── backups/
│   ├── importacion/   # Import Excel (admin)
│   ├── reportes/
│   └── ...
├── shared/            # Utilidades, estilos compartidos (badges, street-view, etc.)
├── app.routes.ts      # Rutas principales y lazy loads
└── app.config.ts      # provideHttpClient + interceptors
```

---

## Autenticación y roles

- Tras el login se guardan tokens; el **JWT interceptor** adjunta `Authorization: Bearer …`.
- **Guards** por ruta (`roleGuard`, etc.) según `admin`, `supervisor`, `encuestador`, `invitado`.
- El menú lateral (`dashboard-layout`) filtra ítems por rol.

---

## Funcionalidades destacadas

- **Dashboard**: estadísticas, gráficos, accesos rápidos, modo claro/oscuro (`body.light-mode`).
- **Mapa inventario**: capas tramos / SV / SH / semáforos, filtros geo, Street View (enlace Google Maps), time-lapse por fecha de inventario.
- **Listas**: filtros por departamento, municipio, ZAT, códigos; badges; botón Street View donde hay coordenadas.
- **Respaldos** (admin): generar ZIP (BD + fotos), descargar, restaurar desde servidor o archivo, purga selectiva con confirmación.
- **Importación Excel** (admin): carga masiva vía API.

---

## Estilos globales

- `src/styles.scss`: variables CSS, modo claro, tablas y badges en listas.
- Fuentes: Syne, DM Serif Display, JetBrains Mono (según `styles.scss` y `index.html`).

---

## Build producción

```bash
ng build --configuration=production
```

Servir el contenido de `dist/frontend/browser/` (o la carpeta que indique `angular.json`) detrás de un servidor web o CDN; configurar **CORS** en el backend para el origen del front.

---

## Más documentación

En el repositorio, carpeta **`docs/`**: documento técnico (Markdown / Word) con visión conjunta **frontend + API + tecnologías**.

---

**INFRAVIAL** — Frontend Angular.
