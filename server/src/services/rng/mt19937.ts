/**
 * MT19937 — Standard Mersenne Twister PRNG used by Gen 4/5 Pokemon games.
 *
 * 624-word (u32) internal state with period 2^19937 - 1.
 * This is the "main RNG" used for PID/IV generation in DPPt/HGSS/BW/B2W2.
 *
 * Gen 4 also uses a separate LCRNG (Linear Congruential) for some operations,
 * but the MT is the primary PRNG for Pokemon generation.
 *
 * Reference: https://en.wikipedia.org/wiki/Mersenne_Twister
 */

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class MT19937 {
  private mt: Uint32Array;
  private mti: number;

  constructor(seed: number) {
    this.mt = new Uint32Array(N);
    this.mti = N + 1;
    this.initFromSeed(seed >>> 0);
  }

  /**
   * Initialize the generator from a single 32-bit seed.
   */
  private initFromSeed(seed: number): void {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < N; i++) {
      // mt[i] = 1812433253 * (mt[i-1] ^ (mt[i-1] >> 30)) + i
      this.mt[i] = (Math.imul(1812433253, (this.mt[i - 1] ^ (this.mt[i - 1] >>> 30))) + i) >>> 0;
    }
    this.mti = N;
  }

  /**
   * Initialize from a full 624-word state array (for restoring from memory dump).
   */
  static fromState(state: Uint32Array, index: number): MT19937 {
    const rng = new MT19937(0);
    if (state.length !== N) throw new Error(`MT19937 state must be ${N} words, got ${state.length}`);
    rng.mt.set(state);
    rng.mti = index;
    return rng;
  }

  /**
   * Generate the next 32-bit random number.
   */
  next(): number {
    let y: number;

    if (this.mti >= N) {
      this.generateNumbers();
    }

    y = this.mt[this.mti++];

    // Tempering
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  }

  /**
   * Generate N new values in the state array (twist step).
   */
  private generateNumbers(): void {
    const mag01 = [0, MATRIX_A];

    for (let k = 0; k < N - M; k++) {
      const y = (this.mt[k] & UPPER_MASK) | (this.mt[k + 1] & LOWER_MASK);
      this.mt[k] = (this.mt[k + M] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;
    }
    for (let k = N - M; k < N - 1; k++) {
      const y = (this.mt[k] & UPPER_MASK) | (this.mt[k + 1] & LOWER_MASK);
      this.mt[k] = (this.mt[k + (M - N)] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;
    }
    const y = (this.mt[N - 1] & UPPER_MASK) | (this.mt[0] & LOWER_MASK);
    this.mt[N - 1] = (this.mt[M - 1] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;

    this.mti = 0;
  }

  /**
   * Get the upper 16 bits of the next random number.
   * This is what Gen 4/5 uses for most Pokemon generation calls.
   */
  nextU16(): number {
    return (this.next() >>> 16) & 0xffff;
  }

  /**
   * Advance the RNG by n steps without returning values.
   */
  advance(n: number): void {
    for (let i = 0; i < n; i++) this.next();
  }

  /**
   * Get the current index into the state array.
   */
  get index(): number {
    return this.mti;
  }

  /**
   * Clone this RNG to explore multiple paths without mutation.
   */
  clone(): MT19937 {
    return MT19937.fromState(new Uint32Array(this.mt), this.mti);
  }
}

/**
 * Gen 4/5 LCRNG — Linear Congruential RNG used alongside MT19937.
 *
 * Used for: initial seed generation (from date/time/delay), and some
 * secondary operations. Not the main Pokemon generation PRNG.
 *
 * seed = seed * 0x41C64E6D + 0x6073 (same LCG as PK4/PK5 encryption)
 */
export class LCRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    const s = BigInt(this.seed);
    this.seed = Number((s * 0x41C64E6Dn + 0x6073n) & 0xFFFFFFFFn);
    return this.seed;
  }

  nextU16(): number {
    return (this.next() >>> 16) & 0xffff;
  }

  get currentSeed(): number {
    return this.seed;
  }

  /**
   * Reverse the LCRNG by one step (for seed recovery).
   * Inverse: seed = seed * 0xEEB9EB65 + 0x0A3561A1
   */
  prev(): number {
    const s = BigInt(this.seed);
    this.seed = Number((s * 0xEEB9EB65n + 0x0A3561A1n) & 0xFFFFFFFFn);
    return this.seed;
  }
}
