// Shared Gen 1/Gen 2 character decoding tables and functions
// Extracted to avoid circular imports between parsers and worldState modules.

// Gen 1 character encoding
const GEN1_CHARS: Record<number, string> = {};
for (let i = 0; i < 26; i++) GEN1_CHARS[0x80 + i] = String.fromCharCode(65 + i);
for (let i = 0; i < 26; i++) GEN1_CHARS[0xA0 + i] = String.fromCharCode(97 + i);
for (let i = 0; i < 10; i++) GEN1_CHARS[0xF6 + i] = String(i);
GEN1_CHARS[0x7F] = ' ';
GEN1_CHARS[0x50] = ''; // Terminator

export function decodeGen1String(buf: Buffer, offset: number, maxLen: number): string {
  let result = '';
  for (let i = 0; i < maxLen; i++) {
    const c = buf[offset + i];
    if (c === 0x50) break;
    result += GEN1_CHARS[c] || '?';
  }
  return result;
}

// Gen 2 character encoding (same table as Gen 1)
const GEN2_CHARS: Record<number, string> = {};
for (let i = 0; i < 26; i++) GEN2_CHARS[0x80 + i] = String.fromCharCode(65 + i);
for (let i = 0; i < 26; i++) GEN2_CHARS[0xA0 + i] = String.fromCharCode(97 + i);
for (let i = 0; i < 10; i++) GEN2_CHARS[0xF6 + i] = String(i);
GEN2_CHARS[0x7F] = ' ';
GEN2_CHARS[0x50] = '';

export function decodeGen2String(buf: Buffer, offset: number, maxLen: number): string {
  let result = '';
  for (let i = 0; i < maxLen; i++) {
    const c = buf[offset + i];
    if (c === 0x50) break;
    result += GEN2_CHARS[c] || '?';
  }
  return result;
}

// Gen 3 character encoding (GBA games)
// Different from Gen 1/2: A=0xBB, a=0xD5, 0-9=0xA1, terminator=0xFF, space=0x00
const GEN3_CHARS: Record<number, string> = { 0x00: ' ' };
for (let i = 0; i < 26; i++) GEN3_CHARS[0xBB + i] = String.fromCharCode(65 + i); // A-Z
for (let i = 0; i < 26; i++) GEN3_CHARS[0xD5 + i] = String.fromCharCode(97 + i); // a-z
for (let i = 0; i < 10; i++) GEN3_CHARS[0xA1 + i] = String(i); // 0-9
GEN3_CHARS[0xAB] = '!'; GEN3_CHARS[0xAC] = '?'; GEN3_CHARS[0xAD] = '.';
GEN3_CHARS[0xAE] = '-'; GEN3_CHARS[0xB0] = '\u2026'; // ellipsis
GEN3_CHARS[0xB1] = '\u201C'; GEN3_CHARS[0xB2] = '\u201D'; // smart quotes
GEN3_CHARS[0xB3] = '\u2018'; GEN3_CHARS[0xB4] = '\u2019'; // smart single quotes
GEN3_CHARS[0xB5] = '\u2642'; GEN3_CHARS[0xB6] = '\u2640'; // ♂ ♀
GEN3_CHARS[0xB7] = '$'; GEN3_CHARS[0xB8] = ','; GEN3_CHARS[0xBA] = '/';

export function decodeGen3String(buf: Buffer, offset: number, maxLen: number): string {
  let result = '';
  for (let i = 0; i < maxLen; i++) {
    const c = buf[offset + i];
    if (c === 0xFF) break; // Gen 3 terminator
    result += GEN3_CHARS[c] || '?';
  }
  return result;
}

// Gen 4 character encoding (DS games: DPPt, HGSS)
// Gen 4 uses 16-bit character codes that are NOT standard Unicode.
// This table maps internal u16 values → Unicode characters.
// Source: PKHeX StringConverter4Util.cs TableINT
// Only the half-width Latin section (0x0121+) is commonly used for English text.
// Japanese hiragana/katakana occupy 0x0001-0x00A1.
// Full table covers 0x0000-0x01EC.
const GEN4_TABLE: string[] = [
  // 0x000-0x00F: hiragana
  '\0', '\u3000', 'ぁ', 'あ', 'ぃ', 'い', 'ぅ', 'う', 'ぇ', 'え', 'ぉ', 'お', 'か', 'が', 'き', 'ぎ',
  // 0x010-0x01F
  'く', 'ぐ', 'け', 'げ', 'こ', 'ご', 'さ', 'ざ', 'し', 'じ', 'す', 'ず', 'せ', 'ぜ', 'そ', 'ぞ',
  // 0x020-0x02F
  'た', 'だ', 'ち', 'ぢ', 'っ', 'つ', 'づ', 'て', 'で', 'と', 'ど', 'な', 'に', 'ぬ', 'ね', 'の',
  // 0x030-0x03F
  'は', 'ば', 'ぱ', 'ひ', 'び', 'ぴ', 'ふ', 'ぶ', 'ぷ', 'へ', 'べ', 'ぺ', 'ほ', 'ぼ', 'ぽ', 'ま',
  // 0x040-0x04F
  'み', 'む', 'め', 'も', 'ゃ', 'や', 'ゅ', 'ゆ', 'ょ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ',
  // 0x050-0x05F: katakana
  'を', 'ん', 'ァ', 'ア', 'ィ', 'イ', 'ゥ', 'ウ', 'ェ', 'エ', 'ォ', 'オ', 'カ', 'ガ', 'キ', 'ギ',
  // 0x060-0x06F
  'ク', 'グ', 'ケ', 'ゲ', 'コ', 'ゴ', 'サ', 'ザ', 'シ', 'ジ', 'ス', 'ズ', 'セ', 'ゼ', 'ソ', 'ゾ',
  // 0x070-0x07F
  'タ', 'ダ', 'チ', 'ヂ', 'ッ', 'ツ', 'ヅ', 'テ', 'デ', 'ト', 'ド', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
  // 0x080-0x08F
  'ハ', 'バ', 'パ', 'ヒ', 'ビ', 'ピ', 'フ', 'ブ', 'プ', 'ヘ', 'ベ', 'ペ', 'ホ', 'ボ', 'ポ', 'マ',
  // 0x090-0x09F
  'ミ', 'ム', 'メ', 'モ', 'ャ', 'ヤ', 'ュ', 'ユ', 'ョ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ',
  // 0x0A0-0x0AF: full-width digits + uppercase
  'ヲ', 'ン', '０', '１', '２', '３', '４', '５', '６', '７', '８', '９', 'Ａ', 'Ｂ', 'Ｃ', 'Ｄ',
  // 0x0B0-0x0BF
  'Ｅ', 'Ｆ', 'Ｇ', 'Ｈ', 'Ｉ', 'Ｊ', 'Ｋ', 'Ｌ', 'Ｍ', 'Ｎ', 'Ｏ', 'Ｐ', 'Ｑ', 'Ｒ', 'Ｓ', 'Ｔ',
  // 0x0C0-0x0CF: full-width uppercase cont + lowercase
  'Ｕ', 'Ｖ', 'Ｗ', 'Ｘ', 'Ｙ', 'Ｚ', 'ａ', 'ｂ', 'ｃ', 'ｄ', 'ｅ', 'ｆ', 'ｇ', 'ｈ', 'ｉ', 'ｊ',
  // 0x0D0-0x0DF
  'ｋ', 'ｌ', 'ｍ', 'ｎ', 'ｏ', 'ｐ', 'ｑ', 'ｒ', 'ｓ', 'ｔ', 'ｕ', 'ｖ', 'ｗ', 'ｘ', 'ｙ', 'ｚ',
  // 0x0E0-0x0EF: full-width symbols
  '\0', '！', '？', '、', '。', '…', '・', '／', '「', '」', '『', '』', '（', '）', '♂', '♀',
  // 0x0F0-0x0FF
  '＋', 'ー', '×', '÷', '＝', '～', '：', '；', '．', '，', '♠', '♣', '♥', '♦', '★', '◎',
  // 0x100-0x10F
  '○', '□', '△', '◇', '＠', '♪', '％', '☀', '☁', '☂', '☃', '①', '②', '③', '④', '⑤',
  // 0x110-0x11F
  '⑥', '⑦', '円', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '←', '↑', '↓', '→', '►',
  // 0x120-0x12F: half-width Latin (used for English text)
  '&', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E',
  // 0x130-0x13F
  'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
  // 0x140-0x14F
  'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
  // 0x150-0x15F
  'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'À',
  // 0x160-0x16F: accented Latin
  'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð',
  // 0x170-0x17F
  'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', '⑧', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Þ', 'ß', 'à',
  // 0x180-0x18F
  'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ð',
  // 0x190-0x19F
  'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', '⑨', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'þ', 'ÿ', 'Œ',
  // 0x1A0-0x1AF: symbols + punctuation
  'œ', 'Ş', 'ş', 'ª', 'º', '⑩', '⑪', '⑫', '$', '¡', '¿', '!', '?', ',', '.', '⑬',
  // 0x1B0-0x1BF
  '･', '/', '\u2018', "'", '\u201C', '\u201D', '„', '«', '»', '(', ')', '♂', '♀', '+', '-', '*',
  // 0x1C0-0x1CF
  '#', '=', '&', '~', ':', ';', '⑯', '⑰', '⑱', '⑲', '⑳', '⑴', '⑵', '⑶', '⑷', '⑸',
  // 0x1D0-0x1DF
  '@', '⑹', '%', '⑺', '⑻', '⑼', '⑽', '⑾', '⑿', '⒀', '⒁', '⒂', '⒃', '⒄', ' ', '⒅',
  // 0x1E0-0x1EC
  '⒆', '⒇', '⒈', '⒉', '⒊', '⒋', '⒌', '⒍', '°', '_', '＿', '⒎', '⒏',
];

/**
 * Decode a Gen 4 u16 character string from a buffer.
 * Gen 4 stores text as u16 LE values using a custom encoding table.
 * Terminated by 0xFFFF.
 */
export function decodeGen4String(buf: Buffer, offset: number, maxChars: number): string {
  let result = '';
  for (let i = 0; i < maxChars; i++) {
    const code = buf.readUInt16LE(offset + i * 2);
    if (code === 0xFFFF || code === 0x0000) break;
    const ch = code < GEN4_TABLE.length ? GEN4_TABLE[code] : '?';
    result += ch || '?';
  }
  return result;
}
