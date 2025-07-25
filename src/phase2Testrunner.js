const UtilityListBuilder = require('./MasterUtilityListBuilder');

async function runPhase2Test() {
  console.log('🚀 Starting Phase 2 Test: Master Utility List Builder');
  console.log('=' .repeat(60));

  const builder = new UtilityListBuilder();

  try {
    // Check if we already have a master list
    console.log('🔍 Checking for existing master list...');
    const existing = await builder.loadMasterList();
    
    if (existing && existing.length > 0) {
      console.log(`📂 Found existing list with ${existing.length} utilities`);
      console.log('Choose: [R]ebuild from scratch, [U]se existing, or [Q]uit?');
      
      // For automated testing, we'll use existing if available
      console.log('Using existing master list for testing...\n');
      
      builder.displaySummary(existing);
      
      // Test filtering capabilities
      console.log('\n🧪 Testing SIC filtering capabilities...');
      
      const electricUtilities = builder.getUtilitiesBySic(existing, 4900, 4939);
      console.log(`Electric Services (4900-4939): ${electricUtilities.length} companies`);
      
      const waterUtilities = builder.getUtilitiesBySic(existing, 4953);
      console.log(`Water Supply (4953): ${waterUtilities.length} companies`);
      
      // Show sample companies from each category
      console.log('\n📋 Sample Companies:');
      if (electricUtilities.length > 0) {
        console.log(`Electric: ${electricUtilities[0].ticker} - ${electricUtilities[0].company_name}`);
      }
      if (waterUtilities.length > 0) {
        console.log(`Water: ${waterUtilities[0].ticker} - ${waterUtilities[0].company_name}`);
      }
      
      console.log('\n✅ Phase 2 Test Complete - Master list is ready!');
      console.log('Next: Proceed to Phase 3 (Batch ROE Processing)');
      
      return existing;
      
    } else {
      console.log('📭 No existing master list found. Building from scratch...');
      
      // Build fresh master list
      const utilities = await builder.buildMasterUtilityList();
      
      // Display summary
      builder.displaySummary(utilities);
      
      console.log('\n✅ Phase 2 Test Complete - Fresh master list built!');
      console.log('Next: Proceed to Phase 3 (Batch ROE Processing)');
      
      return utilities;
    }

  } catch (error) {
    console.error('❌ Phase 2 Test Failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Test utility functions
async function quickTest() {
  console.log('🔬 Quick Phase 2 Test (Sample Processing)');
  console.log('=' .repeat(40));
  
  const builder = new UtilityListBuilder();
  
  // Test with a small sample of known utility tickers
  const testTickers = {
    'DUK': { cik: '0001326160', title: 'DUKE ENERGY CORPORATION' },
    'NEE': { cik: '0000753308', title: 'NEXTERA ENERGY, INC.' },
    'SO': { cik: '0000092122', title: 'The Southern Company' }
  };
  
  console.log('Testing SIC filtering with known utilities...');
  
  const utilities = await builder.filterUtilityCompanies(testTickers);
  
  console.log(`\n✅ Quick Test Results:`);
  console.log(`Found ${utilities.length} utilities from ${Object.keys(testTickers).length} test companies`);
  
  utilities.forEach(u => {
    console.log(`  ${u.ticker} (${u.sic_code}) - ${u.company_name}`);
  });
  
  return utilities;
}

// Run the appropriate test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    quickTest()
      .then(() => console.log('\n🎉 Quick test completed successfully!'))
      .catch(err => console.error('❌ Quick test failed:', err.message));
  } else {
    runPhase2Test()
      .then(() => console.log('\n🎉 Phase 2 testing completed successfully!'))
      .catch(err => console.error('❌ Phase 2 testing failed:', err.message));
  }
}

module.exports = { runPhase2Test, quickTest };
