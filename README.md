# Mi Taller — App de gestión para taller mecánico

Proyecto listo para subir a **GitHub** y desplegar en **Render**, con base de
datos real (PostgreSQL) para que todos los que abran el link vean la misma
información.

## Estructura

```
taller-mecanico-web/
├── client/     → Frontend (React + Vite)
├── server/     → Backend (Express + PostgreSQL)
└── render.yaml → Configuración automática para Render
```

## Paso 1 — Subir el proyecto a GitHub

1. Crea un repositorio nuevo en https://github.com/new (puede ser privado)
2. En tu computadora, dentro de esta carpeta, corre:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de la app del taller"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/NOMBRE-REPO.git
   git push -u origin main
   ```

## Paso 2 — Desplegar en Render (opción automática, recomendada)

1. Entra a https://render.com y crea una cuenta (puedes usar tu cuenta de GitHub)
2. Haz clic en **New +** → **Blueprint**
3. Selecciona el repositorio que acabas de subir
4. Render va a detectar el archivo `render.yaml` y va a crear automáticamente:
   - Una base de datos PostgreSQL (`taller-mecanico-db`)
   - Un servicio web (`taller-mecanico-app`) ya conectado a esa base de datos
5. Haz clic en **Apply** y espera a que termine el primer despliegue (unos minutos)
6. Cuando termine, Render te da un link público como:
   `https://taller-mecanico-app.onrender.com`

Ese link ya es la app funcionando, con base de datos real. Todos los que
lo abran (tú, tu cliente, tus mecánicos) van a ver y guardar la misma
información.

## Paso 2 (alternativa) — Desplegar manualmente

Si prefieres no usar el Blueprint:

1. En Render, crea primero una base de datos: **New +** → **PostgreSQL** (plan Free)
2. Copia el valor de **"Internal Database URL"** que te da Render
3. Crea el servicio web: **New +** → **Web Service** → conecta tu repositorio
4. Configura:
   - **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command:** `node server/index.js`
5. En la pestaña **Environment**, agrega la variable:
   - `DATABASE_URL` = (pega el Internal Database URL que copiaste)
6. Haz clic en **Create Web Service**

## Notas importantes

- **Plan gratuito de Render:** el servicio web "duerme" tras un rato sin uso
  y tarda unos segundos en despertar la primera vez que alguien lo abre
  después de estar inactivo. Es normal, no es un error. Si eso te molesta
  para el uso real del taller, el plan pagado (~$7/mes) lo evita.
- **Fotos y videos:** se guardan como parte de los datos (base64) en la
  base de datos. Funciona bien para uso moderado, pero si vas a subir
  muchos videos pesados con frecuencia, en algún momento conviene mover
  ese respaldo a un almacenamiento de archivos aparte (por ejemplo,
  Cloudinary o un bucket S3) en vez de la base de datos. Lo dejamos
  pendiente como posible mejora futura.
- **PIN de administrador:** protege que solo quien lo conozca edite el
  nombre y logo del taller, pero es una protección básica (no es un
  sistema de usuarios con contraseñas individuales). Suficiente para
  esta primera versión.

## Desarrollo local (opcional, para seguir probando en tu computadora)

Necesitas [Node.js](https://nodejs.org) instalado y una base de datos
Postgres (puedes usar una gratuita de Render también para esto).

```bash
# Backend
cd server
npm install
DATABASE_URL="tu_cadena_de_conexion" npm start

# Frontend (en otra terminal)
cd client
npm install
npm run dev
```

El frontend quedará en `http://localhost:5173` y hablará con el backend
en `http://localhost:4000`.
