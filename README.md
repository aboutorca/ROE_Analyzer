# Utility ROE Analyzer

A financial analysis tool that calculates Return on Equity (ROE) for all publicly traded utility companies in North America using data exclusively from the SEC EDGAR API.

## Overview

The Utility ROE Analyzer is designed for analysts, operators, and internal strategy teams who need accurate, traceable, and auditable ROE calculations for utility companies. The tool emphasizes full transparency by providing source filing URLs, XBRL tags used, raw values, and clear formulas for every calculation.

**Key Features:**
- ROE calculation using SEC EDGAR API data exclusively
- XBRL tag fallback logic for data resilience
- Complete source traceability for audit purposes
- Utility company filtering using SIC codes (4900–4939, 4953, 4961, 4971)
- API compliance with 10 requests/sec limit
- Support for annual (FY) and quarterly (Q1, Q2, Q3) reporting periods

## Data Source

This tool uses the SEC EDGAR API as the single source of truth for all financial data. No third-party datasets are used, ensuring regulatory alignment and data integrity.

**Primary API Endpoints:**
- Company tickers: `https://www.sec.gov/files/company_tickers.json`
- Company submissions: `https://data.sec.gov/submissions/CIK{10-digit}.json`
- Company facts (XBRL): `https://data.sec.gov/api/xbrl/companyfacts/CIK{10-digit}.json`

## Project Structure

```
utility-roe-analyzer/
├── src/                 # Source code
├── data/               # Cached data and company lists
├── output/             # Generated reports and analysis
├── package.json        # Node.js dependencies
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

```bash
npm start
```

## ROE Calculation Formula

```
ROE = Net Income ÷ Stockholders' Equity
```

**XBRL Tags Used:**
- Net Income: `us-gaap:NetIncomeLoss` (with fallbacks)
- Stockholders' Equity: `us-gaap:StockholdersEquity` (with fallbacks)

## Output Format

Each ROE calculation includes:
- Company identification (ticker, CIK, name, SIC)
- Filing information (date, period, accession number)
- Source URL for verification
- XBRL tags and raw values used
- Complete calculation formula
- Data quality flags for any anomalies

## API Compliance

The tool enforces SEC EDGAR API guidelines:
- Maximum 10 requests per second
- 100ms delay between requests
- Proper User-Agent headers
- Exponential backoff for rate limiting

## Development Phases

1. **Phase 1:** Single-company ROE extractor
2. **Phase 2:** Master utility list builder
3. **Phase 3:** Batch ROE processor
4. **Phase 4:** Frontend UI with ShadCN components

## License

MIT
