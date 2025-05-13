// Service pour interagir avec l'API météo OpenWeatherMap
import axios from 'axios';
import { env } from '../config';

export interface WeatherData {
  description: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  is_rainy: boolean;
  is_snowy: boolean;
}

/**
 * Récupère les données météo courantes pour une localisation donnée
 * @param lat Latitude
 * @param lon Longitude
 * @returns Données météo formatées
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    console.log(`Fetching weather data for location: lat=${lat}, lon=${lon}`);
    console.log(`Using OpenWeatherMap API key: ${env.WEATHER_API_KEY.substring(0, 3)}...${env.WEATHER_API_KEY.substring(env.WEATHER_API_KEY.length - 3)}`);
    
    const url = `https://api.openweathermap.org/data/2.5/weather`;
    console.log(`Making request to: ${url}`);
    
    const params = {
      lat,
      lon,
      appid: env.WEATHER_API_KEY,
      units: 'metric', // Pour obtenir la température en Celsius
      lang: 'fr'       // Pour obtenir les descriptions en français
    };
    
    console.log('Request params:', { ...params, appid: '***hidden***' });
    
    const response = await axios.get(url, { params });
    
    console.log('Weather API response status:', response.status);
    console.log('Weather API response headers:', response.headers);
    console.log('Weather data received (truncated):', JSON.stringify(response.data).substring(0, 300) + '...');
    
    const data = response.data;
    
    // Vérifier si les conditions sont pluvieuses ou neigeuses
    const isRainy = data.weather.some((w: any) => 
      w.main === 'Rain' || w.main === 'Drizzle' || w.main === 'Thunderstorm'
    );
    
    const isSnowy = data.weather.some((w: any) => 
      w.main === 'Snow'
    );
    
    const weatherData: WeatherData = {
      description: data.weather[0].description,
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      is_rainy: isRainy,
      is_snowy: isSnowy
    };
    
    console.log('Formatted weather data:', weatherData);
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:');
      console.error('Status:', error.response?.status);
      console.error('Status text:', error.response?.statusText);
      console.error('Response data:', error.response?.data);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      console.error('Request params:', error.config?.params);
    }
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 