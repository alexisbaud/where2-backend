// Service pour récupérer des images via Google Maps Platform et SerpAPI
import { getJson } from 'serpapi';
import { env } from '../config';
import axios from 'axios';

export interface ImageData {
  image_url: string;
  source_url: string;
  title: string;
}

/**
 * Recherche une image pour une activité donnée
 * Stratégie: 
 * 1. Utiliser Google Maps Text Search pour trouver le lieu
 * 2. Utiliser Google Maps Place Photos pour obtenir la photo
 * 3. Fallback sur SerpAPI si aucune image trouvée via Google Maps
 * 
 * @param activityTitle Titre de l'activité pour rechercher une image pertinente
 * @returns Données de l'image (URL de l'image, URL source, titre)
 */
export async function searchActivityImage(activityTitle: string): Promise<ImageData> {
  console.log(`Searching image for activity: "${activityTitle}"`);
  
  try {
    // 1. Essayer d'abord Google Maps Text Search
    const googleMapsImage = await searchImageWithGoogleMaps(activityTitle);
    if (googleMapsImage) {
      console.log(`Image found via Google Maps for: "${activityTitle}"`);
      return googleMapsImage;
    }
    
    // 2. Si aucune image n'est trouvée via Google Maps, utiliser SerpAPI
    console.log(`No image found via Google Maps, falling back to SerpAPI for: "${activityTitle}"`);
    return await searchImageWithSerpApi(activityTitle);
  } catch (error) {
    console.error('Error searching for activity image:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Retourner une image par défaut en cas d'erreur
    return {
      image_url: 'https://via.placeholder.com/300x200?text=Image+non+disponible',
      source_url: '',
      title: activityTitle
    };
  }
}

/**
 * Recherche une image en utilisant Google Maps Platform (Text Search + Place Photos)
 * @param query Terme de recherche pour le lieu
 * @returns Données de l'image ou null si non trouvée
 */
async function searchImageWithGoogleMaps(query: string): Promise<ImageData | null> {
  try {
    console.log(`Searching place with Google Maps Text Search for: "${query}"`);
    console.log(`Using Google Maps API key: ${env.GOOGLE_MAPS_API_KEY.substring(0, 3)}...${env.GOOGLE_MAPS_API_KEY.substring(env.GOOGLE_MAPS_API_KEY.length - 3)}`);
    
    // 1. Rechercher le lieu avec Text Search API
    const textSearchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const textSearchParams = {
      query: query,
      key: env.GOOGLE_MAPS_API_KEY,
      language: 'fr',
    };
    
    const textSearchResponse = await axios.get(textSearchUrl, { params: textSearchParams });
    
    // Vérifier si des résultats ont été trouvés
    if (textSearchResponse.data.status !== 'OK' || !textSearchResponse.data.results || textSearchResponse.data.results.length === 0) {
      console.log(`No places found in Google Maps for: "${query}"`);
      return null;
    }
    
    // Récupérer le premier résultat
    const place = textSearchResponse.data.results[0];
    console.log(`Place found: "${place.name}" (${place.place_id})`);
    
    // Vérifier si le lieu a des photos
    if (!place.photos || place.photos.length === 0) {
      console.log(`No photos found for place: "${place.name}"`);
      return null;
    }
    
    // 2. Obtenir la photo avec Place Photos API
    const photoReference = place.photos[0].photo_reference;
    const placeName = place.name;
    const placeId = place.place_id;
    
    // Créer l'URL de la photo
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${env.GOOGLE_MAPS_API_KEY}`;
    
    // Générer l'URL source (lien vers Google Maps pour ce lieu)
    const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    
    console.log(`Image URL from Google Maps: ${photoUrl}`);
    
    return {
      image_url: photoUrl,
      source_url: googleMapsUrl,
      title: placeName
    };
  } catch (error) {
    console.error('Error searching image with Google Maps:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null; // Retourner null pour permettre le fallback sur SerpAPI
  }
}

/**
 * Recherche une image en utilisant SerpAPI (fallback)
 * @param query Terme de recherche pour l'image
 * @returns Données de l'image
 */
async function searchImageWithSerpApi(query: string): Promise<ImageData> {
  console.log(`Searching image with SerpAPI for: "${query}"`);
  console.log(`Using SerpAPI key: ${env.SERPAPI_API_KEY.substring(0, 3)}...${env.SERPAPI_API_KEY.substring(env.SERPAPI_API_KEY.length - 3)}`);
  
  try {
    // Construire la requête de recherche
    const searchQuery = `${query} activité`;
    console.log(`SerpAPI search query: "${searchQuery}"`);
    
    // Paramètres pour SerpAPI
    const params = {
      engine: "google_images",
      q: searchQuery,
      api_key: env.SERPAPI_API_KEY,
      hl: "fr",
      gl: "fr",
      safe: "active" // Pour éviter les contenus inappropriés
    };
    
    console.log('Sending request to SerpAPI...');
    const results = await getJson(params);
    
    if (!results.images_results || results.images_results.length === 0) {
      console.error('No image results found from SerpAPI');
      throw new Error('No image results found');
    }
    
    // Récupérer le premier résultat
    const firstImage = results.images_results[0];
    console.log(`SerpAPI image found: ${firstImage.title || 'No title'}`);
    console.log(`SerpAPI image URL: ${firstImage.original || firstImage.thumbnail}`);
    
    return {
      image_url: firstImage.original || firstImage.thumbnail,
      source_url: firstImage.source || firstImage.link || '',
      title: firstImage.title || query
    };
  } catch (error) {
    console.error('Error searching with SerpAPI:', error);
    
    // Retourner une image par défaut en cas d'erreur
    return {
      image_url: 'https://via.placeholder.com/300x200?text=Image+non+disponible',
      source_url: '',
      title: query
    };
  }
} 