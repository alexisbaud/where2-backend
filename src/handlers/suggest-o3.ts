// Handler pour la route POST /suggest-o3 (OpenAI o3)
import { Context } from 'hono';
import { Activity, SuggestRequestSchema, SuggestResponseSchema } from '../types';
import { calculateRoute, searchActivityImage, getAccurateCoordinates } from '../services';
import { generateActivities, PreferenceChoice, EnvironmentPreference, ExperienceType, EventPermanence } from '../services/openai-o3'; // Utilisation du service o3
import { getCurrentWeather } from '../services/weather';
import { getDatetimeInfo } from '../utils/datetime';

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
        console.log(`Processing activity "${activity.title}" at ${activity.location.address}`);
        
        // Tenter d'obtenir des coordonnées plus précises via Google Places
        let destLat = activity.location.lat;
        let destLng = activity.location.lng;
        
        if (activity.title && activity.location.address) {
          console.log(`Getting more accurate coordinates for: ${activity.title}, ${activity.location.address}`);
          const accurateCoords = await getAccurateCoordinates(activity.title, activity.location.address);
          
          if (accurateCoords) {
            console.log(`Using more accurate coordinates: (${accurateCoords.lat}, ${accurateCoords.lng}) instead of (${destLat}, ${destLng})`);
            destLat = accurateCoords.lat;
            destLng = accurateCoords.lng;
            
            // Mettre à jour les coordonnées de l'activité avec les valeurs plus précises
            enrichedActivity.location = {
              ...enrichedActivity.location,
              lat: accurateCoords.lat,
              lng: accurateCoords.lng
            };
          } else {
            console.log(`No accurate coordinates found, using original coordinates: (${destLat}, ${destLng})`);
          }
        }
        
        // Calculer la route avec les coordonnées les plus précises disponibles
        console.log(`Calculating route for activity "${activity.title}" using coordinates (${destLat}, ${destLng})`);
        const routeData = await calculateRoute(
          userLat,
          userLng,
          destLat,
          destLng
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
 * Gère les valeurs par défaut pour les réponses au quiz
 * @param rawAnswers Réponses brutes de la requête
 * @returns Réponses avec valeurs par défaut
 */
function convertRequestAnswers(rawAnswers: any) {
  const convertedAnswers = { ...rawAnswers };
  
  // Définir les valeurs par défaut si elles sont manquantes
  if (convertedAnswers.same_type === undefined) {
    convertedAnswers.same_type = PreferenceChoice.Indifferent;
  }
  
  // Si participants_count est défini (mode raffinement) mais indoor_preference est absent
  if (convertedAnswers.indoor_preference === undefined && rawAnswers.participants_count !== undefined) {
    convertedAnswers.indoor_preference = EnvironmentPreference.Indifferent;
  }
  
  // Si en mode raffinement mais authentic_preference est absent
  if (convertedAnswers.authentic_preference === undefined && rawAnswers.participants_count !== undefined) {
    convertedAnswers.authentic_preference = ExperienceType.Indifferent;
  }
  
  // Si en mode raffinement mais temporary_preference est absent
  if (convertedAnswers.temporary_preference === undefined && rawAnswers.participants_count !== undefined) {
    convertedAnswers.temporary_preference = EventPermanence.Indifferent;
  }
  
  return convertedAnswers;
}

/**
 * Handler pour la route POST /suggest-o3
 * Génère des suggestions d'activités personnalisées en utilisant OpenAI o3
 */
export async function suggestO3Handler(c: Context): Promise<Response> {
  console.log('POST /suggest-o3 - Starting activity generation with OpenAI o3');
  const startTime = Date.now();
  
  try {
    // Validation du schéma de la requête
    const requestValidation = SuggestRequestSchema.safeParse(await c.req.json());
    
    if (!requestValidation.success) {
      console.error('Invalid request format:', requestValidation.error.format());
      return c.json({ error: 'Invalid request format', details: requestValidation.error.format() }, 400);
    }
    
    const requestData = requestValidation.data;
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    // Extraire les paramètres essentiels
    const { location, answers: rawAnswers, refine, excludeIds, datetime } = requestData;
    
    // Convertir les réponses pour les rendre compatibles avec le service OpenAI
    const answers = convertRequestAnswers(rawAnswers);
    
    // Appliquer les valeurs par défaut si non fournies
    if (answers.same_type === undefined) answers.same_type = PreferenceChoice.No; // Valeur par défaut
    if (answers.budget === undefined) answers.budget = 50; // Valeur par défaut: 50€
    if (answers.travel_time === undefined) answers.travel_time = 20; // Valeur par défaut: 20 minutes
    if (answers.energy_level === undefined) answers.energy_level = 4; // Valeur par défaut: niveau 4
    
    try {
      // Récupérer les données météo pour la localisation
      console.log(`Fetching weather data for location: ${location.lat}, ${location.lng}`);
      const weatherData = await getCurrentWeather(location.lat, location.lng);
      console.log('Weather data received:', weatherData);
      
      // Obtenir les informations de date et heure en utilisant la valeur fournie par l'utilisateur
      const datetimeInfo = getDatetimeInfo(datetime);
      console.log('Datetime info:', datetimeInfo);
      
      try {
        // Générer des suggestions avec le modèle OpenAI o3
        console.log('Calling OpenAI o3 API...');
        const suggestionsData = await generateActivities({
          answers,
          location,
          weather: weatherData,
          refine,
          excludeIds,
          datetime: datetimeInfo
        });
        
        console.log('OpenAI o3 response received with activities:', suggestionsData.activities.length);
        
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

/**
 * Handler pour la route GET /activity/:id
 * Récupère les détails d'une activité spécifique à partir de son ID
 */
export async function getActivityO3Handler(c: Context): Promise<Response> {
  const id = c.req.param('id');
  console.log(`GET /activity-o3/${id} - Fetching activity details`);
  
  // Rechercher l'activité dans la mémoire
  const activity = activitiesMemoryStore.get(id);
  
  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }
  
  return c.json(activity);
} 