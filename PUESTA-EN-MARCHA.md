# Puesta en marcha — qué falta para que todo quede operativo

Estado verificado el 26/08/2026. Los dos sitios responden 200 y el backend está
sano. Lo que sigue son las piezas que aún faltan por configurar.

## 0. Renovar el VPS — vence el 27/08/2026

Es lo primero. Si caduca, todo lo demás da igual. Panel de Hostinger → VPS →
**Renew**.

## 1. Google OAuth — el login con Google está caído ahora mismo

El `client_secret` estaba escrito en el código fuente y ha sido público en
GitHub durante dos meses. Al moverlo a variables de entorno, el login dejó de
funcionar porque esas variables **no están puestas en el servidor**.

Hay que rotar el secreto igualmente, así que se resuelven las dos cosas a la vez:

1. <https://console.cloud.google.com/apis/credentials> → tu cliente OAuth 2.0
2. **Add secret** → copia el valor nuevo
3. En el servidor:

```bash
nano /var/www/vuttik/backend/server/.env.local
```

Añade:

```
GOOGLE_CLIENT_ID=<tu client id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<el secreto NUEVO>
```

```bash
pm2 restart vuttik-backend-web vuttik-backend-pos --update-env
```

4. Prueba el login en vuttik.com
5. Solo entonces, vuelve a la consola de Google y **borra el secreto antiguo**

## 2. Correo — verificación y recuperación de contraseña no funcionan

Las credenciales SMTP están en `/var/www/vuttik/backend/server/.env`, pero la
aplicación carga **únicamente `.env.local`**. Llevan tiempo sin llegar al
proceso, así que esto ya estaba roto antes de esta auditoría.

La contraseña SMTP también fue pública, así que cámbiala en tu proveedor y pon
la nueva en `.env.local` (no en `.env`):

```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=<la NUEVA>
```

## 3. Contraseña root del VPS

Fue pública dos meses. Cámbiala desde el panel de Hostinger. Ya tienes acceso
por clave SSH (`vuttik_deploy_key_new`), así que no dependes de ella.

## 4. Opcionales

**AdSense** — sin esto, los huecos sin campaña propia simplemente no se
muestran. El ad server propio funciona igual.

```
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
ADSENSE_SLOT_FEED=1234567890
```

**Facebook Login** — sin `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET` ese botón no
funciona.

## Comprobación final

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://vuttik.com
```

Y en la web: registro con correo, login con Google, publicar un producto, abrir
el POS y entrar a un negocio.
