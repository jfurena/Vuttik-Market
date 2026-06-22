"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudOnline = isCloudOnline;
exports.cloudLogin = cloudLogin;
exports.cloudSyncPush = cloudSyncPush;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
// Toggle to local IP for testing, or production URL
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:3005/api';
function request(method, endpoint, data, token) {
    return new Promise((resolve, reject) => {
        const url = new url_1.URL(`${CLOUD_URL}${endpoint}`);
        const lib = url.protocol === 'https:' ? https_1.default : http_1.default;
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
            }
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
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}: ${body}`));
                    }
                }
                catch (e) {
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
async function isCloudOnline() {
    try {
        // Attempt to hit the cloud health/ping endpoint
        // We assume the main server responds to GET /api/pos/sync (even if it's a 401, it means online)
        await request('GET', '/auth/ping');
        return true;
    }
    catch (e) {
        // If it's a network error, return false. If it's a 401, it's online!
        if (e.message.includes('Status 401') || e.message.includes('Status 404'))
            return true;
        return false;
    }
}
async function cloudLogin(correo, password) {
    return request('POST', '/auth/login', { correo, password });
}
async function cloudSyncPush(token, operations) {
    return request('POST', '/pos/sync', { operations }, token);
}
