// Types et interfaces TypeScript pour les structures de données de l'application
import { z } from 'zod';

// Schémas Zod pour validation
export const LocationSchema = z.object({
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export const OpenHoursSchema = z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
});

export const OrganizerSchema = z.object({
  type: z.string(),
  name: z.string(),
});

export const ActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price_eur: z.number(),
  duration_min: z.number().int(),
  duration_max: z.number().int(),
  location: LocationSchema,
  distance_m: z.number().int().nullable(),
  estimated_travel_time: z.number().int().nullable(),
  travel_type: z.number().int().nullable(),
  indoor: z.boolean(),
  authentic: z.boolean(),
  temporary: z.boolean(),
  tags: z.array(z.string()),
  rating_google: z.number().nullable(),
  reviews_count: z.number().nullable(),
  image_url: z.string().nullable(),
  external_url: z.string().nullable(),
  is_free: z.boolean(),
  is_student_free: z.boolean(),
  language: z.string().nullable(),
  open_hours: z.array(OpenHoursSchema).nullable(),
  date_special: z.string().nullable(),
  organizer: OrganizerSchema.nullable(),
});

export const SuggestResponseSchema = z.object({
  activities: z.array(ActivitySchema),
  note: z.number().int().min(1).max(10),
  note_reasons: z.string(),
});

export const SuggestRequestSchema = z.object({
  answers: z.object({
    canceled_activity: z.string(),
    same_type: z.boolean(),
    budget: z.number().optional(),
    travel_time: z.number().optional(),
    energy_level: z.number().optional(),
    available_time: z.number().optional(),
    participants_count: z.number().optional(),
    indoor_preference: z.boolean().optional(),
    authentic_preference: z.boolean().optional(),
    temporary_preference: z.boolean().optional(),
  }).catchall(z.any()),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  refine: z.boolean().optional(),
  excludeIds: z.array(z.string()).optional(),
});

// Types TypeScript dérivés des schémas Zod
export type Location = z.infer<typeof LocationSchema>;
export type OpenHours = z.infer<typeof OpenHoursSchema>;
export type Organizer = z.infer<typeof OrganizerSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type SuggestResponse = z.infer<typeof SuggestResponseSchema>;
export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;
