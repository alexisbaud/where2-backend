// Handler pour la route /suggest-41
import { Context } from 'hono';
import { SuggestRequestSchema, SuggestResponseSchema, Activity } from '../types';
import { getCurrentWeather } from '../services/weather';
import { generateActivities } from '../services/openai-41';
import { calculateRoute } from '../services/maps';
import { getDatetimeInfo } from '../utils/datetime';
import { z } from 'zod';
import { searchActivityImage } from '../services';

// Map mémoire pour stocker les activités générées
const activitiesMemoryStore = new Map<string, Activity>();

/**
 * Enrichit les activités avec des informations supplémentaires
 * - Calcul de distance et temps de trajet
 * - Ajout d'images via SerpAPI
 */
async function enrichActivities(activities: Activity[], userLat: number, userLng: number): Promise<Activity[]> {
  console.log(`Enriching ${activities.length} activities with additional data`);
  
  // Traiter chaque activité en parallèle
  const enrichedActivities = await Promise.all(activities.map(async (activity) => {
    const enrichedActivity = { ...activity };
    
    try {
      // Calculer la distance et le temps de trajet
      if (activity.location && activity.location.lat && activity.location.lng) {
        console.log(`Calculating route for activity "${activity.title}"`);
        const routeData = await calculateRoute(
          userLat,
          userLng,
          activity.location.lat,
          activity.location.lng
        );
        
        enrichedActivity.distance_m = routeData.distance_m;
        enrichedActivity.estimated_travel_time = routeData.estimated_travel_time;
        enrichedActivity.travel_type = routeData.travel_type;
      }
      
      // Rechercher une image pour l'activité
      if (activity.title) {
        console.log(`Searching image for activity "${activity.title}"`);
        try {
          const imageData = await searchActivityImage(activity.title);
          enrichedActivity.image_url = imageData.image_url;
        } catch (imageError) {
          console.warn(`Could not find image for activity "${activity.title}":`, imageError);
          // En cas d'erreur, laisser image_url à null
        }
      }
      
      return enrichedActivity;
    } catch (error) {
      console.error(`Error enriching activity "${activity.title}":`, error);
      return activity; // En cas d'erreur, retourner l'activité inchangée
    }
  }));
  
  return enrichedActivities;
}

/**
 * Handler pour la route POST /suggest-41
 * Génère des suggestions d'activités en fonction des réponses de l'utilisateur et de sa localisation
 */
export async function suggestHandler(c: Context): Promise<Response> {
  console.log('POST /suggest-41 - Start processing request');
  const startTime = Date.now();
  
  try {
    // Valider la requête reçue
    console.log('Validating request...');
    const requestValidation = SuggestRequestSchema.safeParse(c.req.json());
    
    if (!requestValidation.success) {
      console.error('Invalid request format:', requestValidation.error.format());
      return c.json({ error: 'Invalid request format', details: requestValidation.error.format() }, 400);
    }
    
    // Extraire les données validées
    const { answers, location, datetime, refine, excludeIds } = requestValidation.data;
    
    // Appliquer les valeurs par défaut si non fournies
    if (answers.budget === undefined) answers.budget = 50; // Valeur par défaut: 50€
    if (answers.travel_time === undefined) answers.travel_time = 20; // Valeur par défaut: 20 minutes
    if (answers.energy_level === undefined) answers.energy_level = 4; // Valeur par défaut: niveau 4 (moyen)
    
    try {
      // Récupérer les données météo
      console.log('Fetching weather data...');
      const weather = await getCurrentWeather(location.lat, location.lng);
      console.log('Weather data received:', weather);
      
      // Obtenir les informations de date et d'heure
      const datetimeInfo = getDatetimeInfo(datetime);
      console.log('Current datetime:', datetimeInfo);
      
      try {
        // Générer les suggestions d'activités avec OpenAI
        console.log('Generating activity suggestions...');
        const suggestionsData = await generateActivities({
          answers,
          location,
          weather,
          refine,
          excludeIds,
          datetime: datetimeInfo
        });
        
        console.log('OpenAI response received with activities:', suggestionsData.activities.length);
        
        // Enrichir les activités avec les distances, temps de trajet et images
        console.log('Enriching activities with additional data...');
        suggestionsData.activities = await enrichActivities(
          suggestionsData.activities,
          location.lat,
          location.lng
        );
        
        // Stocker les activités dans le store en mémoire
        for (const activity of suggestionsData.activities) {
          activitiesMemoryStore.set(activity.id, activity);
        }
        
        // Valider la réponse finale
        console.log('Validating final response...');
        const validationResponse = SuggestResponseSchema.safeParse(suggestionsData);
        if (!validationResponse.success) {
          console.error('Invalid response format:', validationResponse.error.format());
          return c.json({ error: 'Failed to generate valid suggestions', details: validationResponse.error.format() }, 500);
        }
        
        // Calculer le temps d'exécution
        const executionTime = Date.now() - startTime;
        console.log(`POST /suggest-41 - Request completed in ${executionTime}ms`);
        
        return c.json(validationResponse.data);
      } catch (openaiError) {
        console.error('Error from OpenAI service:', openaiError);
        if (openaiError instanceof Error) {
          console.error('Error message:', openaiError.message);
          console.error('Error stack:', openaiError.stack);
        }
        return c.json({ error: 'Failed to generate suggestions from OpenAI', details: String(openaiError) }, 500);
      }
    } catch (weatherError) {
      console.error('Error from Weather service:', weatherError);
      if (weatherError instanceof Error) {
        console.error('Error message:', weatherError.message);
        console.error('Error stack:', weatherError.stack);
      }
      return c.json({ error: 'Failed to fetch weather data', details: String(weatherError) }, 500);
    }
  } catch (error) {
    console.error('Unhandled error processing suggestion request:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return c.json({ error: 'Failed to generate suggestions', details: String(error) }, 500);
  }
}

/**
 * Handler pour la route GET /activity/:id
 * Récupère les détails d'une activité spécifique à partir de son ID
 */
export async function getActivityHandler(c: Context): Promise<Response> {
  const id = c.req.param('id');
  console.log(`GET /activity/${id} - Fetching activity details`);
  
  // Rechercher l'activité dans la mémoire
  const activity = activitiesMemoryStore.get(id);
  
  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }
  
  return c.json(activity);
} 