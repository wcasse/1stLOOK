#!/usr/bin/env node

/**
 * F1RSTL00K — Phase 1: IMDb Core Dataset Builder
 *
 * Downloads IMDb public dataset files, filters to movies and TV movies
 * released 2000–2026, joins ratings, and outputs data/imdb-core.json.
 *
 * Files downloaded from https://datasets.imdbws.com/:
 *   - title.basics.tsv.gz
 *   - title.crew.tsv.gz
 *   - title.principals.tsv.gz
 *   - title.ratings.tsv.gz
 */

import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const TEMP_DIR = join(ROOT, '.imdb-temp');

const BASE_URL = 'https://datasets.imdbws.com';
const FILES = [
  'title.basics.tsv.gz',
  'title.crew.tsv.gz',
  'title.principals.tsv.gz',
  'title.ratings.tsv.gz',
];

const MIN_YEAR = 2000;
const MAX_YEAR = 2026;
const TITLE_TYPES = new Set(['movie', 'tvMovie']);

// ── Helpers ──────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[F1RSTL00K] ${msg}\n`);
}

function follow(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        follow(res.headers.location).then(resolve, reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function downloadFile(filename) {
  const dest = join(TEMP_DIR, filename);
  if (existsSync(dest)) {
    log(`  Cached: ${filename}`);
    return dest;
  }
  const url = `${BASE_URL}/${filename}`;
  log(`  Downloading: ${url}`);
  const res = await follow(url);
  const total = parseInt(res.headers['content-length'] || '0', 10);
  let downloaded = 0;
  let lastPct = -1;

  res.on('data', (chunk) => {
    downloaded += chunk.length;
    if (total > 0) {
      const pct = Math.floor((downloaded / total) * 100);
      if (pct !== lastPct && pct % 10 === 0) {
        process.stdout.write(`  ${filename}: ${pct}%\r`);
        lastPct = pct;
      }
    }
  });

  await pipeline(res, createWriteStream(dest));
  log(`  Done: ${filename} (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
  return dest;
}

async function parseTsv(gzPath, onRow) {
  const gunzip = createGunzip();
  const input = createReadStream(gzPath).pipe(gunzip);
  const rl = createInterface({ input, crlfDelay: Infinity });

  let headers = null;
  for await (const line of rl) {
    const fields = line.split('\t');
    if (!headers) {
      headers = fields;
      continue;
    }
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = fields[i] === '\\N' ? null : fields[i];
    }
    onRow(row);
  }
}

function clean(val) {
  return val === '\\N' ? null : val;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  log('Phase 1: IMDb Core Dataset Builder');
  log(`Filtering: titleType in [${[...TITLE_TYPES].join(', ')}], years ${MIN_YEAR}–${MAX_YEAR}`);
  log('');

  // Ensure dirs
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Step 1: Download all files
  log('Step 1/5: Downloading IMDb dataset files...');
  const paths = {};
  for (const file of FILES) {
    paths[file] = await downloadFile(file);
  }
  log('');

  // Step 2: Parse title.basics — filter to movies/tvMovies 2000–2026
  log('Step 2/5: Parsing title.basics (filtering titles)...');
  const titles = new Map();
  let totalBasics = 0;
  let kept = 0;

  await parseTsv(paths['title.basics.tsv.gz'], (row) => {
    totalBasics++;
    if (totalBasics % 1_000_000 === 0) {
      process.stdout.write(`  Scanned ${(totalBasics / 1_000_000).toFixed(0)}M rows, kept ${kept}...\r`);
    }

    if (!TITLE_TYPES.has(row.titleType)) return;

    const year = parseInt(row.startYear, 10);
    if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) return;

    kept++;
    titles.set(row.tconst, {
      imdbId: row.tconst,
      title: row.primaryTitle,
      originalTitle: row.originalTitle !== row.primaryTitle ? row.originalTitle : undefined,
      type: row.titleType,
      year: year,
      runtime: row.runtimeMinutes ? parseInt(row.runtimeMinutes, 10) : null,
      genres: row.genres ? row.genres.split(',') : [],
      rating: null,
      votes: null,
      directors: [],
      writers: [],
    });
  });

  log(`  Scanned ${totalBasics.toLocaleString()} total rows`);
  log(`  Kept ${kept.toLocaleString()} titles (${TITLE_TYPES.size} types, ${MIN_YEAR}–${MAX_YEAR})`);
  log('');

  // Step 3: Parse title.ratings — join to filtered titles
  log('Step 3/5: Parsing title.ratings (joining scores)...');
  let ratingsJoined = 0;

  await parseTsv(paths['title.ratings.tsv.gz'], (row) => {
    const title = titles.get(row.tconst);
    if (!title) return;

    title.rating = parseFloat(row.averageRating);
    title.votes = parseInt(row.numVotes, 10);
    ratingsJoined++;
  });

  log(`  Joined ratings for ${ratingsJoined.toLocaleString()} titles`);
  log('');

  // Step 4: Parse title.crew — join directors/writers
  log('Step 4/5: Parsing title.crew (joining directors/writers)...');
  let crewJoined = 0;

  await parseTsv(paths['title.crew.tsv.gz'], (row) => {
    const title = titles.get(row.tconst);
    if (!title) return;

    if (row.directors) {
      title.directors = row.directors.split(',');
    }
    if (row.writers) {
      title.writers = row.writers.split(',');
    }
    crewJoined++;
  });

  log(`  Joined crew for ${crewJoined.toLocaleString()} titles`);
  log('');

  // Step 5: Write output
  log('Step 5/5: Writing data/imdb-core.json...');
  const output = [...titles.values()];

  // Sort by votes descending (most notable first)
  output.sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const json = JSON.stringify(output, null, 2);
  const outPath = join(DATA_DIR, 'imdb-core.json');
  await writeFile(outPath, json, 'utf-8');

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);

  log('');
  log('═══════════════════════════════════════════');
  log('  Phase 1 Complete');
  log(`  Total titles: ${output.length.toLocaleString()}`);
  log(`  With ratings: ${output.filter(t => t.rating !== null).length.toLocaleString()}`);
  log(`  Output: ${outPath}`);
  log(`  Size: ${sizeMB} MB`);
  log('═══════════════════════════════════════════');

  // Print top 10 by votes as a sanity check
  log('');
  log('Top 10 by IMDb votes (sanity check):');
  output.slice(0, 10).forEach((t, i) => {
    log(`  ${i + 1}. ${t.title} (${t.year}) — ${t.rating}/10, ${t.votes?.toLocaleString()} votes`);
  });
}

main().catch((err) => {
  console.error('[F1RSTL00K] Fatal error:', err);
  process.exit(1);
});
