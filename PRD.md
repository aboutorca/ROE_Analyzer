Product Requirements Document: Utility ROE Analyzer

⸻

1. Product Overview

The Utility ROE Analyzer is a financial analysis tool that calculates Return on Equity (ROE) for all publicly traded utility companies in North America using data exclusively from the SEC EDGAR API. Built for analysts, operators, and internal strategy teams, the tool emphasizes full transparency, auditability, and traceability. Every ROE output includes the source filing URL, XBRL tags used, raw values, and a clear formula. The tool is architected around a controlled universe of utility companies and is designed for speed, accuracy, and regulatory alignment.

Note: The SEC API is the single source of truth for all financial data; no third-party datasets are used.

⸻

2. Core Features
	•	ROE Calculation Engine
Computes ROE as Net Income ÷ Stockholders’ Equity using XBRL-tagged data.
	•	XBRL Tag Fallback Logic
Prioritizes us-gaap:NetIncomeLoss and us-gaap:StockholdersEquity with systematic fallbacks to ensure resilience across companies.
	•	Complete Source Traceability
Each output includes:
	•	Filing accession number
	•	Filing URL
	•	XBRL tags used
	•	Raw extracted values
	•	Full formula
	•	Timeframe Selector
User toggles between annual (FY) and quarterly (Q1, Q2, Q3) ROE views.
	•	Utility Company Filtering
Filters company universe using SIC codes: 4900–4939, 4953, 4961, 4971.
	•	API Compliance
Enforces 10 requests/sec limit, 100ms delay between requests, User-Agent headers, and exponential backoff logic.
	•	Frontend Built with ShadCN
UI components will use ShadCN for table rendering, dropdowns, search, and styling.

⸻

3. Data Pipeline

Step 1: Build Company Universe
	•	Fetch https://www.sec.gov/files/company_tickers.json
	•	Construct ticker → CIK map
	•	Zero-pad CIKs to 10 digits for API compatibility

Step 2: Filter for Utilities
	•	Query https://data.sec.gov/submissions/CIK{10-digit}.json
	•	Include companies whose SIC codes are within: [4900–4939, 4953, 4961, 4971]
	•	Build master list with ticker, CIK, company name, SIC

Step 3: Extract Financial Data
	•	Pull https://data.sec.gov/api/xbrl/companyfacts/CIK{10-digit}.json
	•	Navigate to facts['us-gaap']
	•	Extract Net Income using:
	•	NetIncomeLoss['USD']
	•	fallback: ProfitLoss, NetIncomeLossAvailableToCommonStockholdersBasic
	•	Extract Equity using:
	•	StockholdersEquity['USD']
	•	fallback: StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest

Step 4: Calculate ROE
	•	Filter by fp = FY or Q1/Q2/Q3 as selected
	•	Use most recent available filing
	•	Validate equity > 0
	•	Compute:
ROE = Net Income ÷ Stockholders' Equity
	•	Handle edge cases (missing data, negative equity)

Step 5: Build Output Object
	•	Include:
	•	Ticker, CIK, Name, SIC
	•	Filing date, fiscal period, accession number
	•	Source URL
	•	Tags used, raw values, ROE result
	•	Calculation string
	•	Timestamp
	•	data_quality_flags for any anomalies
	•	(Optional: manual_override: true for companies flagged for special handling)

⸻

4. Output Format

{
  "ticker": "DUK",
  "cik": "0000017797",
  "company_name": "Duke Energy Corp",
  "sic_code": "4911",
  "fiscal_year": 2024,
  "fiscal_period": "FY",
  "filing_date": "2025-02-14",
  "accession_number": "0000017797-25-000012",
  "filing_url": "https://www.sec.gov/Archives/edgar/data/17797/000001779725000012",
  "net_income": {
    "value": 2854000000,
    "tag": "us-gaap:NetIncomeLoss",
    "unit": "USD"
  },
  "stockholders_equity": {
    "value": 32456000000,
    "tag": "us-gaap:StockholdersEquity",
    "unit": "USD"
  },
  "roe_calculation": {
    "formula": "ROE = 2,854,000,000 ÷ 32,456,000,000 = 8.79%",
    "value": 0.0879,
    "percentage": "8.79%"
  },
  "extraction_timestamp": "2025-07-24T10:30:45Z",
  "data_quality_flags": []
}


⸻

5. Phase Plan

Phase 1: Single-Company ROE Extractor
	•	Build core API client with rate limiter
	•	Extract company facts
	•	Calculate ROE with fallback logic
	•	Output traceable result for 1 ticker

Phase 2: Master Utility List Builder
	•	Load company tickers
	•	Apply SIC filtering logic
	•	Build master utility list
	•	Cache and export for later use

Phase 3: Batch ROE Processor
	•	Apply extractor to all companies
	•	Use thread-safe limiter to stay under 10 req/sec
	•	Format JSON and CSV outputs
	•	Track errors and recover gracefully

Phase 4: Frontend UI
	•	Display data table (sortable, searchable)
	•	Add timeframe selector
	•	Drill-down modal for source + calculation breakdown
	•	CSV / JSON export buttons

⸻

6. Known Limitations and Risks
	•	Q4 Data: Must be derived (Q4 = FY − Q1 − Q2 − Q3)
	•	Tag Variance: Some utilities use custom tags or extensions
	•	IFRS Tags: Canadian companies may require separate tag handling
	•	Holding Companies: Mixed-segment data may skew parent-level equity
	•	API Limits: 10 req/sec throttle; ~30s runtime for full dataset
	•	Preferred Shares: May require adjusted Net Income logic in future
	•	Restatements: Past periods may be revised — unclear which value is “true”

⸻

7. Future Features (Post-MVP)

Additional Ratios:
	•	ROA: Net Income ÷ Assets
	•	Debt/Equity: Total Debt ÷ Equity
	•	Operating Margin: Operating Income ÷ Revenue

Analytics:
	•	Sector benchmarking (using frames/ endpoint)
	•	Historical ROE trends (5+ years)
	•	Seasonality and volatility detection
	•	Rate case outcome correlation

Platform Upgrades:
	•	PostgreSQL caching with 24h TTL
	•	Slack/Email alerts for ROE swings > 2%
	•	Geographic filtering (by territory or HQ)
	•	Rate case database integration
	•	Public API endpoints for programmatic access

Data Enrichment:
	•	EIA energy production overlays
	•	FERC Form 1 reconciliation
	•	Credit rating tagging
	•	Dividend yield display