import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// F1RSTL00K — The Producer's Master Intelligence Platform
// 26 Years of Film Industry Data (2000–2026)
// ═══════════════════════════════════════════════════════════════════

const COLORS = {
  bg: "#0a0a0c",
  surface: "#111114",
  surfaceHover: "#18181c",
  card: "#141418",
  border: "#222228",
  borderLight: "#2a2a32",
  text: "#e8e6e3",
  textMuted: "#8a8a94",
  textDim: "#5a5a64",
  accent: "#c8a84e",
  accentDim: "#8a7434",
  green: "#3ddc84",
  red: "#ff4757",
  blue: "#4a9eff",
  purple: "#a855f7",
  orange: "#ff8c42",
  cyan: "#22d3ee",
  magenta: "#ec4899",
};

// ─── DATA SOURCES REGISTRY ───────────────────────────────────────
const DATA_SOURCES = [
  { id: "tmdb", name: "TMDb API", type: "API", status: "live", records: "920K+", desc: "Full movie metadata, cast, crew, keywords, releases", category: "Core" },
  { id: "boxoffice", name: "Box Office Mojo / The Numbers", type: "Scrape", status: "live", records: "85K+", desc: "Domestic & international grosses, weekly breakdowns, theater counts", category: "Financial" },
  { id: "copyright", name: "US Copyright Office (CPRS)", type: "API", status: "live", records: "2.1M+", desc: "Script registrations — reveals development timelines years before greenlight", category: "Intelligence" },
  { id: "sec", name: "SEC EDGAR Filings", type: "API", status: "live", records: "48K+", desc: "10-K, 10-Q, 8-K for Disney, Warner, Paramount, Lionsgate — segment-level P&L", category: "Financial" },
  { id: "sony", name: "Sony Hack Archive (Reported)", type: "Static", status: "indexed", records: "12K+", desc: "Slate ultimates, talent compensation, greenlight memos, packaging docs — as reported by trades", category: "Intelligence" },
  { id: "pacer", name: "PACER Court Records", type: "API", status: "live", records: "34K+", desc: "Net profit lawsuits reveal actual studio accounting — Buchwald v Paramount, etc.", category: "Intelligence" },
  { id: "bankruptcy", name: "Bankruptcy Filings", type: "API", status: "indexed", records: "890+", desc: "Relativity Media, Open Road, Orion — financial structures exposed in filings", category: "Intelligence" },
  { id: "sundance", name: "Sundance Institute", type: "Scrape", status: "live", records: "6.2K+", desc: "Every selection, section, jury, acquisition, and price since 2000", category: "Festivals" },
  { id: "cannes", name: "Festival de Cannes", type: "Scrape", status: "live", records: "4.8K+", desc: "Official Selection, Un Certain Regard, Directors' Fortnight, Critics' Week", category: "Festivals" },
  { id: "tiff", name: "TIFF", type: "Scrape", status: "live", records: "5.5K+", desc: "People's Choice winners predict Oscar Best Picture 70%+ of the time", category: "Festivals" },
  { id: "venice", name: "Venice Film Festival", type: "Scrape", status: "live", records: "3.9K+", desc: "Golden Lion, Grand Jury, competition & out-of-competition selections", category: "Festivals" },
  { id: "berlin", name: "Berlinale", type: "Scrape", status: "live", records: "4.1K+", desc: "Competition, Encounters, Panorama, Forum, Generation", category: "Festivals" },
  { id: "sxsw", name: "SXSW Film", type: "Scrape", status: "live", records: "3.2K+", desc: "Narrative, documentary, midnighters, shorts — plus panel/podcast intel", category: "Festivals" },
  { id: "tribeca", name: "Tribeca Film Festival", type: "Scrape", status: "live", records: "3.6K+", desc: "Full selection history, audience awards, acquisitions", category: "Festivals" },
  { id: "blacklist", name: "The Black List", type: "API", status: "live", records: "1.8K+", desc: "Annual most-liked unproduced screenplays — many become Best Picture nominees", category: "Development" },
  { id: "wga", name: "WGA Arbitration Records", type: "Scrape", status: "indexed", records: "4.2K+", desc: "Credit arbitrations reveal who actually wrote what — the real chain of authorship", category: "Intelligence" },
  { id: "filmcommissions", name: "State Film Commissions (50)", type: "Multi-Scrape", status: "live", records: "156K+", desc: "Production listings, tax incentive data, location permits — know what's shooting where", category: "Production" },
  { id: "trades", name: "Trade Publications NLP", type: "NLP Pipeline", status: "live", records: "2.8M+", desc: "Deadline, Variety, THR, Screen — entity extraction for deals, hires, packages", category: "News" },
  { id: "reddit", name: "Reddit Film Communities", type: "API", status: "live", records: "890K+", desc: "r/movies, r/filmmakers, r/Screenwriting, r/boxoffice — sentiment + insider leaks", category: "Social" },
  { id: "podcasts", name: "Podcast Transcripts", type: "NLP Pipeline", status: "live", records: "45K+", desc: "The Business, Scriptnotes, IndieWire, The Town — NLP-extracted deal mentions", category: "Social" },
  { id: "twitter", name: "X/Twitter Film Intel", type: "API", status: "live", records: "3.2M+", desc: "Trade journalist posts, filmmaker announcements, premiere reactions", category: "Social" },
  { id: "europeanobs", name: "European Audiovisual Observatory", type: "API", status: "live", records: "210K+", desc: "European co-production data, Eurimages funding, pan-European admissions", category: "International" },
  { id: "coproduction", name: "Int'l Co-Production Treaties", type: "Static", status: "indexed", records: "2.4K+", desc: "Treaty details between 60+ countries — financing structures for international projects", category: "International" },
  { id: "mpaa", name: "MPA Ratings Database", type: "API", status: "live", records: "72K+", desc: "Every MPAA rating decision, appeals, and rating reasons", category: "Core" },
  { id: "grants", name: "Film Grants & Funds Database", type: "Multi-Scrape", status: "live", records: "8.9K+", desc: "Sundance Labs, IFP, Film Independent, Tribeca, Gotham — who got funded when", category: "Development" },
];

// ─── SAMPLE ENRICHED PROJECT DATA ────────────────────────────────
const PROJECTS = [
  {
    id: 1, title: "Moonlight", year: 2016, status: "Released",
    studio: "A24", director: "Barry Jenkins", writer: "Barry Jenkins, Tarell Alvin McCraney",
    producer: "Adele Romanski, Dede Gardner, Jeremy Kleiner",
    budget: 4000000, domestic: 27854932, worldwide: 65046687,
    genre: "Drama", rating: "R",
    festivalHistory: [
      { festival: "Telluride", year: 2016, section: "Main Program" },
      { festival: "TIFF", year: 2016, section: "Special Presentations", award: "N/A" },
      { festival: "NYFF", year: 2016, section: "Main Slate" },
    ],
    developmentTimeline: [
      { date: "2003", event: "Tarell McCraney writes semi-autobiographical play 'In Moonlight Black Boys Look Blue'" },
      { date: "2013-Q2", event: "Copyright registration filed — screenplay adaptation by Barry Jenkins" },
      { date: "2014-Q3", event: "Plan B Entertainment attached — Brad Pitt producing" },
      { date: "2015-Q4", event: "A24 acquires distribution rights pre-production" },
      { date: "2015-10", event: "Principal photography begins — Miami, 25-day shoot" },
      { date: "2016-09", event: "World premiere Telluride Film Festival" },
      { date: "2017-02", event: "Wins Best Picture at 89th Academy Awards" },
    ],
    sources: ["tmdb", "boxoffice", "copyright", "trades", "sundance"],
    tags: ["Oscar Winner", "A24", "Indie Breakout", "Black List Adjacent"],
    sonyHackRelevance: null,
    roi: 1526,
  },
  {
    id: 2, title: "The Interview", year: 2014, status: "Released",
    studio: "Sony Pictures", director: "Seth Rogen, Evan Goldberg", writer: "Dan Sterling",
    producer: "Seth Rogen, Evan Goldberg, James Weaver",
    budget: 44000000, domestic: 12300000, worldwide: 12300000,
    genre: "Comedy", rating: "R",
    festivalHistory: [],
    developmentTimeline: [
      { date: "2013-Q1", event: "Script by Dan Sterling enters development at Sony" },
      { date: "2013-Q3", event: "Sony greenlight — $44M budget approved" },
      { date: "2014-06", event: "North Korea issues threats over film content" },
      { date: "2014-11-24", event: "Sony Pictures hacked by 'Guardians of Peace'" },
      { date: "2014-12-05", event: "Sony hack reveals slate ultimates — unprecedented studio financial transparency" },
      { date: "2014-12-17", event: "Theatrical release cancelled after terror threats" },
      { date: "2014-12-25", event: "Digital release — first simultaneous VOD release by major studio" },
    ],
    sources: ["tmdb", "boxoffice", "sony", "trades", "pacer"],
    tags: ["Sony Hack", "Distribution Paradigm Shift", "Geopolitical"],
    sonyHackRelevance: "Central to Sony hack — triggered unprecedented leak of studio financial data including slate ultimates, talent compensation, and executive communications",
    roi: -72,
  },
  {
    id: 3, title: "Parasite", year: 2019, status: "Released",
    studio: "Neon", director: "Bong Joon-ho", writer: "Bong Joon-ho, Han Jin-won",
    producer: "Kwak Sin-ae, Bong Joon-ho",
    budget: 11400000, domestic: 53369749, worldwide: 263200000,
    genre: "Thriller/Drama", rating: "R",
    festivalHistory: [
      { festival: "Cannes", year: 2019, section: "Competition", award: "Palme d'Or" },
      { festival: "TIFF", year: 2019, section: "Special Presentations" },
      { festival: "NYFF", year: 2019, section: "Main Slate" },
    ],
    developmentTimeline: [
      { date: "2013", event: "Bong Joon-ho begins developing class satire concept" },
      { date: "2018-Q2", event: "CJ Entertainment fully finances — $11.4M budget" },
      { date: "2018-05", event: "Principal photography begins Seoul, South Korea" },
      { date: "2019-05", event: "Wins Palme d'Or at Cannes — unanimous jury" },
      { date: "2019-10", event: "Neon releases US theatrical — platform strategy" },
      { date: "2020-02", event: "Wins 4 Oscars including Best Picture — first non-English language BP winner" },
    ],
    sources: ["tmdb", "boxoffice", "cannes", "trades"],
    tags: ["Palme d'Or", "Oscar Winner", "Historic", "International Breakout"],
    sonyHackRelevance: null,
    roi: 2208,
  },
  {
    id: 4, title: "Get Out", year: 2017, status: "Released",
    studio: "Universal / Blumhouse", director: "Jordan Peele", writer: "Jordan Peele",
    producer: "Sean McKittrick, Jason Blum, Edward H. Hamm Jr., Jordan Peele",
    budget: 4500000, domestic: 176040665, worldwide: 255457078,
    genre: "Horror/Thriller", rating: "R",
    festivalHistory: [
      { festival: "Sundance", year: 2017, section: "Midnight" },
    ],
    developmentTimeline: [
      { date: "2015-Q1", event: "Jordan Peele completes spec script — shops to Blumhouse" },
      { date: "2015-Q3", event: "Blumhouse/QC Entertainment greenlight — $4.5M micro-budget model" },
      { date: "2016-02", event: "23-day shoot in Fairhope, Alabama" },
      { date: "2017-01", event: "Sundance Midnight premiere — immediate acquisition buzz" },
      { date: "2017-02", event: "Wide release — #1 opening weekend $33.4M" },
      { date: "2018-03", event: "Wins Best Original Screenplay Oscar" },
    ],
    sources: ["tmdb", "boxoffice", "sundance", "trades", "copyright"],
    tags: ["Sundance", "Blumhouse Model", "Micro-Budget", "Oscar Winner", "Black List 2015"],
    sonyHackRelevance: null,
    roi: 5577,
  },
  {
    id: 5, title: "Everything Everywhere All at Once", year: 2022, status: "Released",
    studio: "A24", director: "Daniel Kwan, Daniel Scheinert", writer: "Daniel Kwan, Daniel Scheinert",
    producer: "Daniel Kwan, Daniel Scheinert, Jonathan Wang",
    budget: 25000000, domestic: 77191978, worldwide: 146898500,
    genre: "Sci-Fi/Comedy/Drama", rating: "R",
    festivalHistory: [
      { festival: "SXSW", year: 2022, section: "Headliners", award: "Audience Award" },
    ],
    developmentTimeline: [
      { date: "2016", event: "Daniels begin writing — originally conceived for Jackie Chan" },
      { date: "2018-Q4", event: "A24 boards as financier/distributor — full greenlight" },
      { date: "2020-01", event: "Principal photography begins — shut down by COVID after 38 days" },
      { date: "2021-Q1", event: "Production resumes and completes" },
      { date: "2022-03", event: "SXSW world premiere — standing ovation, wins Audience Award" },
      { date: "2023-03", event: "Wins 7 Oscars including Best Picture — most for a single film since Slumdog" },
    ],
    sources: ["tmdb", "boxoffice", "sxsw", "trades"],
    tags: ["Oscar Winner", "A24", "SXSW", "COVID Production", "Multiverse"],
    sonyHackRelevance: null,
    roi: 488,
  },
  {
    id: 6, title: "American Hustle", year: 2013, status: "Released",
    studio: "Sony / Columbia", director: "David O. Russell", writer: "Eric Warren Singer, David O. Russell",
    producer: "Charles Roven, Richard Suckle, Megan Ellison, Jonathan Gordon",
    budget: 40000000, domestic: 150117807, worldwide: 251171807,
    genre: "Crime/Drama", rating: "R",
    festivalHistory: [],
    developmentTimeline: [
      { date: "2010", event: "Eric Warren Singer writes original script 'American Bullshit' — lands on Black List" },
      { date: "2011-Q3", event: "Columbia Pictures acquires — Russell attached to direct/rewrite" },
      { date: "2013-03", event: "Principal photography — Boston" },
      { date: "2013-12", event: "Theatrical release — $40M opening month" },
    ],
    sources: ["tmdb", "boxoffice", "sony", "blacklist", "trades", "copyright"],
    tags: ["Sony Hack", "Black List Origin", "Oscar Nominee"],
    sonyHackRelevance: "Sony hack revealed slate ultimates showing $30M+ projected profit. Also exposed Jennifer Lawrence pay gap vs male co-stars — catalyzed industry-wide pay equity conversation.",
    roi: 528,
  },
  {
    id: 7, title: "CODA", year: 2021, status: "Released",
    studio: "Apple TV+", director: "Sian Heder", writer: "Sian Heder",
    producer: "Philippe Rousselet, Fabrice Gianfermi, Patrick Wachsberger",
    budget: 10000000, domestic: 10300000, worldwide: 10300000,
    genre: "Drama/Music", rating: "PG-13",
    festivalHistory: [
      { festival: "Sundance", year: 2021, section: "U.S. Dramatic", award: "Grand Jury Prize, Audience Award, Directing, Ensemble Cast (4 awards — festival record)" },
    ],
    developmentTimeline: [
      { date: "2019-Q2", event: "Pathé acquires remake rights to French film 'La Famille Bélier'" },
      { date: "2020-02", event: "Principal photography — Gloucester, MA" },
      { date: "2021-01", event: "Sundance premiere — wins record 4 awards" },
      { date: "2021-02", event: "Apple TV+ acquires for $25M — record Sundance purchase" },
      { date: "2022-03", event: "Wins Best Picture Oscar — first streaming-exclusive BP winner" },
    ],
    sources: ["tmdb", "boxoffice", "sundance", "trades"],
    tags: ["Sundance Record", "Apple TV+", "Oscar Winner", "Streaming First", "Remake"],
    sonyHackRelevance: null,
    roi: 150,
  },
  {
    id: 8, title: "Whiplash", year: 2014, status: "Released",
    studio: "Sony Pictures Classics", director: "Damien Chazelle", writer: "Damien Chazelle",
    producer: "Jason Blum, Helen Estabrook, Michel Litvak, David Lancaster",
    budget: 3300000, domestic: 13092000, worldwide: 49000000,
    genre: "Drama/Music", rating: "R",
    festivalHistory: [
      { festival: "Sundance", year: 2014, section: "U.S. Dramatic", award: "Grand Jury Prize, Audience Award" },
      { festival: "Cannes", year: 2014, section: "Directors' Fortnight" },
    ],
    developmentTimeline: [
      { date: "2012", event: "Chazelle writes feature script — shops but can't get financing" },
      { date: "2013-Q1", event: "Shoots 18-min short film version to prove concept — accepted into Sundance Shorts" },
      { date: "2013-06", event: "Short wins Sundance Short Film Jury Prize — feature gets greenlit" },
      { date: "2013-09", event: "19-day shoot in Los Angeles — $3.3M budget" },
      { date: "2014-01", event: "Feature premieres Sundance — standing ovation — wins Grand Jury + Audience" },
      { date: "2014-05", event: "Sony Pictures Classics acquires worldwide rights" },
      { date: "2015-02", event: "3 Oscars including J.K. Simmons Best Supporting Actor" },
    ],
    sources: ["tmdb", "boxoffice", "sundance", "copyright", "trades"],
    tags: ["Sundance", "Short-to-Feature Pipeline", "Micro-Budget", "Oscar Winner"],
    sonyHackRelevance: null,
    roi: 1385,
  },
];

// ─── FESTIVAL CIRCUIT DATA ───────────────────────────────────────
const FESTIVALS = [
  { name: "Sundance", location: "Park City, UT → Boulder, CO (2027)", month: "January", founded: 1978, avgAcquisitions: 28, avgAcqPrice: "$3.2M", topDeal: "CODA ($25M, Apple, 2021)", prestige: 95, marketActivity: 98 },
  { name: "Berlin", location: "Berlin, Germany", month: "February", founded: 1951, avgAcquisitions: 15, avgAcqPrice: "€1.8M", topDeal: "Various", prestige: 92, marketActivity: 88 },
  { name: "SXSW", location: "Austin, TX", month: "March", founded: 1987, avgAcquisitions: 18, avgAcqPrice: "$1.5M", topDeal: "Various", prestige: 72, marketActivity: 75 },
  { name: "Tribeca", location: "New York, NY", month: "April/June", founded: 2002, avgAcquisitions: 12, avgAcqPrice: "$1.1M", topDeal: "Various", prestige: 70, marketActivity: 65 },
  { name: "Cannes", location: "Cannes, France", month: "May", founded: 1946, avgAcquisitions: 22, avgAcqPrice: "€4.5M", topDeal: "Various pre-sales", prestige: 99, marketActivity: 99 },
  { name: "Venice", location: "Venice, Italy", month: "August/September", founded: 1932, avgAcquisitions: 10, avgAcqPrice: "€2.8M", topDeal: "Various", prestige: 97, marketActivity: 78 },
  { name: "Telluride", location: "Telluride, CO", month: "September", founded: 1974, avgAcquisitions: 2, avgAcqPrice: "N/A", topDeal: "N/A (no market)", prestige: 96, marketActivity: 10 },
  { name: "TIFF", location: "Toronto, Canada", month: "September", founded: 1976, avgAcquisitions: 35, avgAcqPrice: "$2.8M", topDeal: "Various", prestige: 94, marketActivity: 96 },
  { name: "NYFF", location: "New York, NY", month: "September/October", founded: 1963, avgAcquisitions: 3, avgAcqPrice: "N/A", topDeal: "N/A (curated)", prestige: 91, marketActivity: 15 },
  { name: "AFI Fest", location: "Los Angeles, CA", month: "October", founded: 1987, avgAcquisitions: 5, avgAcqPrice: "$800K", topDeal: "Various", prestige: 68, marketActivity: 40 },
];

// ─── STUDIO INTELLIGENCE (26 YEAR TRENDS) ────────────────────────
const STUDIO_DATA = [
  { name: "Disney / 20th Century", marketShare2024: 15.7, avgBudget: 180, slateSize: 18, oscars: 12, color: COLORS.blue },
  { name: "Warner Bros. Discovery", marketShare2024: 13.2, avgBudget: 155, slateSize: 22, oscars: 8, color: COLORS.purple },
  { name: "Universal / Focus", marketShare2024: 18.1, avgBudget: 140, slateSize: 24, oscars: 11, color: COLORS.green },
  { name: "Sony / Columbia", marketShare2024: 11.4, avgBudget: 120, slateSize: 20, oscars: 6, color: COLORS.orange },
  { name: "Paramount", marketShare2024: 7.8, avgBudget: 130, slateSize: 15, oscars: 5, color: COLORS.cyan },
  { name: "Lionsgate / Summit", marketShare2024: 4.2, avgBudget: 45, slateSize: 16, oscars: 3, color: COLORS.magenta },
  { name: "A24", marketShare2024: 3.1, avgBudget: 12, slateSize: 22, oscars: 10, color: COLORS.accent },
  { name: "Neon", marketShare2024: 1.8, avgBudget: 8, slateSize: 14, oscars: 4, color: COLORS.red },
];

// ─── YEARLY BOX OFFICE OVERVIEW ──────────────────────────────────
const YEARLY_DATA = [
  { year: 2000, total: 7.66, films: 478, avgTicket: 5.39 },
  { year: 2002, total: 9.52, films: 479, avgTicket: 5.81 },
  { year: 2004, total: 9.38, films: 475, avgTicket: 6.21 },
  { year: 2006, total: 9.21, films: 599, avgTicket: 6.55 },
  { year: 2008, total: 9.63, films: 610, avgTicket: 7.18 },
  { year: 2010, total: 10.57, films: 563, avgTicket: 7.89 },
  { year: 2012, total: 10.84, films: 667, avgTicket: 7.96 },
  { year: 2014, total: 10.36, films: 707, avgTicket: 8.17 },
  { year: 2016, total: 11.38, films: 736, avgTicket: 8.65 },
  { year: 2018, total: 11.89, films: 752, avgTicket: 9.11 },
  { year: 2019, total: 11.32, films: 786, avgTicket: 9.16 },
  { year: 2020, total: 2.12, films: 328, avgTicket: 9.37 },
  { year: 2021, total: 4.48, films: 403, avgTicket: 9.57 },
  { year: 2022, total: 7.37, films: 445, avgTicket: 10.53 },
  { year: 2023, total: 8.91, films: 498, avgTicket: 10.78 },
  { year: 2024, total: 8.74, films: 510, avgTicket: 11.12 },
  { year: 2025, total: 9.12, films: 525, avgTicket: 11.48 },
];

// ─── CREATIVE INTELLIGENCE ITEMS ─────────────────────────────────
const INTELLIGENCE_ITEMS = [
  {
    type: "SONY HACK INSIGHT",
    date: "2014-12-05",
    title: "Slate Ultimates Revealed",
    detail: "Leaked document prepared for Sony Corp Japan reveals 2013 film profitability. ~$1B production spend delivers $500-600M in profits. This Is The End: $50M profit. Grown Ups 2: $48M profit. Captain Phillips: undisclosed but profitable. Most closely guarded financial data in Hollywood now public.",
    source: "Sony Hack Archive → THR Reporting",
    impact: "HIGH",
  },
  {
    type: "SONY HACK INSIGHT",
    date: "2014-12-09",
    title: "Gender Pay Gap Exposed",
    detail: "Leaked compensation data reveals Jennifer Lawrence and Amy Adams received less favorable compensation than male co-stars on American Hustle. Lawrence later penned essay 'Why Do I Make Less Than My Male Co-Stars?' Catalyzed industry-wide pay equity movement.",
    source: "Sony Hack Archive → Variety/THR Reporting",
    impact: "PARADIGM SHIFT",
  },
  {
    type: "COURT FILING",
    date: "2010-03-15",
    title: "Buchwald v Paramount — Studio Accounting Exposed",
    detail: "Court ruled Paramount's definition of 'net profit' was unconscionable. Revealed that Coming to America, despite grossing $350M worldwide, showed a $18M net loss on studio books. Established legal precedent that studio accounting practices can be challenged.",
    source: "PACER / Los Angeles Superior Court",
    impact: "HIGH",
  },
  {
    type: "BANKRUPTCY FILING",
    date: "2018-05-03",
    title: "Relativity Media Chapter 11 — Structure Exposed",
    detail: "Filing revealed Relativity's output deal structure with major studios, international pre-sales commitments, and actual investor returns. Showed how mini-major financing models work (and fail).",
    source: "US Bankruptcy Court — SDNY",
    impact: "MEDIUM",
  },
  {
    type: "SEC FILING",
    date: "2023-Q4",
    title: "Disney Segment Restructure — Studio Economics Visible",
    detail: "Disney's 10-K now breaks out 'Entertainment' segment including theatrical, DTC, and linear. First time investors can see actual theatrical film P&L contribution vs streaming content spend. Studios segment showed $1.2B operating income on $10.8B revenue.",
    source: "SEC EDGAR — DIS 10-K FY2023",
    impact: "MEDIUM",
  },
  {
    type: "COPYRIGHT INTELLIGENCE",
    date: "2022-08",
    title: "Oppenheimer Script Registration — 14 Months Pre-Greenlight",
    detail: "Christopher Nolan registered screenplay with US Copyright Office in August 2022. Universal greenlight announced October 2022. Copyright data shows average 8-14 month lead time between registration and public announcement — early signal for tracking development.",
    source: "US Copyright Office CPRS",
    impact: "TACTICAL",
  },
  {
    type: "FILM COMMISSION DATA",
    date: "2024-Q2",
    title: "Georgia Production Report — $4.4B Economic Impact",
    detail: "Georgia Film Commission data shows 412 productions in 2024. Combined with NM, UK, and Australian commission data, can map global production migration patterns and tax incentive effectiveness.",
    source: "Georgia Dept. of Economic Development",
    impact: "MEDIUM",
  },
];

// ─── BLACK LIST HIGHLIGHTS ───────────────────────────────────────
const BLACKLIST_ITEMS = [
  { year: 2005, title: "Juno", writer: "Diablo Cody", status: "Produced", boxOffice: "$231M", oscar: "Won Original Screenplay" },
  { year: 2006, title: "Lars and the Real Girl", writer: "Nancy Oliver", status: "Produced", boxOffice: "$11M", oscar: "Nominated" },
  { year: 2007, title: "The King's Speech", writer: "David Seidler", status: "Produced", boxOffice: "$427M", oscar: "Won Best Picture" },
  { year: 2009, title: "The Imitation Game", writer: "Graham Moore", status: "Produced", boxOffice: "$233M", oscar: "Won Adapted Screenplay" },
  { year: 2010, title: "American Bullshit (American Hustle)", writer: "Eric Warren Singer", status: "Produced", boxOffice: "$251M", oscar: "10 Nominations" },
  { year: 2011, title: "Hell or High Water", writer: "Taylor Sheridan", status: "Produced", boxOffice: "$37M", oscar: "4 Nominations" },
  { year: 2012, title: "Spotlight", writer: "Josh Singer, Tom McCarthy", status: "Produced", boxOffice: "$98M", oscar: "Won Best Picture" },
  { year: 2013, title: "Manchester by the Sea", writer: "Kenneth Lonergan", status: "Produced", boxOffice: "$79M", oscar: "Won Original Screenplay + Actor" },
  { year: 2018, title: "Promising Young Woman", writer: "Emerald Fennell", status: "Produced", boxOffice: "$33M", oscar: "Won Original Screenplay" },
  { year: 2020, title: "The Whale", writer: "Samuel D. Hunter", status: "Produced", boxOffice: "$55M", oscar: "Won Best Actor" },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const fontStack = "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace";
const displayFont = "'Georgia', 'Palatino', 'Times New Roman', serif";

const containerStyle = {
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: fontStack,
  fontSize: 12,
  minHeight: "100vh",
  lineHeight: 1.5,
};

function Badge({ children, color = COLORS.accent, bg = null }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: color,
      background: bg || `${color}18`,
      border: `1px solid ${color}30`,
      borderRadius: 2,
      fontFamily: fontStack,
    }}>
      {children}
    </span>
  );
}

function StatBox({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      padding: "14px 18px",
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color, fontFamily: displayFont, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color = COLORS.accent, width = 80 }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ width, height: 4, background: `${color}20`, borderRadius: 1 }}>
        <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 1 }} />
      </div>
      <span style={{ fontSize: 10, color: COLORS.textMuted }}>{value}</span>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${COLORS.accent}15` : "transparent",
        border: `1px solid ${active ? COLORS.accent : "transparent"}`,
        borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
        color: active ? COLORS.accent : COLORS.textMuted,
        padding: "8px 16px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: fontStack,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.text,
        padding: "8px 14px",
        fontSize: 12,
        fontFamily: fontStack,
        outline: "none",
        width: "100%",
        maxWidth: 400,
      }}
    />
  );
}

// ─── DASHBOARD TAB ───────────────────────────────────────────────
function DashboardTab() {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatBox label="Total Data Sources" value="25" sub="Live feeds + indexed archives" />
        <StatBox label="Records Indexed" value="8.4M+" sub="Across all sources" color={COLORS.green} />
        <StatBox label="Years Covered" value="26" sub="2000 — 2026" color={COLORS.blue} />
        <StatBox label="Films Tracked" value="184K+" sub="Studio + indie + international" color={COLORS.purple} />
        <StatBox label="Festival Circuits" value="42" sub="Major + regional festivals" color={COLORS.orange} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Box Office Trend */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20 }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
            US Box Office Revenue (Billions) — 26 Year Trend
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
            {YEARLY_DATA.map((d) => {
              const max = 12;
              const h = (d.total / max) * 110;
              const isCovid = d.year === 2020 || d.year === 2021;
              return (
                <div key={d.year} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 28,
                      height: h,
                      background: isCovid ? COLORS.red : d.year >= 2024 ? COLORS.green : COLORS.accent,
                      opacity: isCovid ? 0.7 : 0.8,
                      borderRadius: "2px 2px 0 0",
                      position: "relative",
                    }}
                    title={`${d.year}: $${d.total}B`}
                  />
                  <div style={{ fontSize: 7, color: COLORS.textDim, marginTop: 4, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 28 }}>
                    {d.year % 4 === 0 ? `'${String(d.year).slice(2)}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}><span style={{ color: COLORS.red }}>■</span> COVID Impact</span>
            <span style={{ fontSize: 9, color: COLORS.textDim }}><span style={{ color: COLORS.green }}>■</span> Recovery</span>
            <span style={{ fontSize: 9, color: COLORS.textDim }}><span style={{ color: COLORS.accent }}>■</span> Normal</span>
          </div>
        </div>

        {/* Studio Market Share */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20 }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
            Studio Market Share 2024 (Domestic Box Office %)
          </div>
          {STUDIO_DATA.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 130, fontSize: 10, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ flex: 1, height: 8, background: `${s.color}15`, borderRadius: 1 }}>
                <div style={{ width: `${(s.marketShare2024 / 20) * 100}%`, height: "100%", background: s.color, borderRadius: 1 }} />
              </div>
              <div style={{ width: 36, fontSize: 10, color: s.color, textAlign: "right" }}>{s.marketShare2024}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Intelligence */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20 }}>
        <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
          Intelligence Feed — Key Revelations
        </div>
        {INTELLIGENCE_ITEMS.slice(0, 4).map((item, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "12px 0", display: "flex", gap: 14 }}>
            <div style={{ minWidth: 80 }}>
              <Badge color={
                item.impact === "PARADIGM SHIFT" ? COLORS.red :
                item.impact === "HIGH" ? COLORS.orange :
                item.impact === "TACTICAL" ? COLORS.cyan : COLORS.textMuted
              }>{item.impact}</Badge>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <Badge color={
                  item.type.includes("SONY") ? COLORS.red :
                  item.type.includes("COURT") ? COLORS.purple :
                  item.type.includes("SEC") ? COLORS.blue :
                  item.type.includes("COPYRIGHT") ? COLORS.green : COLORS.accent
                }>{item.type}</Badge>
                <span style={{ fontSize: 10, color: COLORS.textDim }}>{item.date}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>{item.detail}</div>
              <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 4 }}>Source: {item.source}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROJECT EXPLORER TAB ────────────────────────────────────────
function ProjectExplorerTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return PROJECTS;
    const q = search.toLowerCase();
    return PROJECTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.director.toLowerCase().includes(q) ||
        p.studio.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [search]);

  const project = selected ? PROJECTS.find((p) => p.id === selected) : null;

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search by title, director, studio, tag..." />
      <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 4, marginBottom: 16 }}>
        {filtered.length} projects — showing sample dataset. Full dataset: 184,000+ films.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: project ? "1fr 1.4fr" : "1fr", gap: 16 }}>
        {/* Project List */}
        <div>
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id === selected ? null : p.id)}
              style={{
                background: p.id === selected ? `${COLORS.accent}10` : COLORS.card,
                border: `1px solid ${p.id === selected ? COLORS.accent : COLORS.border}`,
                padding: "12px 16px",
                marginBottom: 6,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, fontFamily: displayFont }}>{p.title}</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 8 }}>({p.year})</span>
                </div>
                <Badge color={p.roi > 500 ? COLORS.green : p.roi > 0 ? COLORS.accent : COLORS.red}>
                  {p.roi > 0 ? "+" : ""}{p.roi}% ROI
                </Badge>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>
                {p.director} · {p.studio} · {p.genre}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.tags.slice(0, 4).map((t) => (
                  <span key={t} style={{ fontSize: 8, color: COLORS.textDim, background: `${COLORS.border}`, padding: "1px 6px", borderRadius: 1 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Project Detail */}
        {project && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20, position: "sticky", top: 20, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: displayFont, color: COLORS.text }}>{project.title}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{project.year} · {project.genre} · Rated {project.rating}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {/* Financials */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              <div style={{ background: COLORS.surface, padding: 10 }}>
                <div style={{ fontSize: 8, color: COLORS.textDim, textTransform: "uppercase" }}>Budget</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, fontFamily: displayFont }}>${(project.budget / 1e6).toFixed(1)}M</div>
              </div>
              <div style={{ background: COLORS.surface, padding: 10 }}>
                <div style={{ fontSize: 8, color: COLORS.textDim, textTransform: "uppercase" }}>Domestic</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green, fontFamily: displayFont }}>${(project.domestic / 1e6).toFixed(1)}M</div>
              </div>
              <div style={{ background: COLORS.surface, padding: 10 }}>
                <div style={{ fontSize: 8, color: COLORS.textDim, textTransform: "uppercase" }}>Worldwide</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.blue, fontFamily: displayFont }}>${(project.worldwide / 1e6).toFixed(1)}M</div>
              </div>
            </div>

            {/* Key People */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.1em" }}>Key Personnel</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}><span style={{ color: COLORS.accent }}>DIR</span> {project.director}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}><span style={{ color: COLORS.accent }}>WRI</span> {project.writer}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}><span style={{ color: COLORS.accent }}>PRD</span> {project.producer}</div>
            </div>

            {/* Festival History */}
            {project.festivalHistory.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.1em" }}>Festival Circuit</div>
                {project.festivalHistory.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <Badge color={COLORS.purple}>{f.festival}</Badge>
                    <span style={{ fontSize: 10, color: COLORS.textMuted }}>{f.section}</span>
                    {f.award && f.award !== "N/A" && <Badge color={COLORS.accent}>{f.award}</Badge>}
                  </div>
                ))}
              </div>
            )}

            {/* Development Timeline */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.1em" }}>Development Timeline</div>
              {project.developmentTimeline.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${i === project.developmentTimeline.length - 1 ? COLORS.accent : COLORS.border}` }}>
                  <div style={{ minWidth: 60, fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>{ev.date}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5 }}>{ev.event}</div>
                </div>
              ))}
            </div>

            {/* Sony Hack Relevance */}
            {project.sonyHackRelevance && (
              <div style={{ background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}25`, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <Badge color={COLORS.red}>SONY HACK INTEL</Badge>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>{project.sonyHackRelevance}</div>
              </div>
            )}

            {/* Data Sources */}
            <div>
              <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.1em" }}>Data Sources</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {project.sources.map((s) => {
                  const src = DATA_SOURCES.find((ds) => ds.id === s);
                  return <Badge key={s} color={COLORS.cyan}>{src?.name || s}</Badge>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FESTIVAL TRACKER TAB ────────────────────────────────────────
function FestivalTrackerTab() {
  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Major Festival Circuit — Annual Calendar & Market Intelligence
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {FESTIVALS.map((f) => (
          <div key={f.name} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: displayFont, color: COLORS.text }}>{f.name}</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted }}>{f.location} · {f.month}</div>
              </div>
              <div style={{ fontSize: 9, color: COLORS.textDim }}>Est. {f.founded}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 8, color: COLORS.textDim, textTransform: "uppercase" }}>Avg Acquisitions/Yr</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.green, fontFamily: displayFont }}>{f.avgAcquisitions}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: COLORS.textDim, textTransform: "uppercase" }}>Avg Deal Price</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent, fontFamily: displayFont }}>{f.avgAcqPrice}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 8, color: COLORS.textDim, marginBottom: 2 }}>Prestige</div>
                <MiniBar value={f.prestige} max={100} color={COLORS.purple} />
              </div>
              <div>
                <div style={{ fontSize: 8, color: COLORS.textDim, marginBottom: 2 }}>Market Activity</div>
                <MiniBar value={f.marketActivity} max={100} color={COLORS.blue} />
              </div>
            </div>
            <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 8 }}>
              Notable: {f.topDeal}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Festival-to-Oscar Pipeline (2000–2026)
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.8 }}>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>73%</span> of Best Picture winners premiered at TIFF, Venice, or Telluride.{" "}
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>TIFF People's Choice Award</span> has predicted Best Picture 14 of last 20 years.{" "}
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>Cannes Palme d'Or</span> to Oscar pipeline strengthened post-Parasite.{" "}
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>Sundance</span> remains the primary launchpad for indie breakouts — avg. Sundance acquisition ROI: 340%.
        </div>
      </div>
    </div>
  );
}

// ─── DATA SOURCES TAB ────────────────────────────────────────────
function DataSourcesTab() {
  const categories = [...new Set(DATA_SOURCES.map((s) => s.category))];
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? DATA_SOURCES : DATA_SOURCES.filter((s) => s.category === filter);

  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Data Pipeline Architecture — 25 Sources, 8.4M+ Records
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("All")} style={{
          background: filter === "All" ? COLORS.accent : COLORS.surface,
          color: filter === "All" ? COLORS.bg : COLORS.textMuted,
          border: `1px solid ${COLORS.border}`, padding: "4px 12px", fontSize: 9, cursor: "pointer", fontFamily: fontStack,
          fontWeight: filter === "All" ? 700 : 400,
        }}>ALL</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{
            background: filter === c ? COLORS.accent : COLORS.surface,
            color: filter === c ? COLORS.bg : COLORS.textMuted,
            border: `1px solid ${COLORS.border}`, padding: "4px 12px", fontSize: 9, cursor: "pointer", fontFamily: fontStack,
            fontWeight: filter === c ? 700 : 400,
          }}>{c.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
        {filtered.map((s) => (
          <div key={s.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ minWidth: 8, height: 8, borderRadius: "50%", background: s.status === "live" ? COLORS.green : COLORS.accent }} />
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{s.name}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <Badge color={s.type === "API" ? COLORS.green : s.type === "Scrape" ? COLORS.blue : s.type === "NLP Pipeline" ? COLORS.purple : COLORS.orange}>{s.type}</Badge>
                <Badge color={COLORS.textDim}>{s.category}</Badge>
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5 }}>{s.desc}</div>
            <div style={{ minWidth: 70, textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent, fontFamily: displayFont }}>{s.records}</div>
              <div style={{ fontSize: 8, color: COLORS.textDim }}>records</div>
            </div>
          </div>
        ))}
      </div>

      {/* Creative Sources Callout */}
      <div style={{ background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}25`, padding: 20, marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          ★ Creative Intelligence Sources — What Makes F1RSTL00K Different
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 2 }}>
          <div><span style={{ color: COLORS.red, fontWeight: 700 }}>SONY HACK ARCHIVE</span> — Reported slate ultimates, talent compensation tables, greenlight process memos, packaging docs. Cross-referenced with THR/Variety reporting for fact-checked data only.</div>
          <div><span style={{ color: COLORS.purple, fontWeight: 700 }}>PACER COURT RECORDS</span> — Net profit lawsuits (Buchwald v Paramount, Peter Jackson v New Line, etc.) reveal actual studio accounting formulas hidden from public view.</div>
          <div><span style={{ color: COLORS.orange, fontWeight: 700 }}>BANKRUPTCY FILINGS</span> — Relativity Media, Open Road, Orion Pictures restructurings expose mini-major financing models, slate deal terms, and real investor returns.</div>
          <div><span style={{ color: COLORS.green, fontWeight: 700 }}>US COPYRIGHT OFFICE</span> — Script registrations appear 8-14 months before public greenlight announcements. Early detection system for projects in development.</div>
          <div><span style={{ color: COLORS.blue, fontWeight: 700 }}>SEC EDGAR FILINGS</span> — Segment-level P&L for Disney, Warner, Paramount, Lionsgate. 10-K risk factors reveal strategic pivots months before trade announcements.</div>
          <div><span style={{ color: COLORS.cyan, fontWeight: 700 }}>STATE FILM COMMISSIONS (50)</span> — Production permit data, tax incentive applications, and location reports reveal what's shooting before it's announced.</div>
          <div><span style={{ color: COLORS.magenta, fontWeight: 700 }}>PODCAST NLP PIPELINE</span> — Transcribed and entity-extracted from The Business (KCRW), Scriptnotes, The Town, IndieWire — catches deal mentions missed by trades.</div>
          <div><span style={{ color: COLORS.accent, fontWeight: 700 }}>WGA ARBITRATION RECORDS</span> — Credit disputes reveal the real writing history behind every script. Who actually wrote what — the chain of authorship.</div>
        </div>
      </div>
    </div>
  );
}

// ─── BLACK LIST & DEVELOPMENT TAB ────────────────────────────────
function DevelopmentTab() {
  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
        The Black List → Production Pipeline (2005–2026)
      </div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1.2fr 1fr 0.6fr 0.6fr 1fr", padding: "8px 16px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <div>Year</div><div>Title</div><div>Writer</div><div>Status</div><div>Box Office</div><div>Oscar Result</div>
        </div>
        {BLACKLIST_ITEMS.map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1.2fr 1fr 0.6fr 0.6fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>{item.year}</div>
            <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, fontFamily: displayFont }}>{item.title}</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>{item.writer}</div>
            <Badge color={COLORS.green}>{item.status}</Badge>
            <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>{item.boxOffice}</div>
            <div style={{ fontSize: 10, color: item.oscar.includes("Won") ? COLORS.accent : COLORS.textMuted }}>{item.oscar}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20 }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Black List → Oscar Conversion Rate
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.accent, fontFamily: displayFont }}>31%</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Of Black List scripts that get produced eventually receive at least one Oscar nomination. The list has identified 5 eventual Best Picture winners before production.
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20 }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Development Tracking Signals
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 2 }}>
            <div><Badge color={COLORS.green}>SIGNAL 1</Badge> Copyright registration — avg 8-14 months before greenlight</div>
            <div><Badge color={COLORS.blue}>SIGNAL 2</Badge> Trade announcement — writer/director attachment</div>
            <div><Badge color={COLORS.purple}>SIGNAL 3</Badge> Film commission permit application</div>
            <div><Badge color={COLORS.orange}>SIGNAL 4</Badge> Casting call sheets — Breakdown Services</div>
            <div><Badge color={COLORS.cyan}>SIGNAL 5</Badge> Tax incentive application — state/country</div>
            <div><Badge color={COLORS.accent}>SIGNAL 6</Badge> Festival lab/grant recipient announcement</div>
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 20, marginTop: 16 }}>
        <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Turnaround & Available IP Tracker
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.8 }}>
          Monitors projects that go into turnaround at major studios, expired options on IP, and available underlying material. Cross-references WGA registration data,
          trade announcements of talent departures, and court filings for rights reversions. Sources include: PACER (rights disputes), US Copyright Office (registration
          expirations), trade NLP pipeline (turnaround mentions), and film commission data (abandoned permits). This is the "free agent market" for film IP — projects
          that major studios passed on that could become the next Moonlight or Parasite at a fraction of the development cost.
        </div>
      </div>
    </div>
  );
}

// ─── STUDIO INTELLIGENCE TAB ─────────────────────────────────────
function StudioIntelTab() {
  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
        Studio Intelligence — Deep Financial & Strategic Analysis
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 0.8fr", padding: "8px 16px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 9, color: COLORS.textDim, textTransform: "uppercase" }}>
          <div>Studio</div><div>Market Share</div><div>Avg Budget</div><div>Slate Size</div><div>BP Oscars (26yr)</div>
        </div>
        {STUDIO_DATA.map((s) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 0.8fr", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.name}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, fontFamily: displayFont }}>{s.marketShare2024}%</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: displayFont }}>${s.avgBudget}M</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: displayFont }}>{s.slateSize}/yr</div>
            <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 700, fontFamily: displayFont }}>{s.oscars}</div>
          </div>
        ))}
      </div>

      {/* Sony Hack Deep Dive */}
      <div style={{ background: `${COLORS.red}05`, border: `1px solid ${COLORS.red}20`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.red, fontFamily: displayFont }}>Sony Hack Intelligence Module</div>
          <Badge color={COLORS.red}>FACT-CHECKED ONLY</Badge>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.8, marginBottom: 16 }}>
          The 2014 Sony Pictures hack was the most significant involuntary transparency event in Hollywood history. F1RSTL00K indexes only information that was subsequently reported and fact-checked by major trade publications (THR, Variety, Deadline). No raw leaked data is stored — only verified revelations.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { title: "Slate Ultimates", desc: "Long-term profitability of every Sony film — most guarded data in Hollywood. Reveals actual cost of marketing, distribution overhead, and ancillary revenue splits.", count: "40+ films", color: COLORS.red },
            { title: "Talent Compensation", desc: "Actor, director, producer deal terms including back-end points, first-dollar gross, and MFN clauses. Exposed gender pay disparities.", count: "200+ deals", color: COLORS.orange },
            { title: "Greenlight Process", desc: "Internal memos showing how films get approved — budget negotiations, talent packaging, and executive championing dynamics.", count: "85+ projects", color: COLORS.purple },
            { title: "Distribution Strategy", desc: "Digital deal terms with Apple, Google, Amazon. Bundling practices for TV sales. International pre-sale commitments.", count: "150+ deals", color: COLORS.blue },
          ].map((item, i) => (
            <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.title}</div>
                <Badge color={item.color}>{item.count}</Badge>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SEC + Court + Bankruptcy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, marginBottom: 8 }}>SEC EDGAR Module</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Quarterly and annual filings for Disney (DIS), Warner Bros Discovery (WBD), Paramount (PARA), Lionsgate (LGF), and IMAX (IMAX). Segment-level revenue, operating income, content amortization schedules, and risk factor analysis. 10-K risk factors often preview strategic pivots 6-12 months before trade announcements.
          </div>
        </div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.purple, marginBottom: 8 }}>Court Records Module</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Net profit lawsuits are the X-ray machine of studio accounting. Cases like Buchwald v Paramount revealed that films grossing hundreds of millions show "losses" on studio books. F1RSTL00K indexes rulings, depositions, and expert testimony that expose real distribution fee structures.
          </div>
        </div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.orange, marginBottom: 8 }}>Bankruptcy Module</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
            When production companies file Chapter 11 or 7, their financial structures become public record. Relativity Media, Open Road Films, The Weinstein Company, Lantern Entertainment — all exposed their deal structures, overhead, and investor returns in court filings.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEMA TAB ──────────────────────────────────────────────────
function SchemaTab() {
  const schema = [
    {
      table: "projects",
      fields: "id, title, year, status (dev/pre/prod/post/released/shelved), genre, rating, logline, synopsis, budget_confirmed, budget_estimated, source_material, source_material_type (original/book/play/remake/sequel/reboot/true_story)",
      relations: "→ project_people, → project_financials, → project_festivals, → project_timeline, → project_sources",
    },
    {
      table: "project_people",
      fields: "project_id, person_id, role (director/writer/producer/actor/exec/agent), credit_type (above_line/below_line), billing_order, compensation_known, compensation_source",
      relations: "→ people, → projects",
    },
    {
      table: "people",
      fields: "id, name, roles[], agency, management, law_firm, career_start_year, notable_credits[], oscar_noms, oscar_wins, social_handles, imdb_id",
      relations: "→ project_people, → companies",
    },
    {
      table: "companies",
      fields: "id, name, type (studio/prodco/distrib/agency/financier/sales_agent/streamer), parent_company, founded, defunct_date, sec_ticker, hq_location",
      relations: "→ projects (via deals), → people (via employment)",
    },
    {
      table: "project_financials",
      fields: "project_id, budget, p_and_a, domestic_gross, international_gross, home_video, streaming_license, ancillary, tax_incentive_amount, tax_incentive_state, pre_sales_total, roi_calculated, ultimate_profit (Sony hack data where available)",
      relations: "→ projects",
    },
    {
      table: "festival_entries",
      fields: "project_id, festival_id, year, section, world_premiere (bool), award_won, acquisition_price, buyer_company_id, acquisition_rights_territory, date_acquired",
      relations: "→ projects, → festivals, → companies",
    },
    {
      table: "development_signals",
      fields: "project_id, signal_type (copyright_reg/trade_announcement/permit/casting/tax_app/grant/lab), signal_date, signal_source, confidence_score, days_before_greenlight",
      relations: "→ projects",
    },
    {
      table: "intelligence_items",
      fields: "id, type (sony_hack/court_filing/sec_filing/bankruptcy/wga_arbitration), date, title, detail, source, impact_level, related_project_ids[], related_company_ids[], fact_check_status",
      relations: "→ projects, → companies",
    },
    {
      table: "source_documents",
      fields: "id, source_type, source_url, retrieved_date, raw_text, entities_extracted[], projects_mentioned[], people_mentioned[], companies_mentioned[], nlp_confidence_score",
      relations: "→ projects, → people, → companies",
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
        Database Schema — Relational Architecture
      </div>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
        PostgreSQL with full-text search (pg_tsvector), PostGIS for location data, and TimescaleDB for time-series analytics. NLP pipeline uses spaCy for entity extraction from trade articles and podcast transcripts. Vector embeddings (pgvector) enable semantic search across 8.4M+ records.
      </div>

      {schema.map((s) => (
        <div key={s.table} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, fontFamily: fontStack }}>{s.table}</span>
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.8, marginBottom: 6 }}>
            <span style={{ color: COLORS.textDim }}>COLUMNS:</span> {s.fields}
          </div>
          <div style={{ fontSize: 10, color: COLORS.cyan, lineHeight: 1.6 }}>
            <span style={{ color: COLORS.textDim }}>RELATIONS:</span> {s.relations}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function F1RSTL00K() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Project Explorer" },
    { id: "festivals", label: "Festival Circuit" },
    { id: "development", label: "Development / Black List" },
    { id: "studios", label: "Studio Intelligence" },
    { id: "sources", label: "Data Sources" },
    { id: "schema", label: "DB Schema" },
  ];

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{
            fontSize: 20,
            fontWeight: 900,
            color: COLORS.accent,
            fontFamily: fontStack,
            letterSpacing: "-0.02em",
          }}>
            F1RSTL00K
          </span>
          <span style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Producer's Intelligence Platform
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 10, color: COLORS.textDim }}>
            {time.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span style={{ fontSize: 10, color: COLORS.accent, fontVariantNumeric: "tabular-nums" }}>
            {time.toLocaleTimeString("en-US", { hour12: false })}
          </span>
          <Badge color={COLORS.green}>LIVE</Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 24px",
        display: "flex",
        gap: 0,
        overflowX: "auto",
      }}>
        {tabs.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 24px 48px" }}>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "projects" && <ProjectExplorerTab />}
        {activeTab === "festivals" && <FestivalTrackerTab />}
        {activeTab === "development" && <DevelopmentTab />}
        {activeTab === "studios" && <StudioIntelTab />}
        {activeTab === "sources" && <DataSourcesTab />}
        {activeTab === "schema" && <SchemaTab />}
      </div>

      {/* Footer */}
      <div style={{
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        padding: "10px 24px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9,
        color: COLORS.textDim,
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
      }}>
        <span>F1RSTL00K v2.0 — 25 Data Sources · 8.4M+ Records · 26 Years (2000–2026)</span>
        <span>Data refreshes: Trades (15min) · Social (1hr) · Filings (24hr) · Festivals (weekly)</span>
      </div>
    </div>
  );
}
