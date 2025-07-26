const SECApiClient = require('./secApiClient');
const RateLimiter = require('./rateLimiter');

class ROEExtractor {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.apiClient = new SECApiClient(this.rateLimiter);
    
    // XBRL tag fallback sequences - optimized for data availability
    this.netIncomeTagSequence = [
      'NetIncomeLoss',                             // Most commonly available
      'IncomeLossFromContinuingOperations',        // Better measure when available
      'NetIncomeLossAvailableToCommonStockholdersBasic',  // Available to common shareholders
      'ProfitLoss'                                 // Fallback
    ];
    
    this.equityTagSequence = [
      'StockholdersEquity',
      'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'
    ];
    
    this.totalAssetsTagSequence = [
      'Assets',                                    // Most commonly available
      'AssetsTotal',                              // Alternative tag
      'AssetsCurrent',                            // Current assets if total not available
      'AssetsNoncurrent'                          // Non-current assets fallback
    ];
  }

  // Extract financial data using fallback logic
  extractFinancialData(facts, tagSequence, label) {
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

  // Get the correct data entry for the target year - FIXED VERSION
  getMostRecentFiling(dataArray, fiscalPeriod = 'FY', targetYear = null) {
    if (fiscalPeriod === 'FY' && targetYear) {
      // For income data: find entry that spans the full target year
      const fullYearEntries = dataArray.filter(item => 
        item.start && item.end &&
        item.start.includes(`${targetYear}-01-01`) && 
        item.end.includes(`${targetYear}-12-31`)
      );
      
      if (fullYearEntries.length > 0) {
        // Sort by filing date (most recent first)
        return fullYearEntries.sort((a, b) => new Date(b.filed) - new Date(a.filed))[0];
      }
      
      // For equity data (balance sheet): find entry that ends on target year-end
      const yearEndEntries = dataArray.filter(item => 
        item.end && item.end.includes(`${targetYear}-12-31`)
      );
      
      if (yearEndEntries.length > 0) {
        return yearEndEntries.sort((a, b) => new Date(b.filed) - new Date(a.filed))[0];
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
      return new Date(b.filed) - new Date(a.filed);
    });
    
    return sorted[0];
  }

  // Calculate ROE with full traceability
  async calculateROE(ticker, cik, fiscalPeriod = 'FY') {
    try {
      // Initialize data quality flags
      let dataQualityFlags = [];
      
      // Get company facts and submissions (needed for SIC code)
      const [companyFacts, companySubmissions] = await Promise.all([
        this.apiClient.fetchCompanyFacts(cik),
        this.apiClient.fetchCompanySubmissions(cik)
      ]);
      const facts = companyFacts.facts;
      
      // Extract Net Income with fallback
      const netIncomeData = this.extractFinancialData(
        facts, 
        this.netIncomeTagSequence, 
        'Net Income'
      );
      
      // Extract Stockholders' Equity with fallback
      const equityData = this.extractFinancialData(
        facts, 
        this.equityTagSequence, 
        'Stockholders Equity'
      );

      // FIXED: Smart year targeting - try 2024 first, fall back to most recent available
      let targetYear = fiscalPeriod === 'FY' ? 2024 : null;
      
      // For companies without 2024 data, find their most recent year
      if (targetYear === 2024) {
        const available2024 = netIncomeData.data.some(item => 
          item.start && item.end &&
          item.start.includes('2024-01-01') && 
          item.end.includes('2024-12-31')
        );
        
        if (!available2024) {
          // Find most recent available full year
          const availableYears = netIncomeData.data
            .filter(item => item.start && item.end && 
              item.start.includes('-01-01') && item.end.includes('-12-31'))
            .map(item => parseInt(item.start.split('-')[0]))
            .filter(year => year > 0);
            
          if (availableYears.length > 0) {
            targetYear = Math.max(...availableYears);
            console.log(`⚠️  No 2024 data found, using most recent available year: ${targetYear}`);
          }
        }
      }
      
      console.log(`🔍 Debug: Extracting data for ${fiscalPeriod}, target year: ${targetYear}`);
      console.log(`🔍 Debug: Net income data points: ${netIncomeData.data.length}`);
      
      const recentNetIncome = this.getMostRecentFiling(netIncomeData.data, fiscalPeriod, targetYear);
      const recentEquity = this.getMostRecentFiling(equityData.data, fiscalPeriod, targetYear);
      
      console.log(`🔍 Debug: Selected net income: ${(recentNetIncome.val / 1e9).toFixed(2)}B (${recentNetIncome.start} to ${recentNetIncome.end})`);
      console.log(`🔍 Debug: Selected equity: ${(recentEquity.val / 1e9).toFixed(2)}B (end: ${recentEquity.end})`);

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

      // Format output according to PRD specification
      const result = {
        ticker: ticker.toUpperCase(),
        cik: cik.toString().padStart(10, '0'),
        company_name: companyFacts.entityName,
        sic_code: companySubmissions.sic?.toString() || null,
        fiscal_year: parseInt(recentNetIncome.fy),
        fiscal_period: fiscalPeriod,
        filing_date: recentNetIncome.filed,
        accession_number: recentNetIncome.accn,
        filing_url: filingUrl,
        net_income: {
          value: netIncomeValue,
          tag: netIncomeData.tag,
          unit: "USD"
        },
        stockholders_equity: {
          value: equityValue,
          tag: equityData.tag,
          unit: "USD"
        },
        roe_calculation: {
          formula: `ROE = ${netIncomeValue.toLocaleString()} ÷ ${equityValue.toLocaleString()} = ${roePercentage}%`,
          value: roeDecimal,
          percentage: `${roePercentage}%`
        },
        extraction_timestamp: new Date().toISOString(),
        data_quality_flags: dataQualityFlags
      };

      return result;

    } catch (error) {
      throw new Error(`ROE calculation failed for ${ticker} (CIK: ${cik}): ${error.message}`);
    }
  }

  // Test with single company (Phase 1 validation)
  async testSingleCompany(ticker, cik, fiscalPeriod = 'FY') {
    console.log(`Testing ROE extraction for ${ticker} (CIK: ${cik})...`);
    
    try {
      const result = await this.calculateROE(ticker, cik, fiscalPeriod);
      console.log('\n✅ SUCCESS - ROE Calculation Complete');
      console.log('=====================================');
      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`\n❌ ERROR: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ROEExtractor;