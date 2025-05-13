// Point d'entrée principal du serveur Hono, initialise les routes et démarre le serveur
import { serve } from '@hono/node-server';
import { env } from './config';
import app from './routes';

// Configuration du niveau de log
console.log('==== Where2 API Server ====');
console.log(`Starting server in ${env.NODE_ENV} mode`);
console.log(`Log level set to: ${env.LOG_LEVEL}`);
console.log(`OpenAI model: ${env.OPENAI_MODEL}`);

// Vérification des clés API requises
const missingKeys = [];

if (!env.OPENAI_API_KEY) {
  missingKeys.push('OPENAI_API_KEY');
}

if (!env.WEATHER_API_KEY) {
  missingKeys.push('WEATHER_API_KEY');
}

if (!env.GOOGLE_MAPS_API_KEY) {
  missingKeys.push('GOOGLE_MAPS_API_KEY');
}

if (missingKeys.length > 0) {
  console.error('⚠️ ERREUR: Clés API manquantes dans .env:');
  missingKeys.forEach(key => console.error(`  - ${key}`));
  console.error('Veuillez ajouter ces clés dans votre fichier .env');
  
  if (env.NODE_ENV === 'production') {
    console.error('Arrêt du serveur en environnement de production');
    process.exit(1);
  } else {
    console.warn('Le serveur continuera en mode développement, mais certaines fonctionnalités ne fonctionneront pas correctement');
  }
} else {
  console.log('✅ Toutes les clés API requises sont présentes');
}

// Afficher aussi les variables d'environnement en mode debug
if (env.LOG_LEVEL === 'debug') {
  console.log('\nEnvironment variables (sensitive data masked):');
  console.log('PORT:', env.PORT);
  console.log('NODE_ENV:', env.NODE_ENV);
  console.log('OPENAI_API_KEY:', `${env.OPENAI_API_KEY.substring(0, 3)}...${env.OPENAI_API_KEY.substring(env.OPENAI_API_KEY.length - 3)}`);
  console.log('OPENAI_MODEL:', env.OPENAI_MODEL);
  console.log('WEATHER_API_KEY:', `${env.WEATHER_API_KEY.substring(0, 3)}...${env.WEATHER_API_KEY.substring(env.WEATHER_API_KEY.length - 3)}`);
  console.log('GOOGLE_MAPS_API_KEY:', `${env.GOOGLE_MAPS_API_KEY.substring(0, 3)}...${env.GOOGLE_MAPS_API_KEY.substring(env.GOOGLE_MAPS_API_KEY.length - 3)}`);
  console.log('LOG_LEVEL:', env.LOG_LEVEL);
}

// Démarrer le serveur
serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log(`\n🚀 Server is running on http://localhost:${info.port}`);
  console.log('\nAvailable routes:');
  console.log('- GET  /healthz            Health check endpoint');
  console.log('- POST /suggest            Generate activity suggestions (using model configured in .env)');
  console.log('- POST /suggest-o3         Generate activity suggestions (using model o3)');
  console.log('- GET  /activity/:id       Get details for a specific activity');
  console.log('\nPress Ctrl+C to stop the server');
});
