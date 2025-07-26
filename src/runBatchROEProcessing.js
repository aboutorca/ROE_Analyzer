const BatchROEProcessor = require('./BatchROEProcessor');

/**
 * Phase 3 Test Runner: Batch ROE Processing
 * 
 * Executes ROE calculations for all utilities in the master list
 * with options for quick testing or full processing.
 */

/**
 * Quick test with a small sample of utilities
 */
async function runQuickTest() {
  console.log('🔬 Quick Test: Sample Batch ROE Processing');
  console.log('=' .repeat(50));
  
  const processor = new BatchROEProcessor();
  
  try {
    // Load master utility list
    const utilities = await processor.loadMasterUtilityList();
    
    // Test with first 5 utilities for quick validation
    const sampleUtilities = utilities.slice(0, 5);
    console.log(`Testing with ${sampleUtilities.length} sample utilities:`);
    sampleUtilities.forEach(u => console.log(`  - ${u.ticker}: ${u.company_name}`));
    
    console.log('\n🔄 Processing sample utilities...');
    
    // Override batch size for quick test
    processor.batchSize = 5;
    
    // Process sample batch
    const batchResults = await processor.processBatch(sampleUtilities, 0, 1);
    
    console.log('\n✅ Quick Test Results:');
    console.log(`   Successful: ${batchResults.successful.length}`);
    console.log(`   Failed: ${batchResults.failed.length}`);
    
    if (batchResults.successful.length > 0) {
      console.log('\n🏆 Sample ROE Results:');
      batchResults.successful.forEach(result => {
        console.log(`   ${result.utility_info.ticker}: ${result.roe_calculation.percentage}`);
      });
    }
    
    if (batchResults.failed.length > 0) {
      console.log('\n❌ Failed Calculations:');
      batchResults.failed.forEach(error => {
        console.log(`   ${error.ticker}: ${error.error_message}`);
      });
    }
    
    return batchResults;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    throw error;
  }
}

/**
 * Full batch ROE processing for all utilities
 */
async function runFullBatchProcessing() {
  console.log('🚀 Full Batch ROE Processing');
  console.log('=' .repeat(50));
  console.log('⚠️  This will process ALL 266 utilities in the master list');
  console.log('⏱️  Estimated time: 30-45 minutes with rate limiting');
  console.log('💾 Results will be saved to data/ directory');
  console.log('=' .repeat(50));
  
  const processor = new BatchROEProcessor();
  
  try {
    const results = await processor.processBatchROE();
    
    console.log('\n🎉 Full batch processing completed successfully!');
    console.log(`📊 Final Results: ${results.summary.successful_calculations}/${results.summary.total_processed} utilities processed`);
    console.log(`📈 Success Rate: ${results.summary.success_rate}%`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Full batch processing failed:', error.message);
    throw error;
  }
}

/**
 * Resume processing from a specific utility (for interrupted runs)
 */
async function resumeProcessing(startFromTicker) {
  console.log(`🔄 Resuming Batch ROE Processing from ${startFromTicker}`);
  console.log('=' .repeat(50));
  
  const processor = new BatchROEProcessor();
  
  try {
    // Load master utility list
    const allUtilities = await processor.loadMasterUtilityList();
    
    // Find starting index
    const startIndex = allUtilities.findIndex(u => u.ticker === startFromTicker);
    if (startIndex === -1) {
      throw new Error(`Ticker ${startFromTicker} not found in master utility list`);
    }
    
    // Process remaining utilities
    const remainingUtilities = allUtilities.slice(startIndex);
    console.log(`📊 Resuming with ${remainingUtilities.length} remaining utilities`);
    
    // Override the utility list in processor
    const originalLoad = processor.loadMasterUtilityList;
    processor.loadMasterUtilityList = async () => remainingUtilities;
    
    const results = await processor.processBatchROE();
    
    console.log('\n🎉 Resume processing completed successfully!');
    return results;
    
  } catch (error) {
    console.error('❌ Resume processing failed:', error.message);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    runQuickTest()
      .then(() => console.log('\n🎉 Quick test completed successfully!'))
      .catch(err => {
        console.error('❌ Quick test failed:', err.message);
        process.exit(1);
      });
      
  } else if (args.includes('--resume') && args[1]) {
    const startTicker = args[1];
    resumeProcessing(startTicker)
      .then(() => console.log('\n🎉 Resume processing completed successfully!'))
      .catch(err => {
        console.error('❌ Resume processing failed:', err.message);
        process.exit(1);
      });
      
  } else {
    runFullBatchProcessing()
      .then(() => console.log('\n🎉 Full batch processing completed successfully!'))
      .catch(err => {
        console.error('❌ Full batch processing failed:', err.message);
        process.exit(1);
      });
  }
}

module.exports = { runQuickTest, runFullBatchProcessing, resumeProcessing };
