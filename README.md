# AVISA

Repositorio organizado como monorepo: la interfaz Angular y la API Spring Boot viven en carpetas independientes. La configuración de Render permanece en la raíz para conservar el Blueprint del repositorio.

## Estructura

```text
AVISA/
├── frontend/          # Angular, recursos públicos y Dockerfile de Render
├── backend/           # API Spring Boot (Maven)
├── render.yaml        # Blueprint del servicio frontend existente
└── README.md
```

## Frontend

Desde `frontend/`:

```bash
npm ci
npm start
```

Para generar la compilación de producción: `npm run build`.

El servicio Render definido en `render.yaml` mantiene el nombre `avisa` y construye `frontend/Dockerfile` con `frontend/` como raíz. Los cambios en `backend/` no disparan una compilación del frontend.

## Backend

Desde `backend/`:

```bash
mvn spring-boot:run
```

La API escucha en el puerto `8080` por defecto. Render debe proporcionar el puerto mediante `PORT` cuando el backend se despliegue como servicio web; configura `server.port=${PORT:8080}` en `backend/src/main/resources/application.properties` si el servicio necesita escuchar el puerto asignado por Render.

## Neon y despliegue

Neon es la base de datos PostgreSQL del proyecto y Render aloja los servicios de aplicación. Las credenciales y la URL de conexión se guardan como variables de entorno en el servicio backend de Render, nunca en el repositorio. La aplicación backend actual no contiene todavía un controlador PostgreSQL/JPA ni usa `DATABASE_URL`; añadir esa conexión requiere configurar el driver y la integración de persistencia de forma explícita.

`render.yaml` declara el frontend Docker que ya estaba configurado. No declara un segundo servicio backend para evitar crear o modificar recursos de Render al sincronizar el Blueprint. Si el backend existente se gestiona desde el Dashboard de Render, conserva allí su configuración y añade `backend/` como raíz de servicio para aislar sus despliegues.
