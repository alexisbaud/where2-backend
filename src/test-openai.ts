// Script de test pour vérifier l'intégration avec OpenAI
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testOpenAI() {
  console.log('== Test d\'intégration OpenAI ==');
  
  // Vérifier si la clé API est présente
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Erreur: La clé API OpenAI est manquante dans le fichier .env');
    return;
  }
  
  console.log('✅ Clé API OpenAI trouvée dans .env');
  const obfuscatedKey = `${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`;
  console.log(`Clé API: ${obfuscatedKey}`);
  
  // Créer le client OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Tester plusieurs modèles
  const testModels = [
    'gpt-4.1',      // Modèle spécifié dans l'application
    'gpt-4.0',      // Alternative 1
    'gpt-4',        // Alternative 2
    'gpt-4o',       // Alternative 3
    'gpt-4o-mini',  // Alternative 4 - plus léger
    'gpt-3.5-turbo' // Alternative 5 - encore plus léger
  ];
  
  for (const model of testModels) {
    try {
      console.log(`\nTest du modèle: ${model}`);
      console.log('Envoi d\'une requête simple...');
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Bonjour, peux-tu me dire quel modèle es-tu?' }],
        temperature: 0.7,
      });
      
      console.log('✅ Réponse reçue de OpenAI');
      console.log('Modèle utilisé:', response.model);
      console.log('Réponse:', response.choices[0].message.content);
      console.log('Finish reason:', response.choices[0].finish_reason);
      console.log('Tokens utilisés:', response.usage?.total_tokens || 'N/A');
    } catch (error) {
      console.error(`❌ Erreur avec le modèle ${model}:`, error);
      if (error instanceof OpenAI.APIError) {
        console.error('Type d\'erreur:', error.type);
        console.error('Message d\'erreur:', error.message);
        console.error('Code d\'erreur:', error.code);
        console.error('Status:', error.status);
      }
    }
  }
  
  // Tester spécifiquement le cas d'utilisation avec la recherche web
  try {
    console.log('\n\nTest avec web_search (comme dans l\'application)');
    const chosenModel = 'gpt-4o'; // On utilise gpt-4o qui est connu pour supporter web_search
    
    console.log(`Envoi d'une requête avec web_search sur le modèle ${chosenModel}...`);
    
    const response = await openai.chat.completions.create({
      model: chosenModel,
      messages: [{ role: 'user', content: 'Quels sont les musées populaires à Paris?' }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
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
    
    console.log('✅ Réponse reçue de OpenAI avec web_search');
    console.log('Modèle utilisé:', response.model);
    if (response.choices[0].message.tool_calls) {
      console.log('Tool calls détectés:', response.choices[0].message.tool_calls.length);
      response.choices[0].message.tool_calls.forEach((call, index) => {
        console.log(`Tool call #${index + 1}:`, call.function.name);
        console.log('Arguments:', call.function.arguments);
      });
    } else {
      console.log('Pas de tool calls détectés');
      console.log('Contenu de la réponse:', response.choices[0].message.content);
    }
  } catch (error) {
    console.error('❌ Erreur avec web_search:', error);
    if (error instanceof OpenAI.APIError) {
      console.error('Type d\'erreur:', error.type);
      console.error('Message d\'erreur:', error.message);
      console.error('Code d\'erreur:', error.code);
      console.error('Status:', error.status);
    }
  }
}

testOpenAI().catch(console.error); 