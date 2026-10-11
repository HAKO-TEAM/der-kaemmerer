// Tarifregeln TVöD-VKA für die Rechner (Runbook 4.2: nur mit Quelle).
// § 16 (VKA) Abs. 1–4 Wortlaut: https://tv-oed.de/tvoed_paragraf_16_vka (abgerufen 12.10.2026)
//  - Abs. 2: Einstellung Stufe 1 ohne einschlägige Berufserfahrung; ≥ 1 Jahr → Stufe 2; ≥ 3 Jahre in der Regel Stufe 3
//    (Einstellungen nach dem 31.12.2008); förderliche Zeiten kann der Arbeitgeber ganz oder teilweise berücksichtigen.
//  - Abs. 3: Stufenlaufzeiten 1 / 2 / 3 / 4 / 5 Jahre ununterbrochener Tätigkeit in derselben Entgeltgruppe bei demselben Arbeitgeber;
//    ab Stufe 3 Aufstieg leistungsabhängig verkürz- oder verlängerbar (§ 17 Abs. 2).
//  - Abs. 4: Entgeltgruppe 1 – fünf Stufen, Einstellung in Stufe 2, nächste Stufe jeweils nach vier Jahren.
//  - Abs. 2a (Wechsel im unmittelbaren Anschluss an ein Arbeitsverhältnis im öffentlichen Dienst): Kann-Regel; Wortlaut nicht frei zugänglich
//    geprüft – Rechner weist nur auf die Möglichkeit hin (offene Frage Gate 4a).
// § 20 Jahressonderzahlung (VKA ab 2026): https://oeffentlicher-dienst.info/tvoed/vka/jahressonderzahlung/ (Tarifeinigung 06.04.2025)
//  - einheitlich 85 % (Besondere Teile B und K, EG 1–8: 90 %); Bemessung: Durchschnitt Juli–September; Stichtag 1. Dezember;
//    Kürzung um 1/12 je Kalendermonat ohne Entgeltanspruch (nicht bei Elternzeit/Mutterschutz-Beschäftigungsverbot);
//    Beginn ab 1. Oktober: erster voller Kalendermonat ist Bemessungsgrundlage.
export const STUFENLAUFZEIT = [1, 2, 3, 4, 5];     // Jahre in Stufe 1…5 bis zur nächsten Stufe
export const E1 = { eingangsstufe: 2, hoechste: 6, jahreJeStufe: 4 };   // fünf Stufen (2–6)
export const JSZ = { satz: 0.85, satzBkEg1bis8: 0.9 };
export const EINSTELLUNG = { stufe2abJahren: 1, stufe3abJahren: 3 };
