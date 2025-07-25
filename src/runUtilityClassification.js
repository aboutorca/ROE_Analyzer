const UtilityClassifier = require('./UtilityClassifier');

/**
 * Test runner for comprehensive utility classification
 */
async function runUtilityClassification() {
  console.log('🚀 Starting Comprehensive Utility Classification System');
  console.log('=' .repeat(60));
  console.log('Strategy: Use SEC filing metadata to systematically identify utilities');
  console.log('Source: Full ticker-to-CIK universe (not pre-filtered lists)');
  console.log('Method: Extract SIC codes + business descriptions from SEC filings');
  console.log('=' .repeat(60));

  const classifier = new UtilityClassifier();

  try {
    // Run the comprehensive classification
    const utilities = await classifier.buildMasterUtilityList();
    
    // Display summary
    console.log('\n📊 CLASSIFICATION SUMMARY');
    console.log('=' .repeat(40));
    console.log(`Total utilities identified: ${utilities.length}`);
    
    // Show SIC distribution
    const sicDistribution = classifier.getSicDistribution(utilities);
    console.log('\n📈 SIC Code Distribution:');
    Object.entries(sicDistribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([sic, count]) => {
        const classification = classifier.getUtilityClassification(parseInt(sic));
        console.log(`  ${sic}: ${count} companies (${classification})`);
      });
    
    // Show sample companies
    console.log('\n🏭 Sample Utilities Found:');
    utilities.slice(0, 10).forEach(utility => {
      console.log(`  ${utility.ticker} - ${utility.company_name} (${utility.sic_code})`);
    });
    
    if (utilities.length > 10) {
      console.log(`  ... and ${utilities.length - 10} more`);
    }
    
    console.log('\n✅ Comprehensive utility classification complete!');
    console.log('📁 Results saved to data/ directory');
    console.log('🎯 Ready for Phase 3: Batch ROE Processing');
    
    return utilities;
    
  } catch (error) {
    console.error('❌ Classification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Quick test with small sample
async function runQuickTest() {
  console.log('🔬 Quick Test: Sample Utility Classification');
  console.log('=' .repeat(50));
  
  const classifier = new UtilityClassifier();
  
  try {
    // Load just first 20 companies for testing
    const allCompanies = await classifier.loadTickerToCikMapping();
    const sampleCompanies = allCompanies.slice(0, 20);
    
    console.log(`Testing with ${sampleCompanies.length} sample companies...`);
    
    const utilities = await classifier.processBatch(sampleCompanies, 0, 20);
    
    console.log(`\n✅ Quick test results: ${utilities.length} utilities found`);
    utilities.forEach(utility => {
      console.log(`  ${utility.ticker} - ${utility.classification} (${utility.sic_code})`);
    });
    
    return utilities;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    throw error;
  }
}

// Run based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    runQuickTest()
      .then(() => console.log('\n🎉 Quick test completed successfully!'))
      .catch(err => console.error('❌ Quick test failed:', err.message));
  } else {
    runUtilityClassification()
      .then(() => console.log('\n🎉 Full classification completed successfully!'))
      .catch(err => console.error('❌ Full classification failed:', err.message));
  }
}

module.exports = { runUtilityClassification, runQuickTest };
