"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, TrendingUp, Building, DollarSign, Percent } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis } from "recharts";
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
    accession_number: string;
    tags_used: {
      net_income: string;
      equity: string;
      total_assets: string | null;
    };
    xbrl_viewer_urls: {
      net_income: string;
      equity: string;
      total_assets: string | null;
    };
  };
}



export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);




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
          <UtilityAppSidebar />
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
          <UtilityAppSidebar />
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
  const chartData = companyData.historical_roe.map(item => ({
    year: item.year.toString(),
    roe: parseFloat((item.roe * 100).toFixed(2))
  }));

  // No filters applied - show all historical data

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <UtilityAppSidebar />
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
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => window.open(`https://finance.yahoo.com/quote/${companyData.company_info.ticker}/`, '_blank')}
                >
                  {companyData.company_info.ticker}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Badge>
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
              <div className="text-3xl font-bold text-green-600">
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
              <div className="text-3xl font-bold">
                {companyData.financial_metrics.net_income.formatted}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Annual earnings
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => window.open(companyData.calculation_details.xbrl_viewer_urls?.net_income || companyData.calculation_details.filing_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Verify in SEC Filing
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stockholders&apos; Equity</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {companyData.financial_metrics.stockholders_equity.formatted}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Book value
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => window.open(companyData.calculation_details.xbrl_viewer_urls?.equity || companyData.calculation_details.filing_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Verify in SEC Filing
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {companyData.financial_metrics.total_assets.formatted}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Total company assets
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => window.open(companyData.calculation_details.xbrl_viewer_urls?.total_assets || companyData.calculation_details.filing_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Verify in SEC Filing
              </Button>
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
                  color: "var(--primary)",
                },
              }}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillROE" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-roe)"
                      stopOpacity={1.0}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-roe)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="roe"
                  type="natural"
                  fill="url(#fillROE)"
                  stroke="var(--color-roe)"
                />
              </AreaChart>
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
            <div className="bg-muted p-3 rounded text-base font-mono flex justify-center">
              <div className="text-left">
              {companyData.calculation_details.formula.split('\n').map((line, index) => {
                // Check if this is the result line (contains the final percentage)
                const isResultLine = line.includes('• Result:');
                const percentageMatch = line.match(/(\d+\.\d+%)$/);
                
                if (isResultLine && percentageMatch) {
                  const beforePercentage = line.substring(0, line.lastIndexOf(percentageMatch[1]));
                  const percentage = percentageMatch[1];
                  return (
                    <div key={index} className="mb-1 last:mb-0">
                      {beforePercentage}
                      <span className="text-green-600 font-semibold">{percentage}</span>
                    </div>
                  );
                }
                
                return (
                  <div key={index} className="mb-1 last:mb-0">
                    {line}
                  </div>
                );
              })}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Source Filing</h4>
              <div>
                <a 
                  href={companyData.calculation_details.xbrl_viewer_urls?.net_income || companyData.calculation_details.filing_url}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 hover:underline cursor-pointer"
                >
                  {companyData.calculation_details.source_filing}
                </a>
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
