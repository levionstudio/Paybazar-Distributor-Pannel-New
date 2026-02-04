"use client"

import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Wallet,
  ChevronDown,
  ChevronRight,
  Receipt,
  FileText,
  RotateCcw,
  ArrowRightLeft,
  FileBarChart,
} from "lucide-react"

import { jwtDecode } from "jwt-decode"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface AppSidebarProps {
  role: "master" | "distributor"
}

interface TokenData {
  admin_id: string
  user_id: string
  user_name: string
  user_role: string
  exp: number
  iat: number
}


export function AppSidebar({ role }: AppSidebarProps) {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"

  const pathname = location.pathname

  const [userName, setUserName] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [fundRequestOpen, setFundRequestOpen] = useState(false)
  const [fundTransferOpen, setFundTransferOpen] = useState(false)
  const [revertOpen, setRevertOpen] = useState(false)
  const [tdsOpen, setTdsOpen] = useState(false)

  const iconClass = "h-5 w-5"

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) return

    try {
      const decoded: TokenData = jwtDecode(token)

      // optional safety: auto logout if expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken")
        localStorage.removeItem("userRole")
        return
      }

      setUserName(decoded.user_name || "")
      setUserId(decoded.user_id || "")
    } catch (error) {
      console.error("Failed to decode token", error)
    }
  }, [role])

  // Automatically open dropdowns when inside related paths
  useEffect(() => {
    if (
      pathname.startsWith("/request-funds") ||
      pathname.includes("/requestfund") ||
      pathname.includes("/requestedfund")
    ) {
      setFundRequestOpen(true)
    }
    if (
      pathname.includes("/fund/retailer") ||
      pathname.includes("/fund/distributor")
    ) {
      setFundTransferOpen(true)
    }
    if (
      pathname.includes("/revert/request") ||
      pathname.includes("/revert/history")
    ) {
      setRevertOpen(true)
    }
    if (
      pathname.includes("/tds")
    ) {
      setTdsOpen(true)
    }
  }, [pathname])

  const initials = userName?.[0]?.toUpperCase() || (role === "master" ? "MD" : "DR")

  // Menu configuration
  const dashboardHref = role === "master" ? "/master" : "/distributor"
  const transactionsHref = role === "master" ? "/transactions/md" : "/transactions/distributor"
  
  const fundRequestItems = role === "master" 
    ? [
        { title: "Add Funds", href: "/request-funds" },
        { title: "Fund Request", href: "/md/requestfund" },

      ]
    : [
        { title: "Add Funds", href: "/request-funds/distributor" },
        { title: "Fund Request", href: "/distributor/requestedfund" },
      ]

  const fundTransferItems = role === "master"
    ? [
        { title: "Fund Retailer", href: "/md/fund/retailer" },
        { title: "Fund Distributor", href: "/md/fund/distributor" },
      ]
    : [
        { title: "Fund Retailer", href: "/distributor/fund/retailer" },
      ]

  const revertItems = role === "master"
    ? [
        { title: "Revert Request", href: "/md/revert/request" },
        { title: "Revert History", href: "/md/revert/history" },
      ]
    : [
        { title: "Revert Request", href: "/distributor/revert/request" },
        { title: "Revert History", href: "/distributor/revert/history" },
      ]

  // const tdsItems = role === "master"
  //   ? [
  //       { title: "TDS History", href: "/md/tds/history" },
  //     ]
  //   : [
  //       { title: "TDS History", href: "/distributor/tds/history" },
  //     ]

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarContent className="flex flex-col h-screen">
        {/* LOGO */}
        <div
          className={`flex h-16 items-center justify-center border-b border-sidebar-border ${
            isCollapsed ? "px-2" : "px-4"
          }`}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <img
                src="/paybazaar-logo.png"
                alt="PayBazaar"
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-sidebar-foreground">
                PayBazaar
              </span>
            </div>
          ) : (
            <img
              src="/paybazaar-logo.png"
              alt="PayBazaar"
              className="h-8 w-8 mx-auto object-contain"
            />
          )}
        </div>

        {/* SCROLL AREA */}
        <div
          className={`flex-1 overflow-y-auto ${
            isCollapsed ? "py-4" : "px-3 py-4"
          } space-y-1`}
        >
          {/* MAIN MENU */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href={dashboardHref}
                      className={`flex items-center rounded-lg transition-all ${
                        isCollapsed
                          ? "justify-center px-2 py-2"
                          : "gap-3 px-3 py-2"
                      } ${
                        pathname === dashboardHref
                          ? "text-sidebar-primary-foreground border border-white"
                          : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                      }`}
                    >
                      <LayoutDashboard className={iconClass} />
                      {!isCollapsed && <span>Dashboard</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Transactions */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href={transactionsHref}
                      className={`flex items-center rounded-lg transition-all ${
                        isCollapsed
                          ? "justify-center px-2 py-2"
                          : "gap-3 px-3 py-2"
                      } ${
                        pathname === transactionsHref
                          ? "text-sidebar-primary-foreground border border-white"
                          : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                      }`}
                    >
                      <Receipt className={iconClass} />
                      {!isCollapsed && <span>Transactions</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* FUND REQUESTS COLLAPSIBLE */}
          <SidebarGroup>
            <SidebarGroupContent>
              {isCollapsed ? (
                // COLLAPSED MODE (just icon)
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={fundRequestItems[0].href}
                        className={`flex items-center rounded-lg px-2 py-2 justify-center transition-all ${
                          fundRequestItems.some(item => pathname === item.href)
                            ? "text-sidebar-primary-foreground border border-white"
                            : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                        }`}
                      >
                        <FileText className={iconClass} />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                // EXPANDED MODE
                <Collapsible open={fundRequestOpen} onOpenChange={setFundRequestOpen}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      fundRequestItems.some(item => pathname === item.href)
                        ? "text-sidebar-primary-foreground border-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={iconClass} />
                      <span>Fund</span>
                    </div>
                    {fundRequestOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 space-y-1">
                    {fundRequestItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 pl-11 rounded-lg text-sm transition-all ${
                          pathname === item.href
                            ? "text-sidebar-foreground border border-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 border-transparent"
                        }`}
                      >
                        {item.title}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* FUND TRANSFER COLLAPSIBLE */}
          <SidebarGroup>
            <SidebarGroupContent>
              {isCollapsed ? (
                // COLLAPSED MODE (just icon)
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={fundTransferItems[0].href}
                        className={`flex items-center rounded-lg px-2 py-2 justify-center transition-all ${
                          fundTransferItems.some(item => pathname === item.href)
                            ? "text-sidebar-primary-foreground border border-white"
                            : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                        }`}
                      >
                        <ArrowRightLeft className={iconClass} />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                // EXPANDED MODE
                <Collapsible open={fundTransferOpen} onOpenChange={setFundTransferOpen}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      fundTransferItems.some(item => pathname === item.href)
                        ? "text-sidebar-primary-foreground border-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowRightLeft className={iconClass} />
                      <span>Fund Transfer</span>
                    </div>
                    {fundTransferOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 space-y-1">
                    {fundTransferItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 pl-11 rounded-lg text-sm transition-all ${
                          pathname === item.href
                            ? "text-sidebar-foreground border border-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 border-transparent"
                        }`}
                      >
                        {item.title}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* REVERT COLLAPSIBLE */}
          <SidebarGroup>
            <SidebarGroupContent>
              {isCollapsed ? (
                // COLLAPSED MODE (just icon)
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={revertItems[0].href}
                        className={`flex items-center rounded-lg px-2 py-2 justify-center transition-all ${
                          revertItems.some(item => pathname === item.href)
                            ? "text-sidebar-primary-foreground border border-white"
                            : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                        }`}
                      >
                        <RotateCcw className={iconClass} />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                // EXPANDED MODE
                <Collapsible open={revertOpen} onOpenChange={setRevertOpen}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      revertItems.some(item => pathname === item.href)
                        ? "text-sidebar-primary-foreground border-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RotateCcw className={iconClass} />
                      <span>Revert</span>
                    </div>
                    {revertOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 space-y-1">
                    {revertItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 pl-11 rounded-lg text-sm transition-all ${
                          pathname === item.href
                            ? "text-sidebar-foreground border border-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 border-transparent"
                        }`}
                      >
                        {item.title}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* TDS COLLAPSIBLE */}
          {/* <SidebarGroup>
            <SidebarGroupContent>
              {isCollapsed ? (
                // COLLAPSED MODE (just icon)
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={tdsItems[0].href}
                        className={`flex items-center rounded-lg px-2 py-2 justify-center transition-all ${
                          tdsItems.some(item => pathname === item.href)
                            ? "text-sidebar-primary-foreground border border-white"
                            : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                        }`}
                      >
                        <FileBarChart className={iconClass} />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                // EXPANDED MODE
                <Collapsible open={tdsOpen} onOpenChange={setTdsOpen}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      tdsItems.some(item => pathname === item.href)
                        ? "text-sidebar-primary-foreground border-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileBarChart className={iconClass} />
                      <span>TDS</span>
                    </div>
                    {tdsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 space-y-1">
                    {tdsItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 pl-11 rounded-lg text-sm transition-all ${
                          pathname === item.href
                            ? "text-sidebar-foreground border border-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 border-transparent"
                        }`}
                      >
                        {item.title}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroupContent>
          </SidebarGroup> */}
        </div>

        {/* USER PROFILE */}
        {!isCollapsed && (
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full text-sidebar-primary-foreground flex items-center justify-center font-bold text-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-sidebar-foreground">
                  {userName}
                </p>
                <p className="text-xs text-sidebar-foreground/70 capitalize">
                  {userId || (role === "master" ? "Master Distributor" : "Distributor")}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}