import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false; // Server-Route

// ── Slug generieren ─────────────────────────────────────
function makeSlug(title: string, org: string): string {
  const clean = (s: string) => s
    .toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const year = new Date().getFullYear();
  return `${clean(title)}-${clean(org)}-${year}`;
}

// ── Markdown-Inhalt erzeugen ────────────────────────────
function buildMarkdown(d: Record<string, string>): string {
  const slug = makeSlug(d.stellentitel || 'stelle', d.behoerde || 'kommune');
  const tags = (d.schlagwoerter || '')
    .split(',').map(t => t.trim()).filter(Boolean)
    .map(t => `"${t}"`).join(', ');

  return `---
title: "${d.stellentitel}"
organisation: "${d.behoerde}"
orgtyp: "${d.orgtyp || 'Kommune'}"
ort: "${d.ort}"
bundesland: "${d.bundesland}"
entgelt: "${d.entgelt}"
beschaeftigung: "${d.beschaeftigung || 'Vollzeit'}"
befristung: "${d.befristung || 'Unbefristet'}"
startdatum: "${d.startdatum || 'zum nächstmöglichen Zeitpunkt'}"
bewerbungsschluss: "${d.bewerbungsschluss}"
bewerbungslink: "${d.bewerbungslink}"
schlagwoerter: [${tags || '"Kommunalverwaltung", "TVöD"'}]
paket: "${d.paket?.split(' – ')[0] || 'Basis'}"
aktiv: false
datum: "${new Date().toISOString().split('T')[0]}"
featured: false
---

${d.kurzbeschreibung || ''}

## Ihre Aufgaben

${(d.aufgaben || '').split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}

## Ihr Profil

${(d.anforderungen || '').split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}

${d.wirbieten ? `## Wir bieten\n\n${d.wirbieten.split('\n').filter(Boolean).map(l => `- ${l.replace(/^[-•]\s*/,'')}`).join('\n')}` : ''}

${d.logo_link ? `**Logo:** [${d.logo_link}](${d.logo_link})` : ''}

*Eingereicht von: ${d.kontaktname} · ${d.kontaktemail}${d.kontakttel ? ' · ' + d.kontakttel : ''}*
`;
}

// ── GitHub-Datei anlegen ────────────────────────────────
async function createGitHubFile(slug: string, content: string, env: Record<string, string | undefined>) {
  const token   = env.GITHUB_TOKEN;
  const owner   = env.GITHUB_OWNER   || 'HAKO-TEAM';
  const repo    = env.GITHUB_REPO    || 'der-kaemmerer';
  const path    = `src/content/jobs/${slug}.md`;
  const encoded = Buffer.from(content, 'utf8').toString('base64');

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // SHA holen falls Datei bereits existiert
  const existing = await fetch(url, { headers });
  const sha = existing.ok ? (await existing.json()).sha : undefined;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Draft job: ${slug}`,
      content: encoded,
      branch: 'main',
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API: ${err.message}`);
  }
  return { slug, path };
}

// ── E-Mail senden ───────────────────────────────────────
async function sendNotificationEmail(d: Record<string, string>, slug: string, resendKey: string) {
  const resend = new Resend(resendKey);
  const previewUrl = `https://derkaemmerer.de/stellen/${slug}`;

  await resend.emails.send({
    from: 'Buchungssystem <noreply@derkaemmerer.de>',
    to: 'anzeigen@derkaemmerer.de',
    subject: `✉️ Neue Anzeigenbuchung: ${d.stellentitel} – ${d.behoerde}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1a2744;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Neue Stellenanzeigen-Buchung</h1>
    <p style="margin:8px 0 0;color:#93c5fd;font-size:14px">derkaemmerer.de · Buchungssystem</p>
  </div>
  <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px">Paket</td><td style="padding:8px 0;font-weight:bold;color:#1a2744">${d.paket}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Stellentitel</td><td style="padding:8px 0;color:#1a2744">${d.stellentitel}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Behörde</td><td style="padding:8px 0;color:#1a2744">${d.behoerde} (${d.orgtyp})</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Ort</td><td style="padding:8px 0;color:#1a2744">${d.ort}, ${d.bundesland}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Bewerbungsschluss</td><td style="padding:8px 0;color:#1a2744">${d.bewerbungsschluss}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Kontakt</td><td style="padding:8px 0;color:#1a2744">${d.kontaktname} · ${d.kontaktemail}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Add-ons</td><td style="padding:8px 0;color:#1a2744">${[d.addon_newsletter, d.addon_linkedin, d.addon_portraet, d.addon_beratung].filter(Boolean).join(', ') || '—'}</td></tr>
    </table>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#374151;margin-bottom:20px">
      Die Anzeige wurde automatisch als <strong>Entwurf</strong> im GitHub-Repo angelegt (<code>aktiv: false</code>).<br>
      Bitte prüfen und freigeben:
    </p>
    <a href="https://github.com/HAKO-TEAM/der-kaemmerer/blob/main/src/content/jobs/${slug}.md"
       style="display:inline-block;background:#1a2744;color:#fff;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px;margin-right:12px">
      📝 Entwurf auf GitHub prüfen
    </a>
    <a href="${previewUrl}"
       style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px">
      👁 Vorschau ansehen
    </a>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af">
      Zum Freigeben: in der GitHub-Datei <code>aktiv: false</code> → <code>aktiv: true</code> ändern und committen.<br>
      Vercel deployt dann automatisch innerhalb von ~2 Minuten.
    </p>
  </div>
</div>`,
  });
}

// ── Haupt-Handler ───────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  const env = import.meta.env as Record<string, string | undefined>;

  try {
    const form = await request.formData();
    const d: Record<string, string> = {};
    form.forEach((val, key) => { if (typeof val === 'string') d[key] = val; });

    // Pflicht-Check
    if (!d.stellentitel || !d.behoerde || !d.kontaktemail) {
      return new Response(JSON.stringify({ error: 'Pflichtfelder fehlen' }), { status: 400 });
    }

    // Slug + Markdown
    const slug    = makeSlug(d.stellentitel, d.behoerde);
    const content = buildMarkdown(d);

    // GitHub-Datei anlegen (aktiv: false)
    await createGitHubFile(slug, content, env);

    // Benachrichtigung senden
    const resendKey = env.RESEND_API_KEY;
    if (resendKey) {
      await sendNotificationEmail(d, slug, resendKey);
    }

    return new Response(JSON.stringify({ ok: true, slug }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Booking API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unbekannter Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
