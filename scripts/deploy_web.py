# -*- coding: utf-8 -*-
"""
Deploys apps/vuttik-web (frontend + backend) to the VPS.

Replaces the pile of ad-hoc deploy_*.py scripts that each carried a copy of the
root password. Credentials come from the environment; see scripts/vps.py.

    python scripts/deploy_web.py            # build, upload, restart
    python scripts/deploy_web.py --no-build # upload what is already in dist/

Production layout, confirmed against the live nginx configuration:

    vuttik.com      root /var/www/vuttik/marketplace/public_html
                    /api/ -> 127.0.0.1:3005/api/
    pos.vuttik.com  root /var/www/vuttik/pos/public_html
                    /api/ -> 127.0.0.1:3006/pos/api/

Both pm2 processes execute the SAME /var/www/vuttik/backend/server/index.js,
differing only by PORT, so a backend deploy has to restart both of them.
"""
import os
import re
import subprocess
import sys
import tarfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vps import connect, run  # noqa: E402

APP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'apps', 'vuttik-web')
REMOTE_ROOT = '/var/www/vuttik'
BACKEND_DIR = REMOTE_ROOT + '/backend/server'
FRONTEND_DIR = REMOTE_ROOT + '/marketplace/public_html'
PROCESSES = 'vuttik-backend-web vuttik-backend-pos'
ARCHIVE = 'vuttik-web-deploy.tar.gz'


def build():
    """Compiles the server TypeScript and the Vite frontend."""
    print('== Compilando backend (ts -> js) ==')
    subprocess.check_call('npm run build:server', shell=True, cwd=APP_DIR)
    print('== Compilando frontend ==')
    subprocess.check_call('npm run build', shell=True, cwd=APP_DIR)


def _skip(info):
    """Keeps node_modules, local databases and secrets out of the archive."""
    name = info.name.replace('\\', '/')
    blocked = ('node_modules', '.env.local', '.env.deploy', '.db', '.db-wal', '.db-shm')
    if any(part in name for part in blocked):
        return None

    # pos-backend.js is owned by the POS deploy, which copies the newer build
    # from apps/vuttik-pos-web into this same backend directory. The copy inside
    # apps/vuttik-web is an older snapshot with fewer guarded routes, so shipping
    # it would silently downgrade the POS. index.js still imports it at runtime;
    # it just has to come from the other deploy.
    if name.endswith('server/pos-backend.js'):
        print('   omitido: server/pos-backend.js (lo despliega el POS)')
        return None

    return info


def make_archive():
    path = os.path.join(APP_DIR, ARCHIVE)
    print('== Empaquetando ==')
    with tarfile.open(path, 'w:gz') as tar:
        tar.add(os.path.join(APP_DIR, 'dist'), arcname='dist', filter=_skip)
        tar.add(os.path.join(APP_DIR, 'server'), arcname='server', filter=_skip)
    print('   %s (%.1f MB)' % (ARCHIVE, os.path.getsize(path) / 1e6))
    return path


def preflight(client):
    """Refuses to deploy if the server has something the local tree lacks.

    Learned the hard way: a deploy once replaced a newer server-side db.js with
    an older local copy, silently switching the app to a stale database, and
    dropped six auth routes that only existed on the server. Comparing route
    names and environment variables catches exactly that class of regression
    before anything is overwritten.
    """
    print('== Comprobacion previa: el servidor no debe tener nada que falte en local ==')
    problems = []

    checks = [
        ('index.js', r"app\.(get|post|put|delete|patch)\('[^']+'"),
        ('auth.js', r"authRouter\.(get|post|put|delete|patch)\('[^']+'"),
    ]
    for filename, pattern in checks:
        local_path = os.path.join(APP_DIR, 'server', filename)
        if not os.path.exists(local_path):
            continue
        with open(local_path, encoding='utf-8') as fh:
            local_routes = set(re.findall(pattern, fh.read()))
        _, out, _ = run(client, "grep -ohE \"%s\" %s/%s 2>/dev/null | sort -u"
                        % (pattern.replace('"', '\\"'), BACKEND_DIR, filename), check=False)
        remote_routes = set(line.strip() for line in out.splitlines() if line.strip())
        # re.findall with groups returns the group, so re-extract full matches.
        with open(local_path, encoding='utf-8') as fh:
            local_full = set(m.group(0) for m in re.finditer(pattern, fh.read()))
        missing = remote_routes - local_full
        if missing:
            problems.append('%s: el servidor tiene rutas que local no: %s'
                            % (filename, ', '.join(sorted(missing)[:8])))

    for filename in ('index.js', 'auth.js', 'db.js'):
        local_path = os.path.join(APP_DIR, 'server', filename)
        if not os.path.exists(local_path):
            continue
        with open(local_path, encoding='utf-8') as fh:
            local_env = set(re.findall(r'process\.env\.[A-Z_]+', fh.read()))
        _, out, _ = run(client, "grep -ohE 'process\\.env\\.[A-Z_]+' %s/%s 2>/dev/null | sort -u"
                        % (BACKEND_DIR, filename), check=False)
        remote_env = set(line.strip() for line in out.splitlines() if line.strip())
        missing = remote_env - local_env
        if missing:
            problems.append('%s: el servidor usa variables que local ignora: %s'
                            % (filename, ', '.join(sorted(missing))))

    if problems:
        print('\nDESPLIEGUE ABORTADO. El servidor tiene cambios que tu copia local no:')
        for p in problems:
            print('  - ' + p)
        print('\nTrae esos cambios a local antes de desplegar, o el despliegue los borrara.')
        sys.exit(1)

    print('   OK: local contiene todo lo que hay en el servidor')


def main():
    if '--no-build' not in sys.argv:
        build()

    archive = make_archive()
    client = connect()
    try:
        preflight(client)
        stamp = time.strftime('%Y%m%d-%H%M%S')

        print('== Respaldando la version actual ==')
        run(client, 'mkdir -p %s/backups' % REMOTE_ROOT)
        run(client,
            'tar -czf {root}/backups/backend-{stamp}.tar.gz -C {backend} . 2>/dev/null || true'
            .format(root=REMOTE_ROOT, backend=BACKEND_DIR, stamp=stamp), check=False)
        run(client,
            'tar -czf {root}/backups/frontend-{stamp}.tar.gz -C {front} . 2>/dev/null || true'
            .format(root=REMOTE_ROOT, front=FRONTEND_DIR, stamp=stamp), check=False)

        print('== Subiendo ==')
        sftp = client.open_sftp()
        sftp.put(archive, '%s/%s' % (REMOTE_ROOT, ARCHIVE))
        sftp.close()

        print('== Desplegando ==')
        run(client, 'cd {root} && rm -rf .deploy_tmp && mkdir .deploy_tmp && '
                    'tar -xzf {archive} -C .deploy_tmp'.format(root=REMOTE_ROOT, archive=ARCHIVE))
        # Copy over the top: the server's .env.local is not in the archive and
        # must survive the deploy.
        run(client, 'cp -r {root}/.deploy_tmp/server/. {backend}/'.format(root=REMOTE_ROOT, backend=BACKEND_DIR))
        run(client, 'rm -rf {front:s}/assets && cp -r {root}/.deploy_tmp/dist/. {front}/'
                    .format(root=REMOTE_ROOT, front=FRONTEND_DIR))
        run(client, 'rm -rf {root}/.deploy_tmp {root}/{archive}'.format(root=REMOTE_ROOT, archive=ARCHIVE))

        print('== Reiniciando (ambos procesos comparten index.js) ==')
        run(client, 'pm2 restart %s --update-env' % PROCESSES)

        print('== Comprobacion de salud ==')
        time.sleep(6)
        healthy = True
        for port in (3005, 3006):
            _, out, _ = run(client,
                            'curl -s -o /dev/null -w "%%{http_code}" --max-time 10 http://localhost:%d/api/health'
                            % port, check=False)
            code = out.strip()
            print('   puerto %d -> %s' % (port, code))
            if code != '200':
                healthy = False

        for url in ('https://vuttik.com', 'https://pos.vuttik.com'):
            # Single %, not %%: this string is concatenated, never %-formatted,
            # so doubling it would reach curl literally.
            _, out, _ = run(client,
                            'curl -s -o /dev/null -w "%{http_code}" --max-time 15 ' + url, check=False)
            print('   %s -> %s' % (url, out.strip()))

        if not healthy:
            print('\nFALLO: algun puerto no responde 200.')
            print('Revisa:  pm2 logs vuttik-backend-web --lines 50')
            print('Respaldo en %s/backups/backend-%s.tar.gz' % (REMOTE_ROOT, stamp))
            sys.exit(1)

        print('\nDespliegue completado.')
    finally:
        client.close()
        if os.path.exists(archive):
            os.remove(archive)


if __name__ == '__main__':
    main()
