/**
 * Thai Word Tokenizer using Dictionary-based Maximal Matching with TCC constraints.
 */

// Thai combining marks that cannot start a new token (vowels, tone marks, garan)
const COMBINING_MARKS = new Set([
  '\u0E31', '\u0E34', '\u0E35', '\u0E36', '\u0E37', '\u0E38', '\u0E39', '\u0E3A',
  '\u0E47', '\u0E48', '\u0E49', '\u0E4A', '\u0E4B', '\u0E4C', '\u0E4D', '\u0E4E'
]);

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isWord = false;
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      let next = node.children.get(char);
      if (!next) {
        next = new TrieNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.isWord = true;
  }

  /**
   * Find the longest matching word in the trie starting at text[startIdx]
   * that does NOT violate Thai combining mark boundaries.
   */
  findLongestMatch(text, startIdx) {
    let node = this.root;
    let longestMatch = null;
    const n = text.length;

    for (let i = startIdx; i < n; i++) {
      const char = text[i];
      node = node.children.get(char);
      if (!node) break;

      if (node.isWord) {
        const nextIdx = i + 1;
        // Validate boundary: the character immediately following cannot be a combining mark
        if (nextIdx < n && COMBINING_MARKS.has(text[nextIdx])) {
          continue;
        }
        longestMatch = text.substring(startIdx, nextIdx);
      }
    }
    return longestMatch;
  }
}

export class Tokenizer {
  constructor(words) {
    this.trie = new Trie();
    if (words) {
      this.loadWords(words);
    }
  }

  loadWords(words) {
    const wordList = Array.isArray(words) ? words : Object.keys(words);
    for (let i = 0; i < wordList.length; i++) {
      const w = wordList[i];
      if (w) this.trie.insert(w);
    }
  }

  tokenize(text) {
    if (!text) return [];
    const tokens = [];
    const n = text.length;
    let i = 0;

    while (i < n) {
      const char = text[i];

      // Whitespace handling
      if (/\s/.test(char)) {
        let end = i + 1;
        while (end < n && /\s/.test(text[end])) end++;
        tokens.push(text.substring(i, end));
        i = end;
        continue;
      }

      // Try longest match from trie
      const match = this.trie.findLongestMatch(text, i);
      if (match) {
        tokens.push(match);
        i += match.length;
      } else {
        // Unknown token: consume non-Thai chunk or single character
        if (/[A-Za-z0-9]/.test(char)) {
          let end = i + 1;
          while (end < n && /[A-Za-z0-9]/.test(text[end])) end++;
          tokens.push(text.substring(i, end));
          i = end;
        } else {
          // Single character (with any trailing combining marks attached)
          let end = i + 1;
          while (end < n && COMBINING_MARKS.has(text[end])) end++;
          tokens.push(text.substring(i, end));
          i = end;
        }
      }
    }

    return tokens;
  }
}
