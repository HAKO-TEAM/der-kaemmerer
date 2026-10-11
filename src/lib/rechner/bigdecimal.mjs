// Exakte Dezimalarithmetik (Teilmenge von java.math.BigDecimal) für den amtlichen Programmablaufplan (PAP).
// Wert = int × 10^(-scale), int als BigInt. Rundungsarten wie im PAP: DOWN (Richtung null), UP (weg von null).
export class BD {
  constructor(int, scale = 0) { this.int = BigInt(int); this.scale = scale; }
  static DOWN = 'DOWN';
  static UP = 'UP';
  static valueOf(x) {
    if (x instanceof BD) return x;
    let s = typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toString()) : String(x);
    if (/e/i.test(s)) s = Number(s).toFixed(20).replace(/0+$/, '');
    const neg = s.startsWith('-'); if (neg) s = s.slice(1);
    const [g, n = ''] = s.split('.');
    const b = new BD(BigInt((g || '0') + n), n.length);
    if (neg) b.int = -b.int;
    // Java valueOf(double) liefert z. B. 0.4 (scale 1) und 3000 als "3000.0" (scale 1) – für die Rechnung ohne Bedeutung
    return b;
  }
  static get ZERO() { return new BD(0n, 0); }
  static get ONE() { return new BD(1n, 0); }
  #auf(scale) { return this.int * 10n ** BigInt(scale - this.scale); }
  add(o) { const s = Math.max(this.scale, o.scale); return new BD(this.#auf(s) + o.#auf(s), s); }
  subtract(o) { const s = Math.max(this.scale, o.scale); return new BD(this.#auf(s) - o.#auf(s), s); }
  multiply(o) { return new BD(this.int * o.int, this.scale + o.scale); }
  static #teile(z, n, modus) {
    const q = z / n, r = z % n;
    if (r === 0n || modus === 'DOWN') return q;
    if (modus === 'UP') return q + ((z < 0n) !== (n < 0n) ? -1n : 1n);
    throw new Error('Rundung erforderlich, aber keine Rundungsart angegeben');
  }
  divide(o, scale, modus) {
    if (scale === undefined) {   // exakte Division (im PAP nur durch 2 und 100)
      for (let s = Math.max(this.scale, 0); s < this.scale + 40; s++) {
        const z = this.int * 10n ** BigInt(s - this.scale + o.scale);
        if (z % o.int === 0n) return new BD(z / o.int, s);
      }
      throw new Error('Division nicht exakt darstellbar');
    }
    const z = this.int * 10n ** BigInt(scale - this.scale + o.scale);
    return new BD(BD.#teile(z, o.int, modus), scale);
  }
  setScale(scale, modus) {
    if (scale >= this.scale) return new BD(this.#auf(scale), scale);
    return new BD(BD.#teile(this.int, 10n ** BigInt(this.scale - scale), modus), scale);
  }
  compareTo(o) { const s = Math.max(this.scale, o.scale); const a = this.#auf(s), b = o.#auf(s); return a < b ? -1 : a > b ? 1 : 0; }
  longValue() { return Number(this.int / 10n ** BigInt(this.scale)); }
  toNumber() { return Number(this.int) / 10 ** this.scale; }
  toString() { const n = this.int < 0n ? -this.int : this.int; const s = n.toString().padStart(this.scale + 1, '0'); return (this.int < 0n ? '-' : '') + (this.scale ? s.slice(0, -this.scale) + '.' + s.slice(-this.scale) : s); }
}
