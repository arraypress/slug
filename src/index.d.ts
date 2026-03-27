/**
 * @arraypress/slug — TypeScript definitions.
 */

export interface SlugifyOptions {
  /** Word separator. Default: '-' */
  separator?: string;
  /** Convert to lowercase. Default: true */
  lowercase?: boolean;
  /** Convert accented chars to ASCII. Default: true */
  transliterate?: boolean;
  /** Max length (0 = unlimited). Truncates at word boundary. Default: 0 */
  maxLength?: number;
  /** Words to remove. */
  stopWords?: string[];
}

export interface UniqueSlugOptions extends SlugifyOptions {
  /** Max collision attempts. Default: 100 */
  maxAttempts?: number;
}

/** Generate a URL-safe slug from a string. */
export function slugify(input: string, options?: SlugifyOptions): string;

/** Generate a unique slug by appending a counter if needed. */
export function uniqueSlug(
  input: string,
  exists: (slug: string) => boolean | Promise<boolean>,
  options?: UniqueSlugOptions
): Promise<string>;

/** Check if a string is a valid slug. */
export function isValidSlug(slug: string, options?: { separator?: string }): boolean;

/** Common English stop words. */
export const STOP_WORDS: string[];
