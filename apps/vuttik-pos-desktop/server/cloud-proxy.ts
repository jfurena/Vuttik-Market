import https from 'https';
import http from 'http';
import { URL } from 'url';

// Toggle to local IP for testing, or production URL
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:3005/api';

function request(method: string, endpoint: string, data?: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CLOUD_URL}${endpoint}`);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      } as any
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body || '{}'));
          } else {
            reject(new Error(`Status ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

export async function isCloudOnline(): Promise<boolean> {
  try {
    // Attempt to hit the cloud health/ping endpoint
    // We assume the main server responds to GET /api/pos/sync (even if it's a 401, it means online)
    await request('GET', '/auth/ping'); 
    return true;
  } catch (e: any) {
    // If it's a network error, return false. If it's a 401, it's online!
    if (e.message.includes('Status 401') || e.message.includes('Status 404')) return true;
    return false;
  }
}

export async function cloudLogin(correo: string, password: string, codigoNegocio?: string) {
  const payload: any = { correo, password };
  if (codigoNegocio) payload.codigo_negocio = codigoNegocio;
  return request('POST', '/auth/login', payload);
}

export async function cloudSyncPush(token: string, operations: any[]) {
  return request('POST', '/pos/sync', { operations }, token);
}
