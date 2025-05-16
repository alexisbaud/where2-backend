// Service pour interagir avec l'API Google Maps
import { Client, TravelMode, Language, PlaceInputType } from '@googlemaps/google-maps-services-js';
import { env, WALKING_THRESHOLD_MIN } from '../config';

// Initialiser le client Google Maps
const client = new Client({});

export interface RouteData {
  distance_m: number;
  estimated_travel_time: number; // en secondes
  travel_type: 1 | 2; // 1 = à pied, 2 = transports en commun
}

/**
 * Obtient des coordonnées précises à partir du titre et de l'adresse
 * @param title Titre ou nom du lieu
 * @param address Adresse du lieu
 * @returns Coordonnées précises du lieu ou null si non trouvé
 */
export async function getAccurateCoordinates(title: string, address: string): Promise<{lat: number, lng: number} | null> {
  // Vérifier si l'adresse contient déjà une ville, sinon ajouter "Paris" par défaut
  // car la plupart des activités sont probablement à Paris
  const hasCity = /paris|lyon|marseille|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|lille/i.test(address);
  
  let searchQuery = `${title}, ${address}`;
  if (!hasCity) {
    searchQuery = `${title}, ${address}, Paris, France`;
    console.log(`Address lacks city information, adding default city: "${searchQuery}"`);
  }
  
  console.log(`Getting accurate coordinates for: "${searchQuery}"`);
  
  try {
    const response = await client.findPlaceFromText({
      params: {
        input: searchQuery,
        inputtype: PlaceInputType.textQuery,
        fields: ['geometry', 'formatted_address', 'name'],
        key: env.GOOGLE_MAPS_API_KEY,
        language: Language.fr
      }
    });
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      const place = response.data.candidates[0];
      
      if (!place.geometry || !place.geometry.location) {
        console.warn('Place found but no geometry information available');
        return null;
      }
      
      const location = place.geometry.location;
      
      console.log(`Place found: "${place.name || 'Unnamed'}" at ${place.formatted_address || 'Unknown address'}`);
      console.log(`Coordinates: (${location.lat}, ${location.lng})`);
      
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    // Si la première recherche ne trouve rien, essayer une recherche plus générale
    if (!hasCity) {
      console.log('Trying more generic search with only the title...');
      
      const fallbackResponse = await client.findPlaceFromText({
        params: {
          input: `${title}, Paris, France`,
          inputtype: PlaceInputType.textQuery,
          fields: ['geometry', 'formatted_address', 'name'],
          key: env.GOOGLE_MAPS_API_KEY,
          language: Language.fr
        }
      });
      
      if (fallbackResponse.data.candidates && fallbackResponse.data.candidates.length > 0) {
        const fallbackPlace = fallbackResponse.data.candidates[0];
        
        if (fallbackPlace.geometry && fallbackPlace.geometry.location) {
          const fallbackLocation = fallbackPlace.geometry.location;
          
          console.log(`Fallback place found: "${fallbackPlace.name || 'Unnamed'}" at ${fallbackPlace.formatted_address || 'Unknown address'}`);
          console.log(`Fallback coordinates: (${fallbackLocation.lat}, ${fallbackLocation.lng})`);
          
          return {
            lat: fallbackLocation.lat,
            lng: fallbackLocation.lng
          };
        }
      }
    }
    
    console.warn(`No places found for query: "${searchQuery}"`);
    return null;
  } catch (error) {
    console.error('Error finding place:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

/**
 * Calcule la distance et le temps de trajet entre deux points
 * Utilise le mode à pied si le trajet est inférieur à WALKING_THRESHOLD_MIN,
 * sinon utilise les transports en commun avec des corrections pour aligner
 * les estimations avec l'application Google Maps
 * 
 * @param originLat Latitude d'origine
 * @param originLng Longitude d'origine
 * @param destLat Latitude de destination
 * @param destLng Longitude de destination
 * @returns Données de trajet (distance, temps estimé en secondes, type de trajet)
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
    const walkingDurationMinutes = walkingDuration / 60; // Pour les logs et la comparaison
    
    console.log(`Walking route found: ${walkingRoute.summary}`);
    console.log(`Walking duration: ${walkingDurationMinutes.toFixed(1)} minutes (${walkingDuration} seconds)`);
    console.log(`Walking distance: ${walkingRoute.legs[0].distance.text} (${walkingRoute.legs[0].distance.value} meters)`);
    
    // Si le trajet à pied est inférieur au seuil, utiliser ce mode
    // Les trajets courts à pied sont généralement bien estimés
    if (walkingDurationMinutes <= WALKING_THRESHOLD_MIN) {
      console.log(`Walking duration (${walkingDurationMinutes.toFixed(1)} min) is below threshold (${WALKING_THRESHOLD_MIN} min), using walking mode`);
      return {
        distance_m: walkingRoute.legs[0].distance.value,
        estimated_travel_time: walkingDuration, // Conserver les secondes
        travel_type: 1 // à pied
      };
    }
    
    // Sinon, essayer les transports en commun
    console.log(`Walking duration (${walkingDurationMinutes.toFixed(1)} min) exceeds threshold (${WALKING_THRESHOLD_MIN} min), trying transit mode`);
    try {
      // Utiliser l'heure actuelle pour des estimations plus précises
      const now = new Date();
      const transitParams = {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: TravelMode.transit,
        departure_time: now, // Crucial pour des estimations réalistes
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
          estimated_travel_time: walkingDuration, // Conserver les secondes
          travel_type: 1 // à pied
        };
      }
      
      const transitRoute = transitResult.data.routes[0];
      
      // Si un itinéraire en transport en commun est trouvé, l'utiliser avec des corrections
      if (transitRoute) {
        const transitBaseDuration = transitRoute.legs[0].duration.value; // en secondes
        const transitBaseDurationMinutes = transitBaseDuration / 60; // Pour les logs
        
        console.log(`Transit route found: ${transitRoute.summary || 'No summary'}`);
        console.log(`Transit base duration: ${transitBaseDurationMinutes.toFixed(1)} minutes (${transitBaseDuration} seconds)`);
        console.log(`Transit distance: ${transitRoute.legs[0].distance.text} (${transitRoute.legs[0].distance.value} meters)`);
        
        // Calculer le nombre de correspondances/étapes de transport
        const steps = transitRoute.legs[0].steps;
        let transitStepsCount = 0;
        
        for (const step of steps) {
          if (step.travel_mode === TravelMode.transit) {
            transitStepsCount++;
          }
        }
        console.log(`Number of transit segments: ${transitStepsCount}`);
        
        // Facteurs correctifs pour aligner avec l'application Google Maps
        const BASE_MARGIN_SECONDS = 120; // 2 minutes de base
        const TRANSIT_FACTOR = 1.15; // +15% du temps
        const PER_TRANSIT_MARGIN_SECONDS = 180; // 3 min par correspondance
        
        // Calcul du temps corrigé
        let correctedDuration = transitBaseDuration * TRANSIT_FACTOR;
        correctedDuration += BASE_MARGIN_SECONDS;
        correctedDuration += transitStepsCount * PER_TRANSIT_MARGIN_SECONDS;
        
        // Arrondir aux 30 secondes près
        correctedDuration = Math.ceil(correctedDuration / 30) * 30;
        
        console.log(`Original transit duration: ${transitBaseDuration} seconds (${transitBaseDurationMinutes.toFixed(1)} minutes)`);
        console.log(`Corrected transit duration: ${correctedDuration} seconds (${(correctedDuration/60).toFixed(1)} minutes)`);
        console.log(`Added buffer: ${correctedDuration - transitBaseDuration} seconds (${((correctedDuration - transitBaseDuration)/60).toFixed(1)} minutes)`);
        
        return {
          distance_m: transitRoute.legs[0].distance.value,
          estimated_travel_time: Math.round(correctedDuration), // Valeur corrigée
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
      estimated_travel_time: walkingDuration, // Conserver les secondes
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