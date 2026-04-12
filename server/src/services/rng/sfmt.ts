// server/src/services/rng/sfmt.ts

// SFMT-19937 parameters
const N = 156;
const N32 = N * 4; // 624
const POS1 = 122;
const SL1 = 18;
const SR1 = 11;
const MSK1 = 0xdfffffef;
const MSK2 = 0xddfecb7f;
const MSK3 = 0xbffaffff;
const MSK4 = 0xbffffff6;
const PARITY = [0x00000001, 0x00000000, 0x00000000, 0x13c9e684];

/**
 * SFMT-19937 — SIMD-oriented Fast Mersenne Twister used by Gen 7 Pokemon games.
 * Period: 2^19937 - 1. State: 624 × u32.
 *
 * Ported from 3DSRNGTool (C#, MIT license).
 */
export class SFMT {
  private sfmt: Uint32Array;
  private idx: number;

  constructor(seed: number) {
    this.sfmt = new Uint32Array(N32);
    this.idx = N32;
    this.initGenRand(seed >>> 0);
  }

  private initGenRand(seed: number): void {
    this.sfmt[0] = seed;
    for (let i = 1; i < N32; i++) {
      this.sfmt[i] =
        (Math.imul(this.sfmt[i - 1] ^ (this.sfmt[i - 1] >>> 30), 0x6c078965) +
          i) >>>
        0;
    }
    this.periodCertification();
  }

  private periodCertification(): void {
    const inner = [
      this.sfmt[0] & PARITY[0],
      this.sfmt[1] & PARITY[1],
      this.sfmt[2] & PARITY[2],
      this.sfmt[3] & PARITY[3],
    ];

    let check = inner[0] ^ inner[1] ^ inner[2] ^ inner[3];
    check ^= check >>> 16;
    check ^= check >>> 8;
    check ^= check >>> 4;
    check ^= check >>> 2;
    check ^= check >>> 1;

    if ((check & 1) === 1) return;

    for (let i = 0; i < 4; i++) {
      if (PARITY[i] !== 0) {
        this.sfmt[i] ^= PARITY[i] & (-PARITY[i]);
        return;
      }
    }
  }

  private generateAll(): void {
    let a = 0;
    let b = POS1 * 4;
    let r1 = (N - 2) * 4;
    let r2 = (N - 1) * 4;

    for (; a < (N - POS1) * 4; a += 4, b += 4, r1 = r2, r2 = a) {
      this.doRecursion(a, a, b, r1, r2);
    }

    b = 0;
    for (; a < N32; a += 4, b += 4, r1 = r2, r2 = a) {
      this.doRecursion(a, a, b, r1, r2);
    }

    this.idx = 0;
  }

  private doRecursion(
    destIdx: number,
    aIdx: number,
    bIdx: number,
    r1Idx: number,
    r2Idx: number
  ): void {
    const s = this.sfmt;

    // 128-bit left shift by SL1 (18) bits across 4 u32 words
    const lshift0 = (s[aIdx] << SL1) | (s[aIdx + 1] >>> (32 - SL1));
    const lshift1 = (s[aIdx + 1] << SL1) | (s[aIdx + 2] >>> (32 - SL1));
    const lshift2 = (s[aIdx + 2] << SL1) | (s[aIdx + 3] >>> (32 - SL1));
    const lshift3 = s[aIdx + 3] << SL1;

    // 128-bit right shift by 8 bits across 4 u32 words
    const rshift0 = s[r2Idx + 3] >>> (32 - 8) | 0;
    const rshift1 = (s[r2Idx] << 8) | (s[r2Idx + 3] >>> (32 - 8));
    const rshift2 = (s[r2Idx + 1] << 8) | (s[r2Idx] >>> (32 - 8));
    const rshift3 = (s[r2Idx + 2] << 8) | (s[r2Idx + 1] >>> (32 - 8));

    s[destIdx] =
      (s[aIdx] ^ lshift0 ^ ((s[bIdx] >>> SR1) & MSK1) ^ rshift0 ^ (s[r1Idx] << 8)) >>> 0;
    s[destIdx + 1] =
      (s[aIdx + 1] ^ lshift1 ^ ((s[bIdx + 1] >>> SR1) & MSK2) ^ rshift1 ^ (s[r1Idx + 1] << 8)) >>> 0;
    s[destIdx + 2] =
      (s[aIdx + 2] ^ lshift2 ^ ((s[bIdx + 2] >>> SR1) & MSK3) ^ rshift2 ^ (s[r1Idx + 2] << 8)) >>> 0;
    s[destIdx + 3] =
      (s[aIdx + 3] ^ lshift3 ^ ((s[bIdx + 3] >>> SR1) & MSK4) ^ rshift3 ^ (s[r1Idx + 3] << 8)) >>> 0;
  }

  /**
   * Generate next 32-bit unsigned integer.
   */
  nextUint(): number {
    if (this.idx >= N32) {
      this.generateAll();
    }
    return this.sfmt[this.idx++] >>> 0;
  }

  /**
   * Generate next 64-bit unsigned integer as [high, low] pair.
   * Gen 7 Pokemon generation uses 64-bit values.
   */
  nextUint64(): [number, number] {
    const lo = this.nextUint();
    const hi = this.nextUint();
    return [hi, lo];
  }

  /**
   * Advance the PRNG by n frames without returning values.
   */
  advance(n: number): void {
    for (let i = 0; i < n; i++) {
      this.nextUint();
    }
  }

  /**
   * Get current index (for tracking frame position).
   */
  getIndex(): number {
    return this.idx;
  }

  /**
   * Clone this PRNG for branching predictions.
   */
  clone(): SFMT {
    const copy = Object.create(SFMT.prototype) as SFMT;
    copy.sfmt = new Uint32Array(this.sfmt);
    copy.idx = this.idx;
    return copy;
  }
}
