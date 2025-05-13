// Handler pour la route /healthz
import { Context } from 'hono';

/**
 * Handler pour la route GET /healthz
 * Vérifie l'état de santé du serveur
 */
export async function healthHandler(c: Context): Promise<Response> {
  console.log('GET /healthz - Health check');
  
  // Informations basiques sur l'état du serveur
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
  };
  
  return c.json(healthData);
} 