/**
 * Text normalization for Thai TTS — JavaScript port of makhamtts.normalizer
 * 
 * Converts numbers, abbreviations, and special characters to speakable Thai text:
 * - expand maiyamok (ๆ)
 * - convert thai numerals to arabic
 * - read emails
 * - read english abbreviations
 * - read units
 * - read symbols
 * - read time patterns
 * - read phone numbers
 * - read alphanumeric letters together
 * - read comma numbers
 * - read numbers (with Thai place values: ล้าน, แสน, หมื่น, พัน, ร้อย, สิบ, หน่วย)
 * - read thai abbreviations
 * - read residual latin letters
 */

const THAI_DIGITS = {
  "0": "ศูนย์",
  "1": "หนึ่ง",
  "2": "สอง",
  "3": "สาม",
  "4": "สี่",
  "5": "ห้า",
  "6": "หก",
  "7": "เจ็ด",
  "8": "แปด",
  "9": "เก้า",
};

const THAI_NUMERAL_MAP = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9",
};

const LETTER_TO_THAI = {
  "A": "เอ", "B": "บี", "C": "ซี", "D": "ดี", "E": "อี",
  "F": "เอฟ", "G": "จี", "H": "เอช", "I": "ไอ", "J": "เจ",
  "K": "เค", "L": "แอล", "M": "เอ็ม", "N": "เอ็น", "O": "โอ",
  "P": "พี", "Q": "คิว", "R": "อาร์", "S": "เอส", "T": "ที",
  "U": "ยู", "V": "วี", "W": "ดับเบิลยู", "X": "เอ็กซ์",
  "Y": "วาย", "Z": "แซด",
};

const ABBREVIATIONS = {
  // Months
  "ม.ค.": "มกราคม", "ก.พ.": "กุมภาพันธ์", "มี.ค.": "มีนาคม",
  "เม.ย.": "เมษายน", "พ.ค.": "พฤษภาคม", "มิ.ย.": "มิถุนายน",
  "ก.ค.": "กรกฎาคม", "ส.ค.": "สิงหาคม", "ก.ย.": "กันยายน",
  "ต.ค.": "ตุลาคม", "พ.ย.": "พฤศจิกายน", "ธ.ค.": "ธันวาคม",
  // Eras
  "พ.ศ.": "พุทธศักราช", "ค.ศ.": "คริสต์ศักราช",
  // Titles
  "น.ส.": "นางสาว", "นส.": "นางสาว",
  "ผศ.": "ผู้ช่วยศาสตราจารย์", "รศ.": "รองศาสตราจารย์",
  "ดร.": "ด็อกเตอร์",
  "นพ.": "นายแพทย์", "พญ.": "แพทย์หญิง",
  "ทพ.": "ทันตแพทย์", "ทพญ.": "ทันตแพทย์หญิง",
  "น.สพ.": "นายสัตวแพทย์", "สพ.ญ.": "สัตวแพทย์หญิง",
  "ภก.": "เภสัชกร", "ภญ.": "เภสัชกรหญิง",
  "ทนพ.": "เทคนิคการแพทย์", "กภ.": "กายภาพบำบัด",
  // Army
  "พล.อ.": "พลเอก", "พล.ท.": "พลโท", "พล.ต.": "พลตรี",
  "พ.อ.": "พันเอก", "พ.ท.": "พันโท", "พ.ต.": "พันตรี",
  "ร.อ.": "ร้อยเอก", "ร.ท.": "ร้อยโท", "ร.ต.": "ร้อยตรี",
  "จ.ส.อ.": "จ่าสิบเอก", "จ.ส.ท.": "จ่าสิบโท", "จ.ส.ต.": "จ่าสิบตรี",
  "ส.อ.": "สิบเอก", "ส.ท.": "สิบโท", "ส.ต.": "สิบตรี",
  // Police
  "พล.ต.อ.": "พลตำรวจเอก", "พล.ต.ท.": "พลตำรวจโท", "พล.ต.ต.": "พลตำรวจตรี",
  "พ.ต.อ.": "พันตำรวจเอก", "พ.ต.ท.": "พันตำรวจโท", "พ.ต.ต.": "พันตำรวจตรี",
  "ร.ต.อ.": "ร้อยตำรวจเอก", "ร.ต.ท.": "ร้อยตำรวจโท", "ร.ต.ต.": "ร้อยตำรวจตรี",
  "ด.ต.": "ดาบตำรวจ",
  // Navy
  "พล.ร.อ.": "พลเรือเอก", "พล.ร.ท.": "พลเรือโท", "พล.ร.ต.": "พลเรือตรี",
  "น.อ.": "นาวาเอก", "น.ท.": "นาวาโท", "น.ต.": "นาวาตรี",
  "พ.จ.อ.": "พันจ่าเอก", "พ.จ.ท.": "พันจ่าโท", "พ.จ.ต.": "พันจ่าตรี",
  "จ.อ.": "จ่าเอก", "จ.ท.": "จ่าโท", "จ.ต.": "จ่าตรี",
  // Air Force
  "พล.อ.อ.": "พลอากาศเอก", "พล.อ.ท.": "พลอากาศโท", "พล.อ.ต.": "พลอากาศตรี",
  "พ.อ.อ.": "พันจ่าอากาศเอก", "พ.อ.ท.": "พันจ่าอากาศโท", "พ.อ.ต.": "พันจ่าอากาศตรี",
  // Royal & Noble
  "ม.จ.": "หม่อมเจ้า", "ม.ร.ว.": "หม่อมราชวงศ์", "ม.ล.": "หม่อมหลวง",
  // Common
  "กทม.": "กรุงเทพมหานคร",
  "รร.": "โรงเรียน", "ร.ร.": "โรงเรียน",
  "รพ.": "โรงพยาบาล", "ร.พ.": "โรงพยาบาล",
  "บจก.": "บริษัทจำกัด",
  "ฯลฯ": "เป็นต้น",
};

const SYMBOLS = {
  "%": "เปอร์เซ็นต์",
  "°C": "องศาเซลเซียส",
  "°F": "องศาฟาเรนไฮต์",
  "°": "องศา",
  "@": " แอท ",
  "/": " ทับ ",
};

const ENGLISH_ABBREVS = {
  "thb": "บาท", "usd": "ดอลลาร์", "eur": "ยูโร",
  "vat": "แวต", "pin": "พิน",
  "ram": "แรม", "wifi": "ไวไฟ", "otp": "โอทีพี",
  "covid": "โควิด", "fifa": "ฟีฟ่า",
  "line": "ไลน์", "facebook": "เฟซบุ๊ก", "instagram": "อินสตาแกรม",
  "amazon": "อมาซอน", "twitter": "ทวิตเตอร์",
  "google": "กูเกิล", "youtube": "ยูทูบ", "tiktok": "ติ๊กต็อก",
  "gmail": "จีเมล", "hotmail": "ฮอตเมล",
  "email": "อีเมล", "com": "คอม", "net": "เน็ต",
  "app": "แอป", "lazada": "ลาซาด้า", "shopee": "ช้อปปี้",
  "grab": "แกร็บ", "uber": "อูเบอร์", "whatsapp": "วอทส์แอป",
  "paypal": "เพย์พาล", "promptpay": "พร้อมเพย์", "truemoney": "ทรูมันนี่",
};

const UNITS = {
  "km": "กิโลเมตร", "cm": "เซนติเมตร", "mm": "มิลลิเมตร", "ml": "มิลลิลิตร",
  "kwh": "กิโลวัตต์ชั่วโมง", "kw": "กิโลวัตต์",
  "mb": "เมกะไบต์", "gb": "กิกะไบต์", "tb": "เทราไบต์", "kb": "กิโลไบต์",
  "mbps": "เมกะบิตต่อวินาที",
  "กม.": "กิโลเมตร", "ซม.": "เซนติเมตร", "มม.": "มิลลิเมตร",
  "ตร.กม.": "ตารางกิโลเมตร", "ตร.ม.": "ตารางเมตร", "ตร.ซม.": "ตารางเซนติเมตร",
  "ตร.มม.": "ตารางมิลลิเมตร", "ตร.ว.": "ตารางวา",
  "ลบ.ม.": "ลูกบาศก์เมตร", "ลบ.ซม.": "ลูกบาศก์เซนติเมตร", "มล.": "มิลลิลิตร", "กล.": "กิโลลิตร",
  "กก.": "กิโลกรัม", "มก.": "มิลลิกรัม",
  "kg": "กิโลกรัม", "mg": "มิลลิกรัม",
};

const _EMAIL_SEPARATORS = { "@": " แอท ", ".": " ดอท ", "-": " ขีด ", "_": " ขีดล่าง " };
const _EMAIL_WORDS = {
  "gmail": "จีเมล", "hotmail": "ฮอตเมล", "yahoo": "ยาฮู",
  "outlook": "เอาต์ลุก", "com": "คอม", "net": "เน็ต", "org": "ออร์ก",
  "mail": "เมล", "email": "อีเมล",
};

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const _SYMBOL_PATTERN = new RegExp(
  Object.keys(SYMBOLS).sort((a, b) => b.length - a.length).map(escapeRegex).join("|"),
  "g"
);

const _ENGLISH_ABBREV_PATTERN = new RegExp(
  "\\b(" + Object.keys(ENGLISH_ABBREVS).sort((a, b) => b.length - a.length).map(escapeRegex).join("|") + ")\\b",
  "gi"
);

const _UNIT_PATTERN = new RegExp(
  "(?<=\\d)\\s*(" + Object.keys(UNITS).sort((a, b) => b.length - a.length).map(escapeRegex).join("|") + ")",
  "g"
);

const _TIME_PATTERN = /\b(\d{1,2}):(\d{2})(?:\s*(?:นาฬิกา|น\.))?/g;
const _EMAIL_PATTERN = /[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const _PHONE_PATTERN = /\b\d{2,4}[-\.]\d{3,4}[-\.]\d{3,4}\b/g;
const _ALPHANUM_ID_PATTERN = /\b(?:[A-Za-z]+-?\d+[-\dA-Za-z]*|\d+-?[A-Za-z]+[-\dA-Za-z]*)\b/g;
const _COMMA_NUMBER_PATTERN = /-?\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g;
const _NUMBER_PATTERN = /-?\b\d+(?:\.\d+)?\b/g;

const _ABBREV_PATTERN = new RegExp(
  Object.keys(ABBREVIATIONS).sort((a, b) => b.length - a.length).map(escapeRegex).join("|"),
  "g"
);
const _LATIN_RESIDUE_PATTERN = /[A-Za-z]+/g;

function _numberGroupToThai(n) {
  if (n === 0) return "";
  const parts = [];
  let remaining = n;
  const places = [100000, 10000, 1000, 100, 10, 1];
  for (const place of places) {
    const digit = Math.floor(remaining / place);
    remaining = remaining % place;
    if (digit === 0) continue;
    if (place === 1) {
      if (n > 1 && digit === 1) {
        parts.push("เอ็ด");
      } else {
        parts.push(THAI_DIGITS[String(digit)]);
      }
    } else if (place === 10) {
      if (digit === 1) {
        parts.push("สิบ");
      } else if (digit === 2) {
        parts.push("ยี่สิบ");
      } else {
        parts.push(THAI_DIGITS[String(digit)] + "สิบ");
      }
    } else if (place === 100) {
      parts.push(THAI_DIGITS[String(digit)] + "ร้อย");
    } else if (place === 1000) {
      parts.push(THAI_DIGITS[String(digit)] + "พัน");
    } else if (place === 10000) {
      parts.push(THAI_DIGITS[String(digit)] + "หมื่น");
    } else if (place === 100000) {
      parts.push(THAI_DIGITS[String(digit)] + "แสน");
    }
  }
  return parts.join("");
}

function _integerToThai(n) {
  if (n === 0) return "ศูนย์";
  if (n < 0) return "ลบ" + _integerToThai(-n);
  const parts = [];
  let millionCount = 0;
  let remaining = n;
  while (remaining > 0) {
    const group = remaining % 1000000;
    remaining = Math.floor(remaining / 1000000);
    if (group > 0) {
      const groupText = _numberGroupToThai(group);
      const suffix = "ล้าน".repeat(millionCount);
      parts.push(groupText + suffix);
    }
    millionCount += 1;
  }
  return parts.reverse().join("");
}

function _decimalToThai(text) {
  if (text.includes(".")) {
    const [intPart, decPart] = text.split(".");
    const intThai = _integerToThai(parseInt(intPart || "0", 10));
    const decThai = decPart.split("").map(d => THAI_DIGITS[d] || d).join("");
    return intThai + "จุด" + decThai;
  }
  return _integerToThai(parseInt(text, 10));
}

function _digitsToThai(digits) {
  return digits.split("").map(d => THAI_DIGITS[d] || d).join("");
}

function _emailToThai(match) {
  const out = [];
  let token = "";
  function flush() {
    if (token) {
      const lower = token.toLowerCase();
      if (_EMAIL_WORDS[lower]) {
        out.push(_EMAIL_WORDS[lower]);
      } else {
        out.push(
          token.split("").map(c => {
            if (/\d/.test(c)) return THAI_DIGITS[c] || c;
            const upper = c.toUpperCase();
            return LETTER_TO_THAI[upper] || c;
          }).join("")
        );
      }
      token = "";
    }
  }
  for (const char of match) {
    if (_EMAIL_SEPARATORS[char]) {
      flush();
      out.push(_EMAIL_SEPARATORS[char]);
    } else {
      token += char;
    }
  }
  flush();
  return out.join("");
}

function _timeToThai(match, p1, p2) {
  const hours = parseInt(p1, 10);
  const minutes = parseInt(p2, 10);
  let result = _integerToThai(hours) + "นาฬิกา";
  if (minutes > 0) {
    result += _integerToThai(minutes) + "นาที";
  }
  return result;
}

function _phoneNumberToThai(match) {
  const parts = match.split(/[-.]/);
  return parts.map(_digitsToThai).join(" ");
}

function _alphanumToThai(match) {
  const result = [];
  for (const char of match) {
    if (/\d/.test(char)) {
      result.push(THAI_DIGITS[char]);
    } else if (LETTER_TO_THAI[char.toUpperCase()]) {
      result.push(LETTER_TO_THAI[char.toUpperCase()]);
    } else if (char === "-") {
      result.push(" ");
    } else {
      result.push(char);
    }
  }
  return result.join("");
}

function _numberOrIdToThai(match) {
  const raw = match.replace(/^-/, "");
  const negative = match.startsWith("-");
  const intPart = raw.includes(".") ? raw.split(".")[0] : raw;
  if (intPart.length >= 7) {
    let result = _digitsToThai(raw.replace(".", "จุด").replace("-", ""));
    if (raw.includes(".")) {
      const [ip, dp] = raw.split(".");
      result = _digitsToThai(ip) + "จุด" + _digitsToThai(dp);
    } else {
      result = _digitsToThai(intPart);
    }
    if (negative) result = "ลบ" + result;
    return result;
  }
  return _decimalToThai(match);
}

function expandMaiyamok(text) {
  if (!text.includes("ๆ")) return text;
  // Match repeated word before ๆ
  // In Thai: e.g. "เร็วๆ" -> "เร็วเร็ว", "เด็กๆ" -> "เด็กเด็ก", "มากๆ" -> "มากมาก"
  // Handles spaces and repeated ๆ marks
  return text.replace(/([ก-๙a-zA-Z0-9]+)\s*ๆ+/g, (m, word) => word + word);
}

function thaiNumeralsToArabic(text) {
  return text.replace(/[๐-๙]/g, c => THAI_NUMERAL_MAP[c] || c);
}

export function normalize(text) {
  if (!text) return "";
  text = expandMaiyamok(text);
  text = thaiNumeralsToArabic(text);
  text = text.replace(_EMAIL_PATTERN, _emailToThai);
  text = text.replace(_ENGLISH_ABBREV_PATTERN, m => ENGLISH_ABBREVS[m.toLowerCase()] || m);
  text = text.replace(_UNIT_PATTERN, (m, unit) => UNITS[unit] || unit);
  text = text.replace(_SYMBOL_PATTERN, m => SYMBOLS[m] || m);
  text = text.replace(_TIME_PATTERN, _timeToThai);
  text = text.replace(_PHONE_PATTERN, _phoneNumberToThai);
  text = text.replace(_ALPHANUM_ID_PATTERN, _alphanumToThai);
  text = text.replace(_COMMA_NUMBER_PATTERN, m => _decimalToThai(m.replace(/,/g, "")));
  text = text.replace(_NUMBER_PATTERN, _numberOrIdToThai);
  text = text.replace(_ABBREV_PATTERN, m => ABBREVIATIONS[m] || m);
  text = text.replace(_LATIN_RESIDUE_PATTERN, m => {
    return m.split("").map(c => LETTER_TO_THAI[c.toUpperCase()] || c).join("");
  });
  text = text.replace(/-/g, " ");
  return text;
}
