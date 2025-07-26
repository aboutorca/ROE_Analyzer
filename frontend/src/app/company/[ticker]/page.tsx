"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, TrendingUp, Building, DollarSign, Percent } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UtilityAppSidebar } from "@/components/utility-app-sidebar";

interface CompanyData {
  current_roe: {
    value: number;
    percentage: string;
    fiscal_year: number;
  };
  historical_roe: Array<{
    year: number;
    roe: number;
  }>;
  company_info: {
    ticker: string;
    company_name: string;
    sic_code: string;
    sic_description: string;
    classification: string;
    exchanges: string[];
  };
  financial_metrics: {
    net_income: {
      value: number;
      formatted: string;
    };
    stockholders_equity: {
      value: number;
      formatted: string;
    };
    total_assets: {
      value: number;
      formatted: string;
    };
  };
  calculation_details: {
    formula: string;
    source_filing: string;
    filing_url: string;
    tags_used: {
      net_income: string;
      equity: string;
    };
  };
}

interface FilterState {
  timeframe: string
  fiscalPeriod: string
  sicCodes: string[]
  exchanges: string[]
  showOnlyPositiveROE: boolean
  minROE?: number
  maxROE?: number
}

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    timeframe: "5y",
    fiscalPeriod: "FY",
    sicCodes: [],
    exchanges: [],
    showOnlyPositiveROE: false,
  });

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log('Filters updated:', newFilters);
    // TODO: Apply filters to data fetching and display
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch(`/api/company/${ticker}`);
        if (!response.ok) {
          throw new Error('Company not found');
        }
        const data = await response.json();
        setCompanyData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load company data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [ticker]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <UtilityAppSidebar onFiltersChange={handleFiltersChange} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading company data...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (error || !companyData) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <UtilityAppSidebar onFiltersChange={handleFiltersChange} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Search
              </Button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Prepare chart data with filter application
  let chartData = companyData.historical_roe.map(item => ({
    year: item.year.toString(),
    roe: (item.roe * 100).toFixed(2)
  }));

  // Apply timeframe filter
  if (filters.timeframe !== 'all') {
    const years = parseInt(filters.timeframe.replace('y', ''));
    const currentYear = new Date().getFullYear();
    chartData = chartData.filter(item => 
      parseInt(item.year) >= (currentYear - years)
    );
  }

  // Apply positive ROE filter
  if (filters.showOnlyPositiveROE) {
    chartData = chartData.filter(item => parseFloat(item.roe) > 0);
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <UtilityAppSidebar onFiltersChange={handleFiltersChange} />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="md:hidden" />
                <Button variant="ghost" onClick={() => router.push('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Search
                </Button>
            <div>
              <h1 className="text-3xl font-bold">{companyData.company_info.company_name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary">{companyData.company_info.ticker}</Badge>
                <Badge variant="outline">{companyData.company_info.classification}</Badge>
                <span className="text-sm text-muted-foreground">
                  SIC {companyData.company_info.sic_code} • {companyData.company_info.sic_description}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current ROE</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {companyData.current_roe.percentage}
              </div>
              <p className="text-xs text-muted-foreground">
                Fiscal Year {companyData.current_roe.fiscal_year}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyData.financial_metrics.net_income.formatted}
              </div>
              <p className="text-xs text-muted-foreground">
                Annual earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stockholders&apos; Equity</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyData.financial_metrics.stockholders_equity.formatted}
              </div>
              <p className="text-xs text-muted-foreground">
                Book value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyData.financial_metrics.total_assets.formatted}
              </div>
              <p className="text-xs text-muted-foreground">
                Total company assets
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ROE Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>ROE Historical Trend</CardTitle>
            <CardDescription>
              Return on Equity over the past {companyData.historical_roe.length} years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                roe: {
                  label: "ROE %",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="roe" 
                    stroke="var(--color-roe)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Calculation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Calculation Details & Source</CardTitle>
            <CardDescription>
              Full transparency and traceability to SEC filings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">ROE Formula</h4>
              <code className="bg-muted p-2 rounded block text-sm">
                {companyData.calculation_details.formula}
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">XBRL Tags Used</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Net Income: </span>
                  <code className="bg-muted px-1 rounded">{companyData.calculation_details.tags_used.net_income}</code>
                </div>
                <div>
                  <span className="font-medium">Equity: </span>
                  <code className="bg-muted px-1 rounded">{companyData.calculation_details.tags_used.equity}</code>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Source Filing</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">{companyData.calculation_details.source_filing}</span>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={companyData.calculation_details.filing_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View SEC Filing
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
