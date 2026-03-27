# @arraypress/slug

URL slug generation with transliteration, collision handling, and flexible options. Zero dependencies.

Works in Node.js, Cloudflare Workers, Deno, Bun, and browsers.

## Install

```bash
npm install @arraypress/slug
```

## Functions

### `slugify(input, options?)`

Generate a URL-safe slug from any string.

```js
import { slugify } from '@arraypress/slug';

slugify('Hello World!')              // 'hello-world'
slugify('Crème Brûlée Recipe')       // 'creme-brulee-recipe'
slugify('Rock & Roll')               // 'rock-and-roll'
slugify('Straße nach Berlin')        // 'strasse-nach-berlin'

// Options
slugify('Hello World', { separator: '_' })     // 'hello_world'
slugify('Hello World', { lowercase: false })   // 'Hello-World'
slugify('Long Title Here', { maxLength: 10 })  // 'long-title'
slugify('The Art of War', { stopWords: ['the', 'of'] }) // 'art-war'
```

Options: `separator` (default `'-'`), `lowercase` (default `true`), `transliterate` (default `true`), `maxLength` (default `0` = unlimited), `stopWords` (default `[]`).

### `uniqueSlug(input, exists, options?)`

Generate a unique slug by appending a counter if needed. Accepts sync or async `exists` functions.

```js
import { uniqueSlug } from '@arraypress/slug';

// With a database check
const slug = await uniqueSlug('My Product', async (s) => {
  const row = await db.prepare('SELECT 1 FROM products WHERE slug = ?').bind(s).first();
  return !!row;
});
// => 'my-product' or 'my-product-2' if taken

// With a Set
const taken = new Set(['hello-world', 'hello-world-2']);
const slug = await uniqueSlug('Hello World', (s) => taken.has(s));
// => 'hello-world-3'
```

### `isValidSlug(slug, options?)`

Check if a string is a valid slug.

```js
import { isValidSlug } from '@arraypress/slug';

isValidSlug('hello-world')     // true
isValidSlug('Hello World')     // false
isValidSlug('hello--world')    // false
isValidSlug('hello_world', { separator: '_' }) // true
```

### `STOP_WORDS`

Common English stop words for slug generation.

```js
import { slugify, STOP_WORDS } from '@arraypress/slug';

slugify('The Art of War', { stopWords: STOP_WORDS }) // 'art-war'
```

## Transliteration

Built-in support for Latin accented, German, Nordic, Turkish, Polish, Czech, and common symbols. `&` → `and`, `@` → `at`, `€` → `eur`, `£` → `gbp`, `©` → `c`, etc.

## License

MIT
