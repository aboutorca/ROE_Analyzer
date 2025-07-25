class SECApiClient {
    constructor(rateLimiter) {
      this.rateLimiter = rateLimiter;
      this.baseUrl = 'https://data.sec.gov';
      this.userAgent = 'Utility ROE Analyzer/1.0 (206juandi@gmail.com)';
    }
  
    /**
     * Generic fetch with rate limiting and proper headers
     */
    async fetch(url) {
      await this.rateLimiter.acquire();
      
      const headers = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Host': new URL(url).hostname
      };
  
      try {
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`API request failed for ${url}:`, error.message);
        throw error;
      }
    }
  
    /**
     * Fetch company facts (XBRL data)
     */
    async fetchCompanyFacts(cik) {
      // Ensure CIK is 10 digits with leading zeros
      const paddedCik = cik.toString().padStart(10, '0');
      const url = `${this.baseUrl}/api/xbrl/companyfacts/CIK${paddedCik}.json`;
      return this.fetch(url);
    }
  
    /**
     * Fetch company submissions (filing history and metadata)
     */
    async fetchCompanySubmissions(cik) {
      // Ensure CIK is 10 digits with leading zeros
      const paddedCik = cik.toString().replace(/^0+/, '').padStart(10, '0');
      const url = `${this.baseUrl}/submissions/CIK${paddedCik}.json`;
      return this.fetch(url);
    }
  
    /**
     * Fetch all company tickers
     */
    async fetchCompanyTickers() {
      const url = 'https://www.sec.gov/files/company_tickers.json';
      return this.fetch(url);
    }
  
    /**
     * Fetch frames data (for sector analysis)
     */
    async fetchFrames(tag, units, year, quarter = null) {
      const period = quarter ? `CY${year}Q${quarter}` : `CY${year}`;
      const url = `${this.baseUrl}/api/xbrl/frames/us-gaap/${tag}/${units}/${period}.json`;
      return this.fetch(url);
    }
  }
  
  module.exports = SECApiClient;