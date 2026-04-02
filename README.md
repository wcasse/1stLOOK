# F1RSTL00K — Project Roadmap & Onboarding Guide

**Last Updated:** April 2026
**Live Site:** [f1rstl00k.com](https://f1rstl00k.com)
**Repo:** [github.com/wcasse/1stLOOK](https://github.com/wcasse/1stLOOK)

---

## What Is This?

F1RSTL00K is a **Bloomberg Terminal for the film industry**. It tracks who, what, where, when, why, and how movies and TV got made in Hollywood over the last 26 years (2000–2026). Deals, festivals, scripts, production companies, budgets, box office, lawsuits, talent pipelines — all of it, from studio tentpoles to a guy doing a one-man show at Edinburgh Fringe who ends up with a Netflix first-look deal.

It's built for **producers, development execs, agents, and anyone who wants to understand the business of film** at a level that currently requires subscriptions to 10 different services and years of trade publication reading.

---

## Tech Stack

| Layer | What We Use |
|-------|------------|
| Frontend | Vanilla HTML / CSS / JavaScript — no React, no framework |
| Charts | Chart.js 4.4 via CDN |
| Fonts | Bebas Neue (display), IBM Plex Mono (data), Barlow Condensed (UI) |
| Hosting | Vercel (auto-deploys from GitHub `main` branch) |
| Data | Static JSON files in `data/` directory |
| Scripts | Node.js scripts in `scripts/` for data ingestion |
| Repo | GitHub — push to `main` and the site updates |

**There is no backend or database yet.** Everything is client-side, loading JSON. This is intentional for now — keeps it simple and fast. A PostgreSQL backend is on the roadmap once data volume demands it.

---

## Aesthetic

"Bloomberg Terminal × Variety Trade Paper." Dark background, gold accents (#c8a84e), monospace labels, data-dense layouts. Every design choice should feel like a tool a real producer would keep open on their second monitor, not a marketing site.

CSS variables control the theme in `css/styles.css`. Don't fight the aesthetic — extend it.

---

## Current Site Features (Live)

The site currently has these tabs, all working:

- **Overview** — Deal landscape bubble chart, deals by year, active vs expired status
- **Talent Rankings** — Top talent by total deal value
- **Studio Spend** — Total committed spend, deal count, avg deal value by studio
- **Deal Structure** — Deal type distribution, duration, category breakdown
- **Timeline Race** — Animated studio spending race 2014–2026
- **Deal Database** — Filterable/sortable table of all deals
- **Festival Circuit** — Global acquisition markets with prestige + market activity ratings
- **Development / Black List** — Scripts-to-screen pipeline, 31% Oscar conversion rate
- **Data Sources** — 25 sources powering the platform
- **Intelligence Feed** — Key revelations from non-traditional sources

---

## Data Sources — Where Everything Comes From

### Currently Active (in the repo)

| Source | What It Gives Us | File | Status |
|--------|-----------------|------|--------|
| **Hand-curated deals** | ~100 major Hollywood deals with talent, studio, value, duration | `data/deals.json` | ✅ Live on site |
| **IMDb Public Dataset** | 101,748 films/TV movies (2000–2026) with titles, years, genres, directors, writers, ratings, vote counts | `data/imdb-top.json` | ✅ In repo (Phase 1 complete) |
| **TMDb API** | Budget, revenue, production companies, keywords, taglines, posters for every title in IMDb data | `data/tmdb-enriched.json` | 🔄 Running now (Phase 2) |

### Phase 1 Script: IMDb Core Dataset
- **Script:** `scripts/phase1-imdb-core.js`
- **Source:** https://datasets.imdbws.com/ (free, daily TSV dumps)
- **What it does:** Downloads 4 TSV files (~1 GB), filters to movies/TV movies 2000–2026, joins ratings, outputs JSON
- **Full dataset:** 454,931 titles (134.9 MB, gitignored — regenerate locally)
- **Committed dataset:** 101,748 titles with 100+ IMDb votes (19.8 MB)
- **Run it:** `node scripts/phase1-imdb-core.js`

### Phase 2 Script: TMDb Enrichment
- **Script:** `scripts/phase2-tmdb-enrich.js`
- **Source:** https://developer.themoviedb.org (free API key required)
- **What it does:** Takes each IMDb title, looks it up on TMDb, adds budget/revenue/companies/keywords
- **Rate limit:** 40 requests per 10 seconds (~14 hours for full run)
- **Checkpoints:** Every 500 records — safe to interrupt and resume
- **Run it:** `TMDB_API_KEY=your_key node scripts/phase2-tmdb-enrich.js`
- **Resume:** Add `--resume` flag
- **Test first:** Add `--limit=20` flag

### Planned Data Sources (Phases 3–7)

| Phase | Source | What It Adds | Priority |
|-------|--------|-------------|----------|
| **3** | TMDb production_companies field | Company profiles — every prodco's filmography, avg budget, total gross, talent relationships | HIGH |
| **4** | IndieWire, Screen Daily, trades | Festival acquisitions database — 3,000-5,000 documented deals with prices | HIGH |
| **5** | Edinburgh Fringe archives, Black List | Fringe-to-screen pipeline, development tracking signals | MEDIUM |
| **6** | Deadline, Variety, THR, Tracking Board, SEC, PACER | Expand deals from hundreds to 10,000+ (spec sales, life rights, options) | HIGH |
| **7** | Trade RSS feeds + NLP | Automated entity extraction — people, companies, projects, deal terms from articles | FUTURE |

### Creative Intelligence Sources (What Makes This Different)

These are the sources nobody else is using:

- **Sony Hack Archive (Reported)** — Slate ultimates, talent compensation, greenlight memos. Only fact-checked data as reported by THR/Variety/Deadline. No raw leaked data.
- **PACER Court Records** — Net profit lawsuits (Buchwald v Paramount, etc.) expose actual studio accounting formulas.
- **US Copyright Office (CPRS)** — Script registrations appear 8–14 months before greenlight announcements. Early detection system.
- **Bankruptcy Filings** — Relativity Media, Open Road, Weinstein Company restructurings expose mini-major financing.
- **SEC EDGAR Filings** — Segment-level P&L for Disney, Warner, Paramount, Lionsgate.
- **State Film Commissions (50)** — Production permits and tax incentive data reveal what's shooting before it's announced.
- **UK Companies House** — British production company financials are public. Free API.
- **Netflix Engagement Reports** — Biannual viewing hours for every title on the platform.
- **Podcast NLP Pipeline** — Entity extraction from The Business (KCRW), Scriptnotes, The Town, IndieWire podcasts.
- **WGA Arbitration Records** — Credit disputes reveal who actually wrote what.

---

## Project Structure

```
1stLOOK/
├── index.html                          # Single-page app — all tabs
├── css/
│   └── styles.css                      # All styles, CSS variables
├── js/
│   └── app.js                          # All logic — Chart.js, filtering, modals
├── data/
│   ├── deals.json                      # Hand-curated deals (live on site)
│   ├── imdb-top.json                   # 101K films from IMDb (Phase 1)
│   ├── imdb-core.json                  # 455K films full dataset (gitignored)
│   └── tmdb-enriched.json              # TMDb-enriched data (Phase 2, gitignored)
├── scripts/
│   ├── phase1-imdb-core.js             # IMDb download + parse
│   └── phase2-tmdb-enrich.js           # TMDb API enrichment
├── f1rstl00k-data-expansion.json       # Master expansion plan + gold standard records
├── f1rstl00k-reference.jsx             # React reference component (data only, not code)
├── .gitignore
└── README.md
```

---

## How to Vibe Code on This Project

### Setup

```bash
git clone https://github.com/wcasse/1stLOOK.git
cd 1stLOOK
```

To view the site locally, just open `index.html` in a browser. No build step.

### Using Claude Code

```bash
# Install Claude Code (needs Pro/Max subscription)
curl -fsSL https://claude.ai/install.sh | bash

# If "command not found" on Mac:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bash_profile && source ~/.bash_profile

# Start a session
cd ~/1stLOOK
claude
```

Then talk to it in plain English. It reads your entire codebase and edits files directly.

### Key Conventions

- **No React.** This is vanilla HTML/CSS/JS. Don't try to convert it.
- **No build step.** Everything runs from static files.
- **Chart.js** for all visualizations — loaded via CDN.
- **Tab-based SPA pattern** — each "page" is a `<section>` toggled by JS in `app.js`.
- **All data in JSON** — `data/` directory. Scripts in `scripts/` generate these files.
- **Bloomberg aesthetic** — dark theme, gold accents, monospace fonts. Don't fight it.
- **Fact-check everything** — every data point should have source attribution and confidence level.

### Adding a New Tab

1. Add a `<section id="your-tab" class="tab-section">` in `index.html`
2. Add a tab button in the nav
3. Add the click handler in `app.js`
4. Add any new data to a JSON file in `data/`
5. Style in `css/styles.css` using existing CSS variables

### Running the Data Scripts

```bash
# Phase 1: IMDb (takes ~10 min, downloads ~1 GB)
node scripts/phase1-imdb-core.js

# Phase 2: TMDb (needs API key, takes ~14 hours, checkpoints every 500)
TMDB_API_KEY=your_key node scripts/phase2-tmdb-enrich.js
```

---

## Gold Standard: What a Fully Enriched Record Looks Like

See `f1rstl00k-data-expansion.json` for two complete examples (Baby Reindeer and Fleabag). Each record includes:

- **Key people** — creator, directors, cast, producers, production company, distributor, agency
- **Origin story** — source material type, pipeline (e.g., "Edinburgh Fringe → TV adaptation")
- **Development timeline** — every event from concept to release to aftermath, with dates
- **Financials** — budget, revenue, viewership data, subsequent deal values
- **Awards** — every ceremony, category, and result
- **Legal proceedings** — lawsuits with case name, jurisdiction, amount, status, PACER source
- **Related deals** — first-look deals, series orders, etc.
- **Production company profile** — founded, HQ, key personnel, notable credits
- **Tags** — searchable labels
- **Data sources** — which of our 25 sources contributed to this record
- **Fact check status** — verified or estimated, with source attribution

This is the target format for every project in the database.

---

## Roadmap

| Phase | What | Status | ETA |
|-------|------|--------|-----|
| 1 | IMDb bulk dataset (101K titles) | ✅ Complete | Done |
| 2 | TMDb enrichment (budget, revenue, companies) | 🔄 Running | Overnight |
| 3 | Production company profiles | ⬜ Next | This week |
| 4 | Festival acquisitions database | ⬜ Planned | Next week |
| 5 | Fringe-to-screen + development pipeline | ⬜ Planned | Next week |
| 6 | Deals expansion (10K+ deals) | ⬜ Planned | Weeks 3-4 |
| 7 | NLP trade article pipeline | ⬜ Future | Month 2 |
| — | PostgreSQL backend | ⬜ Future | When JSON gets unwieldy |
| — | Search + filtering on enriched data | ⬜ Future | After Phase 3 |
| — | Local LLM for trade extraction (distillation) | ⬜ Future | After Phase 7 |

---

## Philosophy

This isn't a movie review site or a box office tracker. It's an **intelligence platform**. The goal is to let a producer type in any film, person, or company and see the complete picture: how it got made, who was involved, what it cost, where it premiered, what deals came out of it, and what the data says about similar projects.

The creative edge comes from sources nobody else is combining: copyright registrations as early warning signals, court filings that expose real studio accounting, bankruptcy filings that reveal financing structures, podcast mentions that catch deals before trades report them, and the Fringe-to-screen pipeline that tracks the next Baby Reindeer before Netflix knows it exists.

**Every data point must be fact-checked. Rumors get flagged as rumors. Estimates get flagged as estimates. This is a tool people will make decisions with.**
