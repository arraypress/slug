/**
 * @arraypress/slug
 *
 * URL slug generation with transliteration, collision handling,
 * and flexible options. Zero dependencies.
 *
 * Works in Node.js, Cloudflare Workers, Deno, Bun, and browsers.
 *
 * @module @arraypress/slug
 */

// ── Transliteration Map ─────────────────────

const TRANSLITERATE = {
  // Latin accented
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
  'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i',
  'î': 'i', 'ï': 'i', 'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o',
  'õ': 'o', 'ö': 'o', 'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'þ': 'th', 'ÿ': 'y', 'ß': 'ss',
  // Central/Eastern European
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ś': 's', 'ź': 'z',
  'ż': 'z', 'č': 'c', 'ď': 'd', 'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's',
  'ť': 't', 'ů': 'u', 'ž': 'z', 'ő': 'o', 'ű': 'u',
  // Turkish
  'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
  // Nordic
  'đ': 'd',
  // Symbols & currency
  '&': 'and', '@': 'at', '€': 'eur', '£': 'gbp', '$': 'usd', '¥': 'yen',
  '©': 'c', '®': 'r', '™': 'tm',
};

// ── Core Functions ──────────────────────────

/**
 * Generate a URL-safe slug from a string.
 *
 * @param {string} input - String to slugify.
 * @param {Object} [options]
 * @param {string} [options.separator='-'] - Word separator.
 * @param {boolean} [options.lowercase=true] - Convert to lowercase.
 * @param {boolean} [options.transliterate=true] - Convert accented chars to ASCII.
 * @param {number} [options.maxLength=0] - Max length (0 = unlimited). Truncates at word boundary.
 * @param {string[]} [options.stopWords] - Words to remove (e.g. ['the', 'a', 'an']).
 * @returns {string} URL-safe slug.
 *
 * @example
 * slugify('Hello World!')                    // 'hello-world'
 * slugify('Crème Brûlée Recipe')             // 'creme-brulee-recipe'
 * slugify('My Product™ — Pro Edition')       // 'my-producttm-pro-edition'
 * slugify('Hello World', { separator: '_' }) // 'hello_world'
 * slugify('Hello World', { lowercase: false }) // 'Hello-World'
 * slugify('The Quick Brown Fox', { stopWords: ['the'] }) // 'quick-brown-fox'
 * slugify('A Very Long Title Here', { maxLength: 15 })   // 'a-very-long'
 */
export function slugify(input, options = {}) {
  if (!input || typeof input !== 'string') return '';

  const {
    separator = '-',
    lowercase = true,
    transliterate = true,
    maxLength = 0,
    stopWords = [],
  } = options;

  let str = input.trim();

  // Lowercase first (before transliteration so map keys match)
  if (lowercase) str = str.toLowerCase();

  // Transliterate accented characters
  if (transliterate) {
    str = str.split('').map((char) => {
      const lower = char.toLowerCase();
      return TRANSLITERATE[lower] !== undefined ? TRANSLITERATE[lower] : char;
    }).join('');
  }

  // Replace non-alphanumeric characters with separator
  str = str.replace(/[^a-zA-Z0-9]+/g, separator);

  // Remove leading/trailing separators
  str = str.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');

  // Collapse multiple separators
  str = str.replace(new RegExp(`\\${separator}{2,}`, 'g'), separator);

  // Remove stop words
  if (stopWords.length > 0) {
    const words = str.split(separator);
    const stopSet = new Set(stopWords.map((w) => w.toLowerCase()));
    const filtered = words.filter((w) => !stopSet.has(w));
    str = filtered.length > 0 ? filtered.join(separator) : words.join(separator);
  }

  // Truncate at word boundary
  if (maxLength > 0 && str.length > maxLength) {
    const truncated = str.substring(0, maxLength);
    // If we cut mid-word, step back to the last separator
    if (str[maxLength] !== separator && truncated.includes(separator)) {
      const lastSep = truncated.lastIndexOf(separator);
      str = truncated.substring(0, lastSep);
    } else {
      str = truncated;
    }
  }

  return str;
}

/**
 * Generate a unique slug by appending a counter if needed.
 *
 * The `exists` function is called to check if a slug is already taken.
 * It should return true if the slug is in use, false if available.
 * Supports both sync and async exists functions.
 *
 * @param {string} input - String to slugify.
 * @param {Function} exists - Check function: (slug) => boolean | Promise<boolean>.
 * @param {Object} [options] - Same options as slugify() plus:
 * @param {number} [options.maxAttempts=100] - Max collision attempts before throwing.
 * @returns {Promise<string>} Unique slug.
 *
 * @example
 * // With async DB check
 * const slug = await uniqueSlug('My Product', async (s) => {
 *   const row = await db.prepare('SELECT 1 FROM products WHERE slug = ?').bind(s).first();
 *   return !!row;
 * });
 * // => 'my-product' or 'my-product-2' if taken
 *
 * // With sync Set check
 * const taken = new Set(['hello-world', 'hello-world-2']);
 * const slug = await uniqueSlug('Hello World', (s) => taken.has(s));
 * // => 'hello-world-3'
 */
export async function uniqueSlug(input, exists, options = {}) {
  const { maxAttempts = 100, ...slugOptions } = options;
  const base = slugify(input, slugOptions);

  if (!base) return '';

  // Check the base slug first
  const baseTaken = await exists(base);
  if (!baseTaken) return base;

  // Append counter: slug-2, slug-3, etc.
  for (let i = 2; i <= maxAttempts + 1; i++) {
    const candidate = `${base}${slugOptions.separator || '-'}${i}`;
    const taken = await exists(candidate);
    if (!taken) return candidate;
  }

  throw new Error(`Could not generate unique slug after ${maxAttempts} attempts for: "${input}"`);
}

/**
 * Check if a string is a valid slug.
 *
 * @param {string} slug - String to validate.
 * @param {Object} [options]
 * @param {string} [options.separator='-'] - Expected separator.
 * @returns {boolean} True if valid slug.
 *
 * @example
 * isValidSlug('hello-world')     // true
 * isValidSlug('Hello World')     // false
 * isValidSlug('hello--world')    // false
 * isValidSlug('-hello-world')    // false
 * isValidSlug('hello_world', { separator: '_' }) // true
 */
export function isValidSlug(slug, options = {}) {
  if (!slug || typeof slug !== 'string') return false;

  const { separator = '-' } = options;
  const sep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Must be lowercase alphanumeric with single separators, no leading/trailing
  const pattern = new RegExp(`^[a-z0-9]+(?:${sep}[a-z0-9]+)*$`);
  return pattern.test(slug);
}

/**
 * Common English stop words for slug generation.
 */
export const STOP_WORDS = [
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'it', 'as', 'be', 'was', 'are', 'been',
  'from', 'has', 'have', 'had', 'not', 'this', 'that', 'will', 'can',
];

/**
 * Convert a slug back into a human-readable Title Case label.
 * The inverse of `slugify` for display purposes — splits on the
 * separator and Title-Cases each token.
 *
 * Unlike `slugify`, this preserves stop words because they're
 * usually part of the proper display name (e.g. "Best of the Year"
 * shouldn't render as "Best Year").
 *
 * Use it for taxonomy archive headings (`/tags/future-bass` → "Future Bass"),
 * breadcrumb labels, sitemap entries — anywhere you have a slug and
 * need a display string and don't have the original title cached.
 *
 * @param {string|undefined|null} slug - The slug to humanise.
 * @param {Object} [options]
 * @param {string} [options.separator='-'] - The slug's word separator.
 * @param {Set<string>|string[]} [options.preserveCase] - Words that
 *   should NOT be auto-Title-Cased (acronyms, brand names). Pass
 *   `['AI', 'DAW', 'MIDI']` and they'll render as-is.
 * @returns {string} The display label.
 *
 * @example
 * formatLabel('future-bass')                // 'Future Bass'
 * formatLabel('138bpm')                     // '138bpm' (numeric-leading: untouched)
 * formatLabel('hello-world')                // 'Hello World'
 * formatLabel('sound_design', { separator: '_' })  // 'Sound Design'
 * formatLabel('ai-tools', { preserveCase: ['AI'] }) // 'AI Tools'
 * formatLabel(undefined)                    // ''
 */
export function formatLabel(slug, options = {}) {
  if (!slug || typeof slug !== 'string') return '';

  const { separator = '-', preserveCase } = options;

  /* Case-insensitive lookup: lowercase form → preferred casing.
   * Lets the consumer pass `['AI', 'DAW']` and have those match
   * against the lowercase tokens that come out of `slug.split(...)`. */
  let preserveMap = null;
  if (preserveCase) {
    preserveMap = new Map();
    for (const word of preserveCase) {
      preserveMap.set(word.toLowerCase(), word);
    }
  }

  return slug
    .split(separator)
    .filter(Boolean)
    .map((word) => {
      const wordLower = word.toLowerCase();
      /* Preserve known acronyms / brand names — using the original
       * casing the consumer supplied. */
      if (preserveMap && preserveMap.has(wordLower)) {
        return preserveMap.get(wordLower);
      }
      /* Numeric-leading tokens (e.g. "138bpm", "4k") get no
       * case-change — they read fine in lowercase and Title-Casing
       * the leading digit would do nothing anyway. */
      if (/^\d/.test(word)) return wordLower;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
