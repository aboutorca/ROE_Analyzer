const fs = require('fs').promises;
const path = require('path');
const RateLimiter = require('./rateLimiter');
const SECApiClient = require('./secApiClient');

class UtilityListBuilder {
constructor() {
  this.rateLimiter = new RateLimiter(10, 1000);
  this.apiClient = new SECApiClient(this.rateLimiter);

  this.utilitySicCodes = [4900, 4911, 4922, 4923, 4924, 4931, 4932];
}

async buildMasterUtilityList() {
  console.log('🚀 Starting Phase 2: Master Utility List Builder');

  try {
    const tickerMap = await this.fetchCompanyTickers();
    console.log(`Found ${Object.keys(tickerMap).length} total companies`);

    const utilities = await this.scanAndClassifyCompanies(tickerMap);
    console.log(`✅ Found ${utilities.length} classified utility companies`);

    await this.saveMasterList(utilities);
    return utilities;
  } catch (error) {
    console.error('❌ Error building master utility list:', error.message);
    throw error;
  }
}

async fetchCompanyTickers() {
  const response = await this.apiClient.fetchCompanyTickers();
  const tickerMap = {};
  Object.values(response).forEach(company => {
    if (company.ticker && company.cik_str) {
      tickerMap[company.ticker] = {
        cik: company.cik_str.toString().padStart(10, '0'),
        title: company.title
      };
    }
  });
  return tickerMap;
}

async scanAndClassifyCompanies(tickerMap) {
  const utilities = [];
  const tickers = Object.keys(tickerMap);

  for (const ticker of tickers) {
    const company = tickerMap[ticker];
    try {
      const metadata = await this.apiClient.fetchCompanySubmissions(company.cik);
      const sic = metadata?.sic;
      const desc = metadata?.business?.toLowerCase() || '';

      const isUtility = this.utilitySicCodes.includes(parseInt(sic)) || [
        'utility', 'electric', 'natural gas', 'transmission', 'distribution'
      ].some(word => desc.includes(word));

      if (isUtility) {
        utilities.push({
          ticker,
          cik: `000${company.cik}`,
          company_name: company.title,
          sic_code: sic,
          description: desc
        });
        console.log(`✓ ${ticker} (${sic}) - ${company.title}`);
      }
    } catch (err) {
      console.log(`⚠️ Skipping ${ticker} due to error: ${err.message}`);
    }
  }

  return utilities;
}

async saveMasterList(utilities) {
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonData = {
    generated_at: new Date().toISOString(),
    total_utilities: utilities.length,
    utilities
  };
  const jsonPath = path.join(dataDir, `master_utility_list_${timestamp}.json`);
  const latestJsonPath = path.join(dataDir, 'master_utility_list_latest.json');
  await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
  await fs.writeFile(latestJsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`📄 JSON saved: ${jsonPath}`);
  console.log(`🔗 Latest JSON: ${latestJsonPath}`);
}

async loadMasterList() {
  const pathToLatest = path.join(__dirname, '..', 'data', 'master_utility_list_latest.json');
  try {
    const content = await fs.readFile(pathToLatest, 'utf8');
    return JSON.parse(content).utilities;
  } catch {
    return null;
  }
}

getUtilitiesBySic(utilities, sicStart, sicEnd = null) {
  const targetSics = sicEnd
    ? Array.from({ length: sicEnd - sicStart + 1 }, (_, i) => sicStart + i)
    : [sicStart];
  return utilities.filter(u => targetSics.includes(parseInt(u.sic_code)));
}
}

module.exports = UtilityListBuilder;

// ----------------------------

const UtilityListBuilder = require('./MasterUtilityListBuilder');

async function runPhase2Test() {
console.log('🚀 Starting Phase 2 Test: Master Utility List Builder');
const builder = new UtilityListBuilder();

try {
  const existing = await builder.loadMasterList();
  if (existing?.length) {
    console.log(`📂 Loaded ${existing.length} existing utilities`);
  } else {
    console.log('📭 No existing list found. Building from scratch...');
    const utilities = await builder.buildMasterUtilityList();
    console.log(`✅ Built fresh list: ${utilities.length} utilities`);
  }
} catch (error) {
  console.error('❌ Error in Phase 2 Test:', error.message);
}
}

if (require.main === module) {
runPhase2Test();
}

module.exports = { runPhase2Test };