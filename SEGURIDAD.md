# Seguridad, despliegue y hoja de ruta móvil

Documento operativo tras la auditoría del backend de `vuttik-web`.

---

## 1. Rotación de credenciales — hazlo antes de desplegar

Tres secretos estuvieron expuestos en el repositorio. Sacarlos del código no los
invalida: **siguen siendo válidos y están en el historial de git**, así que hay que
revocarlos en origen. Solo tú puedes hacerlo.

### 1.1 Client secret de Google OAuth — prioridad alta

Estaba escrito en `apps/vuttik-web/server/auth.ts`, partido en dos cadenas
(`'GOCSPX-<REDACTADO>' + 'c4rhq…'`), lo que además evitaba que los escáneres de
secretos lo detectaran.

1. Entra en <https://console.cloud.google.com/apis/credentials>
2. Abre el cliente OAuth 2.0 del proyecto Vuttik
3. **Add secret** → copia el nuevo valor
4. Ponlo en `.env.local` del servidor como `GOOGLE_CLIENT_SECRET`
5. Despliega
6. Vuelve a la consola y **elimina el secreto antiguo**

> Haz el paso 6 solo después de confirmar que el login con Google funciona. Google
> permite dos secretos activos a la vez justamente para esto.

### 1.2 Contraseña SMTP

Estaba en `deploy_package/server/.env`, que **estaba commiteado**.

1. Cambia la contraseña en tu proveedor de correo
2. Actualiza `SMTP_PASS` en el `.env.local` del servidor
3. Revisa los registros de envío por si hubo uso no autorizado

### 1.3 Contraseña root del VPS — migra a clave SSH

Estaba en texto plano en unos 307 scripts `.py`.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vuttik_deploy -C "despliegue-vuttik"
```

```bash
ssh-copy-id -i ~/.ssh/vuttik_deploy.pub root@TU_HOST
```

Después, en el servidor, deshabilita el acceso por contraseña en
`/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

```bash
sudo systemctl restart sshd
```

> No cierres tu sesión SSH actual hasta comprobar que puedes entrar con la clave
> desde otra terminal. Si algo falla, esa sesión abierta es tu única vía de vuelta.

### 1.4 Secretos nuevos de firma

El servidor ahora **se niega a arrancar en producción** si `JWT_SECRET` o
`SESSION_SECRET` faltan o miden menos de 32 caracteres. Antes caía a un valor por
defecto público, con lo que cualquiera podía firmar un token de `mega_guardian`.

```bash
openssl rand -hex 32
```

Genera uno para cada variable y ponlos en `.env.local`.

> Al cambiar `JWT_SECRET` se invalidan todas las sesiones activas: los usuarios
> tendrán que volver a iniciar sesión. Es el comportamiento deseado, porque
> cualquier token emitido con el secreto antiguo debe dejar de servir.

### 1.5 Historial de git

Elegiste no reescribir el historial, así que los valores antiguos siguen siendo
recuperables por cualquiera con acceso al repositorio. La rotación de arriba es lo
que realmente los neutraliza. Si el repositorio llega a ser público alguna vez,
reescribe el historial antes con `git filter-repo`.

---

## 2. Configuración

Copia `apps/vuttik-web/.env.example` a `.env.local` y rellénalo. Regla que conviene
no olvidar: **todo lo que empieza por `VITE_` se incrusta en el JavaScript que
descarga cada visitante**. Nunca pongas ahí un secreto.

Para el despliegue, crea `.env.deploy` en la raíz (ya está en `.gitignore`):

```
VPS_HOST=tu.host
VPS_USER=root
VPS_SSH_KEY=C:/Users/tu-usuario/.ssh/vuttik_deploy
```

---

## 3. Despliegue

Los scripts `deploy_*.py` sueltos quedaron sustituidos por uno solo que lee las
credenciales del entorno, hace respaldo antes de sobrescribir y verifica que el
servidor responde después de reiniciar:

```bash
python scripts/deploy_web.py
```

Si ya compilaste y solo quieres subir:

```bash
python scripts/deploy_web.py --no-build
```

### El backend ahora se compila

`server/*.js` se genera desde `server/*.ts`. **Ya no edites los `.js` a mano.**

```bash
npm run build:server
```

Esto importa porque los dos habían divergido y el `.js` desplegado tenía cuatro
bugs que el `.ts` no: cookies de sesión sin `secure`, un modelo de Gemini
inexistente, una etiqueta de gráfico equivocada y una consulta a una columna que no
existe (`name` en vez de `display_name`), que dejaba las notificaciones de
seguidores en «Un usuario».

---

## 4. Publicidad

### Cómo funciona

Cada hueco pide un anuncio a `GET /api/ads/serve`. El orden de preferencia es:

1. **Campaña propia de Vuttik** que encaje con el hueco, país, provincia y categoría
2. **AdSense**, si hay `ADSENSE_CLIENT_ID` y el slot correspondiente configurado
3. **Nada** — el hueco no se renderiza, no deja un espacio vacío

Los planes de pago que incluyen la característica `no_ads` no reciben anuncios.

### Modelo de cobro

CPM: el anunciante paga por cada mil impresiones. Una impresión descuenta
`bid_cpm / 1000` del presupuesto, y la campaña pasa a `completed` al agotarlo.

La impresión solo se cuenta cuando el anuncio ha estado **realmente visible**
(`IntersectionObserver` al 50%), no cuando se carga la página.

### Antifraude

`/serve` devuelve un token HMAC de vida corta ligado a esa entrega concreta. Los
endpoints de impresión y clic lo exigen. Sin esto, cualquiera podría hacer POST en
bucle a `/api/ads/impression` y agotar el presupuesto de un competidor.

Las URLs de destino se validan: solo `http://` y `https://`. Un `javascript:` en una
creatividad sería XSS almacenado contra todos los que vieran el anuncio.

### Flujo del anunciante

Panel en `/publicidad` (visible en modo negocio). El anunciante crea la campaña
(presupuesto + puja CPM + segmentación), añade creatividades y ve la entrega. La
campaña nace en `pending` y **no se muestra hasta que un moderador la aprueba** desde
`GET /api/ads/admin/campaigns?status=pending`.

### Configurar AdSense

```
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
ADSENSE_SLOT_FEED=1234567890
```

Si se dejan vacíos, el relleno simplemente no se activa y solo se sirven campañas
propias.

---

## 5. Hoja de ruta móvil

La recomendación es **Capacitor**, no React Native: envuelve la web que ya existe en
un contenedor nativo, así que no hay que reescribir la interfaz.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init Vuttik com.vuttik.app --web-dir=dist
npx cap add android
npx cap add ios
```

### Lo que ya está preparado

- **URLs de la API.** Dentro de la app nativa la página se sirve desde
  `capacitor://`, así que una ruta relativa resolvería contra el bundle en vez de
  contra el servidor. El cliente ya respeta `VITE_NATIVE_API_URL`; para el build
  móvil defínelo con el origen absoluto:
  ```
  VITE_NATIVE_API_URL=https://vuttik.com
  ```
- **CORS.** `capacitor://localhost` tendrá que añadirse a `allowedOrigins` en
  `server/index.ts` cuando llegue el momento.
- **Anuncios.** `AdSlot` ya abstrae el hueco del proveedor. AdMob entra añadiendo una
  rama `fallback.network === 'admob'`; el ad server propio funciona igual sin tocar
  nada.

### Lo que queda por resolver

- **Almacenamiento del token.** Hoy va en `localStorage`. En móvil conviene
  `@capacitor/preferences` o, mejor, el llavero del sistema.
- **AdSense no funciona en app nativa.** Hay que sustituirlo por AdMob.
- **Deep links** para compartir productos y perfiles.
- **Notificaciones push**, que hoy se resuelven consultando `/api/notifications`.

---

## 6. Lo que cambió en el modelo de autorización

Antes, el backend del marketplace tomaba la identidad de lo que enviaba el cliente
(`?userId=`, `senderId` en el cuerpo). Ahora **siempre** sale del token verificado.

Consecuencias para quien trabaje sobre este código:

- `authenticateToken` relee el rol y el estado de baneo **desde la base de datos**
  (caché de 15 s). Banear a alguien surte efecto casi al instante, en vez de esperar
  a que caduque un token de 30 días.
- Al cambiar rol o banear hay que llamar a `invalidateUser(uid)`.
- Los parámetros de identidad que envía el cliente se ignoran. No los quites del
  frontend si no hace falta, pero tampoco confíes en ellos.
- `saveUser` (`POST /api/users`) solo escribe el perfil de quien llama. Para cambiar
  el rol de otra persona existe `PUT /api/users/:uid/role`, restringido a
  `mega_guardian`.
