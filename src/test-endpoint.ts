// Script de test pour l'endpoint /suggest
import axios from 'axios';

async function testSuggestEndpoint() {
  console.log('== Test de l\'endpoint /suggest ==');
  
  const testData = {
    answers: {
      canceled_activity: "visite au musée",
      same_type: "no", 
      budget: 20,
      travel_time: 30,
      energy_level: 7,
      available_time: 120,
      participants_count: 2,
      indoor_preference: "outdoor",
      authentic_preference: "authentic",
      temporary_preference: "permanent"
    },
    location: {
      lat: 48.8566,
      lng: 2.3522
    },
    refine: true,
    excludeIds: ["act_01", "act_02", "act_03"]
  };
  
  try {
    console.log('Envoi d\'une requête à http://localhost:3000/suggest');
    console.log('Données:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:3000/suggest', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 secondes
    });
    
    console.log('✅ Réponse reçue avec succès:');
    console.log('Status:', response.status);
    console.log('Activities reçues:', response.data.activities?.length || 0);
    console.log('Premier élément:', response.data.activities?.[0] || 'Aucune activité');
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Erreur lors de la requête:', error.message);
      
      if (error.response) {
        // La requête a été effectuée et le serveur a répondu avec un statut en dehors de 2xx
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        // La requête a été effectuée mais aucune réponse n'a été reçue
        console.error('Aucune réponse reçue');
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        console.error('Erreur de configuration:', error.message);
      }
    } else if (error instanceof Error) {
      console.error('❌ Erreur non liée à Axios:', error.message);
    } else {
      console.error('❌ Erreur inconnue:', error);
    }
  }
}

console.log('Démarrage du test...');
testSuggestEndpoint().catch(console.error); 