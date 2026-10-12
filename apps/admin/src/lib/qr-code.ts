/**
 * Self-contained ISO/IEC 18004 QR Code Matrix Generator (Versions 1-7, Level L, Byte Mode).
 * 100% offline, permanent, zero external API calls, zero runtime dependencies.
 */

interface QrVersionSpec {
  readonly version: number;
  readonly size: number;
  readonly totalDataCodewords: number;
  readonly ecCodewordsPerBlock: number;
  readonly numBlocks: number;
  readonly alignmentCenters: readonly number[];
}

const QR_VERSION_SPECS: readonly QrVersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalDataCodewords: 19,
    ecCodewordsPerBlock: 7,
    numBlocks: 1,
    alignmentCenters: [],
  },
  {
    version: 2,
    size: 25,
    totalDataCodewords: 34,
    ecCodewordsPerBlock: 10,
    numBlocks: 1,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalDataCodewords: 55,
    ecCodewordsPerBlock: 15,
    numBlocks: 1,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalDataCodewords: 80,
    ecCodewordsPerBlock: 20,
    numBlocks: 1,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalDataCodewords: 108,
    ecCodewordsPerBlock: 26,
    numBlocks: 1,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalDataCodewords: 136,
    ecCodewordsPerBlock: 18,
    numBlocks: 2,
    alignmentCenters: [6, 34],
  },
  {
    version: 7,
    size: 45,
    totalDataCodewords: 156,
    ecCodewordsPerBlock: 20,
    numBlocks: 2,
    alignmentCenters: [6, 22, 38],
  },
];

// GF(256) Lookup Tables (primitive polynomial 0x11D = 285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildGeneratorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMultiply(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonRemainder(
  data: Uint8Array,
  ecLength: number,
): Uint8Array {
  const gen = buildGeneratorPolynomial(ecLength);
  const remainder = new Uint8Array(ecLength);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecLength - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLength; j += 1) {
        remainder[j] ^= gfMultiply(gen[j + 1], factor);
      }
    }
  }
  return remainder;
}

function encodeDataCodewords(
  utf8Bytes: Uint8Array,
  spec: QrVersionSpec,
): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100) + 8-bit character count (for Versions 1-9)
  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, 8);
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // Terminator up to 4 zero bits
  const maxBits = spec.totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(spec.totalDataCodewords);
  const byteCount = bits.length / 8;
  for (let i = 0; i < byteCount; i += 1) {
    let val = 0;
    for (let b = 0; b < 8; b += 1) {
      val = (val << 1) | bits[i * 8 + b];
    }
    codewords[i] = val;
  }

  // Pad remaining codewords with alternating 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  for (let i = byteCount; i < spec.totalDataCodewords; i += 1) {
    codewords[i] = padBytes[(i - byteCount) % 2];
  }

  if (spec.numBlocks === 1) {
    const ec = computeReedSolomonRemainder(
      codewords,
      spec.ecCodewordsPerBlock,
    );
    const out = new Uint8Array(codewords.length + ec.length);
    out.set(codewords, 0);
    out.set(ec, codewords.length);
    return out;
  }

  // Interleave 2 blocks (for Versions 6-L and 7-L)
  const blockSize = spec.totalDataCodewords / spec.numBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.numBlocks; b += 1) {
    const blockData = codewords.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(blockData);
    ecBlocks.push(
      computeReedSolomonRemainder(blockData, spec.ecCodewordsPerBlock),
    );
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i += 1) {
    for (let b = 0; b < spec.numBlocks; b += 1) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i += 1) {
    for (let b = 0; b < spec.numBlocks; b += 1) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  return new Uint8Array(finalCodewords);
}

function drawFinderPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  row: number,
  col: number,
  size: number,
): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const r = row + dy;
      const c = col + dx;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const isBorder = dy === -1 || dy === 7 || dx === -1 || dx === 7;
      const isOuterRing = dy === 0 || dy === 6 || dx === 0 || dx === 6;
      const isInnerSquare = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
      modules[r][c] = !isBorder && (isOuterRing || isInnerSquare);
      isFunction[r][c] = true;
    }
  }
}

function drawAlignmentPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  centerRow: number,
  centerCol: number,
): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const r = centerRow + dy;
      const c = centerCol + dx;
      const dist = Math.max(Math.abs(dy), Math.abs(dx));
      modules[r][c] = dist !== 1;
      isFunction[r][c] = true;
    }
  }
}

function drawFormatInformation(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  maskIndex: number,
): void {
  // Error Correction Level L = 01
  const data = (0b01 << 3) | maskIndex;
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((rem >>> i) & 1) !== 0) {
      rem ^= 0x537 << (i - 10);
    }
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  const getBit = (idx: number): boolean => ((bits >>> idx) & 1) !== 0;

  // Copy 1: Top-left format info (vertical on col 8, horizontal on row 8)
  for (let i = 0; i <= 5; i += 1) {
    modules[i][8] = getBit(i);
    isFunction[i][8] = true;
  }
  modules[7][8] = getBit(6);
  isFunction[7][8] = true;
  modules[8][8] = getBit(7);
  isFunction[8][8] = true;
  modules[8][7] = getBit(8);
  isFunction[8][7] = true;
  for (let i = 9; i < 15; i += 1) {
    modules[8][14 - i] = getBit(i);
    isFunction[8][14 - i] = true;
  }

  // Copy 2: Top-right (row 8) & Bottom-left (col 8) format info
  for (let i = 0; i < 8; i += 1) {
    modules[8][size - 1 - i] = getBit(i);
    isFunction[8][size - 1 - i] = true;
  }
  for (let i = 8; i < 15; i += 1) {
    modules[size - 15 + i][8] = getBit(i);
    isFunction[size - 15 + i][8] = true;
  }

  // Dark module
  modules[size - 8][8] = true;
  isFunction[size - 8][8] = true;
}

function drawVersion7InfoIfNeeded(
  modules: boolean[][],
  isFunction: boolean[][],
  spec: QrVersionSpec,
): void {
  if (spec.version < 7) return;
  let rem = spec.version;
  for (let i = 0; i < 12; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  const bits = (spec.version << 12) | rem;
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = spec.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    modules[a][b] = bit;
    isFunction[a][b] = true;
    modules[b][a] = bit;
    isFunction[b][a] = true;
  }
}

export function generateQrCodeMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text.trim() || "https://kudaprima.id");
  const spec =
    QR_VERSION_SPECS.find((s) => utf8Bytes.length <= s.totalDataCodewords - 2) ??
    QR_VERSION_SPECS[QR_VERSION_SPECS.length - 1];

  const maxPayloadLen = spec.totalDataCodewords - 2;
  const boundedBytes =
    utf8Bytes.length > maxPayloadLen
      ? utf8Bytes.slice(0, maxPayloadLen)
      : utf8Bytes;

  const size = spec.size;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  // 1. Finder patterns
  drawFinderPattern(modules, isFunction, 0, 0, size);
  drawFinderPattern(modules, isFunction, 0, size - 7, size);
  drawFinderPattern(modules, isFunction, size - 7, 0, size);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    modules[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    modules[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  // 3. Alignment patterns
  const centers = spec.alignmentCenters;
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = 0; j < centers.length; j += 1) {
      const isCornerFinder =
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0);
      if (!isCornerFinder) {
        drawAlignmentPattern(modules, isFunction, centers[i], centers[j]);
      }
    }
  }

  // 4. Reserve Format & Version Info areas
  drawFormatInformation(modules, isFunction, size, 0);
  drawVersion7InfoIfNeeded(modules, isFunction, spec);

  // 5. Place data and EC codewords in upward/downward 2-column zig-zag
  const allCodewords = encodeDataCodewords(boundedBytes, spec);
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;

  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) {
      rightCol = 5;
    }
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = rightCol - dx;
        if (!isFunction[r][c]) {
          let bit = false;
          if (bitIdx < totalBits) {
            const byte = allCodewords[bitIdx >>> 3];
            bit = ((byte >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx += 1;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            bit = !bit;
          }
          modules[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Re-write format info to ensure crisp final bits
  drawFormatInformation(modules, isFunction, size, 0);
  return modules;
}
