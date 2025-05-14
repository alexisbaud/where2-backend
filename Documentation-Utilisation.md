Url de l'api : where2-backend-production.up.railway.app

# Documentation API Where2

Cette documentation est destinée aux développeurs frontend qui souhaitent intégrer l'API Where2 dans leur application. Elle contient toutes les informations nécessaires pour effectuer des appels API et traiter les réponses.

## Endpoints disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/healthz` | Vérification de l'état du serveur |
| POST | `/suggest-41` | Génération de suggestions d'activités (modèle gpt-4.1) |
| POST | `/suggest-o3` | Génération de suggestions d'activités (modèle o3) |
| GET | `/activity/:id` | Récupération des détails d'une activité spécifique |

## Détails des endpoints

### 1. Vérification de santé

```
GET /healthz
```

**Réponse réussie** : 
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

**Utilisation** : À utiliser pour vérifier que l'API est en ligne avant d'effectuer des appels. Utile pour implémenter une logique de retry ou de fallback.

### 2. Génération de suggestions d'activités

```
POST /suggest-41
POST /suggest-o3
```

Les deux routes fournissent des fonctionnalités similaires mais utilisent des modèles d'IA différents:
- `/suggest-41` utilise le modèle gpt-4.1 d'OpenAI (plus précis mais légèrement plus lent)
- `/suggest-o3` utilise le modèle o3 d'OpenAI (plus rapide, recommandé en production)

**Corps de la requête** :
```json
{
  "answers": {
    "canceled_activity": "Visite du Louvre",
    "same_type": true,
    "budget": 20,
    "travel_time": 30,
    "energy_level": 7,
    "available_time": 120,
    "participants_count": 2,
    "indoor_preference": true,
    "authentic_preference": true,
    "temporary_preference": false
  },
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "datetime": "2023-06-15T14:30:00",
  "refine": false,
  "excludeIds": []
}
```

**Description des champs**:

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `canceled_activity` | string | Oui | Activité annulée qui sert de référence pour les suggestions |
| `same_type` | boolean | Oui | `true` pour chercher le même type d'activité, `false` pour un type différent |
| `budget` | number | Non | Budget maximum en euros pour l'activité |
| `travel_time` | number | Non | Temps de trajet maximum accepté en minutes |
| `energy_level` | number | Non | Niveau d'énergie de l'utilisateur sur une échelle de 1 à 10 |
| `available_time` | number | Non | Temps disponible en minutes |
| `participants_count` | number | Non | Nombre de participants |
| `indoor_preference` | boolean | Non | `true` pour une activité en intérieur, `false` pour extérieur |
| `authentic_preference` | boolean | Non | `true` pour une activité authentique, `false` pour touristique |
| `temporary_preference` | boolean | Non | `true` pour un événement temporaire, `false` pour lieu permanent |
| `location.lat` | number | Oui | Latitude de la position de l'utilisateur |
| `location.lng` | number | Oui | Longitude de la position de l'utilisateur |
| `datetime` | string | Non | Date et heure locales au format ISO 8601 (YYYY-MM-DDTHH:mm:ss) |
| `refine` | boolean | Non | `true` pour affiner des résultats précédents, `false` par défaut |
| `excludeIds` | string[] | Non | Liste d'IDs d'activités à exclure des suggestions |

**Temps de réponse moyen** : 
- `/suggest-41` : 20-40 secondes
- `/suggest-o3` : 50-70 secondes

**Réponse réussie** :
```json
{
  "activities": [
    {
      "id": "act_01",
      "title": "Balade au Jardin du Luxembourg",
      "description": "Profitez d'une promenade dans l'un des plus beaux jardins de Paris...",
      "price_eur": 0,
      "duration_min": 60,
      "duration_max": 120,
      "location": {
        "name": "Jardin du Luxembourg",
        "address": "Rue de Médicis, 75006 Paris",
        "lat": 48.8462,
        "lng": 2.3372
      },
      "distance_m": 1500,
      "estimated_travel_time": 15,
      "travel_type": "walking",
      "indoor": false,
      "authentic": true,
      "temporary": false,
      "tags": ["nature", "promenade", "gratuit"],
      "rating_google": 4.7,
      "reviews_count": 43000,
      "image_url": "https://example.com/jardin.jpg",
      "external_url": "https://maps.google.com/...",
      "is_free": true,
      "is_student_free": true,
      "language": "fr",
      "open_hours": [
        {
          "day": "Lundi",
          "open": "07:30",
          "close": "21:30"
        }
      ],
      "date_special": null,
      "organizer": null
    }
    // 2 autres activités...
  ],
  "note": 8,
  "note_reasons": "Les suggestions correspondent bien aux critères spécifiés."
}
```

**Description des champs de la réponse**:

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique de l'activité |
| `title` | Titre court de l'activité |
| `description` | Description détaillée |
| `price_eur` | Prix en euros (0 si gratuit) |
| `duration_min` | Durée minimale en minutes |
| `duration_max` | Durée maximale en minutes |
| `location` | Informations sur le lieu (nom, adresse, coordonnées) |
| `distance_m` | Distance en mètres depuis la position de l'utilisateur |
| `estimated_travel_time` | Temps de trajet estimé en minutes |
| `travel_type` | Type de transport recommandé: 1 = marche, 2 = vélo, 3 = transport en commun, 4 = voiture |
| `indoor` | Si l'activité est en intérieur (`true`) ou extérieur (`false`) |
| `authentic` | Si l'activité est authentique (`true`) ou touristique (`false`) |
| `temporary` | Si c'est un événement temporaire (`true`) ou un lieu permanent (`false`) |
| `tags` | Liste de tags caractérisant l'activité |
| `is_free` | Si l'activité est gratuite |
| `is_student_free` | Si l'entrée est gratuite pour les étudiants |
| `note` | Auto-évaluation de l'IA sur la qualité des suggestions (1-10) |
| `note_reasons` | Explication de la note donnée |

### 3. Récupération des détails d'une activité

```
GET /activity/:id
```

**Paramètres**:
- `id`: Identifiant unique de l'activité (ex: act_01)

**Réponse réussie**:
Même format qu'une activité individuelle dans la réponse de suggestion.

## Bonnes pratiques d'intégration

### Gestion des temps de réponse

Les routes de suggestion peuvent prendre plusieurs secondes pour répondre. Il est recommandé de:

1. Afficher un écran de chargement ou une animation pendant l'attente
2. Implémenter un timeout côté client (15-20 secondes)
3. Avoir une stratégie de retry en cas d'échec

### Flux d'utilisation recommandé

1. **Collecte des préférences utilisateur**:
   - Posez les questions à l'utilisateur de manière conversationnelle
   - Collectez au minimum: activité annulée, même type ou différent, budget

2. **Premier appel API**:
   - Utilisez `/suggest-o3` avec les préférences de base
   - Affichez les 3 suggestions à l'utilisateur

3. **Affinage si nécessaire**:
   - Si aucune suggestion ne convient, collectez des préférences supplémentaires
   - Utilisez `/suggest-o3` avec `refine: true` et les nouvelles préférences
   - Incluez les IDs des activités précédentes dans `excludeIds`

4. **Détails d'une activité**:
   - Quand l'utilisateur sélectionne une activité, utilisez `/activity/:id`
   - Affichez les détails complets de l'activité

### Exemples de code

**Exemple React avec Fetch API**:

```javascript
// Fonction pour obtenir des suggestions
async function getSuggestions(userPreferences, userLocation) {
  try {
    const response = await fetch('https://where2-backend-production.up.railway.app/suggest-o3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: {
          canceled_activity: userPreferences.canceledActivity,
          same_type: userPreferences.sameType,
          budget: userPreferences.budget,
          // Autres préférences...
        },
        location: userLocation,
        datetime: new Date().toISOString(), // Date et heure locales de l'utilisateur
      }),
    });
    
    if (!response.ok) {
      throw new Error('Erreur réseau ou serveur');
    }
    
    const data = await response.json();
    return data.activities;
  } catch (error) {
    console.error('Erreur lors de la récupération des suggestions:', error);
    throw error;
  }
}
```

## Gestion des erreurs

Toutes les routes peuvent retourner les codes d'erreur suivants:

| Code | Description |
|------|-------------|
| 400 | Requête invalide (format incorrect, données manquantes) |
| 404 | Ressource non trouvée |
| 500 | Erreur interne du serveur |

**Exemple de réponse d'erreur**:
```json
{
  "error": "Invalid request format",
  "details": { /* détails de l'erreur */ }
}
```

**Recommandations pour la gestion des erreurs**:
- Implémenter un système de retry pour les erreurs 500 (maximum 2 tentatives)
- Afficher un message clair à l'utilisateur en cas d'échec
- Proposer une action alternative (recherche manuelle, etc.)

## Limites d'utilisation

- Maximum 100 requêtes par heure par IP
- Maximum 3 activités retournées par requête
- Les coordonnées GPS doivent être valides (en France pour ce MVP)
- Temps de requête maximum: 20 secondes

## Spécificités techniques

- **Modèles IA**: Le service utilise deux modèles différents pour générer des recommandations:
  - `/suggest-41` utilise le modèle gpt-4.1 d'OpenAI
  - `/suggest-o3` utilise le modèle o3 d'OpenAI

- **Contexte pris en compte** dans les suggestions:
  - **Préférences utilisateur**: données fournies par le frontend
  - **Localisation**: coordonnées GPS de l'utilisateur
  - **Météo**: conditions météorologiques actuelles
  - **Date et heure**: le système prend en compte le jour de la semaine, l'heure, et si c'est un jour férié ou un weekend pour suggérer des activités adaptées (ouvertes à ce moment-là, appropriées selon l'horaire). La date et l'heure peuvent être fournies par le frontend via le paramètre `datetime`, sinon le système utilise la date et l'heure du serveur par défaut.

- **Services intégrés**:
  - OpenWeatherMap: Récupération des données météo
  - Google Maps API: Calcul des distances et temps de trajet
  - OpenAI API: Génération des recommandations d'activités
