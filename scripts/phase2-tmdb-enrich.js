#!/usr/bin/env node

/**
 * F1RSTL00K — Phase 2: TMDb Enrichment
 *
 * Takes data/imdb-top.json and enriches each title with budget, revenue,
 * production companies, and keywords from the TMDb API.
 *
 * Usage:
 *   TMDB_API_KEY=your_key node scripts/phase2-tmdb-enrich.js
 *
 * Options:
 *   --limit=N        Only process first N titles (for testing)
 *   --resume         Resume from last checkpoint (skips already-enriched)
 *   --votes-min=N    Only enrich titles with N+ votes (default: 100)
 *
 * Rate limit: 40 requests per 10 seconds per TMDb terms.
 * Output: data/tmdb-enriched.json (checkpoint saved every 500 records)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INPUT = join(ROOT, 'data', 'imdb-top.json');
const OUTPUT = join(ROOT, 'data', 'tmdb-enriched.json');
const CHECKPOINT = join(ROOT, 'data', '.tmdb-checkpoint.json');

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('[F1RSTL00K] Missing TMDB_API_KEY environment variable.');
  console.error('  Get a free key at https://www.themoviedb.org/settings/api');
  console.error('  Then run: TMDB_API_KEY=your_key node scripts/phase2-tmdb-enrich.js');
  process.exit(1);
}

// ── CLI args ─────────────────────────────────────────────────

const args = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  acc[k] = v ?? true;
  return acc;
}, {});

const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const VOTES_MIN = args['votes-min'] ? parseInt(args['votes-min'], 10) : 100;

// ── Rate limiter: 40 req / 10 sec ───────────────────────────

const RATE_WINDOW = 10_000;
const RATE_MAX = 40;
const timestamps = [];

async function rateLimit() {
  const now = Date.now();
  // Purge old timestamps
  while (timestamps.length > 0 && timestamps[0] <= now - RATE_WINDOW) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_MAX) {
    const wait = timestamps[0] + RATE_WINDOW - now + 50;
    await sleep(wait);
    return rateLimit();
  }
  timestamps.push(Date.now());
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── TMDb API ─────────────────────────────────────────────────

function tmdbGet(path) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        } else if (res.statusCode === 429) {
          // Rate limited — wait and retry
          const retryAfter = parseInt(res.headers['retry-after'] || '2', 10);
          sleep(retryAfter * 1000 + 500).then(() => tmdbGet(path)).then(resolve, reject);
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          reject(new Error(`TMDb ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function findTmdbId(imdbId) {
  await rateLimit();
  const result = await tmdbGet(`/find/${imdbId}?external_source=imdb_id`);
  if (!result) return null;
  const movie = result.movie_results?.[0];
  return movie?.id ?? null;
}

async function getMovieDetails(tmdbId) {
  await rateLimit();
  return tmdbGet(`/movie/${tmdbId}?append_to_response=keywords`);
}

function extractEnrichment(details) {
  if (!details) return null;
  return {
    tmdbId: details.id,
    budget: details.budget || null,
    revenue: details.revenue || null,
    productionCompanies: (details.production_companies || []).map(c => ({
      id: c.id,
      name: c.name,
      country: c.origin_country || null,
    })),
    keywords: (details.keywords?.keywords || []).map(k => k.name),
    tagline: details.tagline || null,
    languages: (details.spoken_languages || []).map(l => l.english_name || l.name),
    posterPath: details.poster_path || null,
    backdropPath: details.backdrop_path || null,
    popularity: details.popularity || null,
    status: details.status || null,
  };
}

// ── Logging ──────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[F1RSTL00K] ${msg}\n`);
}

function progress(i, total, title, year) {
  const pct = ((i / total) * 100).toFixed(1);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const rate = (i / (elapsed || 1)).toFixed(1);
  process.stdout.write(`\r  [${pct}%] ${i}/${total} | ${rate}/sec | ${title} (${year})          `);
}

let startTime;

// ── Main ─────────────────────────────────────────────────────

async function main() {
  log('Phase 2: TMDb Enrichment');
  log('');

  // Load IMDb data
  log('Loading data/imdb-top.json...');
  const titles = JSON.parse(readFileSync(INPUT, 'utf-8'));
  log(`  Loaded ${titles.length.toLocaleString()} titles`);

  // Filter to movies only (TMDb movie endpoint)
  let queue = titles.filter(t => t.type === 'movie' && (t.votes || 0) >= VOTES_MIN);
  log(`  After filtering (type=movie, votes>=${VOTES_MIN}): ${queue.length.toLocaleString()}`);

  // Sort by votes desc — most notable first
  queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));

  // Apply limit
  if (LIMIT < queue.length) {
    queue = queue.slice(0, LIMIT);
    log(`  Limited to first ${LIMIT}`);
  }

  // Load existing enriched data if resuming
  let enriched = {};
  if (RESUME && existsSync(CHECKPOINT)) {
    enriched = JSON.parse(readFileSync(CHECKPOINT, 'utf-8'));
    const count = Object.keys(enriched).length;
    log(`  Resuming — ${count.toLocaleString()} already enriched`);
    queue = queue.filter(t => !enriched[t.id]);
    log(`  Remaining: ${queue.length.toLocaleString()}`);
  }

  log('');
  log(`Processing ${queue.length.toLocaleString()} titles...`);
  log('  Rate limit: 40 req / 10 sec (~4 req/sec)');
  log('  Each title = 2 API calls (find + details)');
  const estMinutes = Math.ceil((queue.length * 2) / (4 * 60));
  log(`  Estimated time: ~${estMinutes} minutes`);
  log('');

  startTime = Date.now();
  let processed = 0;
  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (const title of queue) {
    processed++;
    progress(processed, queue.length, title.title, title.year);

    try {
      // Step 1: Find TMDb ID from IMDb ID
      const tmdbId = await findTmdbId(title.id);
      if (!tmdbId) {
        notFound++;
        continue;
      }

      // Step 2: Get full details
      const details = await getMovieDetails(tmdbId);
      const data = extractEnrichment(details);
      if (data) {
        enriched[title.id] = data;
        found++;
      } else {
        notFound++;
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        log(`\n  Error on ${title.id} (${title.title}): ${err.message}`);
      }
    }

    // Checkpoint every 500 records
    if (processed % 500 === 0) {
      writeFileSync(CHECKPOINT, JSON.stringify(enriched));
    }
  }

  // Save checkpoint
  writeFileSync(CHECKPOINT, JSON.stringify(enriched));

  // Build final merged output
  log('\n');
  log('Building merged output...');

  const merged = titles
    .filter(t => t.type === 'movie' && enriched[t.id])
    .map(t => ({
      ...t,
      ...enriched[t.id],
    }));

  // Sort by votes desc
  merged.sort((a, b) => (b.votes || 0) - (a.votes || 0));

  writeFileSync(OUTPUT, JSON.stringify(merged));
  const sizeMB = (Buffer.byteLength(JSON.stringify(merged)) / 1024 / 1024).toFixed(1);

  const totalEnriched = Object.keys(enriched).length;
  const withBudget = merged.filter(t => t.budget > 0).length;
  const withRevenue = merged.filter(t => t.revenue > 0).length;

  log('');
  log('═══════════════════════════════════════════');
  log('  Phase 2 Complete');
  log(`  Enriched: ${totalEnriched.toLocaleString()} titles`);
  log(`  With budget: ${withBudget.toLocaleString()}`);
  log(`  With revenue: ${withRevenue.toLocaleString()}`);
  log(`  Not found on TMDb: ${notFound.toLocaleString()}`);
  log(`  Errors: ${errors}`);
  log(`  Output: ${OUTPUT}`);
  log(`  Size: ${sizeMB} MB`);
  log('═══════════════════════════════════════════');

  // Top 10 sanity check
  log('');
  log('Top 10 enriched (by votes):');
  merged.slice(0, 10).forEach((t, i) => {
    const b = t.budget ? `$${(t.budget / 1e6).toFixed(0)}M` : 'N/A';
    const r = t.revenue ? `$${(t.revenue / 1e6).toFixed(0)}M` : 'N/A';
    const cos = t.productionCompanies?.map(c => c.name).slice(0, 2).join(', ') || 'N/A';
    log(`  ${i + 1}. ${t.title} (${t.year}) — Budget: ${b}, Revenue: ${r}, Companies: ${cos}`);
  });
}

main().catch(err => {
  console.error('\n[F1RSTL00K] Fatal:', err);
  process.exit(1);
});
