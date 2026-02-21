import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RotateCcw, ArrowLeft, User, Wallet, Phone, CreditCard, ChevronDown, Search, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_phone: string;
  distributor_id: string;
  email: string;
  wallet_balance: number;
  is_blocked: boolean;
}

interface UserDetails {
  name: string;
  phone: string;
  userId: string;
  currentBalance: number;
}

export default function DistributorRevertRequest() {
  const navigate = useNavigate();
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [selectedRetailerLabel, setSelectedRetailerLabel] = useState("");
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [distributorId, setDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  // Decode token and get distributor ID
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      const distId = decoded?.user_id;
      if (!distId) {
        console.error("Distributor ID not found in token");
        setLoading(false);
        return;
      }

      setDistributorId(distId);
    } catch (err) {
      console.error("Token decode error", err);
      toast.error("Invalid session. Please login again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all retailers with offset/limit
  useEffect(() => {
    if (!distributorId) return;

    const fetchRetailers = async () => {
      setIsLoadingRetailers(true);
      const token = localStorage.getItem("authToken");

      try {
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}?limit=100&offset=0`;

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
          const retailersList: Retailer[] = data.data.retailers || [];
          setRetailers(retailersList);

          if (retailersList.length === 0) {
            toast.info("No retailers found under your account");
          } else {
            toast.success(`Loaded ${retailersList.length} retailer(s)`);
          }
        } else {
          toast.error(data.message || "Failed to load retailers");
          setRetailers([]);
        }
      } catch (error) {
        console.error("Error fetching retailers:", error);
        toast.error("Failed to load retailers. Please try again.");
        setRetailers([]);
      } finally {
        setIsLoadingRetailers(false);
      }
    };

    fetchRetailers();
  }, [distributorId]);

  // Fetch individual retailer details
  const fetchRetailerDetails = async (retailerId: string) => {
    if (!retailerId) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${retailerId}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        const retailer = data.data.retailer;

        const details: UserDetails = {
          name: retailer.retailer_name || "N/A",
          phone: retailer.retailer_phone || "N/A",
          userId: retailer.retailer_id || "N/A",
          currentBalance: Number(retailer.wallet_balance) || 0,
        };

        setUserDetails(details);
        toast.success(`Selected: ${details.name}`);
      } else {
        toast.error(data.message || "Failed to load retailer details");
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching retailer details:", error);
      toast.error("Failed to load retailer details");
      setUserDetails(null);
    }
  };

  // Handle retailer selection from custom dropdown
  const handleRetailerSelect = (retailer: Retailer) => {
    setSelectedRetailerId(retailer.retailer_id);
    setSelectedRetailerLabel(retailer.retailer_name);
    setDropdownOpen(false);
    setSearchQuery("");
    fetchRetailerDetails(retailer.retailer_id);
  };

  // Clear selection
  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRetailerId("");
    setSelectedRetailerLabel("");
    setUserDetails(null);
    setAmount("");
    setRemarks("");
  };

  // Filtered retailers based on search query (name or phone)
  const filteredRetailers = retailers.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.retailer_name?.toLowerCase().includes(q) ||
      r.retailer_phone?.toLowerCase().includes(q)
    );
  });

  const handleRevert = async () => {
    if (!userDetails) {
      toast.error("Please select a retailer first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const revertAmount = parseFloat(amount);

    if (revertAmount > userDetails.currentBalance) {
      toast.error(
        `Insufficient balance of Retailer for revert. Current balance: ₹${userDetails.currentBalance.toFixed(2)}`
      );
      return;
    }

    if (!distributorId) {
      toast.error("Authentication error. Please login again.");
      return;
    }

    setIsProcessing(true);
    try {
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/revert/create`;
      const token = localStorage.getItem("authToken");

      const payload = {
        from_id: distributorId,
        on_id: selectedRetailerId,
        amount: revertAmount,
        remarks: remarks.trim() || "Revert request processed by distributor",
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.status === "success" || data.success)) {
        toast.success(data.message || data.msg || "Revert processed successfully");
        setAmount("");
        setRemarks("");
        setUserDetails(null);
        setSelectedRetailerId("");
        setSelectedRetailerLabel("");
        window.location.reload();
      } else {
        toast.error(data.message || data.msg || "Failed to process revert");
      }
    } catch (error) {
      console.error("Error processing revert:", error);
      toast.error("Failed to process revert. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedRetailerId("");
    setSelectedRetailerLabel("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setSearchQuery("");
    toast.info("Form reset");
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="distributor">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="distributor">
      <div className="min-h-screen bg-muted/10">
        {/* Header */}
        <div className="paybazaar-gradient border-b border-border/40 p-4 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Revert Request</h1>
              <p className="mt-1 text-sm text-white/80">
                Process revert requests for retailers
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full bg-white/30"></div>
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      Process Revert
                    </CardTitle>
                    <CardDescription className="mt-1 text-white/90">
                      Select retailer and enter revert amount
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardHeader>

            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-8">
              <div className="space-y-6">

                {/* ── Retailer Searchable Dropdown ── */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4" />
                    Select Retailer
                    <span className="text-destructive">*</span>
                  </Label>

                  {isLoadingRetailers ? (
                    <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading retailers...</span>
                    </div>
                  ) : retailers.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No retailers found under your account
                    </div>
                  ) : (
                    <div className="relative" ref={dropdownRef}>

                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        className="flex h-12 w-full items-center justify-between rounded-md border-2 border-border bg-background px-3 text-sm transition-colors hover:border-primary focus:border-primary focus:outline-none"
                      >
                        <span className={selectedRetailerLabel ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {selectedRetailerLabel || "-- Select Retailer --"}
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedRetailerId && (
                            <span
                              onClick={handleClearSelection}
                              className="cursor-pointer rounded p-0.5 hover:bg-muted"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              dropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Dropdown Panel */}
                      {dropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">

                          {/* Search Input */}
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
                              <button
                                onClick={() => setSearchQuery("")}
                                className="shrink-0"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            )}
                          </div>

                          {/* Retailer List */}
                          <ul className="max-h-60 overflow-y-auto py-1">
                            {filteredRetailers.length === 0 ? (
                              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No retailers match your search
                              </li>
                            ) : (
                              filteredRetailers.map((retailer) => (
                                <li
                                  key={retailer.retailer_id}
                                  onClick={() => handleRetailerSelect(retailer)}
                                  className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-muted ${
                                    selectedRetailerId === retailer.retailer_id
                                      ? "bg-primary/10"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">
                                      {retailer.retailer_name}
                                    </span>
                                  </div>
                                  <span className="pl-5 text-xs text-muted-foreground">
                                    {retailer.retailer_phone} • Balance: ₹{formatAmount(retailer.wallet_balance)}
                                  </span>
                                </li>
                              ))
                            )}
                          </ul>

                          {/* Footer Count */}
                          <div className="border-t border-border bg-muted/10 px-3 py-1.5 text-xs text-muted-foreground">
                            Showing {filteredRetailers.length} of {retailers.length} retailer(s)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Details Display */}
                {userDetails && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-100">
                      <Wallet className="h-5 w-5" />
                      Retailer Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <User className="h-3 w-3" />
                          Name
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-red-900 dark:text-red-100">
                          {userDetails.name}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <Phone className="h-3 w-3" />
                          Phone
                        </div>
                        <p className="mt-1 text-sm font-semibold text-red-900 dark:text-red-100">
                          {userDetails.phone}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <CreditCard className="h-3 w-3" />
                          Retailer ID
                        </div>
                        <p className="mt-1 break-all text-sm font-mono font-semibold text-red-900 dark:text-red-100">
                          {userDetails.userId}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <Wallet className="h-3 w-3" />
                          Current Balance
                        </div>
                        <p className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">
                          ₹{formatAmount(userDetails.currentBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revert Amount */}
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <Wallet className="h-4 w-4" />
                    Revert Amount
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, "");
                      if (value.split(".").length <= 2) {
                        setAmount(value);
                      }
                    }}
                    placeholder="Enter amount to revert"
                    className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                    style={{ fontSize: "16px" }}
                    disabled={!userDetails}
                  />
                  {userDetails && (
                    <p className="text-xs text-muted-foreground">
                      Maximum revertable amount: ₹{formatAmount(userDetails.currentBalance)}
                    </p>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    Remarks <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="remarks"
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks (optional)"
                    className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                    style={{ fontSize: "16px" }}
                    disabled={!userDetails}
                  />
                </div>

                {/* Summary Box */}
                {amount && parseFloat(amount) > 0 && userDetails && (
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                    <h3 className="mb-3 text-sm font-semibold text-red-900 dark:text-red-100">
                      Revert Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700 dark:text-red-300">Amount to Revert:</span>
                        <span className="text-lg font-bold text-red-900 dark:text-red-100">
                          ₹{formatAmount(parseFloat(amount))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-red-200 pt-2 dark:border-red-800">
                        <span className="text-sm text-red-700 dark:text-red-300">New Balance (After Revert):</span>
                        <span className="text-base font-semibold text-red-900 dark:text-red-100">
                          ₹{formatAmount(userDetails.currentBalance - parseFloat(amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 border-2 hover:bg-muted"
                    disabled={isProcessing}
                    onClick={() => navigate("/distributor")}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleRevert}
                    disabled={
                      isProcessing ||
                      !userDetails ||
                      !amount ||
                      parseFloat(amount) <= 0
                    }
                    className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Process Revert
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Note */}
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Important Notes:
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">•</span>
                  <span>Select a retailer from the dropdown to view their details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">•</span>
                  <span>Revert amount cannot exceed the retailer's current wallet balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">•</span>
                  <span>All revert transactions are logged and can be tracked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">•</span>
                  <span>Remarks are optional but recommended for record-keeping</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}