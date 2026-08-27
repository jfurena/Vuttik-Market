# Vuttik

Monorepo de la plataforma Vuttik. Contiene **únicamente** lo que sirve a los dos
sitios en producción.

| Sitio | Frontend | API |
|---|---|---|
| `vuttik.com` | `apps/vuttik-web` | `127.0.0.1:3005/api/` |
| `pos.vuttik.com` | `apps/vuttik-pos-web` | `127.0.0.1:3006/pos/api/` |

## Cómo encaja

Los dos dominios comparten **un solo proceso de backend**, `server/index.js` de
`apps/vuttik-web`, ejecutado dos veces por pm2 con distinto `PORT`. El POS no es
un backend aparte: `index.js` monta `pos-backend.js` (de `apps/vuttik-pos-web`)
bajo la ruta `/pos`, y nginx redirige `pos.vuttik.com/api/` a `:3006/pos/api/`.

```
apps/
  vuttik-web/        Marketplace + red social. Aporta el backend compartido:
    server/            index.ts, auth.ts, middleware.ts, ads.ts, db.js
    src/               React + Vite
  vuttik-pos-web/    Punto de venta. Solo aporta server/pos-backend.ts
scripts/             Despliegue (lee credenciales del entorno)
.github/workflows/   CI que despliega al hacer push a main
_archivo/            Material no desplegado. Ignorado por git.
```

## Puesta en marcha local

```bash
npm install
```

```bash
cp apps/vuttik-web/.env.example apps/vuttik-web/.env.local
```

Rellena `.env.local` y arranca:

```bash
npm run dev:web
```

## Compilación

El backend **se compila**: `server/*.js` se genera desde `server/*.ts`. No edites
los `.js` a mano — llegaron a divergir y la versión desplegada acumuló bugs que
el fuente no tenía.

```bash
npm run build:web && npm --prefix apps/vuttik-web run build:server
```

## Despliegue

```bash
python scripts/deploy_web.py
```

```bash
python scripts/deploy_pos.py
```

Ambos hacen respaldo antes de sobrescribir y comprueban salud después de
reiniciar. `deploy_web.py` además **aborta** si el servidor tiene código que la
copia local no tiene, porque eso significaría que el despliegue lo borraría.

Credenciales en `.env.deploy` (ignorado por git):

```
VPS_HOST=...
VPS_USER=root
VPS_SSH_KEY=/ruta/a/tu/clave
```

## Reglas que conviene no romper

- Todo lo que empieza por `VITE_` acaba en el JavaScript que descarga cada
  visitante. **Nunca** un secreto ahí.
- En producción el backend se niega a arrancar sin `JWT_SECRET` y
  `SESSION_SECRET` de 32+ caracteres. Es deliberado: antes caían a un valor por
  defecto público con el que cualquiera podía firmar tokens de administrador.
- La identidad de una petición sale **siempre** del token verificado, nunca de
  `?userId=` ni del cuerpo.

Detalles de seguridad, publicidad y hoja de ruta móvil en [SEGURIDAD.md](SEGURIDAD.md).
