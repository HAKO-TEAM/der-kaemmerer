import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  jobs: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
    schema: z.object({
      title:             z.string(),
      organisation:      z.string(),
      orgtyp:            z.string(),
      ort:               z.string(),
      bundesland:        z.string(),
      entgelt:           z.string(),
      beschaeftigung:    z.string().default('Vollzeit'),
      befristung:        z.string().default('Unbefristet'),
      startdatum:        z.string().optional(),
      bewerbungsschluss: z.string(),
      bewerbungslink:    z.string(),
      schlagwoerter:     z.array(z.string()).optional(),
      paket:             z.enum(['Basis', 'Premium', 'Exklusiv']).default('Basis'),
      aktiv:             z.boolean().default(true),
      datum:             z.string(),
      featured:          z.boolean().default(false),
      logo:              z.string().optional(),
    }),
  }),
};
