/**
 * Thai G2P (Grapheme-to-Phoneme) Engine in pure JavaScript.
 * Ported from MakHamTTS / FastThaiG2P.
 */

import { normalize } from "./normalizer.js";
import { Tokenizer } from "./tokenizer.js";

// Single Thai consonants mapped to their spoken Thai letter name (for standalone consonants)
const THAI_LETTER_NAMES = {
  "ก": "กอ", "ข": "ขอ", "ฃ": "ขอ", "ค": "คอ", "ฅ": "คอ", "ฆ": "คอ",
  "ง": "งอ", "จ": "จอ", "ฉ": "ฉอ", "ช": "ชอ", "ซ": "ซอ", "ฌ": "ชอ",
  "ญ": "ยอ", "ฎ": "ดอ", "ฏ": "ตอ", "ฐ": "ถอ", "ฑ": "ทอ", "ฒ": "ทอ",
  "ณ": "นอ", "ด": "ดอ", "ต": "ตอ", "ถ": "ถอ", "ท": "ทอ", "ธ": "ทอ",
  "น": "นอ", "บ": "บอ", "ป": "ปอ", "ผ": "ผอ", "ฝ": "ฝอ", "พ": "พอ",
  "ฟ": "ฟอ", "ภ": "พอ", "ม": "มอ", "ย": "ยอ", "ร": "รอ", "ล": "ลอ",
  "ว": "วอ", "ศ": "สอ", "ษ": "สอ", "ส": "สอ", "ห": "หอ", "ฬ": "ลอ",
  "อ": "ออ", "ฮ": "ฮอ"
};

export class G2P {
  constructor(dict) {
    this.dict = dict || {};
    this.tokenizer = new Tokenizer(this.dict);
  }

  setDictionary(dict) {
    this.dict = dict;
    this.tokenizer = new Tokenizer(this.dict);
  }

  /**
   * Convert Thai text into Kokoro phoneme representation.
   */
  convert(text) {
    if (!text || !text.trim()) return "";

    const normalized = normalize(text);
    const tokens = this.tokenizer.tokenize(normalized);
    const phonemeParts = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) continue;

      // 1. Exact match in Kokoro phoneme dictionary
      if (this.dict[token]) {
        phonemeParts.push(this.dict[token]);
        continue;
      }

      // 2. Standalone Thai consonant name
      if (THAI_LETTER_NAMES[token] && this.dict[THAI_LETTER_NAMES[token]]) {
        phonemeParts.push(this.dict[THAI_LETTER_NAMES[token]]);
        continue;
      }

      // 3. Sub-word fallback for compound words not directly in dict
      let subIdx = 0;
      let matchedAny = false;
      const subParts = [];
      while (subIdx < token.length) {
        let subMatch = null;
        for (let l = token.length - subIdx; l >= 1; l--) {
          const sub = token.substring(subIdx, subIdx + l);
          if (this.dict[sub]) {
            subMatch = sub;
            break;
          }
        }
        if (subMatch) {
          subParts.push(this.dict[subMatch]);
          subIdx += subMatch.length;
          matchedAny = true;
        } else {
          // If a single Thai character has a letter name
          const singleChar = token[subIdx];
          if (THAI_LETTER_NAMES[singleChar] && this.dict[THAI_LETTER_NAMES[singleChar]]) {
            subParts.push(this.dict[THAI_LETTER_NAMES[singleChar]]);
            matchedAny = true;
          } else {
            // Keep punctuation/Latin symbol as is if applicable
            subParts.push(singleChar);
          }
          subIdx++;
        }
      }

      if (matchedAny) {
        phonemeParts.push(subParts.join(" "));
      } else {
        // Fallback: pass token as is (punctuation/symbols)
        phonemeParts.push(token);
      }
    }

    return phonemeParts.join(" ").replace(/\s+/g, " ").trim();
  }
}
