const ROEExtractor = require('./roeExtractor');

// Phase 1 Test: Single company ROE extraction
async function testPhase1() {
  const extractor = new ROEExtractor();
  
  // Test cases from PRD - using correct CIKs from debug
  const testCases = [
    { ticker: 'DUK', cik: '1326160' },   // Duke Energy (corrected CIK)
    { ticker: 'NEE', cik: '753308' },    // NextEra Energy 
    { ticker: 'SO', cik: '92122' }       // Southern Company
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING: ${testCase.ticker} (CIK: ${testCase.cik})`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      await extractor.testSingleCompany(testCase.ticker, testCase.cik, 'FY');
      
      // Also test quarterly if available
      console.log(`\n--- Testing Q3 data for ${testCase.ticker} ---`);
      try {
        await extractor.testSingleCompany(testCase.ticker, testCase.cik, 'Q3');
      } catch (qError) {
        console.log(`⚠️  Q3 data not available: ${qError.message}`);
      }
      
    } catch (error) {
      console.error(`Failed to process ${testCase.ticker}: ${error.message}`);
    }
    
    // Rate limiting pause between companies
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Run Phase 1 test
if (require.main === module) {
  console.log('🚀 Starting Phase 1: Single-Company ROE Extractor Test');
  console.log('Using SEC EDGAR API with rate limiting...\n');
  
  testPhase1()
    .then(() => {
      console.log('\n✅ Phase 1 testing complete!');
      console.log('Next: Build master utility list (Phase 2)');
    })
    .catch(error => {
      console.error('\n❌ Phase 1 testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPhase1 };
