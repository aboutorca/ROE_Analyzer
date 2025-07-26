const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const RateLimiter = require('./rateLimiter');
const SECApiClient = require('./secApiClient');

/**
 * Comprehensive Utility Classification System
 * 
 * Uses SEC filing metadata to systematically identify utility companies
 * from the full universe of public companies, not pre-filtered lists.
 */
class UtilityClassifier {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.apiClient = new SECApiClient();
    
    // Update API client to use our rate limiter
    this.apiClient.rateLimiter = this.rateLimiter;
    
    // Primary utility SIC codes from PRD
    this.utilitySicCodes = [4900, 4911, 4922, 4923, 4924, 4931, 4932];
    
    // Extended SIC codes for diversified utilities and utility-adjacent companies
    this.extendedUtilitySicCodes = [
      1400, // Mining - includes companies like MDU with utility segments
      1311, // Crude petroleum and natural gas
      1321, // Natural gas liquids
      1381, // Drilling oil and gas wells
      1382, // Oil and gas field exploration services
      1389, // Oil and gas field services
      4610, // Pipelines (except natural gas)
      4612, // Crude petroleum pipelines
      4613, // Refined petroleum pipelines
      4619, // Pipelines, not elsewhere classified
      4922, // Natural gas transmission (already in primary)
      4923, // Natural gas transmission and distribution (already in primary)
      4925, // Mixed, manufactured, or liquefied petroleum gas production
      4939, // Combination utilities, not elsewhere classified
      4941, // Water supply
      4952, // Sewerage systems
      4953, // Refuse systems
      4959, // Sanitary services, not elsewhere classified
      4961, // Steam and air-conditioning supply
      4971  // Irrigation systems
    ];
    
    // Enhanced keywords for business description classification
    this.utilityKeywords = [
      // Core utility terms
      'utility', 'utilities', 'public utility',
      // Electric
      'electric', 'electricity', 'electrical', 'power', 'energy',
      'transmission', 'distribution', 'electric services',
      'power generation', 'power plant', 'electrical grid',
      // Gas
      'natural gas', 'gas distribution', 'gas services', 'gas utility',
      'gas transmission', 'gas pipeline', 'propane', 'lng',
      // Water/Sewer
      'water', 'water supply', 'water utility', 'water services',
      'sewer', 'sewerage', 'wastewater', 'water treatment',
      // Infrastructure
      'pipeline', 'energy transmission', 'infrastructure',
      'regulated utility', 'rate regulated', 'public service commission'
    ];
    
    // Known utility companies with non-utility primary SIC codes
    this.knownUtilityExceptions = {
      'MDU': 'MDU Resources Group - Natural gas distribution and electric services',
      'BKH': 'Black Hills Corporation - Electric and natural gas utility',
      'NWE': 'NorthWestern Corporation - Electric and natural gas utility'
      // Note: AES removed - it's a power generator/IPP, not a regulated utility
    };
  }

  /**
   * Load ticker-to-CIK mapping from existing CSV file
   */
  async loadTickerToCikMapping() {
    const csvPath = path.join(__dirname, '..', 'data', 'Mapped_SEC_Ticker_to_CIK.csv');
    
    return new Promise((resolve, reject) => {
      const companies = [];
      
      createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // CSV columns: Symbol, Name, cik, sec_name
          if (row.Symbol && row.cik) {
            companies.push({
              ticker: row.Symbol.trim(),
              cik: Math.floor(parseFloat(row.cik)).toString().padStart(10, '0'),
              company_name: row.Name || row.sec_name || ''
            });
          }
        })
        .on('end', () => {
          console.log(`📊 Loaded ${companies.length} companies from ticker-to-CIK mapping`);
          resolve(companies);
        })
        .on('error', reject);
    });
  }

  /**
   * Get latest 10-K or 20-F filing for a company
   */
  async getLatestAnnualFiling(cik) {
    try {
      const submissions = await this.apiClient.fetchCompanySubmissions(cik);
      const filings = submissions.filings?.recent;
      
      if (!filings || !filings.form || !filings.accessionNumber) {
        return null;
      }
      
      // Find most recent 10-K or 20-F
      for (let i = 0; i < filings.form.length; i++) {
        const form = filings.form[i];
        if (form === '10-K' || form === '20-F') {
          return {
            form: form,
            accessionNumber: filings.accessionNumber[i],
            filingDate: filings.filingDate[i],
            reportDate: filings.reportDate[i]
          };
        }
      }
      
      return null;
    } catch (error) {
      console.log(`⚠️  Could not fetch filings for CIK ${cik}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract company metadata from SEC submissions
   */
  async extractCompanyMetadata(cik) {
    try {
      const submissions = await this.apiClient.fetchCompanySubmissions(cik);
      
      return {
        sic: submissions.sic?.toString() || null,
        sicDescription: submissions.sicDescription || '',
        businessAddress: submissions.addresses?.business || {},
        fiscalYearEnd: submissions.fiscalYearEnd || null,
        entityType: submissions.entityType || '',
        category: submissions.category || '',
        exchanges: submissions.exchanges || []
      };
    } catch (error) {
      console.log(`⚠️  Could not extract metadata for CIK ${cik}: ${error.message}`);
      return null;
    }
  }

  /**
   * Classify if a company is a utility based on SIC code and business description
   */
  isUtility(sic, businessText = '', sicDescription = '', ticker = '') {
    const sicNum = parseInt(sic);
    
    // 1. Check known utility exceptions first
    if (ticker && this.knownUtilityExceptions[ticker]) {
      return {
        isUtility: true,
        classification: 'Known Utility Exception',
        reason: this.knownUtilityExceptions[ticker]
      };
    }
    
    // 2. Primary classification: Core utility SIC codes
    if (this.utilitySicCodes.includes(sicNum)) {
      return {
        isUtility: true,
        classification: this.getUtilityClassification(sicNum),
        reason: `Primary Utility SIC ${sic}: ${sicDescription}`
      };
    }
    
    // 3. Extended classification: Utility-adjacent SIC codes with keyword validation
    if (this.extendedUtilitySicCodes.includes(sicNum)) {
      const combinedText = `${businessText} ${sicDescription}`.toLowerCase();
      const matchedKeywords = this.utilityKeywords.filter(keyword => 
        combinedText.includes(keyword)
      );
      
      if (matchedKeywords.length >= 1) { // Lower threshold for extended SIC codes
        return {
          isUtility: true,
          classification: 'Diversified Utility',
          reason: `Extended SIC ${sic} + Keywords: ${matchedKeywords.join(', ')}`
        };
      }
    }
    
    // 4. Keyword-only classification: Strong utility indicators
    const combinedText = `${businessText} ${sicDescription}`.toLowerCase();
    const matchedKeywords = this.utilityKeywords.filter(keyword => 
      combinedText.includes(keyword)
    );
    
    // Higher threshold for keyword-only classification
    if (matchedKeywords.length >= 3) {
      return {
        isUtility: true,
        classification: 'Utility (Keyword Match)',
        reason: `Strong keyword indicators: ${matchedKeywords.join(', ')}`
      };
    }
    
    return {
      isUtility: false,
      classification: 'Non-Utility',
      reason: `SIC ${sic} not in utility range, insufficient keyword matches (${matchedKeywords.length} found)`
    };
  }

  /**
   * Get specific utility classification based on SIC code
   */
  getUtilityClassification(sic) {
    const classifications = {
      4900: 'Electric Services',
      4911: 'Electric Services',
      4922: 'Natural Gas Transmission',
      4923: 'Natural Gas Transmission & Distribution',
      4924: 'Natural Gas Distribution',
      4931: 'Electric & Other Services Combined',
      4932: 'Gas & Other Services Combined'
    };
    
    return classifications[sic] || 'Utility Services';
  }

  /**
   * Process a batch of companies for utility classification
   */
  async processBatch(companies, startIndex = 0, batchSize = 50) {
    const utilities = [];
    const endIndex = Math.min(startIndex + batchSize, companies.length);
    
    console.log(`\n🔍 Processing companies ${startIndex + 1}-${endIndex} of ${companies.length}`);
    
    for (let i = startIndex; i < endIndex; i++) {
      const company = companies[i];
      
      try {
        // Extract metadata from SEC filings
        const metadata = await this.extractCompanyMetadata(company.cik);
        
        if (!metadata) {
          console.log(`⚠️  ${company.ticker}: No metadata available`);
          continue;
        }
        
        // Classify as utility
        const classification = this.isUtility(metadata.sic, '', metadata.sicDescription, company.ticker);
        
        if (classification.isUtility) {
          const utilityCompany = {
            ticker: company.ticker,
            cik: company.cik,
            company_name: company.company_name,
            sic_code: metadata.sic,
            sic_description: metadata.sicDescription,
            classification: classification.classification,
            classification_reason: classification.reason,
            fiscal_year_end: metadata.fiscalYearEnd,
            entity_type: metadata.entityType,
            exchanges: metadata.exchanges,
            business_address: metadata.businessAddress
          };
          
          utilities.push(utilityCompany);
          console.log(`✅ ${company.ticker} (${metadata.sic}): ${classification.classification}`);
        } else {
          console.log(`❌ ${company.ticker} (${metadata.sic}): ${classification.reason}`);
        }
        
      } catch (error) {
        console.log(`⚠️  ${company.ticker}: Error processing - ${error.message}`);
      }
    }
    
    return utilities;
  }

  /**
   * Build comprehensive master utility list
   */
  async buildMasterUtilityList() {
    console.log('🚀 Starting Comprehensive Utility Classification');
    console.log('Using SEC filing metadata for systematic identification\n');
    
    try {
      // Load ticker-to-CIK mapping
      const allCompanies = await this.loadTickerToCikMapping();
      
      // Process in batches to respect rate limits
      const batchSize = 50;
      const allUtilities = [];
      
      for (let i = 0; i < allCompanies.length; i += batchSize) {
        const batchUtilities = await this.processBatch(allCompanies, i, batchSize);
        allUtilities.push(...batchUtilities);
        
        // Progress update
        const processed = Math.min(i + batchSize, allCompanies.length);
        const progress = ((processed / allCompanies.length) * 100).toFixed(1);
        console.log(`📊 Progress: ${processed}/${allCompanies.length} (${progress}%) - Found ${allUtilities.length} utilities so far`);
        
        // Small delay between batches
        if (i + batchSize < allCompanies.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Save results
      await this.saveMasterList(allUtilities);
      
      console.log(`\n✅ Classification Complete!`);
      console.log(`📊 Total companies processed: ${allCompanies.length}`);
      console.log(`🏭 Utilities identified: ${allUtilities.length}`);
      console.log(`📈 Utility percentage: ${((allUtilities.length / allCompanies.length) * 100).toFixed(2)}%`);
      
      return allUtilities;
      
    } catch (error) {
      console.error('❌ Error building master utility list:', error.message);
      throw error;
    }
  }

  /**
   * Save master utility list to files
   */
  async saveMasterList(utilities) {
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create comprehensive output object
    const output = {
      generated_at: new Date().toISOString(),
      total_utilities: utilities.length,
      classification_method: 'SEC Filing Metadata Analysis',
      sic_codes_included: this.utilitySicCodes,
      sic_distribution: this.getSicDistribution(utilities),
      utilities: utilities
    };
    
    // Save JSON
    const jsonPath = path.join(dataDir, `comprehensive_utility_list_${timestamp}.json`);
    const latestJsonPath = path.join(dataDir, 'comprehensive_utility_list_latest.json');
    
    await fs.writeFile(jsonPath, JSON.stringify(output, null, 2));
    await fs.writeFile(latestJsonPath, JSON.stringify(output, null, 2));
    
    // Save CSV
    const csvPath = path.join(dataDir, `comprehensive_utility_list_${timestamp}.csv`);
    const latestCsvPath = path.join(dataDir, 'comprehensive_utility_list_latest.csv');
    
    const csvContent = this.convertToCSV(utilities);
    await fs.writeFile(csvPath, csvContent);
    await fs.writeFile(latestCsvPath, csvContent);
    
    console.log(`\n📄 Files saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   CSV: ${csvPath}`);
    console.log(`   Latest JSON: ${latestJsonPath}`);
    console.log(`   Latest CSV: ${latestCsvPath}`);
  }

  /**
   * Get SIC code distribution
   */
  getSicDistribution(utilities) {
    const distribution = {};
    utilities.forEach(utility => {
      const sic = utility.sic_code;
      distribution[sic] = (distribution[sic] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Convert utilities array to CSV format
   */
  convertToCSV(utilities) {
    if (utilities.length === 0) return '';
    
    const headers = Object.keys(utilities[0]);
    const csvRows = [headers.join(',')];
    
    utilities.forEach(utility => {
      const row = headers.map(header => {
        const value = utility[header];
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

module.exports = UtilityClassifier;
