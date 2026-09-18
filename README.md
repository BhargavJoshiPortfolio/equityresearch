# Equity Research Portfolio

A static site showcasing independent equity research on seven companies: **Palantir (PLTR)**, **Gilead Sciences (GILD)**, **Himax Technologies (HIMX)**, **CrowdStrike (CRWD)**, **Infineon Technologies (IFX)**, **Micron Technology (MU)**, and **RTX Corporation (RTX)**.

Each stock page includes a business overview, bull case, bear case, recent catalysts, key metrics, analyst price targets against the live price, a valuation view, an interactive price chart (6M / 1Y / 3Y with hover values), and cited sources. A compare page rebases all seven to 100 against the S&P 500 or the SOX semiconductor index, and the home grid can be filtered by sector and sorted by return or stance.

Built as plain HTML/CSS/JS with no build step and no framework, so it deploys anywhere static files are served, including GitHub Pages.

## Structure

```
index.html               Landing page: filterable, sortable grid of all 7 stocks
stock.html               Detail page template, reads ?t=<TICKER> and renders from data
compare.html             All 7 rebased to 100, benchmark overlay, log/linear scale, returns table
assets/css/style.css     Design system (dark theme, cards, charts)
assets/js/chart.js       Dependency-free SVG line chart engine (axes, crosshair, tooltip, keyboard)
assets/js/main.js        Renders the grid and stock detail page from the data files
assets/js/compare.js     Compare page logic
assets/img/              Favicon and link-preview image
assets/data/             All generated files, do not edit by hand
  research-data.js       Structured research content for all 7 stocks
  price-data.js          Daily closes per ticker plus S&P 500 and SOX, ~3 years
  price-summary.js/.json Current price, 52w range, 1Y/3Y returns per ticker
  price-meta.js          When prices were last refreshed
tools/
  update-prices.js       Refreshes the price-* files from Yahoo Finance
  build-data.js          Rebuilds research-data.js from tools/research_text/*.txt
  research_text/*.txt    Source-of-truth research content, one file per ticker
  serve.js               Tiny static file server for local development
.github/workflows/
  update-prices.yml      Weekday price refresh that commits updated data files
```

## Local development

```bash
node tools/serve.js
```

Then open http://localhost:5173.

## Updating content

- **Price data**: runs automatically on weekdays through the GitHub Action, or by hand with `node tools/update-prices.js`. It downloads everything first and writes nothing if any symbol fails, so a bad run never leaves half-updated data.
- **Research content**: edit the relevant file in `tools/research_text/`, then run `node tools/build-data.js` to regenerate `assets/data/research-data.js`. Bump `FUNDAMENTALS_AS_OF` and `UPDATES_AS_OF` at the top of `build-data.js` whenever you re-research, since those dates are shown on the site.
- **Fields in each research file**: the labeled sections you can see in any existing file, plus three optional ones.
  - `PRICE_TARGET: low=80 avg=196.84 high=255 analysts=32 asof=2026-09-16` drives the analyst target panel (upside is computed against the live price).
  - `UPDATES:` is a bullet list shown as "Since this writeup".
  - `MY_TAKE:` is a paragraph in your own words, shown as a highlighted "My take" panel. It stays hidden until you write one.
- **New stock**: add a `TICKER.txt` file to `tools/research_text/`, add its Yahoo symbol to `TICKERS` in `tools/update-prices.js`, add its entry to `priceKeyMap` in `tools/build-data.js`, and give it a color in `STOCK_COLORS` in `assets/js/main.js`. Then run both scripts.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** → **Build and deployment** → **Source: Deploy from a branch** → select `main` and `/ (root)`.
3. The site will be live at `https://<username>.github.io/<repo-name>/` within a few minutes.

The site itself needs no build step. The optional workflow in `.github/workflows/update-prices.yml` only refreshes data, and you can also run it on demand from the repo's Actions tab.

## Disclaimer

This project is for portfolio and educational purposes only. Nothing on the site constitutes investment advice or a recommendation to buy or sell any security. Data reflects public sources as of the date noted on each page and will go stale over time, so keep prices refreshed and re-research names periodically for fundamentals.
