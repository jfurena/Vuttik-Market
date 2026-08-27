# -*- coding: utf-8 -*-
"""
Shared VPS connection helper.

Credentials are read from the environment, never from source. Put them in a
local `.env.deploy` (git-ignored) or export them in your shell:

    VPS_HOST=...
    VPS_USER=root
    VPS_SSH_KEY=C:/Users/you/.ssh/vuttik_deploy      # preferred
    VPS_PASSWORD=...                                 # fallback only

Prefer key authentication: a password that works over SSH is a single string
that grants full control of the server, and it ends up in shell history,
process listings and backups.
"""
import os
import sys

try:
    import paramiko
except ImportError:  # pragma: no cover
    sys.exit('Falta paramiko. Instálalo con:  pip install paramiko')


def _load_env_file(path='.env.deploy'):
    """Loads KEY=VALUE lines from a local file if present."""
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip())


def connect():
    """Opens an SSH connection using environment-provided credentials."""
    _load_env_file()

    host = os.environ.get('VPS_HOST')
    user = os.environ.get('VPS_USER', 'root')
    key_path = os.environ.get('VPS_SSH_KEY')
    password = os.environ.get('VPS_PASSWORD')

    if not host:
        sys.exit('Falta VPS_HOST. Define las variables en .env.deploy o en tu shell.')
    if not key_path and not password:
        sys.exit('Falta VPS_SSH_KEY (recomendado) o VPS_PASSWORD.')

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    # Reject unknown hosts rather than trusting whatever answers: AutoAddPolicy
    # would silently accept a machine-in-the-middle.
    client.set_missing_host_key_policy(paramiko.RejectPolicy())

    try:
        if key_path:
            client.connect(host, username=user, key_filename=key_path, timeout=30)
        else:
            client.connect(host, username=user, password=password, timeout=30)
    except paramiko.SSHException as exc:
        sys.exit(
            'No se pudo conectar a %s: %s\n'
            'Si es la primera conexión, registra la huella del servidor con:\n'
            '  ssh-keyscan -H %s >> ~/.ssh/known_hosts' % (host, exc, host)
        )

    return client


def run(client, command, check=True):
    """Runs a remote command and returns (exit_code, stdout, stderr)."""
    _, stdout, stderr = client.exec_command(command)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip(), file=sys.stderr)
    if check and code != 0:
        sys.exit('El comando remoto falló (código %d): %s' % (code, command))
    return code, out, err
