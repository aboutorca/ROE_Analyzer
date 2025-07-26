"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFilter,
  IconBuilding,
  IconTrendingUp,
  IconSettings,
  IconHelp,
  IconSearch,
  IconBolt,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

interface UtilityAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onFiltersChange?: (filters: FilterState) => void
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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Companies",
      url: "#",
      icon: IconBuilding,
    },
    {
      title: "Trends",
      url: "#",
      icon: IconTrendingUp,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "/",
      icon: IconSearch,
    },
  ],
}

const sicCodeOptions = [
  { value: "4900", label: "4900 - Electric, Gas & Sanitary Services" },
  { value: "4911", label: "4911 - Electric Services" },
  { value: "4922", label: "4922 - Natural Gas Transmission" },
  { value: "4923", label: "4923 - Natural Gas Transmission & Distribution" },
  { value: "4924", label: "4924 - Natural Gas Distribution" },
  { value: "4931", label: "4931 - Electric & Other Services Combined" },
  { value: "4932", label: "4932 - Gas & Other Services Combined" },
]

const exchangeOptions = [
  { value: "NYSE", label: "NYSE" },
  { value: "NASDAQ", label: "NASDAQ" },
  { value: "AMEX", label: "AMEX" },
]

export function UtilityAppSidebar({ onFiltersChange, ...props }: UtilityAppSidebarProps) {
  const [filters, setFilters] = React.useState<FilterState>({
    timeframe: "5y",
    fiscalPeriod: "FY",
    sicCodes: [],
    exchanges: [],
    showOnlyPositiveROE: false,
  })

  const handleFilterChange = (key: keyof FilterState, value: string | string[] | boolean | number) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const handleSicCodeChange = (sicCode: string, checked: boolean) => {
    const newSicCodes = checked 
      ? [...filters.sicCodes, sicCode]
      : filters.sicCodes.filter(code => code !== sicCode)
    handleFilterChange('sicCodes', newSicCodes)
  }

  const handleExchangeChange = (exchange: string, checked: boolean) => {
    const newExchanges = checked 
      ? [...filters.exchanges, exchange]
      : filters.exchanges.filter(ex => ex !== exchange)
    handleFilterChange('exchanges', newExchanges)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconBolt className="!size-5" />
                <span className="text-base font-semibold">Utility ROE Analyzer</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={data.navMain} />
        
        <Separator className="my-2" />
        
        {/* Filters Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <IconFilter className="size-4" />
            Filters
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4 p-2">
            
            {/* Timeframe Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Timeframe</Label>
              <Select 
                value={filters.timeframe} 
                onValueChange={(value) => handleFilterChange('timeframe', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="3y">3 Years</SelectItem>
                  <SelectItem value="5y">5 Years</SelectItem>
                  <SelectItem value="10y">10 Years</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fiscal Period Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Fiscal Period</Label>
              <Select 
                value={filters.fiscalPeriod} 
                onValueChange={(value) => handleFilterChange('fiscalPeriod', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FY">Annual (FY)</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4 (Derived)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SIC Codes Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">SIC Codes</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {sicCodeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sic-${option.value}`}
                      checked={filters.sicCodes.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleSicCodeChange(option.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`sic-${option.value}`} 
                      className="text-xs cursor-pointer truncate"
                      title={option.label}
                    >
                      {option.value}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Exchanges Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Exchanges</Label>
              <div className="space-y-1">
                {exchangeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exchange-${option.value}`}
                      checked={filters.exchanges.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleExchangeChange(option.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`exchange-${option.value}`} 
                      className="text-xs cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* ROE Filters */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">ROE Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="positive-roe"
                  checked={filters.showOnlyPositiveROE}
                  onCheckedChange={(checked) => 
                    handleFilterChange('showOnlyPositiveROE', checked as boolean)
                  }
                />
                <Label htmlFor="positive-roe" className="text-xs cursor-pointer">
                  Positive ROE only
                </Label>
              </div>
            </div>

          </SidebarGroupContent>
        </SidebarGroup>
        
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-2 text-xs text-muted-foreground text-center">
          <div className="flex items-center justify-center gap-1">
            <IconDatabase className="size-3" />
            SEC EDGAR API
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
