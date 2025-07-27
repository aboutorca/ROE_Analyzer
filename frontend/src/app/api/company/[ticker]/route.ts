import { NextRequest, NextResponse } from 'next/server';
import utilityData from '@/lib/sec-api/comprehensive_utility_list_latest.json';

interface Utility {
  ticker: string;
  company_name: string;
  sic_code: string;
  classification: string;
  cik: string;
  sic_description?: string;
  exchanges?: string[];
  business_address?: object;
}

interface FinancialDataItem {
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  start?: string;
  end?: string;
}

interface FinancialData {
  tag: string;
  data: FinancialDataItem[];
}

interface CompanyFacts {
  entityName: string;
  facts: {
    'us-gaap': {
      [key: string]: {
        units: {
          USD: FinancialDataItem[];
        };
      };
    };
  };
}

interface CompanySubmissions {
  sic?: number;
}

// Rate Limiter class adapted for Next.js API routes
class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests = 10;
  private readonly timeWindow = 1000; // 1 second
  private readonly minDelay = 100; // 100ms minimum delay

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than the time window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.timeWindow);
    
    // If we're at the limit, wait
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.timeWindow - (now - oldestRequest) + this.minDelay;
      await this.sleep(waitTime);
      return this.acquire(); // Recursive call after waiting
    }
    
    // Add current request time
    this.requestTimes.push(now);
    
    // Always wait minimum delay
    await this.sleep(this.minDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// SEC API Client adapted for Next.js API routes
class SECApiClient {
  private rateLimiter: RateLimiter;
  private baseUrl = 'https://data.sec.gov';
  private userAgent = 'Utility ROE Analyzer/1.0 (206juandi@gmail.com)';

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  async fetch(url: string) {
    await this.rateLimiter.acquire();
    
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'application/json',
      'Host': new URL(url).hostname
    };

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  async fetchCompanyFacts(cik: string) {
    const paddedCik = cik.toString().padStart(10, '0');
    const url = `${this.baseUrl}/api/xbrl/companyfacts/CIK${paddedCik}.json`;
    return this.fetch(url);
  }

  async fetchCompanySubmissions(cik: string) {
    const paddedCik = cik.toString().replace(/^0+/, '').padStart(10, '0');
    const url = `${this.baseUrl}/submissions/CIK${paddedCik}.json`;
    return this.fetch(url);
  }
}

// ROE Extractor adapted for Next.js API routes
class ROEExtractor {
  private rateLimiter: RateLimiter;
  private apiClient: SECApiClient;
  private netIncomeTagSequence = [
    'NetIncomeLoss',
    'IncomeLossFromContinuingOperations',
    'NetIncomeLossAvailableToCommonStockholdersBasic',
    'ProfitLoss'
  ];
  private equityTagSequence = [
    'StockholdersEquity',
    'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'
  ];

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.apiClient = new SECApiClient(this.rateLimiter);
  }

  extractFinancialData(facts: CompanyFacts['facts'], tagSequence: string[], label: string): FinancialData {
    for (const tag of tagSequence) {
      const fullTag = `us-gaap:${tag}`;
      if (facts['us-gaap'] && facts['us-gaap'][tag] && facts['us-gaap'][tag]['units'] && facts['us-gaap'][tag]['units']['USD']) {
        return {
          tag: fullTag,
          data: facts['us-gaap'][tag]['units']['USD']
        };
      }
    }
    throw new Error(`No ${label} data found using tag sequence: ${tagSequence.join(', ')}`);
  }

  getMostRecentFiling(dataArray: FinancialDataItem[], fiscalPeriod = 'FY', targetYear: number | null = null): FinancialDataItem {
    if (fiscalPeriod === 'FY' && targetYear) {
      // For income data: find entry that spans the full target year
      const fullYearEntries = dataArray.filter(item => 
        item.start && item.end &&
        item.start.includes(`${targetYear}-01-01`) && 
        item.end.includes(`${targetYear}-12-31`)
      );
      
      if (fullYearEntries.length > 0) {
        return fullYearEntries.sort((a, b) => new Date(b.filed).getTime() - new Date(a.filed).getTime())[0];
      }
      
      // For equity data: find entry that ends on target year-end
      const yearEndEntries = dataArray.filter(item => 
        item.end && item.end.includes(`${targetYear}-12-31`)
      );
      
      if (yearEndEntries.length > 0) {
        return yearEndEntries.sort((a, b) => new Date(b.filed).getTime() - new Date(a.filed).getTime())[0];
      }
    }
    
    // Fallback to fiscal year + period matching
    let filtered = dataArray.filter(item => item.fy && item.fp === fiscalPeriod);
    
    if (filtered.length === 0 && fiscalPeriod === 'FY') {
      filtered = dataArray.filter(item => 
        item.end && item.end.includes('-12-31')
      );
    }
    
    if (filtered.length === 0) {
      throw new Error(`No data found for fiscal period: ${fiscalPeriod}`);
    }

    const sorted = filtered.sort((a, b) => {
      if (a.fy && b.fy && b.fy !== a.fy) {
        return b.fy - a.fy;
      }
      return new Date(b.filed).getTime() - new Date(a.filed).getTime();
    });
    
    return sorted[0];
  }

  async calculateROE(ticker: string, cik: string, fiscalPeriod = 'FY') {
    try {
      console.log(`🔍 Fetching real-time SEC data for ${ticker} (CIK: ${cik})`);
      
      // Get company facts and submissions
      const [companyFacts, companySubmissions] = await Promise.all([
        this.apiClient.fetchCompanyFacts(cik),
        this.apiClient.fetchCompanySubmissions(cik)
      ]) as [CompanyFacts, CompanySubmissions];
      const facts = companyFacts.facts;
      
      // Extract financial data
      const netIncomeData = this.extractFinancialData(facts, this.netIncomeTagSequence, 'Net Income');
      const equityData = this.extractFinancialData(facts, this.equityTagSequence, 'Stockholders Equity');
      
      // Try to extract total assets data with fallback
      let totalAssetsData = null;
      try {
        const assetsTagSequence = ['Assets', 'AssetsTotal', 'AssetsCurrent', 'AssetsNoncurrent'];
        totalAssetsData = this.extractFinancialData(facts, assetsTagSequence, 'Total Assets');
      } catch (error) {
        console.warn(`⚠️ Total assets data not available for ${ticker}:`, (error as Error).message);
      }

      // Smart year targeting - try 2024 first, fall back to most recent
      let targetYear = fiscalPeriod === 'FY' ? 2024 : null;
      
      if (targetYear === 2024) {
        const available2024 = netIncomeData.data.some((item: FinancialDataItem) => 
          item.start && item.end &&
          item.start.includes('2024-01-01') && 
          item.end.includes('2024-12-31')
        );
        
        if (!available2024) {
          const availableYears = netIncomeData.data
            .filter((item: FinancialDataItem) => item.start && item.end && 
              item.start.includes('-01-01') && item.end.includes('-12-31'))
            .map((item: FinancialDataItem) => parseInt(item.start!.split('-')[0]))
            .filter((year: number) => year > 0);
            
          if (availableYears.length > 0) {
            targetYear = Math.max(...availableYears);
            console.log(`⚠️  No 2024 data found, using most recent available year: ${targetYear}`);
          }
        }
      }
      
      const recentNetIncome = this.getMostRecentFiling(netIncomeData.data, fiscalPeriod, targetYear);
      const recentEquity = this.getMostRecentFiling(equityData.data, fiscalPeriod, targetYear);
      
      // Get total assets if available
      let recentTotalAssets = null;
      if (totalAssetsData) {
        try {
          recentTotalAssets = this.getMostRecentFiling(totalAssetsData.data, fiscalPeriod, targetYear);
        } catch {
          console.warn(`⚠️ Could not get recent total assets filing for ${ticker}`);
        }
      }
      
      // Validate equity > 0
      if (recentEquity.val <= 0) {
        throw new Error(`Invalid equity value: ${recentEquity.val}`);
      }

      // Calculate ROE
      const netIncomeValue = recentNetIncome.val;
      const equityValue = recentEquity.val;
      const roeDecimal = netIncomeValue / equityValue;
      const roePercentage = (roeDecimal * 100).toFixed(2);

      // Build filing URL
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${recentNetIncome.accn.replace(/-/g, '')}`;

      // Generate historical data (up to 20 years if available)
      const historicalData = [];
      const currentYear = recentNetIncome.fy;
      
      console.log(`🔍 Generating historical data for ${ticker}, current year: ${currentYear}`);
      
      // Try to get up to 20 years of historical data
      for (let year = currentYear - 19; year <= currentYear; year++) {
        try {
          const yearNetIncome = this.getMostRecentFiling(netIncomeData.data, 'FY', year);
          const yearEquity = this.getMostRecentFiling(equityData.data, 'FY', year);
          
          if (yearNetIncome && yearEquity && yearEquity.val > 0) {
            const yearROE = yearNetIncome.val / yearEquity.val;
            historicalData.push({ year, roe: yearROE });
            console.log(`✅ Year ${year}: ROE = ${(yearROE * 100).toFixed(2)}%`);
          } else {
            console.log(`⚠️ Year ${year}: Invalid data - NetIncome: ${yearNetIncome?.val}, Equity: ${yearEquity?.val}`);
          }
        } catch (error) {
          console.log(`❌ Year ${year}: No data available - ${error}`);
        }
      }
      
      console.log(`📊 Generated ${historicalData.length} historical data points:`, historicalData);

      return {
        current_roe: {
          value: roeDecimal,
          percentage: `${roePercentage}%`,
          fiscal_year: recentNetIncome.fy
        },
        historical_roe: historicalData,
        company_info: {
          ticker: ticker.toUpperCase(),
          company_name: companyFacts.entityName,
          sic_code: companySubmissions.sic?.toString() || null,
          sic_description: null, // Would need additional lookup
          classification: 'Utility', // Based on our utility list
          exchanges: [] // Would need additional lookup
        },
        financial_metrics: {
          net_income: {
            value: netIncomeValue,
            formatted: `$${(netIncomeValue / 1e9).toFixed(2)}B`
          },
          stockholders_equity: {
            value: equityValue,
            formatted: `$${(equityValue / 1e9).toFixed(2)}B`
          },
          total_assets: {
            value: recentTotalAssets?.val || 0,
            formatted: recentTotalAssets?.val ? `$${(recentTotalAssets.val / 1e9).toFixed(2)}B` : 'N/A'
          }
        },
        calculation_details: {
          formula: `ROE = ${netIncomeValue.toLocaleString()} ÷ ${equityValue.toLocaleString()} = ${roePercentage}%`,
          source_filing: `${recentNetIncome.form || '10-K'} filed ${recentNetIncome.filed}`,
          filing_url: filingUrl,
          accession_number: recentNetIncome.accn,
          tags_used: {
            net_income: netIncomeData.tag,
            equity: equityData.tag,
            total_assets: totalAssetsData?.tag || null
          },
          xbrl_viewer_urls: {
            net_income: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${recentNetIncome.accn.replace(/-/g, '')}&xbrl_type=v#menu_cat3`,
            equity: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${recentEquity.accn.replace(/-/g, '')}&xbrl_type=v#menu_cat3`,
            total_assets: recentTotalAssets ? `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${recentTotalAssets.accn.replace(/-/g, '')}&xbrl_type=v#menu_cat3` : null
          }
        },
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error(`ROE calculation failed for ${ticker}:`, error);
      throw error;
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  try {
    console.log(`🚀 API Request: Fetching real-time data for ${ticker}`);
    
    // Access the utilities array from the JSON structure
    const utilities = (utilityData as { utilities: Utility[] }).utilities;
    
    // Find the utility in our master list
    const utility = utilities.find((u: Utility) => u.ticker === ticker);

    if (!utility) {
      return NextResponse.json({ error: 'Utility not found in our database' }, { status: 404 });
    }

    // Extract real-time ROE data from SEC API
    const roeExtractor = new ROEExtractor();
    
    try {
      const roeData = await roeExtractor.calculateROE(ticker, utility.cik, 'FY');
      
      // Enhance with utility list data
      const enhancedData = {
        ...roeData,
        company_info: {
          ...roeData.company_info,
          sic_description: utility.sic_description,
          classification: utility.classification,
          exchanges: utility.exchanges || [],
          business_address: utility.business_address || null
        }
      };
      
      console.log(`✅ Successfully fetched real-time data for ${ticker}`);
      return NextResponse.json(enhancedData);
      
    } catch (secError) {
      console.error(`❌ SEC API Error for ${ticker}:`, secError);
      
      // Fallback to basic utility info if SEC API fails
      return NextResponse.json({
        error: 'Unable to fetch real-time financial data',
        details: secError instanceof Error ? secError.message : 'Unknown error',
        company_info: {
          ticker: utility.ticker,
          company_name: utility.company_name,
          sic_code: utility.sic_code,
          sic_description: utility.sic_description,
          classification: utility.classification,
          exchanges: utility.exchanges || [],
          business_address: utility.business_address || null
        },
        last_updated: new Date().toISOString()
      }, { status: 503 }); // Service Unavailable
    }
    
  } catch (error) {
    console.error(`❌ General API Error:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
