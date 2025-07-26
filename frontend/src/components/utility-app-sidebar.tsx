"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
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
} from "@/components/ui/sidebar"
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



export function UtilityAppSidebar({ ...props }: UtilityAppSidebarProps) {
  // Filter functionality removed as requested



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
        {/* Filters section removed */}
        
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
