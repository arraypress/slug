# Changelog

All notable changes to `@arraypress/slug` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — Unreleased

### Added

- `formatLabel(slug, options?)` — inverse of `slugify` for display
  purposes. Converts `'future-bass'` → `'Future Bass'`. Preserves
  stop words (unlike `slugify`) because they're usually part of the
  display name. Numeric-leading tokens (`'138bpm'`, `'4k'`) keep
  their case. Supports a `preserveCase` option (array or Set) for
  acronyms / brand names — matches case-insensitively so consumers
  pass `['AI', 'DAW']` and get the preferred casing back in the
  output. Custom `separator` supported.

  Typical use: taxonomy archive headings (`/tags/[slug]` →
  display string), breadcrumbs, sitemap entries — anywhere you
  have a slug and don't have the original title cached.
