import paramiko
import sys

HOST = '2.24.222.145'
USER = 'root'
PASSWORD = 'O3R&.sG;CWf8Sq7R'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

cmd = "cat /var/www/vuttik/backend/server/.env"
stdin, stdout, stderr = ssh.exec_command(cmd)

sys.stdout.buffer.write(stdout.read())
ssh.close()
