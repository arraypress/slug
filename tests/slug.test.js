import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug, isValidSlug, STOP_WORDS, formatLabel } from '../src/index.js';

// ── slugify ─────────────────────────────────

describe('slugify', () => {
  it('basic string', () => {
    assert.equal(slugify('Hello World'), 'hello-world');
  });

  it('multiple spaces', () => {
    assert.equal(slugify('  Hello   World  '), 'hello-world');
  });

  it('special characters', () => {
    assert.equal(slugify('Hello! @World# $2024'), 'hello-atworld-usd2024');
  });

  it('accented characters', () => {
    assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
    assert.equal(slugify('Ñoño'), 'nono');
    assert.equal(slugify('Ünïcödé'), 'unicode');
  });

  it('German characters', () => {
    assert.equal(slugify('Straße'), 'strasse');
    assert.equal(slugify('Über'), 'uber');
  });

  it('Nordic characters', () => {
    assert.equal(slugify('Ångström'), 'angstrom');
    assert.equal(slugify('Ærø'), 'aero');
  });

  it('Turkish characters', () => {
    assert.equal(slugify('Güneş'), 'gunes');
    assert.equal(slugify('Çığır'), 'cigir');
  });

  it('Polish characters', () => {
    assert.equal(slugify('Łódź'), 'lodz');
    assert.equal(slugify('Źródło'), 'zrodlo');
  });

  it('Czech characters', () => {
    assert.equal(slugify('Příliš žluťoučký'), 'prilis-zlutoucky');
  });

  it('ampersand becomes and', () => {
    assert.equal(slugify('Rock & Roll'), 'rock-and-roll');
  });

  it('numbers preserved', () => {
    assert.equal(slugify('Product v2.0'), 'product-v2-0');
    assert.equal(slugify('123 Test'), '123-test');
  });

  it('already a slug', () => {
    assert.equal(slugify('hello-world'), 'hello-world');
  });

  it('empty string', () => {
    assert.equal(slugify(''), '');
  });

  it('null/undefined', () => {
    assert.equal(slugify(null), '');
    assert.equal(slugify(undefined), '');
  });

  it('only special chars', () => {
    assert.equal(slugify('!!!???'), '');
  });

  // Options
  it('custom separator', () => {
    assert.equal(slugify('Hello World', { separator: '_' }), 'hello_world');
  });

  it('dot separator', () => {
    assert.equal(slugify('Hello World', { separator: '.' }), 'hello.world');
  });

  it('no lowercase', () => {
    assert.equal(slugify('Hello World', { lowercase: false }), 'Hello-World');
  });

  it('no transliteration', () => {
    const result = slugify('Crème', { transliterate: false });
    assert.ok(!result.includes('è')); // stripped as non-alnum
  });

  it('maxLength truncates at word boundary', () => {
    assert.equal(slugify('The Quick Brown Fox Jumps', { maxLength: 15 }), 'the-quick-brown');
  });

  it('maxLength does not break mid-word', () => {
    const result = slugify('Hello World', { maxLength: 8 });
    assert.equal(result, 'hello');
  });

  it('maxLength with short string', () => {
    assert.equal(slugify('Hi', { maxLength: 100 }), 'hi');
  });

  it('stop words', () => {
    assert.equal(slugify('The Quick Brown Fox', { stopWords: ['the'] }), 'quick-brown-fox');
  });

  it('multiple stop words', () => {
    assert.equal(slugify('A Guide to the Art of War', { stopWords: ['a', 'to', 'the', 'of'] }), 'guide-art-war');
  });

  it('stop words do not remove all words', () => {
    const result = slugify('The The The', { stopWords: ['the'] });
    assert.equal(result, 'the-the-the'); // keeps original if all would be removed
  });

  it('combined options', () => {
    assert.equal(
      slugify('The Crème Brûlée Recipe!', { stopWords: ['the'], maxLength: 20 }),
      'creme-brulee-recipe'
    );
  });
});

// ── uniqueSlug ──────────────────────────────

describe('uniqueSlug', () => {
  it('returns base slug when available', async () => {
    const slug = await uniqueSlug('Hello World', () => false);
    assert.equal(slug, 'hello-world');
  });

  it('appends counter when taken', async () => {
    const taken = new Set(['hello-world']);
    const slug = await uniqueSlug('Hello World', (s) => taken.has(s));
    assert.equal(slug, 'hello-world-2');
  });

  it('increments counter for multiple collisions', async () => {
    const taken = new Set(['hello-world', 'hello-world-2', 'hello-world-3']);
    const slug = await uniqueSlug('Hello World', (s) => taken.has(s));
    assert.equal(slug, 'hello-world-4');
  });

  it('works with async exists function', async () => {
    const taken = new Set(['test']);
    const slug = await uniqueSlug('Test', async (s) => {
      await new Promise((r) => setTimeout(r, 1));
      return taken.has(s);
    });
    assert.equal(slug, 'test-2');
  });

  it('passes slugify options through', async () => {
    const slug = await uniqueSlug('Hello World', () => false, { separator: '_' });
    assert.equal(slug, 'hello_world');
  });

  it('uses custom separator in counter', async () => {
    const taken = new Set(['hello_world']);
    const slug = await uniqueSlug('Hello World', (s) => taken.has(s), { separator: '_' });
    assert.equal(slug, 'hello_world_2');
  });

  it('throws after max attempts', async () => {
    await assert.rejects(
      () => uniqueSlug('Test', () => true, { maxAttempts: 5 }),
      /Could not generate unique slug/
    );
  });

  it('returns empty for empty input', async () => {
    const slug = await uniqueSlug('', () => false);
    assert.equal(slug, '');
  });
});

// ── isValidSlug ─────────────────────────────

describe('isValidSlug', () => {
  it('valid slugs', () => {
    assert.ok(isValidSlug('hello-world'));
    assert.ok(isValidSlug('hello'));
    assert.ok(isValidSlug('hello-world-123'));
    assert.ok(isValidSlug('123'));
    assert.ok(isValidSlug('a'));
  });

  it('invalid slugs', () => {
    assert.ok(!isValidSlug('Hello-World'));     // uppercase
    assert.ok(!isValidSlug('hello--world'));     // double separator
    assert.ok(!isValidSlug('-hello-world'));     // leading separator
    assert.ok(!isValidSlug('hello-world-'));     // trailing separator
    assert.ok(!isValidSlug('hello world'));      // space
    assert.ok(!isValidSlug('hello_world'));      // wrong separator
    assert.ok(!isValidSlug(''));                 // empty
    assert.ok(!isValidSlug(null));              // null
  });

  it('custom separator', () => {
    assert.ok(isValidSlug('hello_world', { separator: '_' }));
    assert.ok(!isValidSlug('hello-world', { separator: '_' }));
  });
});

// ── STOP_WORDS ──────────────────────────────

describe('STOP_WORDS', () => {
  it('is an array of strings', () => {
    assert.ok(Array.isArray(STOP_WORDS));
    assert.ok(STOP_WORDS.length > 20);
    assert.ok(STOP_WORDS.includes('the'));
    assert.ok(STOP_WORDS.includes('and'));
    assert.ok(STOP_WORDS.includes('a'));
  });

  it('works with slugify', () => {
    assert.equal(slugify('The Art of War', { stopWords: STOP_WORDS }), 'art-war');
  });
});

// ── formatLabel ─────────────────────────────

describe('formatLabel', () => {
  it('simple two-word slug', () => assert.equal(formatLabel('future-bass'), 'Future Bass'));
  it('three-word slug', () => assert.equal(formatLabel('hello-world-foo'), 'Hello World Foo'));
  it('single-word slug', () => assert.equal(formatLabel('uplifting'), 'Uplifting'));
  it('numeric-leading token kept lowercase', () =>
    assert.equal(formatLabel('138bpm'), '138bpm'));
  it('numeric-leading mixed with words', () =>
    assert.equal(formatLabel('138bpm-trance'), '138bpm Trance'));
  it('custom separator', () =>
    assert.equal(formatLabel('sound_design', { separator: '_' }), 'Sound Design'));
  it('preserve case from array', () =>
    assert.equal(
      formatLabel('ai-tools', { preserveCase: ['AI'] }),
      'AI Tools',
    ));
  it('preserve case from Set', () =>
    assert.equal(
      formatLabel('daw-midi-export', { preserveCase: new Set(['DAW', 'MIDI']) }),
      'DAW MIDI Export',
    ));
  it('preserves stop words for display (unlike slugify)', () =>
    assert.equal(formatLabel('best-of-the-year'), 'Best Of The Year'));
  it('lowercases tokens that arrive uppercase', () =>
    assert.equal(formatLabel('FUTURE-BASS'), 'Future Bass'));
  it('drops empty segments from double separator', () =>
    assert.equal(formatLabel('hello--world'), 'Hello World'));
  it('null → empty', () => assert.equal(formatLabel(null), ''));
  it('undefined → empty', () => assert.equal(formatLabel(undefined), ''));
  it('empty → empty', () => assert.equal(formatLabel(''), ''));
  it('round-trips with slugify for ASCII inputs', () => {
    const original = 'Future Bass';
    const slug = slugify(original);
    assert.equal(formatLabel(slug), original);
  });
});
