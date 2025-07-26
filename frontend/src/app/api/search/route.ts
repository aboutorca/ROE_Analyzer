import { NextRequest, NextResponse } from 'next/server';
import utilityData from '@/lib/sec-api/comprehensive_utility_list_latest.json';

interface Utility {
  ticker: string;
  company_name: string;
  sic_code: string;
  classification: string;
  cik: string;
  sic_description?: string;
  exchanges?: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  // Access the utilities array from the JSON structure
  const utilities = (utilityData as { utilities: Utility[] }).utilities;

  // Filter and sort utilities based on ticker or company name
  // Prioritize exact ticker matches, then partial ticker matches, then company name matches
  const filteredUtilities = utilities
    .filter((utility: Utility) => {
      const tickerMatch = utility.ticker.toLowerCase().includes(query);
      const nameMatch = utility.company_name.toLowerCase().includes(query);
      return tickerMatch || nameMatch;
    })
    .sort((a: Utility, b: Utility) => {
      const aTickerExact = a.ticker.toLowerCase() === query;
      const bTickerExact = b.ticker.toLowerCase() === query;
      const aTickerMatch = a.ticker.toLowerCase().includes(query);
      const bTickerMatch = b.ticker.toLowerCase().includes(query);
      const aNameMatch = a.company_name.toLowerCase().includes(query);
      const bNameMatch = b.company_name.toLowerCase().includes(query);
      
      // Exact ticker match gets highest priority
      if (aTickerExact && !bTickerExact) return -1;
      if (!aTickerExact && bTickerExact) return 1;
      
      // Partial ticker match gets second priority
      if (aTickerMatch && !bTickerMatch) return -1;
      if (!aTickerMatch && bTickerMatch) return 1;
      
      // Company name matches get lowest priority
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // If same priority, sort alphabetically by ticker
      return a.ticker.localeCompare(b.ticker);
    })
    .slice(0, 10) // Limit to 10 results
    .map((utility: Utility) => ({
      ticker: utility.ticker,
      company_name: utility.company_name,
      sic_code: utility.sic_code,
      classification: utility.classification
    }));

  return NextResponse.json(filteredUtilities);
}
