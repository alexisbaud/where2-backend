/**
 * Utilitaires pour la gestion des dates et des heures
 */

// Jours de la semaine en français
const DAYS_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi'
];

// Jours fériés en France pour l'année en cours (à mettre à jour chaque année)
// Format: MM-DD (sans l'année)
const HOLIDAYS_FR = [
  '01-01', // Jour de l'an
  '04-01', // Lundi de Pâques (2024)
  '05-01', // Fête du travail
  '05-08', // Victoire 1945
  '05-09', // Ascension (2024)
  '05-20', // Lundi de Pentecôte (2024)
  '07-14', // Fête nationale
  '08-15', // Assomption
  '11-01', // Toussaint
  '11-11', // Armistice
  '12-25'  // Noël
];

/**
 * Vérifie si la date donnée est un jour férié en France
 * @param date Date à vérifier
 * @returns true si c'est un jour férié
 */
function isHoliday(date: Date): boolean {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${month}-${day}`;
  return HOLIDAYS_FR.includes(dateString);
}

/**
 * Vérifie si la date donnée est un weekend (samedi ou dimanche)
 * @param date Date à vérifier
 * @returns true si c'est un weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = dimanche, 6 = samedi
}

/**
 * Récupère les informations de date et d'heure actuelles
 * @param datetimeString Chaîne de date au format ISO (YYYY-MM-DDTHH:mm:ss), optionnelle
 * @returns Objet contenant les informations formatées
 */
export function getDatetimeInfo(datetimeString?: string) {
  // Utiliser la date fournie ou la date actuelle
  const now = datetimeString ? new Date(datetimeString) : new Date();
  
  // Formater la date (YYYY-MM-DD)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  
  // Formater l'heure (HH:MM)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;
  
  // Récupérer le jour de la semaine en français
  const dayOfWeek = DAYS_FR[now.getDay()];
  
  return {
    date,
    time,
    day: dayOfWeek,
    isHoliday: isHoliday(now),
    isWeekend: isWeekend(now)
  };
}

/**
 * Récupère les informations de date et d'heure pour une date spécifique
 * @param dateString Chaîne de date au format ISO (YYYY-MM-DD)
 * @param timeString Chaîne d'heure au format HH:MM
 * @returns Objet contenant les informations formatées
 */
export function getDatetimeInfoForDate(dateString: string, timeString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const date = new Date(year, month - 1, day, hours, minutes);
  
  return {
    date: dateString,
    time: timeString,
    day: DAYS_FR[date.getDay()],
    isHoliday: isHoliday(date),
    isWeekend: isWeekend(date)
  };
} 