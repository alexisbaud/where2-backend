// Configuration centralisée (clés API, constantes, paramètres d'environnement)

// Configuration et chargement des variables d'environnement
import dotenv from 'dotenv';
import { z } from 'zod';

// Charger les variables d'environnement
dotenv.config();

// Schéma de validation pour les variables d'environnement
const envSchema = z.object({
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  
  // OpenAI
  OPENAI_API_KEY: z.string(),
  
  // Météo (OpenWeatherMap)
  WEATHER_API_KEY: z.string(),
  
  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string(),
  
  // SerpAPI (Google Images)
  SERPAPI_API_KEY: z.string(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Valider et extraire les variables d'environnement
export const env = envSchema.parse(process.env);

// Autres constantes de configuration
export const WALKING_THRESHOLD_MIN = 15; // Seuil en minutes au-delà duquel on utilise les transports en commun
