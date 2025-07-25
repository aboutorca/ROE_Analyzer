const UtilityClassifier = require('./UtilityClassifier');

async function debugMDU() {
  console.log('🔍 Debugging MDU Resources Group SIC Code Issue');
  console.log('=' .repeat(50));
  
  const classifier = new UtilityClassifier();
  
  try {
    // Find MDU in the ticker mapping
    const companies = await classifier.loadTickerToCikMapping();
    const mdu = companies.find(c => c.ticker === 'MDU');
    
    if (!mdu) {
      console.log('❌ MDU not found in ticker mapping');
      return;
    }
    
    console.log('📊 MDU Company Info:');
    console.log('  Ticker:', mdu.ticker);
    console.log('  CIK:', mdu.cik);
    console.log('  Company Name:', mdu.company_name);
    
    // Extract metadata directly
    console.log('\n🔍 Extracting SEC metadata...');
    const metadata = await classifier.extractCompanyMetadata(mdu.cik);
    
    if (metadata) {
      console.log('📋 SEC Metadata:');
      console.log('  SIC Code:', metadata.sic);
      console.log('  SIC Description:', metadata.sicDescription);
      console.log('  Entity Type:', metadata.entityType);
      console.log('  Fiscal Year End:', metadata.fiscalYearEnd);
      
      // Test classification
      const classification = classifier.isUtility(metadata.sic, metadata.sicDescription, metadata.sicDescription, mdu.ticker);
      console.log('\n🎯 Classification Result:');
      console.log('  Is Utility:', classification.isUtility);
      console.log('  Classification:', classification.classification);
      console.log('  Reason:', classification.reason);
      
      // Check if SIC 4924 is in our utility codes
      console.log('\n🔧 Utility SIC Codes Check:');
      console.log('  Our utility SIC codes:', classifier.utilitySicCodes);
      console.log('  Does 4924 exist in our list?', classifier.utilitySicCodes.includes(4924));
      
      if (metadata.sic === '1400') {
        console.log('\n⚠️  WARNING: SEC is reporting SIC 1400, but MDU should be SIC 4924');
        console.log('   This suggests either:');
        console.log('   1. SEC data has outdated/incorrect SIC code');
        console.log('   2. MDU has multiple business segments with different SIC codes');
        console.log('   3. We need to check business description for utility keywords');
      }
      
    } else {
      console.log('❌ Could not extract metadata');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

debugMDU();
