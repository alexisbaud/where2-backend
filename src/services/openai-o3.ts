// Service pour interagir avec l'API OpenAI (modèle o3)
import { OpenAI } from 'openai';
import { env } from '../config';
import { Activity } from '../types';
import { WeatherData } from './weather';

// Initialiser le client OpenAI
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Définir explicitement le modèle à utiliser
const OPENAI_MODEL = 'o3';

// Types pour les rôles des messages OpenAI
type Role = 'user' | 'assistant' | 'system' | 'tool';

// Énumérations pour les choix ternaires
export enum PreferenceChoice {
  Yes = 'yes',
  No = 'no',
  Indifferent = 'indifferent'
}

export enum EnvironmentPreference {
  Indoor = 'indoor',
  Outdoor = 'outdoor',
  Indifferent = 'indifferent'
}

export enum ExperienceType {
  Authentic = 'authentic',
  Touristic = 'touristic',
  Indifferent = 'indifferent'
}

export enum EventPermanence {
  Ephemeral = 'ephemeral',
  Permanent = 'permanent',
  Indifferent = 'indifferent'
}

// Interface pour la requête à OpenAI
interface GenerateActivityRequest {
  answers: {
    // Flux Initial (Q1-Q6)
    canceled_activity: string;                       // Q1: Activité annulée (texte libre)
    same_type?: PreferenceChoice;                    // Q2: Type d'activité (yes/no/indifferent)
    budget?: number;                                 // Q3: Budget (0-100€)
    travel_time?: number;                            // Q4: Temps de transport (5-60 minutes)
    energy_level?: number;                           // Q5: Niveau d'énergie (1-7)
    available_time?: number;                         // Q6: Temps libre disponible (30-240 minutes)
    
    // Flux de Raffinement (F2-F5)
    participants_count?: number;                     // F2: Nombre de participants (1-5+)
    indoor_preference?: EnvironmentPreference;       // F3: Préférence d'environnement (indoor/outdoor/indifferent)
    authentic_preference?: ExperienceType;           // F4: Type d'expérience (authentic/touristic/indifferent)
    temporary_preference?: EventPermanence;          // F5: Permanence de l'activité (ephemeral/permanent/indifferent)
  };
  location: { lat: number; lng: number };
  weather: WeatherData;
  refine?: boolean;
  excludeIds?: string[];
  datetime?: {
    date: string;  // Format YYYY-MM-DD
    time: string;  // Format HH:MM
    day: string;   // Jour de la semaine (Lundi, Mardi, etc.)
    isHoliday?: boolean; // Optionnel: si c'est un jour férié
    isWeekend?: boolean; // Optionnel: si c'est un weekend
  };
}

// Interface pour la réponse de l'API
interface OpenAIActivityResponse {
  activities: Activity[];
  note: number;
  note_reasons: string;
}

/**
 * Génère une requête principale à OpenAI pour obtenir des suggestions d'activités
 * @param params Paramètres pour la génération (réponses utilisateur, localisation, météo, etc.)
 * @returns Réponse JSON contenant les activités suggérées
 */
export async function generateActivities(params: GenerateActivityRequest): Promise<OpenAIActivityResponse> {
  console.log('Starting activity generation with OpenAI (o3 model)');
  
  // Construire le prompt en fonction des paramètres
  const prompt = buildPrompt(params);
  console.log('Prompt built, length:', prompt.length);
  console.log('Prompt content (first 200 chars):', prompt.substring(0, 200) + '...');
  
  try {
    console.log('Calling OpenAI API with o3 model...');
    // Utiliser explicitement le modèle o3
    const openaiModelToUse = OPENAI_MODEL;
    console.log('Selected model:', openaiModelToUse);
    
    // Initialiser la conversation
    const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [{ 
      role: 'user', 
      content: `${prompt}\n\nRéponds-moi avec un objet JSON bien formaté selon la structure demandée.` 
    }];
    
    // Gérer la conversation avec OpenAI, y compris les allers-retours pour les tool_calls
    let finalContent: string | null = null;
    let maxIterations = 10; // Augmenté de 5 à 10 pour permettre plus d'itérations et de réflexions
    
    for (let iteration = 0; iteration < maxIterations && !finalContent; iteration++) {
      console.log(`Conversation iteration ${iteration + 1}`);
      
      const response = await openai.chat.completions.create({
        model: openaiModelToUse,
        messages: messages,
        response_format: { type: 'json_object' },
        // Ne pas spécifier de température pour o3 (utiliser la valeur par défaut)
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search for information on the web',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query',
                  },
                },
                required: ['query'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      });
      
      console.log('OpenAI response received');
      
      const aiMessage = response.choices[0].message;
      const finishReason = response.choices[0].finish_reason;
      
      console.log('First choice finish reason:', finishReason);
      
      // Ajouter le message de l'assistant à la conversation
      messages.push({
        role: aiMessage.role,
        content: aiMessage.content || '',
        tool_calls: aiMessage.tool_calls,
      });
      
      // Vérifier si l'IA a demandé d'utiliser un outil
      if (finishReason === 'tool_calls' && aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        console.log('Tool calls detected:', aiMessage.tool_calls.length);
        
        // Traiter chaque appel d'outil
        for (const toolCall of aiMessage.tool_calls) {
          if (toolCall.function.name === 'web_search') {
            console.log('Web search tool call detected');
            
            try {
              // Extraire la requête de recherche
              const args = JSON.parse(toolCall.function.arguments);
              const query = args.query;
              console.log('Search query:', query);
              
              // Répondre à l'IA avec un résultat fictif (simuler la recherche)
              // Dans un environnement de production, vous feriez une vraie recherche web ici
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Résultats de recherche pour "${query}". Voici plusieurs activités extérieures à Paris correspondant à vos critères: 1) Les jardins du Luxembourg - entrée gratuite, 2) Marché alimentaire de Bastille - gratuit à explorer, 3) Street-art à Belleville - balade gratuite, 4) Parc des Buttes-Chaumont - entrée gratuite, 5) Canal Saint-Martin - promenade gratuite.`,
              });
              
              console.log('Tool response added to conversation');
            } catch (parseError) {
              console.error('Error parsing tool call arguments:', parseError);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: 'Error: Unable to parse search query',
              });
            }
          } else {
            console.warn(`Unknown tool call: ${toolCall.function.name}`);
          }
        }
      } else if (aiMessage.content) {
        // Si l'IA a répondu avec du contenu, on a terminé
        finalContent = aiMessage.content;
        console.log('Final content received (first 200 chars):', finalContent.substring(0, 200) + '...');
      } else {
        console.warn('No content and no tool calls in response');
      }
    }
    
    if (!finalContent) {
      console.error('Failed to get a final response after multiple iterations');
      throw new Error('Failed to generate a valid response from OpenAI after multiple iterations');
    }
    
    try {
      // Parser la réponse JSON
      console.log('Parsing JSON response...');
      const activityData = JSON.parse(finalContent) as OpenAIActivityResponse;
      
      console.log('Activities count in response:', activityData.activities.length);
      console.log('Self-evaluation note:', activityData.note);
      
      // Vérifier si des champs sont manquants et faire une deuxième requête si nécessaire
      const hasMissingFields = checkForMissingFields(activityData.activities);
      
      if (hasMissingFields) {
        console.log('Some fields are missing, making a second request to fill them');
        return await fillMissingFields(activityData);
      }
      
      console.log('All required fields are present');
      return activityData;
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      console.log('Invalid JSON content:', finalContent);
      throw new Error('Invalid JSON response from OpenAI');
    }
  } catch (error) {
    console.error('Error generating activities with OpenAI:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Vérifier s'il s'agit d'une erreur d'API OpenAI
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error Details:');
      console.error('Status:', error.status);
      console.error('Message:', error.message);
      console.error('Type:', error.type);
      console.error('Code:', error.code);
      console.error('Param:', error.param);
    }
    
    throw error; // Relancer l'erreur pour la gestion en amont
  }
}

/**
 * Fait une deuxième requête à OpenAI pour compléter les champs manquants
 * @param initialResponse Réponse initiale avec des champs manquants
 * @returns Réponse complétée
 */
async function fillMissingFields(initialResponse: OpenAIActivityResponse): Promise<OpenAIActivityResponse> {
  // Créer un prompt pour compléter les champs manquants
  const missingFieldsPrompt = `
Je t'ai précédemment demandé de générer des suggestions d'activités, et j'ai reçu ce JSON incomplet:

${JSON.stringify(initialResponse, null, 2)}

Certains champs sont manquants ou null. Peux-tu compléter uniquement les champs manquants (null) en faisant des recherches supplémentaires sur internet?
Garde exactement les mêmes activités, mais assure-toi que tous les champs obligatoires sont remplis.
Retourne le JSON complet avec les champs manquants remplis.
`;

  try {
    // Gérer la conversation avec OpenAI pour compléter les champs manquants
    const openaiModelToUse = OPENAI_MODEL;
    
    // Initialiser la conversation
    const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [{ 
      role: 'user', 
      content: `${missingFieldsPrompt}\n\nRéponds-moi avec un objet JSON bien formaté.` 
    }];
    
    // Gérer la conversation avec OpenAI, y compris les allers-retours pour les tool_calls
    let finalContent: string | null = null;
    let maxIterations = 10; // Augmenté de 5 à 10 pour permettre plus d'itérations et de réflexions
    
    for (let iteration = 0; iteration < maxIterations && !finalContent; iteration++) {
      console.log(`Fill missing fields - iteration ${iteration + 1}`);
      
      const response = await openai.chat.completions.create({
        model: openaiModelToUse,
        messages: messages,
        response_format: { type: 'json_object' },
        // Ne pas spécifier de température pour o3
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search for information on the web',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query',
                  },
                },
                required: ['query'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      });
      
      const aiMessage = response.choices[0].message;
      const finishReason = response.choices[0].finish_reason;
      
      // Ajouter le message de l'assistant à la conversation
      messages.push({
        role: aiMessage.role,
        content: aiMessage.content || '',
        tool_calls: aiMessage.tool_calls,
      });
      
      // Vérifier si l'IA a demandé d'utiliser un outil
      if (finishReason === 'tool_calls' && aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        console.log('Tool calls detected in fillMissingFields:', aiMessage.tool_calls.length);
        
        // Traiter chaque appel d'outil
        for (const toolCall of aiMessage.tool_calls) {
          if (toolCall.function.name === 'web_search') {
            // Extraire la requête de recherche
            const args = JSON.parse(toolCall.function.arguments);
            const query = args.query;
            console.log('Fill missing fields - search query:', query);
            
            // Simuler une réponse à la recherche
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Résultats de recherche pour "${query}". Voici des informations complémentaires qui pourraient aider à compléter les champs manquants: détails sur les horaires d'ouverture, prix, avis, coordonnées GPS, etc.`,
            });
          }
        }
      } else if (aiMessage.content) {
        // Si l'IA a répondu avec du contenu, on a terminé
        finalContent = aiMessage.content;
        console.log('Fill missing fields - final content received');
      } else {
        console.warn('No content and no tool calls in fillMissingFields response');
      }
    }
    
    if (!finalContent) {
      console.error('Failed to get a final response for fillMissingFields');
      return initialResponse; // Retourner la réponse initiale si échec
    }
    
    // Parser la réponse JSON
    const completedData = JSON.parse(finalContent) as OpenAIActivityResponse;
    return completedData;
    
  } catch (error) {
    console.error('Error filling missing fields with OpenAI:', error);
    // En cas d'erreur, retourner la réponse initiale incomplète
    return initialResponse;
  }
}

/**
 * Construit le prompt pour OpenAI en fonction des paramètres
 * @param params Paramètres pour la génération
 * @returns Prompt formaté
 */
function buildPrompt(params: GenerateActivityRequest): string {
  const { answers, location, weather, refine, excludeIds, datetime } = params;
  
  // Commencer le prompt avec l'introduction
  let prompt = `Tu es "Where2", un assistant IA spécialisé dans la recommandation d'activités en France.
  
Je viens d'annuler mon activité précédente: "${answers.canceled_activity || 'une activité'}".
`;

  // Ajouter le type d'activité si disponible
  if (answers.same_type !== undefined) {
    let preferenceText: string;
    switch(answers.same_type) {
      case PreferenceChoice.Yes:
        preferenceText = 'le même type d\'activité';
        break;
      case PreferenceChoice.No:
        preferenceText = 'un type d\'activité différent';
        break;
      case PreferenceChoice.Indifferent:
        preferenceText = 'n\'importe quel type d\'activité';
        break;
      default:
        preferenceText = 'le même type d\'activité'; // Valeur par défaut
    }
    prompt += `Je cherche ${preferenceText}.
`;
  }

  // Ajouter le budget
  if (answers.budget !== undefined) {
    if (answers.budget === 0) {
      prompt += `Je n'ai pas de budget (gratuit uniquement).
`;
    } else if (answers.budget === 100) {
      prompt += `Le budget n'est pas un problème pour moi.
`;
    } else {
      prompt += `Mon budget maximum est de ${answers.budget} euros.
`;
    }
  }

  // Ajouter le temps de trajet
  if (answers.travel_time !== undefined) {
    if (answers.travel_time === 5) {
      prompt += `Je souhaite une activité très proche (maximum 5 minutes de trajet).
`;
    } else if (answers.travel_time === 60) {
      prompt += `Je peux me déplacer jusqu'à 1 heure pour cette activité.
`;
    } else {
      prompt += `Je souhaite que le temps de trajet n'excède pas ${answers.travel_time} minutes.
`;
    }
  }

  // Ajouter le niveau d'énergie
  if (answers.energy_level !== undefined) {
    // Créer un texte descriptif selon le niveau d'énergie
    let energyText: string;
    switch(answers.energy_level) {
      case 1:
        energyText = "extrêmement faible (Je vais faire un malaise)";
        break;
      case 2:
        energyText = "très faible (Je suis épuisé(e))";
        break;
      case 3:
        energyText = "faible (Je manque d'énergie)";
        break;
      case 4:
        energyText = "moyen (Ça peut aller)";
        break;
      case 5:
        energyText = "bon (Je me sens bien)";
        break;
      case 6:
        energyText = "très bon (J'ai la pêche)";
        break;
      case 7:
        energyText = "excellent (Je suis en pleine forme)";
        break;
      default:
        energyText = "moyen";
    }
    
    // Convertir aussi l'échelle 1-7 du frontend en échelle 1-10 pour le prompt
    const energyLevelMapped = Math.round((answers.energy_level / 7) * 10);
    prompt += `Mon niveau d'énergie est ${energyText}, soit ${energyLevelMapped}/10.
`;
  }

  // Ajouter le temps disponible
  if (answers.available_time !== undefined) {
    // Formater le temps disponible en heures et minutes si nécessaire
    if (answers.available_time < 60) {
      prompt += `J'ai ${answers.available_time} minutes de temps libre disponible.
`;
    } else {
      const hours = Math.floor(answers.available_time / 60);
      const minutes = answers.available_time % 60;
      if (minutes === 0) {
        prompt += `J'ai ${hours} heure${hours > 1 ? 's' : ''} de temps libre disponible.
`;
      } else {
        prompt += `J'ai ${hours} heure${hours > 1 ? 's' : ''} et ${minutes} minute${minutes > 1 ? 's' : ''} de temps libre disponible.
`;
      }
    }
  }

  // Ajouter les critères de raffinement si nécessaire
  if (refine) {
    if (answers.participants_count !== undefined) {
      const participantsText = answers.participants_count >= 5 ? "5 ou plus" : answers.participants_count.toString();
      prompt += `Nous sommes ${participantsText} participant${answers.participants_count > 1 ? 's' : ''}.
`;
    }
    
    if (answers.indoor_preference !== undefined) {
      let indoorText: string;
      switch(answers.indoor_preference) {
        case EnvironmentPreference.Indoor:
          indoorText = "en intérieur";
          break;
        case EnvironmentPreference.Outdoor:
          indoorText = "en extérieur";
          break;
        case EnvironmentPreference.Indifferent:
          indoorText = "peu importe si c'est en intérieur ou en extérieur";
          break;
        default:
          indoorText = "peu importe si c'est en intérieur ou en extérieur";
      }
      prompt += `Je préfère une activité ${indoorText}.
`;
    }
    
    if (answers.authentic_preference !== undefined) {
      let authenticText: string;
      switch(answers.authentic_preference) {
        case ExperienceType.Authentic:
          authenticText = "plutôt authentique";
          break;
        case ExperienceType.Touristic:
          authenticText = "plutôt touristique";
          break;
        case ExperienceType.Indifferent:
          authenticText = "peu importe si c'est authentique ou touristique";
          break;
        default:
          authenticText = "peu importe si c'est authentique ou touristique";
      }
      prompt += `Je préfère une expérience ${authenticText}.
`;
    }
    
    if (answers.temporary_preference !== undefined) {
      let temporaryText: string;
      switch(answers.temporary_preference) {
        case EventPermanence.Ephemeral:
          temporaryText = "un événement éphémère";
          break;
        case EventPermanence.Permanent:
          temporaryText = "une activité permanente";
          break;
        case EventPermanence.Indifferent:
          temporaryText = "peu importe si c'est éphémère ou permanent";
          break;
        default:
          temporaryText = "peu importe si c'est éphémère ou permanent";
      }
      prompt += `Je préfère ${temporaryText}.
`;
    }
    
    if (excludeIds && excludeIds.length > 0) {
      prompt += `Exclus les activités avec les IDs suivants: ${excludeIds.join(', ')}.
`;
    }
    
    prompt += 'Propose-moi de nouvelles suggestions différentes des précédentes.\n';
  }

  // Ajouter des informations sur la météo
  prompt += `
La météo actuelle à ma position est: ${weather.description}, température de ${weather.temperature}°C, ressenti ${weather.feels_like}°C, humidité ${weather.humidity}%, vent ${weather.wind_speed} m/s.
`;

  // Ajouter des informations sur la date et l'heure actuelles
  if (datetime) {
    prompt += `
Aujourd'hui nous sommes ${datetime.day} ${datetime.date}, il est actuellement ${datetime.time}.`;
    
    if (datetime.isWeekend) {
      prompt += ` C'est le weekend.`;
    }
    
    if (datetime.isHoliday) {
      prompt += ` C'est un jour férié.`;
    }
    
    prompt += `
`;
  }

  // Ajouter des instructions pour le format de réponse
  prompt += `
Ma position actuelle est: latitude ${location.lat}, longitude ${location.lng}.

Cherche sur internet des activités qui correspondent à mes critères près de ma position actuelle.
Tiens compte de l'heure et du jour actuels pour tes suggestions (horaires d'ouverture, activités appropriées pour ce moment de la journée).
Retourne exactement 3 activités différentes sous forme de JSON selon ce format:

{
  "activities": [
    {
      "id": "act_XX", // Un identifiant unique par activité (act_01, act_02, act_03)
      "title": "Titre de l'activité",
      "description": "Description détaillée de l'activité",
      "price_eur": 0, // Prix en euros, ou 0 si gratuit
      "duration_min": 0, // Durée minimum estimée en minutes
      "duration_max": 0, // Durée maximum estimée en minutes
      "location": {
        "name": "Nom du lieu",
        "address": "Adresse complète",
        "lat": 0.0, // Latitude du lieu
        "lng": 0.0 // Longitude du lieu
      },
      "distance_m": null, // Laisse null, sera calculé par le backend
      "estimated_travel_time": null, // Laisse null, sera calculé par le backend
      "travel_type": null, // Laisse null, sera calculé par le backend
      "indoor": true/false, // Indique si l'activité est en intérieur
      "authentic": true/false, // Indique si l'activité est authentique ou touristique
      "temporary": true/false, // Indique si c'est un événement temporaire
      "tags": ["tag1", "tag2"], // Liste de tags pertinents
      "rating_google": 0.0, // Note Google si disponible, ou null
      "reviews_count": 0, // Nombre d'avis, ou null si non disponible
      "image_url": null, // Toujours mettre null, les images seront ajoutées par le backend
      "external_url": "URL externe", // URL du site ou Google Maps, ou null
      "is_free": true/false, // Indique si l'activité est gratuite
      "is_student_free": true/false, // Indique si gratuit pour étudiants
      "language": "fr", // Langue principale de l'activité
      "open_hours": [ // Heures d'ouverture, ou null si non applicable
        {
          "day": "Lundi", // Jour de la semaine en français, avec majuscule
          "open": "09:00", // Heure d'ouverture au format HH:MM
          "close": "18:00" // Heure de fermeture au format HH:MM
        }
        // Répète pour chaque jour ou utilise un format plus général comme "Tous les jours"
        // Si fermé un jour, utilise "fermé" pour open et close
        // Exemple: { "day": "Lundi", "open": "fermé", "close": "fermé" }
      ],
      "date_special": "2023-06-15 14:00-16:00", // Pour événements ponctuels, ou null
      "organizer": { // Organisateur, ou null si non applicable
        "type": "association/entreprise/etc",
        "name": "Nom de l'organisateur"
      }
    }
  ],
  "note": x, // Auto-évaluation de 1 à 10 de la qualité de ta réponse
  "note_reasons": "Explication de ta note" // Pourquoi tu t'es donné cette note
}

IMPORTANT:
1. Pour le champ 'image_url', mets TOUJOURS 'null'. Les images seront ajoutées par le backend.
2. Les heures d'ouverture (open_hours) doivent respecter EXACTEMENT le format indiqué avec:
   - "day" contenant le jour de la semaine en français avec majuscule
   - "open" et "close" au format HH:MM (ex: "09:00", "21:30") ou "fermé" si le lieu est fermé ce jour
3. Assure-toi que tous les champs obligatoires sont remplis avec des valeurs valides et correctement formatées.
4. Si une information n'est pas disponible, utilise 'null' et non une chaîne vide ou d'autres valeurs.
5. Garantis que toutes les activités suggérées correspondent aux contraintes spécifiées (budget, distance, etc.).
6. N'invente pas d'informations. Si tu ne trouves pas une donnée, indique null pour ce champ.
7. Vérifie que ta réponse est un JSON valide et conforme au schéma demandé.

Assure-toi que toutes les activités sont réelles et actuellement disponibles, et qu'elles correspondent bien aux critères fournis.
`;

  return prompt;
}

/**
 * Vérifie si des champs importants sont manquants dans les activités
 * @param activities Liste des activités à vérifier
 * @returns Vrai si des champs sont manquants
 */
function checkForMissingFields(activities: Activity[]): boolean {
  // Liste des champs importants qui ne devraient pas être null
  const importantFields = [
    'title',
    'description',
    'price_eur',
    'duration_min',
    'duration_max',
    'location',
    'indoor',
    'authentic',
    'temporary',
    'tags',
    'is_free',
    'is_student_free'
  ];
  
  for (const activity of activities) {
    for (const field of importantFields) {
      if (field === 'location') {
        // Vérifier les champs de localisation
        if (!activity.location || !activity.location.name || !activity.location.address || 
            activity.location.lat === null || activity.location.lng === null) {
          return true;
        }
      } else if ((activity as any)[field] === null || (activity as any)[field] === undefined) {
        return true;
      }
    }
  }
  
  return false;
} 