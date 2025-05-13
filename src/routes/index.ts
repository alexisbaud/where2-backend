// Définition des routes de l'API (endpoints) pour les suggestions d'activités

// Configuration des routes de l'API
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { suggestHandler, getActivityHandler, healthHandler, suggestO3Handler } from '../handlers';

// Créer l'instance Hono
const app = new Hono();

// Middlewares globaux
app.use('*', logger());
app.use('*', cors({
  origin: '*', // En production, à remplacer par les domaines autorisés
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 3600,
}));

// Route de healthcheck
app.get('/healthz', healthHandler);

// Routes principales
app.post('/suggest', suggestHandler);
app.post('/suggest-o3', suggestO3Handler);
app.get('/activity/:id', getActivityHandler);

// Route de fallback pour les routes non définies
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested endpoint does not exist' }, 404);
});

// Middleware de gestion des erreurs
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error', message: 'An unexpected error occurred' }, 500);
});

export default app;
