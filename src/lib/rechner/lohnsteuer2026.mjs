// AUTOMATISCH ERZEUGT aus dem amtlichen PAP Lohnsteuer 2026 (BMF/ITZBund) durch scripts/pap-uebersetzen.mjs – nicht von Hand ändern.
// Quelle: src/data/steuer/Lohnsteuer2026.xml
import { BD } from './bigdecimal.mjs';

/**
 * Lohnsteuer, Solidaritätszuschlag und Bemessungsgrundlage Kirchensteuer nach PAP 2026.
 * Eingaben wie im PAP (Beträge in Cent), z. B. { LZZ: 2, RE4: 409767, STKL: 1, ZKF: 0, R: 0, KVZ: 2.9, PVZ: 1, PVS: 0, PVA: 0 }.
 * Ergebnis: alle Ausgaben des PAP als Zahl (Cent), z. B. LSTLZZ, SOLZLZZ, BK.
 */
export function lohnsteuer2026(werte = {}) {
  let af = 1;
  let AJAHR = 0;
  let ALTER1 = 0;
  let ALV = 0;
  let f = 1.0;
  let JFREIB = BD.ZERO;
  let JHINZU = BD.ZERO;
  let JRE4 = BD.ZERO;
  let JRE4ENT = BD.ZERO;
  let JVBEZ = BD.ZERO;
  let KRV = 0;
  let KVZ = BD.ZERO;
  let LZZ = 1;
  let LZZFREIB = BD.ZERO;
  let LZZHINZU = BD.ZERO;
  let MBV = BD.ZERO;
  let PKPV = BD.ZERO;
  let PKPVAGZ = BD.ZERO;
  let PKV = 0;
  let PVA = BD.ZERO;
  let PVS = 0;
  let PVZ = 0;
  let R = 0;
  let RE4 = BD.ZERO;
  let SONSTB = BD.ZERO;
  let SONSTENT = BD.ZERO;
  let STERBE = BD.ZERO;
  let STKL = 1;
  let VBEZ = BD.ZERO;
  let VBEZM = BD.ZERO;
  let VBEZS = BD.ZERO;
  let VBS = BD.ZERO;
  let VJAHR = 0;
  let ZKF = BD.ZERO;
  let ZMVB = 0;
  let BK = BD.ZERO;
  let BKS = BD.ZERO;
  let LSTLZZ = BD.ZERO;
  let SOLZLZZ = BD.ZERO;
  let SOLZS = BD.ZERO;
  let STS = BD.ZERO;
  let VFRB = BD.ZERO;
  let VFRBS1 = BD.ZERO;
  let VFRBS2 = BD.ZERO;
  let WVFRB = BD.ZERO;
  let WVFRBO = BD.ZERO;
  let WVFRBM = BD.ZERO;
  let ALTE = BD.ZERO;
  let ANP = BD.ZERO;
  let ANTEIL1 = BD.ZERO;
  let AVSATZAN = BD.ZERO;
  let BBGKVPV = BD.ZERO;
  let BBGRVALV = BD.ZERO;
  let BMG = BD.ZERO;
  let DIFF = BD.ZERO;
  let EFA = BD.ZERO;
  let FVB = BD.ZERO;
  let FVBSO = BD.ZERO;
  let FVBZ = BD.ZERO;
  let FVBZSO = BD.ZERO;
  let GFB = BD.ZERO;
  let HBALTE = BD.ZERO;
  let HFVB = BD.ZERO;
  let HFVBZ = BD.ZERO;
  let HFVBZSO = BD.ZERO;
  let HOCH = BD.ZERO;
  let J = 0;
  let JBMG = BD.ZERO;
  let JLFREIB = BD.ZERO;
  let JLHINZU = BD.ZERO;
  let JW = BD.ZERO;
  let K = 0;
  let KFB = BD.ZERO;
  let KVSATZAN = BD.ZERO;
  let KZTAB = 0;
  let LSTJAHR = BD.ZERO;
  let LSTOSO = BD.ZERO;
  let LSTSO = BD.ZERO;
  let MIST = BD.ZERO;
  let PKPVAGZJ = BD.ZERO;
  let PVSATZAN = BD.ZERO;
  let RVSATZAN = BD.ZERO;
  let RW = BD.ZERO;
  let SAP = BD.ZERO;
  let SOLZFREI = BD.ZERO;
  let SOLZJ = BD.ZERO;
  let SOLZMIN = BD.ZERO;
  let SOLZSBMG = BD.ZERO;
  let SOLZSZVE = BD.ZERO;
  let ST = BD.ZERO;
  let ST1 = BD.ZERO;
  let ST2 = BD.ZERO;
  let VBEZB = BD.ZERO;
  let VBEZBSO = BD.ZERO;
  let VERGL = BD.ZERO;
  let VSPHB = BD.ZERO;
  let VSP = BD.ZERO;
  let VSPN = BD.ZERO;
  let VSPALV = BD.ZERO;
  let VSPKVPV = BD.ZERO;
  let VSPR = BD.ZERO;
  let W1STKL5 = BD.ZERO;
  let W2STKL5 = BD.ZERO;
  let W3STKL5 = BD.ZERO;
  let X = BD.ZERO;
  let Y = BD.ZERO;
  let ZRE4 = BD.ZERO;
  let ZRE4J = BD.ZERO;
  let ZRE4VP = BD.ZERO;
  let ZRE4VPR = BD.ZERO;
  let ZTABFB = BD.ZERO;
  let ZVBEZ = BD.ZERO;
  let ZVBEZJ = BD.ZERO;
  let ZVE = BD.ZERO;
  let ZX = BD.ZERO;
  let ZZX = BD.ZERO;
  const TAB1 = [BD.ZERO, BD.valueOf( 0.4), BD.valueOf( 0.384), BD.valueOf( 0.368), BD.valueOf( 0.352), BD.valueOf( 0.336), BD.valueOf( 0.32), BD.valueOf( 0.304), BD.valueOf( 0.288), BD.valueOf( 0.272), BD.valueOf( 0.256), BD.valueOf( 0.24), BD.valueOf( 0.224), BD.valueOf( 0.208), BD.valueOf( 0.192), BD.valueOf( 0.176), BD.valueOf( 0.16), BD.valueOf( 0.152), BD.valueOf( 0.144), BD.valueOf( 0.14), BD.valueOf( 0.136), BD.valueOf( 0.132), BD.valueOf( 0.128), BD.valueOf( 0.124), BD.valueOf( 0.12), BD.valueOf( 0.116), BD.valueOf( 0.112), BD.valueOf( 0.108), BD.valueOf( 0.104), BD.valueOf( 0.1), BD.valueOf( 0.096), BD.valueOf( 0.092), BD.valueOf( 0.088), BD.valueOf( 0.084), BD.valueOf( 0.08), BD.valueOf( 0.076), BD.valueOf( 0.072), BD.valueOf( 0.068), BD.valueOf( 0.064), BD.valueOf( 0.06), BD.valueOf( 0.056), BD.valueOf( 0.052), BD.valueOf( 0.048), BD.valueOf( 0.044), BD.valueOf( 0.04), BD.valueOf( 0.036), BD.valueOf( 0.032), BD.valueOf( 0.028), BD.valueOf( 0.024), BD.valueOf( 0.02), BD.valueOf( 0.016), BD.valueOf( 0.012), BD.valueOf( 0.008), BD.valueOf( 0.004), BD.valueOf( 0)];
  const TAB2 = [BD.ZERO, BD.valueOf( 3000), BD.valueOf( 2880), BD.valueOf( 2760), BD.valueOf( 2640), BD.valueOf( 2520), BD.valueOf( 2400), BD.valueOf( 2280), BD.valueOf( 2160), BD.valueOf( 2040), BD.valueOf( 1920), BD.valueOf( 1800), BD.valueOf( 1680), BD.valueOf( 1560), BD.valueOf( 1440), BD.valueOf( 1320), BD.valueOf( 1200), BD.valueOf( 1140), BD.valueOf( 1080), BD.valueOf( 1050), BD.valueOf( 1020), BD.valueOf( 990), BD.valueOf( 960), BD.valueOf( 930), BD.valueOf( 900), BD.valueOf( 870), BD.valueOf( 840), BD.valueOf( 810), BD.valueOf( 780), BD.valueOf( 750), BD.valueOf( 720), BD.valueOf( 690), BD.valueOf( 660), BD.valueOf( 630), BD.valueOf( 600), BD.valueOf( 570), BD.valueOf( 540), BD.valueOf( 510), BD.valueOf( 480), BD.valueOf( 450), BD.valueOf( 420), BD.valueOf( 390), BD.valueOf( 360), BD.valueOf( 330), BD.valueOf( 300), BD.valueOf( 270), BD.valueOf( 240), BD.valueOf( 210), BD.valueOf( 180), BD.valueOf( 150), BD.valueOf( 120), BD.valueOf( 90), BD.valueOf( 60), BD.valueOf( 30), BD.valueOf( 0) ];
  const TAB3 = [BD.ZERO, BD.valueOf( 900), BD.valueOf( 864), BD.valueOf( 828), BD.valueOf( 792), BD.valueOf( 756), BD.valueOf( 720), BD.valueOf( 684), BD.valueOf( 648), BD.valueOf( 612), BD.valueOf( 576), BD.valueOf( 540), BD.valueOf( 504), BD.valueOf( 468), BD.valueOf( 432), BD.valueOf( 396), BD.valueOf( 360), BD.valueOf( 342), BD.valueOf( 324), BD.valueOf( 315), BD.valueOf( 306), BD.valueOf( 297), BD.valueOf( 288), BD.valueOf( 279), BD.valueOf( 270), BD.valueOf( 261), BD.valueOf( 252), BD.valueOf( 243), BD.valueOf( 234), BD.valueOf( 225), BD.valueOf( 216), BD.valueOf( 207), BD.valueOf( 198), BD.valueOf( 189), BD.valueOf( 180), BD.valueOf( 171), BD.valueOf( 162), BD.valueOf( 153), BD.valueOf( 144), BD.valueOf( 135), BD.valueOf( 126), BD.valueOf( 117), BD.valueOf( 108), BD.valueOf( 99), BD.valueOf( 90), BD.valueOf( 81), BD.valueOf( 72), BD.valueOf( 63), BD.valueOf( 54), BD.valueOf( 45), BD.valueOf( 36), BD.valueOf( 27), BD.valueOf( 18), BD.valueOf( 9), BD.valueOf( 0)];
  const TAB4 = [BD.ZERO, BD.valueOf( 0.4), BD.valueOf( 0.384), BD.valueOf( 0.368), BD.valueOf( 0.352), BD.valueOf( 0.336), BD.valueOf( 0.32), BD.valueOf( 0.304), BD.valueOf( 0.288), BD.valueOf( 0.272), BD.valueOf( 0.256), BD.valueOf( 0.24), BD.valueOf( 0.224), BD.valueOf( 0.208), BD.valueOf( 0.192), BD.valueOf( 0.176), BD.valueOf( 0.16), BD.valueOf( 0.152), BD.valueOf( 0.144), BD.valueOf( 0.14), BD.valueOf( 0.136), BD.valueOf( 0.132), BD.valueOf( 0.128), BD.valueOf( 0.124), BD.valueOf( 0.12), BD.valueOf( 0.116), BD.valueOf( 0.112), BD.valueOf( 0.108), BD.valueOf( 0.104), BD.valueOf( 0.1), BD.valueOf( 0.096), BD.valueOf( 0.092), BD.valueOf( 0.088), BD.valueOf( 0.084), BD.valueOf( 0.08), BD.valueOf( 0.076), BD.valueOf( 0.072), BD.valueOf( 0.068), BD.valueOf( 0.064), BD.valueOf( 0.06), BD.valueOf( 0.056), BD.valueOf( 0.052), BD.valueOf( 0.048), BD.valueOf( 0.044), BD.valueOf( 0.04), BD.valueOf( 0.036), BD.valueOf( 0.032), BD.valueOf( 0.028), BD.valueOf( 0.024), BD.valueOf( 0.02), BD.valueOf( 0.016), BD.valueOf( 0.012), BD.valueOf( 0.008), BD.valueOf( 0.004), BD.valueOf( 0)];
  const TAB5 = [BD.ZERO, BD.valueOf( 1900), BD.valueOf( 1824), BD.valueOf( 1748), BD.valueOf( 1672), BD.valueOf( 1596), BD.valueOf( 1520), BD.valueOf( 1444), BD.valueOf( 1368), BD.valueOf( 1292), BD.valueOf( 1216), BD.valueOf( 1140), BD.valueOf( 1064), BD.valueOf( 988), BD.valueOf( 912), BD.valueOf( 836), BD.valueOf( 760), BD.valueOf( 722), BD.valueOf( 684), BD.valueOf( 665), BD.valueOf( 646), BD.valueOf( 627), BD.valueOf( 608), BD.valueOf( 589), BD.valueOf( 570), BD.valueOf( 551), BD.valueOf( 532), BD.valueOf( 513), BD.valueOf( 494), BD.valueOf( 475), BD.valueOf( 456), BD.valueOf( 437), BD.valueOf( 418), BD.valueOf( 399), BD.valueOf( 380), BD.valueOf( 361), BD.valueOf( 342), BD.valueOf( 323), BD.valueOf( 304), BD.valueOf( 285), BD.valueOf( 266), BD.valueOf( 247), BD.valueOf( 228), BD.valueOf( 209), BD.valueOf( 190), BD.valueOf( 171), BD.valueOf( 152), BD.valueOf( 133), BD.valueOf( 114), BD.valueOf( 95), BD.valueOf( 76), BD.valueOf( 57), BD.valueOf( 38), BD.valueOf( 19), BD.valueOf( 0)];
  const ZAHL1 = BD.ONE;
  const ZAHL2 = BD.valueOf(2);
  const ZAHL5 = BD.valueOf(5);
  const ZAHL7 = BD.valueOf(7);
  const ZAHL12 = BD.valueOf(12);
  const ZAHL100 = BD.valueOf(100);
  const ZAHL360 = BD.valueOf(360);
  const ZAHL500 = BD.valueOf(500);
  const ZAHL700 = BD.valueOf(700);
  const ZAHL1000 = BD.valueOf(1000);
  const ZAHL10000 = BD.valueOf(10000);
  const TYP = {"af":"int","AJAHR":"int","ALTER1":"int","ALV":"int","f":"double","JFREIB":"BigDecimal","JHINZU":"BigDecimal","JRE4":"BigDecimal","JRE4ENT":"BigDecimal","JVBEZ":"BigDecimal","KRV":"int","KVZ":"BigDecimal","LZZ":"int","LZZFREIB":"BigDecimal","LZZHINZU":"BigDecimal","MBV":"BigDecimal","PKPV":"BigDecimal","PKPVAGZ":"BigDecimal","PKV":"int","PVA":"BigDecimal","PVS":"int","PVZ":"int","R":"int","RE4":"BigDecimal","SONSTB":"BigDecimal","SONSTENT":"BigDecimal","STERBE":"BigDecimal","STKL":"int","VBEZ":"BigDecimal","VBEZM":"BigDecimal","VBEZS":"BigDecimal","VBS":"BigDecimal","VJAHR":"int","ZKF":"BigDecimal","ZMVB":"int"};
  for (const [k, v] of Object.entries(werte)) {
    if (!(k in TYP)) throw new Error('Unbekannte Eingabe: ' + k);
    const wert = TYP[k] === 'BigDecimal' ? BD.valueOf(v) : Number(v);
    switch (k) {
      case 'af': af = wert; break;
      case 'AJAHR': AJAHR = wert; break;
      case 'ALTER1': ALTER1 = wert; break;
      case 'ALV': ALV = wert; break;
      case 'f': f = wert; break;
      case 'JFREIB': JFREIB = wert; break;
      case 'JHINZU': JHINZU = wert; break;
      case 'JRE4': JRE4 = wert; break;
      case 'JRE4ENT': JRE4ENT = wert; break;
      case 'JVBEZ': JVBEZ = wert; break;
      case 'KRV': KRV = wert; break;
      case 'KVZ': KVZ = wert; break;
      case 'LZZ': LZZ = wert; break;
      case 'LZZFREIB': LZZFREIB = wert; break;
      case 'LZZHINZU': LZZHINZU = wert; break;
      case 'MBV': MBV = wert; break;
      case 'PKPV': PKPV = wert; break;
      case 'PKPVAGZ': PKPVAGZ = wert; break;
      case 'PKV': PKV = wert; break;
      case 'PVA': PVA = wert; break;
      case 'PVS': PVS = wert; break;
      case 'PVZ': PVZ = wert; break;
      case 'R': R = wert; break;
      case 'RE4': RE4 = wert; break;
      case 'SONSTB': SONSTB = wert; break;
      case 'SONSTENT': SONSTENT = wert; break;
      case 'STERBE': STERBE = wert; break;
      case 'STKL': STKL = wert; break;
      case 'VBEZ': VBEZ = wert; break;
      case 'VBEZM': VBEZM = wert; break;
      case 'VBEZS': VBEZS = wert; break;
      case 'VBS': VBS = wert; break;
      case 'VJAHR': VJAHR = wert; break;
      case 'ZKF': ZKF = wert; break;
      case 'ZMVB': ZMVB = wert; break;
    }
  }
  function MPARA() {
    BBGRVALV = BD.valueOf(101400);
    AVSATZAN = BD.valueOf(0.013);
    RVSATZAN = BD.valueOf(0.093);
    BBGKVPV = BD.valueOf(69750);
    KVSATZAN = (KVZ.divide(ZAHL2).divide(ZAHL100)).add(BD.valueOf(0.07));
    if (PVS == 1) {
      PVSATZAN = BD.valueOf(0.023);
    } else {
      PVSATZAN =  BD.valueOf(0.018);
    }
    if (PVZ == 1) {
      PVSATZAN = PVSATZAN.add(BD.valueOf(0.006));
    } else {
      PVSATZAN = PVSATZAN.subtract(PVA.multiply(BD.valueOf(0.0025)));
    }
    W1STKL5 = BD.valueOf(14071);
    W2STKL5 = BD.valueOf(34939);
    W3STKL5 = BD.valueOf(222260);
    GFB = BD.valueOf(12348);
    SOLZFREI = BD.valueOf(20350);
  }
  function MRE4JL() {
    if (LZZ == 1) {
      ZRE4J= RE4.divide (ZAHL100, 2, BD.DOWN);
      ZVBEZJ= VBEZ.divide (ZAHL100, 2, BD.DOWN);
      JLFREIB= LZZFREIB.divide (ZAHL100, 2, BD.DOWN);
      JLHINZU= LZZHINZU.divide (ZAHL100, 2, BD.DOWN);
    } else {
      if (LZZ == 2) {
        ZRE4J= (RE4.multiply (ZAHL12)).divide (ZAHL100, 2, BD.DOWN);
        ZVBEZJ= (VBEZ.multiply (ZAHL12)).divide (ZAHL100, 2, BD.DOWN);
        JLFREIB= (LZZFREIB.multiply (ZAHL12)).divide (ZAHL100, 2, BD.DOWN);
        JLHINZU= (LZZHINZU.multiply (ZAHL12)).divide (ZAHL100, 2, BD.DOWN);
      } else {
        if (LZZ == 3) {
          ZRE4J= (RE4.multiply (ZAHL360)).divide (ZAHL700, 2, BD.DOWN);
          ZVBEZJ= (VBEZ.multiply (ZAHL360)).divide (ZAHL700, 2, BD.DOWN);
          JLFREIB= (LZZFREIB.multiply (ZAHL360)).divide (ZAHL700, 2, BD.DOWN);
          JLHINZU= (LZZHINZU.multiply (ZAHL360)).divide (ZAHL700, 2, BD.DOWN);
        } else {
          ZRE4J= (RE4.multiply (ZAHL360)).divide (ZAHL100, 2, BD.DOWN);
          ZVBEZJ= (VBEZ.multiply (ZAHL360)).divide (ZAHL100, 2, BD.DOWN);
          JLFREIB= (LZZFREIB.multiply (ZAHL360)).divide (ZAHL100, 2, BD.DOWN);
          JLHINZU= (LZZHINZU.multiply (ZAHL360)).divide (ZAHL100, 2, BD.DOWN);
        }
      }
    }
    if (af == 0) {
      f= 1;
    }
  }
  function MRE4() {
    if (ZVBEZJ.compareTo (BD.ZERO) == 0) {
      FVBZ= BD.ZERO;
      FVB= BD.ZERO;
      FVBZSO= BD.ZERO;
      FVBSO= BD.ZERO;
    } else {
      if (VJAHR < 2006) {
        J= 1;
      } else {
        if (VJAHR < 2058) {
          J= VJAHR - 2004;
        } else {
          J= 54;
        }
      }
      if (LZZ == 1) {
        VBEZB= (VBEZM.multiply (BD.valueOf(ZMVB))).add (VBEZS);
        HFVB= TAB2[J].divide (ZAHL12).multiply (BD.valueOf(ZMVB)).setScale (0, BD.UP);
        FVBZ= TAB3[J].divide (ZAHL12).multiply (BD.valueOf(ZMVB)).setScale (0, BD.UP);
      } else {
        VBEZB= ((VBEZM.multiply (ZAHL12)).add (VBEZS)).setScale (2, BD.DOWN);
        HFVB= TAB2[J];
        FVBZ= TAB3[J];
      }
      FVB= ((VBEZB.multiply (TAB1[J]))).divide (ZAHL100).setScale (2, BD.UP);
      if (FVB.compareTo (HFVB) == 1) {
        FVB = HFVB;
      }
      if (FVB.compareTo (ZVBEZJ) == 1) {
        FVB = ZVBEZJ;
      }
      FVBSO= (FVB.add((VBEZBSO.multiply (TAB1[J])).divide (ZAHL100))).setScale (2, BD.UP);
      if (FVBSO.compareTo (TAB2[J]) == 1) {
        FVBSO = TAB2[J];
      }
      HFVBZSO= (((VBEZB.add(VBEZBSO)).divide (ZAHL100)).subtract (FVBSO)).setScale (2, BD.DOWN);
      FVBZSO= (FVBZ.add((VBEZBSO).divide (ZAHL100))).setScale (0, BD.UP);
      if (FVBZSO.compareTo (HFVBZSO) == 1) {
        FVBZSO = HFVBZSO.setScale(0, BD.UP);
      }
      if (FVBZSO.compareTo (TAB3[J]) == 1) {
        FVBZSO = TAB3[J];
      }
      HFVBZ= ((VBEZB.divide (ZAHL100)).subtract (FVB)).setScale (2, BD.DOWN);
      if (FVBZ.compareTo (HFVBZ) == 1) {
        FVBZ = HFVBZ.setScale (0, BD.UP);
      }
    }
    MRE4ALTE();
  }
  function MRE4ALTE() {
    if (ALTER1 == 0) {
      ALTE= BD.ZERO;
    } else {
      if (AJAHR < 2006) {
        K= 1;
      } else {
        if (AJAHR < 2058) {
          K= AJAHR - 2004;
        } else {
          K= 54;
        }
      }
      BMG= ZRE4J.subtract (ZVBEZJ);
      ALTE = (BMG.multiply(TAB4[K])).setScale(0, BD.UP);
      HBALTE= TAB5[K];
      if (ALTE.compareTo (HBALTE) == 1) {
        ALTE= HBALTE;
      }
    }
  }
  function MRE4ABZ() {
    ZRE4= (ZRE4J.subtract (FVB).subtract   (ALTE).subtract (JLFREIB).add (JLHINZU)).setScale (2, BD.DOWN);
    if (ZRE4.compareTo (BD.ZERO) == -1) {
      ZRE4= BD.ZERO;
    }
    ZRE4VP= ZRE4J;
    ZVBEZ = ZVBEZJ.subtract(FVB).setScale(2, BD.DOWN);
    if (ZVBEZ.compareTo(BD.ZERO) == -1) {
      ZVBEZ = BD.ZERO;
    }
  }
  function MBERECH() {
    MZTABFB();
    VFRB = ((ANP.add(FVB.add(FVBZ))).multiply(ZAHL100)).setScale(0, BD.DOWN);
    MLSTJAHR();
    WVFRB = ((ZVE.subtract(GFB)).multiply(ZAHL100)).setScale(0, BD.DOWN);
    if (WVFRB.compareTo(BD.ZERO) == -1) {
      WVFRB = BD.ZERO;
    }
    LSTJAHR = (ST.multiply(BD.valueOf(f))).setScale(0,BD.DOWN);
    UPLSTLZZ();
    if (ZKF.compareTo(BD.ZERO) == 1) {
      ZTABFB = ZTABFB.add(KFB);
      MRE4ABZ();
      MLSTJAHR();
      JBMG = (ST.multiply(BD.valueOf(f))).setScale(0,BD.DOWN);
    } else {
      JBMG = LSTJAHR;
    }
    MSOLZ();
  }
  function MZTABFB() {
    ANP= BD.ZERO;
    if (ZVBEZ.compareTo (BD.ZERO) >= 0 && ZVBEZ.compareTo(FVBZ) == -1) {
      FVBZ = BD.valueOf(ZVBEZ.longValue());
    }
    if (STKL < 6) {
      if (ZVBEZ.compareTo (BD.ZERO) == 1) {
        if ((ZVBEZ.subtract (FVBZ)).compareTo (BD.valueOf(102)) == -1) {
          ANP= (ZVBEZ.subtract (FVBZ)).setScale (0, BD.UP);
        } else {
          ANP= BD.valueOf(102);
        }
      }
    } else {
      FVBZ= BD.ZERO;
      FVBZSO= BD.ZERO;
    }
    if (STKL < 6) {
      if (ZRE4.compareTo(ZVBEZ) == 1) {
        if (ZRE4.subtract(ZVBEZ).compareTo(BD.valueOf(1230)) == -1) {
          ANP = ANP.add(ZRE4).subtract(ZVBEZ).setScale(0,BD.UP);
        } else {
          ANP = ANP.add(BD.valueOf(1230));
        }
      }
    }
    KZTAB= 1;
    if (STKL == 1) {
      SAP= BD.valueOf(36);
      KFB= (ZKF.multiply (BD.valueOf(9756))).setScale (0, BD.DOWN);
    } else {
      if (STKL == 2) {
        EFA= BD.valueOf(4260);
        SAP= BD.valueOf(36);
        KFB= (ZKF.multiply (BD.valueOf(9756))).setScale (0, BD.DOWN);
      } else {
        if (STKL == 3) {
          KZTAB= 2;
          SAP= BD.valueOf(36);
          KFB= (ZKF.multiply (BD.valueOf(9756))).setScale (0, BD.DOWN);
        } else {
          if (STKL == 4) {
            SAP= BD.valueOf(36);
            KFB= (ZKF.multiply (BD.valueOf(4878))).setScale (0, BD.DOWN);
          } else {
            if (STKL == 5) {
              SAP= BD.valueOf(36);
              KFB= BD.ZERO;
            } else {
              KFB= BD.ZERO;
            }
          }
        }
      }
    }
    ZTABFB= (EFA.add (ANP).add (SAP).add (FVBZ)).setScale (2, BD.DOWN);
  }
  function MLSTJAHR() {
    UPEVP();
    ZVE= ZRE4.subtract (ZTABFB).subtract(VSP);
    UPMLST();
  }
  function UPLSTLZZ() {
    JW = LSTJAHR.multiply(ZAHL100);
    UPANTEIL();
    LSTLZZ = ANTEIL1;
  }
  function UPMLST() {
    if (ZVE.compareTo (ZAHL1) == -1) {
      ZVE= BD.ZERO;
      X= BD.ZERO;
    } else {
      X= (ZVE.divide (BD.valueOf(KZTAB))).setScale (0, BD.DOWN);
    }
    if (STKL < 5) {
      UPTAB26();
    } else {
      MST5_6();
    }
  }
  function UPEVP() {
    if (KRV == 1) {
      VSPR = BD.ZERO;
    } else {
      if (ZRE4VP.compareTo(BBGRVALV) == 1) {
        ZRE4VPR = BBGRVALV;
      } else {
        ZRE4VPR = ZRE4VP;
      }
      VSPR = (ZRE4VPR.multiply(RVSATZAN)).setScale(2,BD.DOWN);
    }
    MVSPKVPV();
    if (ALV == 1) {
    } else {
      if (STKL == 6) {
      } else {
        MVSPHB();
      }
    }
  }
  function MVSPKVPV() {
    if (ZRE4VP.compareTo(BBGKVPV) == 1) {
      ZRE4VPR = BBGKVPV;
    } else {
      ZRE4VPR = ZRE4VP;
    }
    if (PKV > 0) {
      if (STKL == 6) {
        VSPKVPV = BD.ZERO;
      } else {
        PKPVAGZJ = PKPVAGZ.multiply(ZAHL12).divide(ZAHL100).setScale(2,BD.DOWN);
        VSPKVPV = PKPV.multiply(ZAHL12).divide(ZAHL100).setScale(2, BD.DOWN);
        VSPKVPV = VSPKVPV.subtract(PKPVAGZJ);
        if (VSPKVPV.compareTo(BD.ZERO) == -1) {
          VSPKVPV = BD.ZERO;
        }
      }
    } else {
      VSPKVPV = ZRE4VPR.multiply(KVSATZAN.add(PVSATZAN)).setScale(2, BD.DOWN);
    }
    VSP = VSPKVPV.add(VSPR).setScale(0, BD.UP);
  }
  function MVSPHB() {
    if (ZRE4VP.compareTo(BBGRVALV) == 1) {
      ZRE4VPR = BBGRVALV;
    } else {
      ZRE4VPR = ZRE4VP;
    }
    VSPALV = AVSATZAN.multiply(ZRE4VPR).setScale(2, BD.DOWN);
    VSPHB = VSPALV.add(VSPKVPV).setScale(2, BD.DOWN);
    if (VSPHB.compareTo(BD.valueOf(1900)) == 1) {
      VSPHB = BD.valueOf(1900);
    }
    VSPN = VSPR.add(VSPHB).setScale(0, BD.UP);
    if (VSPN.compareTo(VSP) == 1) {
      VSP = VSPN;
    }
  }
  function MST5_6() {
    ZZX= X;
    if (ZZX.compareTo(W2STKL5) == 1) {
      ZX= W2STKL5;
      UP5_6();
      if (ZZX.compareTo (W3STKL5) == 1) {
        ST= (ST.add ((W3STKL5.subtract (W2STKL5)).multiply (BD.valueOf(0.42)))).setScale (0, BD.DOWN);
        ST= (ST.add ((ZZX.subtract (W3STKL5)).multiply (BD.valueOf(0.45)))).setScale (0, BD.DOWN);
      } else {
        ST= (ST.add ((ZZX.subtract (W2STKL5)).multiply (BD.valueOf(0.42)))).setScale (0, BD.DOWN);
      }
    } else {
      ZX= ZZX;
      UP5_6();
      if (ZZX.compareTo (W1STKL5) == 1) {
        VERGL= ST;
        ZX= W1STKL5;
        UP5_6();
        HOCH= (ST.add ((ZZX.subtract (W1STKL5)).multiply (BD.valueOf(0.42)))).setScale (0, BD.DOWN);
        if (HOCH.compareTo (VERGL) == -1) {
          ST= HOCH;
        } else {
          ST= VERGL;
        }
      }
    }
  }
  function UP5_6() {
    X= (ZX.multiply (BD.valueOf(1.25))).setScale (0, BD.DOWN);
    UPTAB26();
    ST1= ST;
    X= (ZX.multiply (BD.valueOf(0.75))).setScale (0, BD.DOWN);
    UPTAB26();
    ST2= ST;
    DIFF= (ST1.subtract (ST2)).multiply (ZAHL2);
    MIST= (ZX.multiply (BD.valueOf(0.14))).setScale (0, BD.DOWN);
    if (MIST.compareTo (DIFF) == 1) {
      ST= MIST;
    } else {
      ST= DIFF;
    }
  }
  function MSOLZ() {
    SOLZFREI = (SOLZFREI.multiply(BD.valueOf(KZTAB)));
    if (JBMG.compareTo (SOLZFREI) == 1) {
      SOLZJ= (JBMG.multiply (BD.valueOf(5.5))).divide(ZAHL100).setScale(2, BD.DOWN);
      SOLZMIN= (JBMG.subtract (SOLZFREI)).multiply (BD.valueOf(11.9)).divide (ZAHL100).setScale (2, BD.DOWN);
      if (SOLZMIN.compareTo (SOLZJ) == -1) {
        SOLZJ= SOLZMIN;
      }
      JW= SOLZJ.multiply (ZAHL100).setScale (0, BD.DOWN);
      UPANTEIL();
      SOLZLZZ= ANTEIL1;
    } else {
      SOLZLZZ= BD.ZERO;
    }
    if (R > 0) {
      JW= JBMG.multiply (ZAHL100);
      UPANTEIL();
      BK= ANTEIL1;
    } else {
      BK= BD.ZERO;
    }
  }
  function UPANTEIL() {
    if (LZZ == 1) {
      ANTEIL1= JW;
    } else {
      if (LZZ == 2) {
        ANTEIL1= JW.divide (ZAHL12, 0, BD.DOWN);
      } else {
        if (LZZ == 3) {
          ANTEIL1= (JW.multiply (ZAHL7)).divide (ZAHL360, 0, BD.DOWN);
        } else {
          ANTEIL1= JW.divide (ZAHL360, 0, BD.DOWN);
        }
      }
    }
  }
  function MSONST() {
    LZZ = 1;
    if (ZMVB == 0) {
      ZMVB = 12;
    }
    if (SONSTB.compareTo (BD.ZERO) == 0 && MBV.compareTo (BD.ZERO) == 0) {
      LSTSO= BD.ZERO;
      STS= BD.ZERO;
      SOLZS= BD.ZERO;
      BKS= BD.ZERO;
    } else {
      MOSONST();
      ZRE4J= ((JRE4.add (SONSTB)).divide (ZAHL100)).setScale (2, BD.DOWN);
      ZVBEZJ= ((JVBEZ.add (VBS)).divide (ZAHL100)).setScale (2, BD.DOWN);
      VBEZBSO= STERBE;
      MRE4SONST();
      MLSTJAHR();
      WVFRBM = (ZVE.subtract(GFB)).multiply(ZAHL100).setScale(2,BD.DOWN);
      if (WVFRBM.compareTo(BD.ZERO) == -1) {
        WVFRBM = BD.ZERO;
      }
      LSTSO= ST.multiply (ZAHL100);
      STS = LSTSO.subtract(LSTOSO).multiply(BD.valueOf(f)).divide(ZAHL100, 0, BD.DOWN).multiply(ZAHL100);
      STSMIN();
    }
  }
  function STSMIN() {
    if (STS.compareTo(BD.ZERO) == -1) {
      if (MBV.compareTo(BD.ZERO) == 0) {
      } else {
        LSTLZZ = LSTLZZ.add(STS);
        if (LSTLZZ.compareTo(BD.ZERO) == -1) {
          LSTLZZ = BD.ZERO;
        }
        SOLZLZZ = SOLZLZZ.add(STS.multiply(BD.valueOf(5.5).divide(ZAHL100))).setScale(0, BD.DOWN);
        if (SOLZLZZ.compareTo(BD.ZERO) == -1) {
          SOLZLZZ = BD.ZERO;
        }
        BK = BK.add(STS);
        if (BK.compareTo(BD.ZERO) == -1) {
          BK = BD.ZERO;
        }
      }
      STS = BD.ZERO;
      SOLZS = BD.ZERO;
    } else {
      MSOLZSTS();
    }
    if (R > 0) {
      BKS = STS;
    } else {
      BKS = BD.ZERO;
    }
  }
  function MSOLZSTS() {
    if (ZKF.compareTo(BD.ZERO) == 1) {
      SOLZSZVE= ZVE.subtract(KFB);
    } else {
      SOLZSZVE= ZVE;
    }
    if (SOLZSZVE.compareTo(BD.ONE) == -1) {
      SOLZSZVE= BD.ZERO;
      X= BD.ZERO;
    } else {
      X= SOLZSZVE.divide(BD.valueOf(KZTAB), 0, BD.DOWN);
    }
    if (STKL < 5) {
      UPTAB26();
    } else {
      MST5_6();
    }
    SOLZSBMG= ST.multiply(BD.valueOf(f)).setScale(0,BD.DOWN);
    if (SOLZSBMG.compareTo(SOLZFREI) == 1) {
      SOLZS= STS.multiply(BD.valueOf(5.5)).divide(ZAHL100, 0, BD.DOWN);
    } else {
      SOLZS= BD.ZERO;
    }
  }
  function MOSONST() {
    ZRE4J= (JRE4.divide (ZAHL100)).setScale (2, BD.DOWN);
    ZVBEZJ= (JVBEZ.divide (ZAHL100)).setScale (2, BD.DOWN);
    JLFREIB= JFREIB.divide (ZAHL100, 2, BD.DOWN);
    JLHINZU= JHINZU.divide (ZAHL100, 2, BD.DOWN);
    MRE4();
    MRE4ABZ();
    ZRE4VP = ZRE4VP.subtract(JRE4ENT.divide(ZAHL100));
    MZTABFB();
    VFRBS1 = ((ANP.add(FVB.add(FVBZ))).multiply(ZAHL100)).setScale(2,BD.DOWN);
    MLSTJAHR();
    WVFRBO = ((ZVE.subtract(GFB)).multiply(ZAHL100)).setScale(2, BD.DOWN);
    if (WVFRBO.compareTo(BD.ZERO) == -1 ) {
      WVFRBO = BD.ZERO;
    }
    LSTOSO= ST.multiply (ZAHL100);
  }
  function MRE4SONST() {
    MRE4();
    FVB= FVBSO;
    MRE4ABZ();
    ZRE4VP = ZRE4VP.add(MBV.divide(ZAHL100)).subtract(JRE4ENT.divide(ZAHL100)).subtract(SONSTENT.divide(ZAHL100));
    FVBZ= FVBZSO;
    MZTABFB();
    VFRBS2 = ((((ANP.add(FVB).add(FVBZ))).multiply(ZAHL100))).subtract(VFRBS1);
  }
  function UPTAB26() {
    if (X.compareTo(GFB.add(ZAHL1)) == -1) {
      ST= BD.ZERO;
    } else {
      if (X.compareTo (BD.valueOf(17800)) == -1) {
        Y = (X.subtract(GFB)).divide(ZAHL10000, 6,BD.DOWN);
        RW= Y.multiply (BD.valueOf(914.51));
        RW= RW.add (BD.valueOf(1400));
        ST= (RW.multiply (Y)).setScale (0, BD.DOWN);
      } else {
        if (X.compareTo (BD.valueOf(69879)) == -1) {
          Y= (X.subtract (BD.valueOf(17799))).divide (ZAHL10000, 6, BD.DOWN);
          RW= Y.multiply (BD.valueOf(173.1));
          RW= RW.add (BD.valueOf(2397));
          RW= RW.multiply (Y);
          ST= (RW.add (BD.valueOf(1034.87))).setScale (0, BD.DOWN);
        } else {
          if (X.compareTo (BD.valueOf(277826)) == -1) {
            ST= ((X.multiply (BD.valueOf(0.42))).subtract (BD.valueOf(11135.63))).setScale (0, BD.DOWN);
          } else {
            ST= ((X.multiply (BD.valueOf(0.45))).subtract (BD.valueOf(19470.38))).setScale (0, BD.DOWN);
          }
        }
      }
    }
    ST= ST.multiply (BD.valueOf(KZTAB));
  }
  MPARA();
  MRE4JL();
  VBEZBSO= BD.ZERO;
  MRE4();
  MRE4ABZ();
  MBERECH();
  MSONST();
  return { BK: BK instanceof BD ? BK.toNumber() : BK, BKS: BKS instanceof BD ? BKS.toNumber() : BKS, LSTLZZ: LSTLZZ instanceof BD ? LSTLZZ.toNumber() : LSTLZZ, SOLZLZZ: SOLZLZZ instanceof BD ? SOLZLZZ.toNumber() : SOLZLZZ, SOLZS: SOLZS instanceof BD ? SOLZS.toNumber() : SOLZS, STS: STS instanceof BD ? STS.toNumber() : STS, VFRB: VFRB instanceof BD ? VFRB.toNumber() : VFRB, VFRBS1: VFRBS1 instanceof BD ? VFRBS1.toNumber() : VFRBS1, VFRBS2: VFRBS2 instanceof BD ? VFRBS2.toNumber() : VFRBS2, WVFRB: WVFRB instanceof BD ? WVFRB.toNumber() : WVFRB, WVFRBO: WVFRBO instanceof BD ? WVFRBO.toNumber() : WVFRBO, WVFRBM: WVFRBM instanceof BD ? WVFRBM.toNumber() : WVFRBM };
}
