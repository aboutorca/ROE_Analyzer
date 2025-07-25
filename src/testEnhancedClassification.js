const UtilityClassifier = require('./UtilityClassifier');

async function testEnhancedClassification() {
  console.log('🧪 Testing Enhanced Utility Classification System');
  console.log('=' .repeat(60));
  
  const classifier = new UtilityClassifier();
  
  // Test companies including known problematic cases
  const testTickers = [
    'MDU',   // Known utility exception (SIC 1400)
    'DUK',   // Standard utility (SIC 4911)
    'NEE',   // Standard utility (SIC 4911)
    'AEP',   // Standard utility (SIC 4911)
    'SO',    // Standard utility (SIC 4911)
    'BKH',   // Known utility exception
    'NWE',   // Known utility exception
    'AAPL',  // Non-utility (should remain non-utility)
    'MSFT',  // Non-utility (should remain non-utility)
    'AES'    // Edge case utility (SIC 4991)
  ];
  
  try {
    const companies = await classifier.loadTickerToCikMapping();
    
    console.log('🔍 Testing classification on sample companies:\n');
    
    for (const ticker of testTickers) {
      const company = companies.find(c => c.ticker === ticker);
      
      if (!company) {
        console.log(`❌ ${ticker}: Not found in ticker mapping`);
        continue;
      }
      
      try {
        const metadata = await classifier.extractCompanyMetadata(company.cik);
        
        if (!metadata) {
          console.log(`⚠️  ${ticker}: Could not extract metadata`);
          continue;
        }
        
        const classification = classifier.isUtility(
          metadata.sic, 
          metadata.sicDescription, 
          metadata.sicDescription, 
          company.ticker
        );
        
        const status = classification.isUtility ? '✅' : '❌';
        console.log(`${status} ${ticker} (SIC ${metadata.sic}): ${classification.classification}`);
        console.log(`   Reason: ${classification.reason}`);
        console.log(`   Company: ${company.company_name}`);
        console.log('');
        
      } catch (error) {
        console.log(`⚠️  ${ticker}: Error - ${error.message}`);
      }
    }
    
    console.log('✅ Enhanced classification testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

testEnhancedClassification();
