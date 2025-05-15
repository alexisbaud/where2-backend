// Handler pour simuler une réponse retardée avec des données factices
import { Context } from 'hono';
import { SuggestRequestSchema, SuggestResponseSchema } from '../types';

/**
 * Renvoie une réponse JSON factice après un délai de 60 secondes
 * Cette route est utilisée pour tester le comportement de l'application en cas d'attente prolongée
 * Accepte les mêmes paramètres que la route /suggest-o3
 */
export const mockDelayHandler = async (c: Context) => {
  console.log('🕒 [POST /mock-delay] Début du traitement (délai de 60 secondes)');
  const startTime = Date.now();
  
  try {
    // Valider la requête reçue
    console.log('Validating request...');
    const requestValidation = SuggestRequestSchema.safeParse(await c.req.json());
    
    if (!requestValidation.success) {
      console.error('Invalid request format:', requestValidation.error.format());
      return c.json({ error: 'Invalid request format', details: requestValidation.error.format() }, 400);
    }
    
    // Extraire les données validées (pour les logs)
    const { answers, location, datetime, refine, excludeIds } = requestValidation.data;
    
    console.log('Request data received:', {
      answers,
      location,
      datetime: datetime || 'not provided',
      refine: refine || false,
      excludeIds: excludeIds?.length || 0
    });
    
    // Simuler un traitement de 60 secondes
    console.log('Simulating long processing time (60 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Données factices qui ressemblent à la structure attendue mais sans utiliser l'IA
    const mockData = {
      activities: [
        {
          id: "mock-activity-1",
          title: "Visite du musée d'art moderne",
          description: "Une expérience culturelle dans un musée renommé",
          long_description: "Découvrez les collections permanentes et les expositions temporaires de ce musée d'art moderne qui présente des œuvres d'artistes contemporains nationaux et internationaux.",
          price_eur: 12.5,
          duration_min: 60,
          duration_max: 180,
          location: {
            name: "Musée d'Art Moderne de Paris",
            address: "11 Avenue du Président Wilson, 75116 Paris",
            lat: 48.8651,
            lng: 2.2909
          },
          distance_m: 1500,
          estimated_travel_time: 15,
          travel_type: 1,
          indoor: true,
          authentic: true,
          temporary: false,
          tags: ["art", "culture", "musée", "intérieur"],
          rating_google: 4.2,
          reviews_count: 3542,
          image_url: "https://example.com/images/museum.jpg",
          external_url: "https://www.mam.paris.fr",
          is_free: false,
          is_student_free: true,
          language: "fr",
          open_hours: [
            {
              day: "lundi",
              open: "fermé",
              close: "fermé"
            },
            {
              day: "mardi",
              open: "10:00",
              close: "18:00"
            },
            {
              day: "mercredi",
              open: "10:00",
              close: "18:00"
            },
            {
              day: "jeudi",
              open: "10:00",
              close: "18:00"
            },
            {
              day: "vendredi",
              open: "10:00",
              close: "18:00"
            },
            {
              day: "samedi",
              open: "10:00",
              close: "18:00"
            },
            {
              day: "dimanche",
              open: "10:00",
              close: "18:00"
            }
          ],
          date_special: null,
          organizer: {
            type: "museum",
            name: "Ville de Paris"
          }
        },
        {
          id: "mock-activity-2",
          title: "Balade dans le Jardin du Luxembourg",
          description: "Une promenade relaxante dans un parc historique",
          long_description: "Profitez d'une après-midi dans l'un des plus beaux jardins de Paris. Le Jardin du Luxembourg offre de magnifiques espaces verts, des fontaines et des statues pour une promenade agréable.",
          price_eur: 0,
          duration_min: 30,
          duration_max: 120,
          location: {
            name: "Jardin du Luxembourg",
            address: "Rue de Médicis, 75006 Paris",
            lat: 48.8462,
            lng: 2.3372
          },
          distance_m: 2200,
          estimated_travel_time: 25,
          travel_type: 2,
          indoor: false,
          authentic: true,
          temporary: false,
          tags: ["parc", "nature", "détente", "extérieur"],
          rating_google: 4.7,
          reviews_count: 8756,
          image_url: "https://jardin.senat.fr/fileadmin/_processed_/6/9/csm_jardin-du-luxembourg_acc93119b9.jpg",
          external_url: "https://www.senat.fr/jardin/",
          is_free: true,
          is_student_free: true,
          language: null,
          open_hours: [
            {
              day: "tous les jours",
              open: "7:30",
              close: "21:30"
            }
          ],
          date_special: null,
          organizer: {
            type: "government",
            name: "Sénat"
          }
        },
        {
          id: "mock-activity-3",
          title: "Concert de jazz au Sunset/Sunside",
          description: "Une soirée musicale dans un club de jazz emblématique",
          long_description: "Le Sunset/Sunside est l'un des clubs de jazz les plus réputés de Paris. Venez écouter des musiciens talentueux dans une ambiance chaleureuse et intime.",
          price_eur: 25,
          duration_min: 90,
          duration_max: 120,
          location: {
            name: "Sunset/Sunside",
            address: "60 Rue des Lombards, 75001 Paris",
            lat: 48.8593,
            lng: 2.3479
          },
          distance_m: 1800,
          estimated_travel_time: 20,
          travel_type: 1,
          indoor: true,
          authentic: true,
          temporary: true,
          tags: ["musique", "jazz", "concert", "soirée"],
          rating_google: 4.5,
          reviews_count: 1245,
          image_url: null,
          external_url: "https://www.sunset-sunside.com",
          is_free: false,
          is_student_free: false,
          language: null,
          open_hours: [
            {
              day: "tous les jours",
              open: "19:30",
              close: "02:00"
            }
          ],
          date_special: "2023-12-15",
          organizer: {
            type: "club",
            name: "Sunset/Sunside"
          }
        }
      ],
      note: 7,
      note_reasons: "Ces suggestions sont des exemples fictifs et ne sont pas générées par l'IA en fonction de vos préférences réelles. Elles représentent simplement des activités typiques dans une grande ville."
    };
    
    // Valider la réponse avant de l'envoyer
    console.log('Validating response...');
    const validationResponse = SuggestResponseSchema.safeParse(mockData);
    
    if (!validationResponse.success) {
      console.error('Invalid mock response format:', validationResponse.error.format());
      return c.json({ error: 'Invalid mock response format', details: validationResponse.error.format() }, 500);
    }
    
    // Calculer le temps d'exécution
    const executionTime = Date.now() - startTime;
    console.log(`✅ [POST /mock-delay] Fin du traitement (après délai de 60 secondes) - Request completed in ${executionTime}ms`);
    
    return c.json(validationResponse.data);
  } catch (error) {
    console.error('Unhandled error in mock-delay handler:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return c.json({ error: 'Failed to process mock request', details: String(error) }, 500);
  }
}; 