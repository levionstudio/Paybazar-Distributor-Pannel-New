import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Loader2, ArrowLeft, Wallet, User, Phone, CreditCard,
  ChevronDown, Search, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

// ✅ Fixed: field names match actual API response
interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_phone: string;
  distributor_email: string;
  master_distributor_id: string;
  wallet_balance: number;
  is_blocked: boolean;
}

interface DistributorDetails {
  name: string;
  phone: string;
  userId: string;
  currentBalance: number;
}

const MdFundDistributor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedDistributorId, setSelectedDistributorId] = useState("");
  const [selectedDistributorLabel, setSelectedDistributorLabel] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [distributorDetails, setDistributorDetails] = useState<DistributorDetails | null>(null);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isLoadingDistributors, setIsLoadingDistributors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Searchable dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus search
  useEffect(() => {
    if (dropdownOpen && searchRef.current)
      setTimeout(() => searchRef.current?.focus(), 50);
  }, [dropdownOpen]);

  // ── Auth check ────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({ title: "Authentication Required", description: "Please login to continue.", variant: "destructive" });
        window.location.href = "/login";
        return;
      }
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken");
          toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
          window.location.href = "/login";
          return;
        }
        if (!decoded.user_id) {
          toast({ title: "Invalid Token", description: "User ID missing.", variant: "destructive" });
          window.location.href = "/login";
          return;
        }
        if (decoded.user_role !== "master_distributor") {
          toast({ title: "Access Denied", description: "This page is only accessible to master distributors.", variant: "destructive" });
          window.location.href = "/login";
          return;
        }
        setTokenData(decoded);
      } catch {
        toast({ title: "Invalid Token", description: "Please login again", variant: "destructive" });
        window.location.href = "/login";
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // ── Fetch wallet balance ───────────────────────────────────
  useEffect(() => {
    if (!tokenData) return;
    const fetchBalance = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/md/${tokenData.user_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status === "success")
          setWalletBalance(Number(res.data.data.wallet_balance ?? res.data.data.balance ?? 0));
      } catch { setWalletBalance(0); }
    };
    fetchBalance();
  }, [tokenData]);

  // ── Fetch distributors with limit/offset ──────────────────
  // ✅ Fixed: added ?limit=1000&offset=0
  useEffect(() => {
    if (!tokenData?.user_id) return;
    const fetchDistributors = async () => {
      setIsLoadingDistributors(true);
      const token = localStorage.getItem("authToken");
      try {
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${tokenData.user_id}?limit=1000&offset=0`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.status === "success") {
          const list: Distributor[] = data.data.distributors || [];
          setDistributors(list);
          if (list.length === 0)
            toast({ title: "No Distributors", description: "No distributors found under your account", variant: "default" });
        } else {
          toast({ title: "Error", description: data.message || "Failed to load distributors", variant: "destructive" });
          setDistributors([]);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load distributors. Please try again.", variant: "destructive" });
        setDistributors([]);
      } finally { setIsLoadingDistributors(false); }
    };
    fetchDistributors();
  }, [tokenData]);

  // ── Fetch individual distributor details ──────────────────
  const fetchDistributorDetails = async (distributorId: string) => {
    if (!distributorId) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/distributor/get/distributor/${distributorId}`,
        { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok && data.status === "success") {
        const d = data.data.distributor;
        setDistributorDetails({
          name: d.distributor_name || "N/A",
          phone: d.distributor_phone || "N/A",
          userId: d.distributor_id || "N/A",
          currentBalance: Number(d.wallet_balance) || 0,
        });
      } else {
        toast({ title: "Error", description: data.message || "Failed to load distributor details", variant: "destructive" });
        setDistributorDetails(null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load distributor details", variant: "destructive" });
      setDistributorDetails(null);
    }
  };

  // ── Dropdown handlers ─────────────────────────────────────
  const handleDistributorSelect = (distributor: Distributor) => {
    setSelectedDistributorId(distributor.distributor_id);
    setSelectedDistributorLabel(distributor.distributor_name);
    setDropdownOpen(false);
    setSearchQuery("");
    setAmount("");
    setRemarks("");
    fetchDistributorDetails(distributor.distributor_id);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDistributorId("");
    setSelectedDistributorLabel("");
    setDistributorDetails(null);
    setAmount("");
    setRemarks("");
  };

  // ── Filtered list ─────────────────────────────────────────
  const filteredDistributors = distributors.filter((d) => {
    const q = searchQuery.toLowerCase();
    return d.distributor_name?.toLowerCase().includes(q) || d.distributor_phone?.toLowerCase().includes(q);
  });

  const formatAmount = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributorDetails) {
      toast({ title: "Error", description: "Please select a distributor", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    const amountValue = parseFloat(amount);
    if (amountValue > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough balance. Current balance: ₹${formatAmount(walletBalance)}`,
        variant: "destructive",
      });
      return;
    }
    if (!tokenData) return;

    const token = localStorage.getItem("authToken");
    const payload = {
      from_id: tokenData.user_id,
      to_id: selectedDistributorId,
      amount: amountValue,
      remarks: remarks.trim() || "Fund transfer from master distributor to distributor",
    };

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/fund_transfer/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      toast({ title: "Fund Transfer Successful", description: data.message || "Funds transferred to distributor successfully." });

      // Reset form
      setSelectedDistributorId(""); setSelectedDistributorLabel("");
      setDistributorDetails(null); setAmount(""); setRemarks("");

      // Refresh balance
      try {
        const balanceRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/md/${tokenData.user_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (balanceRes.data.status === "success")
          setWalletBalance(Number(balanceRes.data.data.wallet_balance ?? balanceRes.data.data.balance ?? 0));
      } catch { /* silent */ }

      setTimeout(() => navigate("/master"), 800);
    } catch (err: any) {
      toast({
        title: "Transfer Failed",
        description: err.response?.data?.message || err.response?.data?.error || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally { setLoading(false); }
  };

  if (isCheckingAuth) {
    return (
      <DashboardLayout role="master">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="master">
      <div className="min-h-screen bg-muted/10">
        {/* Header */}
        <div className="paybazaar-gradient border-b border-border/40 p-4 text-white">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Fund Distributor</h1>
              <p className="mt-1 text-sm text-white/80">Transfer funds to distributor's wallet</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-3xl p-6">
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 rounded-full bg-white/30"></div>
                <div>
                  <CardTitle className="text-xl font-semibold">Add Funds to Distributor</CardTitle>
                  <CardDescription className="mt-1 text-white/90">Select distributor to transfer funds</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Wallet Balance */}
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-700 dark:text-green-300" />
                      <span className="text-sm font-semibold text-green-700 dark:text-green-300">Your Current Balance</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">₹{formatAmount(walletBalance)}</p>
                  </div>
                </div>

                {/* ── Searchable Distributor Dropdown ── */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4" />Select Distributor<span className="text-destructive">*</span>
                  </Label>

                  {isLoadingDistributors ? (
                    <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading distributors...</span>
                    </div>
                  ) : distributors.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No distributors found under your account
                    </div>
                  ) : (
                    <div className="relative" ref={dropdownRef}>
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setDropdownOpen((p) => !p)}
                        className="flex h-12 w-full items-center justify-between rounded-md border-2 border-border bg-background px-3 text-sm transition-colors hover:border-primary focus:border-primary focus:outline-none"
                      >
                        <span className={selectedDistributorLabel ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {selectedDistributorLabel || "-- Select Distributor --"}
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedDistributorId && (
                            <span onClick={handleClearSelection} className="cursor-pointer rounded p-0.5 hover:bg-muted">
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Dropdown Panel */}
                      {dropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">
                          {/* Search */}
                          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
                            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                              ref={searchRef}
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search by name or phone..."
                              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            {searchQuery && (
                              <button type="button" onClick={() => setSearchQuery("")} className="shrink-0">
                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            )}
                          </div>

                          {/* List */}
                          <ul className="max-h-60 overflow-y-auto py-1">
                            {filteredDistributors.length === 0 ? (
                              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No distributors match your search
                              </li>
                            ) : (
                              filteredDistributors.map((d) => (
                                <li
                                  key={d.distributor_id}
                                  onClick={() => handleDistributorSelect(d)}
                                  className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-muted ${
                                    selectedDistributorId === d.distributor_id ? "bg-primary/10" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">{d.distributor_name}</span>
                                  </div>
                                  <span className="pl-5 text-xs text-muted-foreground">
                                    {d.distributor_phone} • Balance: ₹{formatAmount(d.wallet_balance)}
                                  </span>
                                </li>
                              ))
                            )}
                          </ul>

                          {/* Footer */}
                          <div className="border-t border-border bg-muted/10 px-3 py-1.5 text-xs text-muted-foreground">
                            Showing {filteredDistributors.length} of {distributors.length} distributor(s)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Distributor Details */}
                {distributorDetails && (
                  <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/20">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-green-900 dark:text-green-100">
                      <Wallet className="h-5 w-5" />Distributor Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300"><User className="h-3 w-3" />Name</div>
                        <p className="mt-1 break-words text-sm font-semibold text-green-900 dark:text-green-100">{distributorDetails.name}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300"><Phone className="h-3 w-3" />Phone</div>
                        <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-100">{distributorDetails.phone}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300"><CreditCard className="h-3 w-3" />User ID</div>
                        <p className="mt-1 break-all text-sm font-mono font-semibold text-green-900 dark:text-green-100">{distributorDetails.userId}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300"><Wallet className="h-3 w-3" />Current Balance</div>
                        <p className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">₹{formatAmount(distributorDetails.currentBalance)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wallet className="h-4 w-4" />Amount<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="decimal"
                    placeholder="Enter amount to transfer"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, "");
                      if (value.split(".").length <= 2) setAmount(value);
                    }}
                    disabled={!distributorDetails}
                    required
                    className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                    style={{ fontSize: "16px" }}
                  />
                  {amount && parseFloat(amount) > 0 && (
                    <p className="text-xs">
                      {parseFloat(amount) > walletBalance ? (
                        <span className="font-semibold text-destructive">
                          ⚠️ Insufficient balance! You need ₹{formatAmount(parseFloat(amount) - walletBalance)} more.
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Your balance after transfer: ₹{formatAmount(walletBalance - parseFloat(amount))}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    Remarks <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[100px] resize-none border-2 border-border bg-background transition-colors focus:border-primary"
                    placeholder="Enter any additional notes or remarks (leave empty for default message)"
                    disabled={!distributorDetails}
                  />
                  <p className="text-xs text-muted-foreground">
                    If left empty, default message will be: "Fund transfer from master distributor to distributor"
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button type="button" variant="outline" className="h-12 flex-1 border-2 hover:bg-muted" disabled={loading} onClick={() => navigate("/master")}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                    disabled={loading || !distributorDetails || !amount || parseFloat(amount) > walletBalance}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><Wallet className="mr-2 h-4 w-4" />Add Funds</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MdFundDistributor;