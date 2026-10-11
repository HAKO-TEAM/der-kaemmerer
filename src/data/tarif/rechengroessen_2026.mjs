// Sozialversicherung 2026 – Arbeitnehmeranteile und Grenzen (Runbook 4.2: nur mit Quelle).
// Quellen (abgerufen 12.10.2026):
//  - BBG und Rechengrößen: SV-Rechengrößenverordnung 2026, BGBl. vom 26.11.2025; TK Firmenkunden „Sozialversicherungs-Rechengrößen 2026“
//    https://www.tk.de/firmenkunden/service/fachthemen/fachthema-beitraege/sozialversicherungs-rechengroessen-2026-2203234
//  - Beitragssätze RV 18,6 % (§ 158 SGB VI), AV 2,6 % (§ 341 SGB III), KV 14,6 % (§ 241 SGB V):
//    https://www.haufe.de/personal/entgelt/beitragssaetze-zur-sozialversicherung_78_493770.html
//  - Pflege 3,6 %, Sachsen AN 2,3 %, Kinderlosenzuschlag 0,6 %, Abschlag 0,25 je Kind ab dem 2. bis 5. (§ 55, § 58 SGB XI):
//    https://sozialversicherung-kompetent.de/pflegeversicherung/versicherungsrecht/1636-beitragssatz-pflegeversicherung-2026.html
//  - Durchschnittlicher Zusatzbeitrag 2,9 % (GKV-Schätzerkreis): https://www.haufe.de/sozialwesen/versicherungen-beitraege/durchschnittlicher-zusatzbeitrag_240_428260.html
//  - Übergangsbereich 603,01–2.000 € (Geringfügigkeitsgrenze 603 € ab 01.01.2026)
export const SV_2026 = {
  jahr: 2026,
  bbgKvPv: 5812.5,       // € je Monat
  bbgRvAv: 8450,         // € je Monat
  kvAllgemeinAn: 7.3,    // % (Hälfte von 14,6)
  zusatzbeitragDurchschnitt: 2.9,
  pvAn: 1.8, pvAnSachsenPlus: 0.5, pvKinderlosZuschlag: 0.6, pvAbschlagJeKind: 0.25, pvAbschlagMaxKinder: 5,
  rvAn: 9.3, avAn: 1.3,
  geringfuegigkeit: 603, uebergangsbereichBis: 2000,
};
