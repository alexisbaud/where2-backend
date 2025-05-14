// Handler pour la route /suggest-o3
import { Context } from 'hono';
import { SuggestRequestSchema, SuggestResponseSchema, Activity } from '../types';
import { getCurrentWeather } from '../services/weather';
import { generateActivities } from '../services/openai-o3'; // Utilisation du service o3
import { calculateRoute } from '../services/maps';
import { getDatetimeInfo } from '../utils/datetime';

// Map mémoire pour stocker les activités générées
const activitiesMemoryStore = new Map<string, Activity>();

/**
 * Handler pour la route POST /suggest-o3
 * Génère des suggestions d'activités avec le modèle o3 d'OpenAI
 */
export async function suggestO3Handler(c: Context): Promise<Response> {
  console.log('POST /suggest-o3 - Start processing request with model o3');
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
    
    const { answers, location, refine, excludeIds, datetime } = validationResult.data;
    console.log('Validated data:', { answers, location, refine: refine || false, excludeIds: excludeIds || [], datetime: datetime || 'Not provided' });
    
    try {
      // Récupérer les données météo
      console.log('Fetching weather data...');
      const weather = await getCurrentWeather(location.lat, location.lng);
      console.log('Weather data received:', weather);
      
      // Obtenir les informations de date et d'heure
      const datetimeInfo = getDatetimeInfo(datetime);
      console.log('Current datetime:', datetimeInfo);
      
      try {
        // Générer les suggestions d'activités avec OpenAI (modèle o3)
        console.log('Generating activity suggestions with o3 model...');
        const suggestionsData = await generateActivities({
          answers,
          location,
          weather,
          refine,
          excludeIds,
          datetime: datetimeInfo
        });
        
        console.log('OpenAI o3 response received with activities:', suggestionsData.activities.length);
        
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
        console.log(`POST /suggest-o3 - Request completed in ${executionTime}ms`);
        
        return c.json(validationResponse.data);
      } catch (openaiError) {
        console.error('Error from OpenAI o3 service:', openaiError);
        if (openaiError instanceof Error) {
          console.error('Error message:', openaiError.message);
          console.error('Error stack:', openaiError.stack);
        }
        return c.json({ error: 'Failed to generate suggestions from OpenAI o3', details: String(openaiError) }, 500);
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
    console.error('Unhandled error processing suggestion request with o3:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return c.json({ error: 'Failed to generate suggestions with o3', details: String(error) }, 500);
  }
} 