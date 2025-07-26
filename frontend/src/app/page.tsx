"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card } from "@/components/ui/card";

interface Utility {
  ticker: string;
  company_name: string;
  sic_code: string;
  classification: string;
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<Utility[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const results = await response.json();
      console.log('Search results for "' + query + '":', results); // Debug log
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUtility = (ticker: string) => {
    router.push(`/company/${ticker}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Utility ROE Analyzer
          </h1>
          <p className="text-lg text-muted-foreground">
            Search for utility companies to analyze their Return on Equity
          </p>
        </div>

        {/* Search Interface */}
        <Card className="p-6">
          <Command className="rounded-lg border shadow-md" shouldFilter={false}>
            <CommandInput
              placeholder="Search utility companies (e.g., MDU, Dominion Energy)..."
              onValueChange={handleSearch}
              value={searchQuery}
            />
            <CommandList>
              {isSearching && (
                <CommandEmpty>Searching...</CommandEmpty>
              )}
              {!isSearching && searchQuery.length > 0 && searchResults.length === 0 && (
                <CommandEmpty>No utilities found. Try searching for a ticker or company name.</CommandEmpty>
              )}
              {!isSearching && searchQuery.length === 0 && (
                <CommandEmpty>Start typing to search for utility companies...</CommandEmpty>
              )}
              {searchResults.length > 0 && (
                <CommandGroup heading="Utilities">
                  {searchResults.map((utility) => (
                    <CommandItem
                      key={utility.ticker}
                      value={utility.ticker}
                      onSelect={() => handleSelectUtility(utility.ticker)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{utility.ticker}</span>
                          <span className="text-xs text-muted-foreground">
                            {utility.classification}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground truncate">
                          {utility.company_name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by SEC EDGAR API • Real-time financial data</p>
        </div>
      </div>
    </div>
  );
}
