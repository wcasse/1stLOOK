# 1stLOOK

Live graph/display tracking all available data on any deals made in Hollywood (+ over time).

## What it tracks

First-look, overall, exclusive, and production-overhead deals between talent/production companies and studios/streamers. Data sourced from Deadline, Variety, THR, Puck, and The Ankler.

## Features

- **KPI dashboard** — total deals, active count, known deal value, studio count
- **Interactive charts** — deals over time (bar + cumulative line), by studio, by deal type, active vs expired
- **Bubble chart** — deal landscape showing value and timeline across studios
- **Filterable table** — sort by any column, filter by studio/type/category/status, full-text search
- **Deal detail modal** — click any deal for full details
- **65 curated deals** — real publicly-reported Hollywood deals from 2014–2026

## Usage

Open `index.html` in a browser. No build step required. Chart.js is loaded from CDN.

## Project structure

```
index.html          — main dashboard page
css/styles.css      — dark theme styling
js/app.js           — charts, filters, table, interactions
data/deals.json     — curated deal dataset
```
