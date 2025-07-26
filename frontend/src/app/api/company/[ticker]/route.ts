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
  business_address?: object;
}

// We'll need to convert our JS modules to work in the API route
// For now, let's create a simplified version that returns mock data
// TODO: Integrate actual ROE calculation from our existing modules

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  // Access the utilities array from the JSON structure
  const utilities = (utilityData as { utilities: Utility[] }).utilities;
  
  // Find the utility in our master list
  const utility = utilities.find((u: Utility) => u.ticker === ticker);

  if (!utility) {
    return NextResponse.json({ error: 'Utility not found' }, { status: 404 });
  }

  // For now, return the utility info with mock ROE data
  // TODO: Integrate with actual ROE calculation
  const mockROEData = {
    current_roe: {
      value: 0.0985, // 9.85%
      percentage: "9.85%",
      fiscal_year: 2024
    },
    historical_roe: [
      { year: 2020, roe: 0.082 },
      { year: 2021, roe: 0.091 },
      { year: 2022, roe: 0.085 },
      { year: 2023, roe: 0.079 },
      { year: 2024, roe: 0.0985 }
    ],
    company_info: {
      ticker: utility.ticker,
      company_name: utility.company_name,
      sic_code: utility.sic_code,
      sic_description: utility.sic_description,
      classification: utility.classification,
      exchanges: utility.exchanges || [],
      business_address: utility.business_address || null
    },
    financial_metrics: {
      net_income: {
        value: 1200000000, // $1.2B
        formatted: "$1.20B"
      },
      stockholders_equity: {
        value: 12200000000, // $12.2B
        formatted: "$12.20B"
      },
      total_assets: {
        value: 45000000000, // $45B
        formatted: "$45.00B"
      }
    },
    calculation_details: {
      formula: "ROE = $1,200,000,000 ÷ $12,200,000,000 = 9.85%",
      source_filing: "10-K filed 2025-02-28",
      filing_url: "https://www.sec.gov/Archives/edgar/data/example",
      tags_used: {
        net_income: "us-gaap:NetIncomeLoss",
        equity: "us-gaap:StockholdersEquity"
      }
    }
  };

  return NextResponse.json({
    ...mockROEData,
    last_updated: new Date().toISOString()
  });
}
