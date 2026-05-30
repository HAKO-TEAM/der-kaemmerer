import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artikelSchema = z.object({
  title:        z.string(),
  beschreibung: z.string(),
  ressort:      z.enum(['haushalt','einnahmen','ausgaben','praxis','recht','analyse']),
  datum:        z.string(),
  minuten:      z.number(),
  autor:        z.string().default('Redaktion'),
  tag:          z.enum(['neu','exklusiv','analyse','gastbeitrag']).optional(),
  featured:     z.boolean().default(false),
});

const mkCol = (pattern) => defineCollection({
  loader: glob({ pattern, base: './src/content' }),
  schema: artikelSchema,
});

export const collections = {
  haushalt:  mkCol('haushalt/*.md'),
  einnahmen: mkCol('einnahmen/*.md'),
  ausgaben:  mkCol('ausgaben/*.md'),
  praxis:    mkCol('praxis/*.md'),
  recht:     mkCol('recht/*.md'),
  analyse:   mkCol('analyse/*.md'),
};
