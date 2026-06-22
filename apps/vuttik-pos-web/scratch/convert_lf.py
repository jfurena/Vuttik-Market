import sys

with open('deploy.sh', 'rb') as f:
    content = f.read()

content = content.replace(b'\r\n', b'\n')

with open('deploy_lf.sh', 'wb') as f:
    f.write(content)
