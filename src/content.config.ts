import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artikel = z.object({
  title: z.string(),
  beschreibung: z.string().optional(),
  ressort: z.string().optional(),
  datum: z.string().optional(),
  minuten: z.number().optional(),
  autor: z.string().optional(),
  tag: z.string().optional(),
  featured: z.boolean().optional(),
});

export const collections = {
  // ── Redaktionelle Ressorts ──────────────────────────────
  haushalt:     defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/haushalt' }),     schema: artikel }),
  einnahmen:    defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/einnahmen' }),    schema: artikel }),
  ausgaben:     defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/ausgaben' }),     schema: artikel }),
  praxis:       defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/praxis' }),       schema: artikel }),
  recht:        defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/recht' }),        schema: artikel }),
  analyse:      defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/analyse' }),      schema: artikel }),
  sozialkosten: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/sozialkosten' }), schema: artikel }),

  // ── Stellenbörse ────────────────────────────────────────
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
      paket:             z.enum(['Basis', 'Premium', 'Exklusiv', 'KommunalFlat']).default('Basis'),
      aktiv:             z.boolean().default(true),
      datum:             z.string(),
      featured:          z.boolean().default(false),
      logo:              z.string().optional(),
    }),
  }),
};
