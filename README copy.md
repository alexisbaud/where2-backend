Url de l'api : 

# Documentation API

### Endpoints disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/healthz` | Vérification de l'état du serveur |
| POST | `/suggest-o3` | Génération de suggestions d'activités (modèle o3) |
| GET | `/activity/:id` | Récupération des détails d'une activité spécifique |

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

### 2. Génération de suggestions d'activités

```
POST /suggest-o3
```

**Corps de la requête** :
```json
{
  "answers": {
    "canceled_activity": "Visite du Louvre",
    "same_type": "yes",
    "budget": 20,
    "travel_time": 30,
    "energy_level": 7,
    "available_time": 120,
    "participants_count": 2,
    "indoor_preference": "indoor",
    "authentic_preference": "authentic",
    "temporary_preference": "temporary"
  },
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "refine": false,
  "excludeIds": []
}
```

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
  ],
  "note": 8,
  "note_reasons": "Les suggestions correspondent bien aux critères spécifiés."
}
```

### 3. Récupération des détails d'une activité

```
GET /activity/:id
```

**Paramètres**:
- `id`: Identifiant unique de l'activité (ex: act_01)

**Réponse réussie**:
```json
{
  "id": "act_01",
  "title": "Balade au Jardin du Luxembourg",
  "description": "Profitez d'une promenade dans l'un des plus beaux jardins de Paris...",
  // Tous les autres champs de l'activité
}
```

## Spécificités techniques

- **Modèles IA**: Le service utilise deux options pour générer des recommandations:
  - `/suggest-o3` utilise spécifiquement le modèle o3 d'OpenAI

- **Services intégrés**:
  - OpenWeatherMap: Récupération des données météo
  - Google Maps API: Calcul des distances et temps de trajet
  - OpenAI API: Génération des recommandations d'activités

- **Stockage**: Les activités générées sont temporairement stockées en mémoire pour permettre leur récupération via l'endpoint `/activity/:id`

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
