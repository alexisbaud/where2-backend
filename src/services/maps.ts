// Service pour interagir avec l'API Google Maps
import { Client, TravelMode, Language } from '@googlemaps/google-maps-services-js';
import { env, WALKING_THRESHOLD_MIN } from '../config';

// Initialiser le client Google Maps
const client = new Client({});

export interface RouteData {
  distance_m: number;
  estimated_travel_time: number; // en secondes
  travel_type: 1 | 2; // 1 = à pied, 2 = transports en commun
}

/**
 * Calcule la distance et le temps de trajet entre deux points
 * Utilise le mode à pied si le trajet est inférieur à WALKING_THRESHOLD_MIN (15 min), sinon utilise les transports en commun
 * @param originLat Latitude d'origine
 * @param originLng Longitude d'origine
 * @param destLat Latitude de destination
 * @param destLng Longitude de destination
 * @returns Données de trajet (distance, temps estimé, type de trajet)
 */
export async function calculateRoute(
  originLat: number, 
  originLng: number, 
  destLat: number, 
  destLng: number
): Promise<RouteData> {
  console.log(`Calculating route from (${originLat}, ${originLng}) to (${destLat}, ${destLng})`);
  console.log(`Using Google Maps API key: ${env.GOOGLE_MAPS_API_KEY.substring(0, 3)}...${env.GOOGLE_MAPS_API_KEY.substring(env.GOOGLE_MAPS_API_KEY.length - 3)}`);
  console.log(`Walking threshold set to ${WALKING_THRESHOLD_MIN} minutes`);
  
  try {
    // Essayer d'abord le mode à pied
    console.log('Trying walking mode first...');
    const walkingParams = {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      mode: TravelMode.walking,
      key: env.GOOGLE_MAPS_API_KEY,
      language: Language.fr
    };
    console.log('Walking request params:', { ...walkingParams, key: '***hidden***' });
    
    const walkingResult = await client.directions({
      params: walkingParams
    });
    
    console.log('Walking route API response status:', walkingResult.status);
    
    if (!walkingResult.data.routes || walkingResult.data.routes.length === 0) {
      console.error('No walking routes found in Google Maps response');
      throw new Error('No walking routes found');
    }
    
    const walkingRoute = walkingResult.data.routes[0];
    const walkingDuration = walkingRoute.legs[0].duration.value; // en secondes
    const walkingDurationMinutes = walkingDuration / 60;
    
    console.log(`Walking route found: ${walkingRoute.summary}`);
    console.log(`Walking duration: ${walkingDurationMinutes.toFixed(1)} minutes (${walkingDuration} seconds)`);
    console.log(`Walking distance: ${walkingRoute.legs[0].distance.text} (${walkingRoute.legs[0].distance.value} meters)`);
    
    // Si le trajet à pied est inférieur au seuil, utiliser ce mode
    if (walkingDurationMinutes <= WALKING_THRESHOLD_MIN) {
      console.log(`Walking duration (${walkingDurationMinutes.toFixed(1)} min) is below threshold (${WALKING_THRESHOLD_MIN} min), using walking mode`);
      return {
        distance_m: walkingRoute.legs[0].distance.value,
        estimated_travel_time: walkingDuration,
        travel_type: 1 // à pied
      };
    }
    
    // Sinon, essayer les transports en commun
    console.log(`Walking duration (${walkingDurationMinutes.toFixed(1)} min) exceeds threshold (${WALKING_THRESHOLD_MIN} min), trying transit mode`);
    try {
      const transitParams = {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: TravelMode.transit,
        key: env.GOOGLE_MAPS_API_KEY,
        language: Language.fr
      };
      console.log('Transit request params:', { ...transitParams, key: '***hidden***' });
      
      const transitResult = await client.directions({
        params: transitParams
      });
      
      console.log('Transit route API response status:', transitResult.status);
      
      if (!transitResult.data.routes || transitResult.data.routes.length === 0) {
        console.warn('No transit routes found in Google Maps response, falling back to walking mode');
        return {
          distance_m: walkingRoute.legs[0].distance.value,
          estimated_travel_time: walkingDuration,
          travel_type: 1 // à pied
        };
      }
      
      const transitRoute = transitResult.data.routes[0];
      
      // Si un itinéraire en transport en commun est trouvé, l'utiliser
      if (transitRoute) {
        console.log(`Transit route found: ${transitRoute.summary || 'No summary'}`);
        console.log(`Transit duration: ${(transitRoute.legs[0].duration.value / 60).toFixed(1)} minutes (${transitRoute.legs[0].duration.value} seconds)`);
        console.log(`Transit distance: ${transitRoute.legs[0].distance.text} (${transitRoute.legs[0].distance.value} meters)`);
        
        return {
          distance_m: transitRoute.legs[0].distance.value,
          estimated_travel_time: transitRoute.legs[0].duration.value,
          travel_type: 2 // transports en commun
        };
      }
    } catch (transitError) {
      console.warn('Could not calculate transit route:', transitError);
      console.warn('Falling back to walking mode');
      // Si les transports en commun échouent, on revient au mode à pied
    }
    
    // Par défaut, retourner la route à pied si les transports en commun ne sont pas disponibles
    console.log('Using walking mode as fallback');
    return {
      distance_m: walkingRoute.legs[0].distance.value,
      estimated_travel_time: walkingDuration,
      travel_type: 1 // à pied
    };
    
  } catch (error) {
    console.error('Error calculating route:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to calculate route: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 