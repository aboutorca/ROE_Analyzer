const fs = require('fs').promises;
const path = require('path');
const ROEExtractor = require('./roeExtractor');
const RateLimiter = require('./rateLimiter');

/**
 * Phase 3: Batch ROE Processing System
 * 
 * Processes ROE calculations for all utilities in the master list
 * with comprehensive error handling, progress tracking, and output generation.
 */
class BatchROEProcessor {
  constructor() {
    this.roeExtractor = new ROEExtractor();
    this.rateLimiter = new RateLimiter();
    
    // Processing configuration
    this.batchSize = 10; // Process utilities in batches
    this.targetFiscalYear = 2024;
    this.fiscalPeriod = 'FY'; // Full year data preferred
    
    // Results tracking
    this.results = {
      successful: [],
      failed: [],
      summary: {
        total_processed: 0,
        successful_calculations: 0,
        failed_calculations: 0,
        average_roe: 0,
        processing_start_time: null,
        processing_end_time: null
      }
    };
  }

  /**
   * Load master utility list from Phase 2 output
   */
  async loadMasterUtilityList() {
    const listPath = path.join(__dirname, '..', 'data', 'comprehensive_utility_list_latest.json');
    
    try {
      const content = await fs.readFile(listPath, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`📊 Loaded master utility list: ${data.utilities.length} utilities`);
      console.log(`📅 List generated: ${data.generated_at}`);
      console.log(`🔍 Classification method: ${data.classification_method}`);
      
      return data.utilities;
    } catch (error) {
      throw new Error(`Failed to load master utility list: ${error.message}`);
    }
  }

  /**
   * Process ROE calculation for a single utility
   */
  async processUtilityROE(utility) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Processing ${utility.ticker} (${utility.company_name})`);
      
      // Calculate ROE using the robust extractor from Phase 1
      const roeResult = await this.roeExtractor.calculateROE(
        utility.ticker,
        utility.cik,
        this.fiscalPeriod
      );
      
      // Enhance result with utility classification info
      const enhancedResult = {
        ...roeResult,
        utility_info: {
          ticker: utility.ticker,
          cik: utility.cik,
          company_name: utility.company_name,
          sic_code: utility.sic_code,
          sic_description: utility.sic_description,
          classification: utility.classification,
          classification_reason: utility.classification_reason,
          exchanges: utility.exchanges
        },
        processing_time_ms: Date.now() - startTime
      };
      
      console.log(`✅ ${utility.ticker}: ROE = ${roeResult.roe_calculation.percentage} (${Date.now() - startTime}ms)`);
      
      return {
        success: true,
        result: enhancedResult
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.log(`❌ ${utility.ticker}: ${error.message} (${processingTime}ms)`);
      
      return {
        success: false,
        error: {
          ticker: utility.ticker,
          cik: utility.cik,
          company_name: utility.company_name,
          error_message: error.message,
          processing_time_ms: processingTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Process a batch of utilities with rate limiting
   */
  async processBatch(utilities, batchIndex, totalBatches) {
    console.log(`\n🔄 Processing Batch ${batchIndex + 1}/${totalBatches} (${utilities.length} utilities)`);
    console.log('=' .repeat(60));
    
    const batchResults = {
      successful: [],
      failed: []
    };
    
    for (const utility of utilities) {
      // Apply rate limiting between requests
      await this.rateLimiter.waitForSlot();
      
      const result = await this.processUtilityROE(utility);
      
      if (result.success) {
        batchResults.successful.push(result.result);
        this.results.successful.push(result.result);
      } else {
        batchResults.failed.push(result.error);
        this.results.failed.push(result.error);
      }
    }
    
    console.log(`\n📊 Batch ${batchIndex + 1} Summary:`);
    console.log(`   ✅ Successful: ${batchResults.successful.length}`);
    console.log(`   ❌ Failed: ${batchResults.failed.length}`);
    console.log(`   📈 Success Rate: ${((batchResults.successful.length / utilities.length) * 100).toFixed(1)}%`);
    
    return batchResults;
  }

  /**
   * Calculate summary statistics from results
   */
  calculateSummaryStatistics() {
    const successful = this.results.successful;
    
    if (successful.length === 0) {
      return {
        count: 0,
        average_roe: 0,
        median_roe: 0,
        min_roe: 0,
        max_roe: 0,
        std_deviation: 0
      };
    }
    
    // Extract ROE values
    const roeValues = successful.map(result => result.roe_calculation.value);
    
    // Calculate statistics
    const sum = roeValues.reduce((a, b) => a + b, 0);
    const average = sum / roeValues.length;
    
    const sortedValues = [...roeValues].sort((a, b) => a - b);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
      : sortedValues[Math.floor(sortedValues.length / 2)];
    
    const variance = roeValues.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / roeValues.length;
    const stdDeviation = Math.sqrt(variance);
    
    return {
      count: successful.length,
      average_roe: average,
      median_roe: median,
      min_roe: Math.min(...roeValues),
      max_roe: Math.max(...roeValues),
      std_deviation: stdDeviation
    };
  }

  /**
   * Save batch processing results to files
   */
  async saveResults() {
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Calculate final statistics
    const stats = this.calculateSummaryStatistics();
    
    // Update summary
    this.results.summary = {
      total_processed: this.results.successful.length + this.results.failed.length,
      successful_calculations: this.results.successful.length,
      failed_calculations: this.results.failed.length,
      success_rate: ((this.results.successful.length / (this.results.successful.length + this.results.failed.length)) * 100).toFixed(2),
      processing_start_time: this.results.summary.processing_start_time,
      processing_end_time: new Date().toISOString(),
      statistics: stats
    };
    
    // Create comprehensive output
    const output = {
      generated_at: new Date().toISOString(),
      processing_summary: this.results.summary,
      successful_roe_calculations: this.results.successful,
      failed_calculations: this.results.failed,
      metadata: {
        target_fiscal_year: this.targetFiscalYear,
        fiscal_period: this.fiscalPeriod,
        batch_size: this.batchSize,
        rate_limiting: "10 requests/second with exponential backoff"
      }
    };
    
    // Save JSON
    const jsonPath = path.join(dataDir, `batch_roe_results_${timestamp}.json`);
    const latestJsonPath = path.join(dataDir, 'batch_roe_results_latest.json');
    
    await fs.writeFile(jsonPath, JSON.stringify(output, null, 2));
    await fs.writeFile(latestJsonPath, JSON.stringify(output, null, 2));
    
    // Save CSV for successful calculations
    const csvPath = path.join(dataDir, `batch_roe_results_${timestamp}.csv`);
    const latestCsvPath = path.join(dataDir, 'batch_roe_results_latest.csv');
    
    const csvContent = this.convertToCSV(this.results.successful);
    await fs.writeFile(csvPath, csvContent);
    await fs.writeFile(latestCsvPath, csvContent);
    
    console.log(`\n📄 Results saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   CSV: ${csvPath}`);
    console.log(`   Latest JSON: ${latestJsonPath}`);
    console.log(`   Latest CSV: ${latestCsvPath}`);
  }

  /**
   * Convert successful ROE results to CSV format
   */
  convertToCSV(results) {
    if (results.length === 0) return 'No successful ROE calculations';
    
    const headers = [
      'ticker', 'company_name', 'cik', 'sic_code', 'classification',
      'fiscal_year', 'fiscal_period', 'roe_percentage', 'roe_decimal',
      'net_income', 'stockholders_equity', 'net_income_tag', 'equity_tag',
      'data_quality_flags', 'processing_time_ms'
    ];
    
    const csvRows = [headers.join(',')];
    
    results.forEach(result => {
      const row = [
        `"${result.utility_info.ticker}"`,
        `"${result.utility_info.company_name}"`,
        `"${result.utility_info.cik}"`,
        `"${result.utility_info.sic_code}"`,
        `"${result.utility_info.classification}"`,
        `"${result.fiscal_year}"`,
        `"${result.fiscal_period}"`,
        `"${result.roe_calculation.percentage}"`,
        `"${result.roe_calculation.value}"`,
        `"${result.net_income.value}"`,
        `"${result.stockholders_equity.value}"`,
        `"${result.net_income.tag}"`,
        `"${result.stockholders_equity.tag}"`,
        `"${result.data_quality_flags.join('; ')}"`,
        `"${result.processing_time_ms}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Main batch processing method
   */
  async processBatchROE() {
    console.log('🚀 Starting Phase 3: Batch ROE Processing');
    console.log('=' .repeat(60));
    console.log(`📊 Target Fiscal Year: ${this.targetFiscalYear}`);
    console.log(`📅 Fiscal Period: ${this.fiscalPeriod}`);
    console.log(`⚡ Batch Size: ${this.batchSize} utilities per batch`);
    console.log(`🔄 Rate Limiting: 10 requests/second with exponential backoff`);
    console.log('=' .repeat(60));
    
    this.results.summary.processing_start_time = new Date().toISOString();
    
    try {
      // Load master utility list
      const utilities = await this.loadMasterUtilityList();
      
      // Process in batches
      const totalBatches = Math.ceil(utilities.length / this.batchSize);
      
      for (let i = 0; i < utilities.length; i += this.batchSize) {
        const batch = utilities.slice(i, i + this.batchSize);
        const batchIndex = Math.floor(i / this.batchSize);
        
        await this.processBatch(batch, batchIndex, totalBatches);
        
        // Brief pause between batches
        if (batchIndex < totalBatches - 1) {
          console.log('\n⏳ Brief pause between batches...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Save results
      await this.saveResults();
      
      // Display final summary
      this.displayFinalSummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Batch ROE processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Display final processing summary
   */
  displayFinalSummary() {
    const summary = this.results.summary;
    const stats = summary.statistics;
    
    console.log('\n🎉 PHASE 3 COMPLETE: BATCH ROE PROCESSING');
    console.log('=' .repeat(60));
    console.log(`📊 Total Utilities Processed: ${summary.total_processed}`);
    console.log(`✅ Successful ROE Calculations: ${summary.successful_calculations}`);
    console.log(`❌ Failed Calculations: ${summary.failed_calculations}`);
    console.log(`📈 Success Rate: ${summary.success_rate}%`);
    
    if (stats.count > 0) {
      console.log('\n📈 ROE STATISTICS:');
      console.log(`   Average ROE: ${(stats.average_roe * 100).toFixed(2)}%`);
      console.log(`   Median ROE: ${(stats.median_roe * 100).toFixed(2)}%`);
      console.log(`   Min ROE: ${(stats.min_roe * 100).toFixed(2)}%`);
      console.log(`   Max ROE: ${(stats.max_roe * 100).toFixed(2)}%`);
      console.log(`   Std Deviation: ${(stats.std_deviation * 100).toFixed(2)}%`);
    }
    
    console.log('\n🏆 TOP PERFORMING UTILITIES (by ROE):');
    const topPerformers = this.results.successful
      .sort((a, b) => b.roe_calculation.value - a.roe_calculation.value)
      .slice(0, 10);
    
    topPerformers.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.utility_info.ticker} - ${result.roe_calculation.percentage} (${result.utility_info.company_name})`);
    });
    
    console.log('\n✅ Batch ROE processing complete!');
    console.log('📁 Results saved to data/ directory');
    console.log('🎯 Ready for analysis and reporting');
  }
}

module.exports = BatchROEProcessor;
