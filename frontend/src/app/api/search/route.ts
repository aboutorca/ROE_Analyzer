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

  // Filter utilities based on ticker or company name
  const filteredUtilities = utilities
    .filter((utility: Utility) => {
      const tickerMatch = utility.ticker.toLowerCase().includes(query);
      const nameMatch = utility.company_name.toLowerCase().includes(query);
      return tickerMatch || nameMatch;
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
