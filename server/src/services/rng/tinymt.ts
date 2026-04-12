// server/src/services/rng/tinymt.ts

// TinyMT constants for Pokemon Gen 6
const MAT1 = 0x8f7011ee;
const MAT2 = 0xfc78ff1f;
const TMAT = 0x3793fdff;

/**
 * TinyMT — Tiny Mersenne Twister PRNG used by Gen 6 Pokemon games.
 * 128-bit internal state (4 × u32). Period: 2^127 - 1.
 *
 * Ported from 3DSRNGTool (C#, MIT license).
 */
export class TinyMT {
  private state: Uint32Array;

  constructor(seed: number);
  constructor(state0: number, state1: number, state2: number, state3: number);
  constructor(
    seedOrState0: number,
    state1?: number,
    state2?: number,
    state3?: number
  ) {
    this.state = new Uint32Array(4);
    if (state1 !== undefined && state2 !== undefined && state3 !== undefined) {
      this.state[0] = seedOrState0 >>> 0;
      this.state[1] = state1 >>> 0;
      this.state[2] = state2 >>> 0;
      this.state[3] = state3 >>> 0;
    } else {
      this.initFromSeed(seedOrState0 >>> 0);
    }
  }

  private initFromSeed(seed: number): void {
    this.state[0] = seed;
    this.state[1] = MAT1;
    this.state[2] = MAT2;
    this.state[3] = TMAT;

    for (let i = 1; i < 8; i++) {
      this.state[i & 3] ^=
        (Math.imul(
          (this.state[(i - 1) & 3] ^ (this.state[(i - 1) & 3] >>> 30)),
          0x6c078965
        ) +
          i) >>>
        0;
    }

    this.periodCertification();

    for (let i = 0; i < 8; i++) {
      this.nextState();
    }
  }

  private periodCertification(): void {
    if (
      this.state[0] === 0 &&
      this.state[1] === 0 &&
      this.state[2] === 0 &&
      this.state[3] === 0
    ) {
      this.state[0] = 0x54494e59;
      this.state[1] = 0x4d54;
      this.state[2] = 0;
      this.state[3] = 0;
    }
  }

  nextState(): void {
    let y = this.state[3];
    let x = (this.state[0] & 0x7fffffff) ^ this.state[1] ^ this.state[2];

    x ^= x << 1;
    y ^= (y >>> 1) ^ x;

    this.state[0] = this.state[1];
    this.state[1] = this.state[2];
    this.state[2] = x ^ (y << 10);
    this.state[3] = y;

    if (y & 1) {
      this.state[1] ^= MAT1;
      this.state[2] ^= MAT2;
    }
  }

  /**
   * Generate next 32-bit output (tempered).
   */
  nextUint(): number {
    this.nextState();
    return this.temper();
  }

  private temper(): number {
    let t0 = this.state[3];
    const t1 = this.state[0] + (this.state[2] >>> 8);

    t0 ^= t1;
    if (t1 & 1) {
      t0 ^= TMAT;
    }
    return t0 >>> 0;
  }

  /**
   * Generate a value in range [0, max).
   * Matches 3DSRNGTool: (uint)(((ulong)nextUint() * max) >> 32)
   * In JS, we use float division since we can't do 64-bit int math natively.
   */
  nextRange(max: number): number {
    const val = this.nextUint() >>> 0;
    return Math.floor((val / 0x100000000) * max);
  }

  /**
   * Get current state for serialization or comparison.
   */
  getState(): [number, number, number, number] {
    return [this.state[0], this.state[1], this.state[2], this.state[3]];
  }

  /**
   * Clone this PRNG instance (for branching predictions).
   */
  clone(): TinyMT {
    return new TinyMT(
      this.state[0],
      this.state[1],
      this.state[2],
      this.state[3]
    );
  }
}
