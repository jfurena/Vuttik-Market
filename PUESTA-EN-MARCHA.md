# Puesta en marcha — qué falta para que todo quede operativo

Estado verificado el 26/08/2026. Los dos sitios responden 200 y el backend está
sano. Lo que sigue son las piezas que aún faltan por configurar.

## 0. Renovar el VPS — vence el 27/08/2026

Es lo primero. Si caduca, todo lo demás da igual. Panel de Hostinger → VPS →
**Renew**.

## 1. Google OAuth — RESUELTO (26/08/2026)

Secreto rotado y configurado en `.env.local`. Verificado contra Google: responde
`invalid_grant` ante un código falso, que es la señal de que acepta el
`client_id` y el secreto. **Queda pendiente borrar el secreto antiguo
(`****NKyS`) en la consola de Google** una vez confirmes el login en el navegador.

<details><summary>Procedimiento seguido</summary>

## 1-bis. Google OAuth — cómo se hizo

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

## 2. Correo — RESUELTO (27/08/2026)

Contraseña de `soporte@vuttik.com` rotada y configuración movida de `.env` a
`.env.local`, que es el único archivo que la aplicación carga. Ese era el motivo
real de que los correos no salieran.

Verificado con un envío real: autenticación SMTP correcta y el servidor aceptó
el mensaje (`250 OK`).

```
SMTP_HOST=mail.vuttik.com   SMTP_PORT=587   SMTP_USER=soporte@vuttik.com
```

El correo NO está en Hostinger: lo sirve DirectAdmin en `d1.neet-panel.com:2222`,
que además es el DNS autoritativo del dominio (`ns3/ns4.neet-panel.com`).

### Autenticación del dominio

| | |
|---|---|
| SPF | `v=spf1 a mx ip4:37.27.67.172 ~all` |
| DKIM | selector `x`, activado desde DirectAdmin |
| DMARC | `v=DMARC1; p=none; rua=mailto:soporte@vuttik.com` |

`p=none` solo monitoriza. Cuando lleves unas semanas de informes limpios, súbelo
a `quarantine` y después a `reject`.

Límite del buzón: **200 envíos diarios**. Si el registro de usuarios crece, habrá
que pasar a un servicio transaccional (Resend, Brevo).

</details>

## 3. Contraseña root del VPS — RESUELTO (27/08/2026)

En lugar de cambiarla, se **desactivó la autenticación por contraseña**: SSH
ahora solo acepta clave. La contraseña filtrada quedó inservible sin necesidad
de rotarla, y el puerto 22 dejó de ser atacable por fuerza bruta.

```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```

Se neutralizó además un `PasswordAuthentication yes` en
`/etc/ssh/sshd_config.d/50-cloud-init.conf`, que se lee antes y habría anulado
el cambio.

Acceso: `ssh -i vuttik_deploy_key_new root@2.24.222.145`. Si perdieras la clave,
Hostinger ofrece consola por navegador desde el panel.

## 4. Opcionales

**AdSense** — sin esto, los huecos sin campaña propia simplemente no se
muestran. El ad server propio funciona igual.

```
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
ADSENSE_SLOT_FEED=1234567890
```

**Facebook Login** — credenciales ya configuradas en el servidor y verificadas
contra Meta. El botón está **oculto** porque la app de Meta (`844646971982835`)
sigue sin publicar: en ese estado el login solo funciona para cuentas con un rol
asignado en la app, y fallaría para el resto de usuarios.

Publicarla exige verificación de empresa (documentación legal, días o semanas) y
revisión de la aplicación. Cuando Meta la apruebe:

```
VITE_FACEBOOK_ENABLED="true"   # en apps/vuttik-web/.env.production
```

```bash
python scripts/deploy_web.py
```

Mientras tanto, se pueden añadir cuentas concretas en *Roles de la aplicación →
Probadores* para probarlo.

## Comprobación final

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://vuttik.com
```

Y en la web: registro con correo, login con Google, publicar un producto, abrir
el POS y entrar a un negocio.
