// Handler pour la route /suggest-41
import { Context } from 'hono';
import { SuggestRequestSchema, SuggestResponseSchema, Activity } from '../types';
import { getCurrentWeather } from '../services/weather';
import { generateActivities } from '../services/openai-41';
import { calculateRoute } from '../services/maps';

// Map mémoire pour stocker les activités générées
const activitiesMemoryStore = new Map<string, Activity>();

/**
 * Handler pour la route POST /suggest-41
 * Génère des suggestions d'activités en fonction des réponses de l'utilisateur et de sa localisation
 */
export async function suggestHandler(c: Context): Promise<Response> {
  console.log('POST /suggest-41 - Start processing request');
  const startTime = Date.now();
  
  try {
    // Valider le body de la requête
    const body = await c.req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const validationResult = SuggestRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Invalid request body:', validationResult.error);
      return c.json({ error: 'Invalid request format', details: validationResult.error.format() }, 400);
    }
    
    const { answers, location, refine, excludeIds } = validationResult.data;
    console.log('Validated data:', { answers, location, refine: refine || false, excludeIds: excludeIds || [] });
    
    try {
      // Récupérer les données météo
      console.log('Fetching weather data...');
      const weather = await getCurrentWeather(location.lat, location.lng);
      console.log('Weather data received:', weather);
      
      try {
        // Générer les suggestions d'activités avec OpenAI
        console.log('Generating activity suggestions...');
        const suggestionsData = await generateActivities({
          answers,
          location,
          weather,
          refine,
          excludeIds
        });
        
        console.log('OpenAI response received with activities:', suggestionsData.activities.length);
        
        // Enrichir chaque activité avec les données de trajet de Google Maps
        console.log('Enriching activities with route data...');
        for (const activity of suggestionsData.activities) {
          if (activity.location && activity.location.lat && activity.location.lng) {
            try {
              const routeData = await calculateRoute(
                location.lat,
                location.lng,
                activity.location.lat,
                activity.location.lng
              );
              
              // Mettre à jour les champs de distance et temps de trajet
              activity.distance_m = routeData.distance_m;
              activity.estimated_travel_time = routeData.estimated_travel_time;
              activity.travel_type = routeData.travel_type;
              console.log(`Route data for activity ${activity.id}:`, { 
                distance_m: routeData.distance_m,
                estimated_travel_time: routeData.estimated_travel_time,
                travel_type: routeData.travel_type 
              });
            } catch (routeError) {
              console.warn(`Failed to calculate route for activity ${activity.id}:`, routeError);
              // Laisser les champs à null en cas d'erreur
            }
          } else {
            console.warn(`Activity ${activity.id} has invalid location:`, activity.location);
          }
          
          // Stocker l'activité dans la mémoire pour la route GET /activity/:id
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