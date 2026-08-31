# Equity Research Portfolio

A static site showcasing independent equity research on seven companies: **Palantir (PLTR)**, **Gilead Sciences (GILD)**, **Himax Technologies (HIMX)**, **CrowdStrike (CRWD)**, **Infineon Technologies (IFX)**, **Micron Technology (MU)**, and **RTX Corporation (RTX)**.

Each stock page includes a business overview, bull case, bear case, recent catalysts, key metrics, a valuation view, an interactive price chart (6M / 1Y / 3Y), and cited sources.

Built as plain HTML/CSS/JS — no build step, no framework — so it deploys anywhere static files are served, including GitHub Pages.

## Structure

```
index.html              Landing page — grid of all 7 stocks with sparkline + one-line thesis
stock.html               Detail page template, reads ?t=<TICKER> and renders from data
assets/css/style.css     Design system (dark theme, cards, charts)
assets/js/chart.js       Dependency-free SVG line chart engine (sparkline + full chart)
assets/js/main.js        Renders the grid and stock detail page from the data files
assets/data/
  research-data.js       Structured research content for all 7 stocks (generated)
  price-data.js           Daily close price series per ticker, ~3 years (generated)
  price-summary.js/.json  Current price, 52w range, 1Y/3Y returns per ticker (generated)
tools/
  update-prices.js       Refreshes price-data.js / price-summary.* from Yahoo Finance
  build-data.js           Rebuilds research-data.js from tools/research_text/*.txt
  research_text/*.txt     Source-of-truth research content, one file per ticker
  serve.js                Tiny static file server for local development
```

## Local development

```bash
node tools/serve.js
```

Then open http://localhost:5173.

## Updating content

- **Price data**: `node tools/update-prices.js` pulls fresh 3-year daily history and current price/52-week range from Yahoo Finance's public chart API for all 7 tickers, and regenerates the `price-*` files.
- **Research content**: edit the relevant file in `tools/research_text/` (plain labeled text format — see any existing file for the schema), then run `node tools/build-data.js` to regenerate `assets/data/research-data.js`.
- To add a new stock: add a `TICKER.txt` file to `tools/research_text/`, add its Yahoo symbol to the `TICKERS` map in `tools/update-prices.js`, and add the matching entry to `priceKeyMap` in `tools/build-data.js`. Then run both scripts.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** → **Build and deployment** → **Source: Deploy from a branch** → select `main` and `/ (root)`.
3. The site will be live at `https://<username>.github.io/<repo-name>/` within a few minutes.

No build step or GitHub Actions workflow is required since this is a plain static site.

## Disclaimer

This project is for portfolio and educational purposes only. Nothing on the site constitutes investment advice or a recommendation to buy or sell any security. Data reflects public sources as of the date noted on each page and will drift out of date — rerun `tools/update-prices.js` to refresh price data, and re-research names periodically for fundamentals.
