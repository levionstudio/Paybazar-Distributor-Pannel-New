import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, RotateCcw, ArrowLeft, User, Phone,
  CreditCard, Wallet, ChevronDown, Search, X,
} from "lucide-react";
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

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_phone: string;
  master_distributor_id: string;
  wallet_balance: number;
}

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_phone: string;
  distributor_id: string;
  wallet_balance: number;
}

interface UserDetails {
  name: string;
  phone: string;
  userId: string;
  currentBalance: number;
}

export default function MdRevertRequest() {
  const navigate = useNavigate();

  // Core state
  const [userType, setUserType] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserLabel, setSelectedUserLabel] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [masterDistributorId, setMasterDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Searchable dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        setLoading(false);
        return;
      }
      const mdId = decoded?.user_id;
      if (!mdId) { setLoading(false); return; }
      setMasterDistributorId(mdId);
    } catch (err) {
      toast.error("Invalid session. Please login again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch distributors or retailers when user type is selected
  // ✅ Fixed: changed ?limit=1000&page=1 → ?limit=1000&offset=0
  useEffect(() => {
    if (!userType || !masterDistributorId) {
      setDistributors([]);
      setRetailers([]);
      return;
    }

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      const token = localStorage.getItem("authToken");

      try {
        let endpoint = "";
        if (userType === "distributor") {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${masterDistributorId}?limit=1000&offset=0`;
        } else if (userType === "retailer") {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/md/${masterDistributorId}?limit=1000&offset=0`;
        }

        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
          if (userType === "distributor") {
            const list: Distributor[] = data.data.distributors || [];
            setDistributors(list);
            list.length === 0
              ? toast.info("No distributors found under your account")
              : toast.success(`Loaded ${list.length} distributor(s)`);
          } else if (userType === "retailer") {
            const list: Retailer[] = data.data.retailers || [];
            setRetailers(list);
            list.length === 0
              ? toast.info("No retailers found under your account")
              : toast.success(`Loaded ${list.length} retailer(s)`);
          }
        } else {
          toast.error(data.message || "Failed to load users");
          setDistributors([]);
          setRetailers([]);
        }
      } catch (error) {
        toast.error("Failed to load users. Please try again.");
        setDistributors([]);
        setRetailers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [userType, masterDistributorId]);

  // Fetch individual user details
  const fetchUserDetails = async (userId: string, type: string) => {
    if (!userId) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const endpoint = type === "distributor"
        ? `${import.meta.env.VITE_API_BASE_URL}/distributor/get/distributor/${userId}`
        : `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${userId}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        if (type === "distributor") {
          const user = data.data.distributor;
          setUserDetails({
            name: user.distributor_name || "N/A",
            phone: user.distributor_phone || "N/A",
            userId: user.distributor_id || "N/A",
            currentBalance: Number(user.wallet_balance) || 0,
          });
        } else {
          const user = data.data.retailer;
          setUserDetails({
            name: user.retailer_name || "N/A",
            phone: user.retailer_phone || "N/A",
            userId: user.retailer_id || "N/A",
            currentBalance: Number(user.wallet_balance) || 0,
          });
        }
      } else {
        toast.error(data.message || "Failed to load user details");
        setUserDetails(null);
      }
    } catch {
      toast.error("Failed to load user details");
      setUserDetails(null);
    }
  };

  // Handle user type change — reset everything
  const handleUserTypeChange = (value: string) => {
    setUserType(value);
    setSelectedUserId("");
    setSelectedUserLabel("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setDistributors([]);
    setRetailers([]);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  // Handle selection from searchable dropdown
  const handleUserSelect = (id: string, label: string) => {
    setSelectedUserId(id);
    setSelectedUserLabel(label);
    setDropdownOpen(false);
    setSearchQuery("");
    fetchUserDetails(id, userType);
  };

  // Clear selection
  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserId("");
    setSelectedUserLabel("");
    setUserDetails(null);
    setAmount("");
    setRemarks("");
  };

  // Filtered list based on search
  const currentList = userType === "distributor" ? distributors : retailers;
  const filteredList = currentList.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    const name = item.distributor_name || item.retailer_name || "";
    const phone = item.distributor_phone || item.retailer_phone || "";
    return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
  });

  const handleRevert = async () => {
    if (!userDetails) { toast.error("Please select a user first"); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Please enter a valid amount"); return; }

    const revertAmount = parseFloat(amount);
    if (revertAmount > userDetails.currentBalance) {
      toast.error(`Insufficient balance. Current balance: ₹${userDetails.currentBalance.toFixed(2)}`);
      return;
    }
    if (!masterDistributorId) { toast.error("Authentication error. Please login again."); return; }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      const payload = {
        from_id: masterDistributorId,
        on_id: selectedUserId,
        amount: revertAmount,
        remarks: remarks.trim() || `Revert request processed by master distributor for ${userType}`,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/revert/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.status === "success" || data.success)) {
        toast.success(data.message || data.msg || "Revert processed successfully");
        setAmount(""); setRemarks(""); setUserDetails(null);
        setSelectedUserId(""); setSelectedUserLabel(""); setUserType("");
        window.location.reload();
      } else {
        toast.error(data.message || data.msg || "Failed to process revert");
      }
    } catch {
      toast.error("Failed to process revert. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUserType(""); setSelectedUserId(""); setSelectedUserLabel("");
    setAmount(""); setRemarks(""); setUserDetails(null);
    setDistributors([]); setRetailers([]);
    setSearchQuery(""); setDropdownOpen(false);
    toast.info("Form reset");
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
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
              <h1 className="text-2xl font-bold">Revert Request</h1>
              <p className="mt-1 text-sm text-white/80">Process revert requests for Distributors and Retailers</p>
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
                    <CardTitle className="text-xl font-semibold">Process Revert</CardTitle>
                    <CardDescription className="mt-1 text-white/90">Select user type and process fund revert</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-white hover:bg-white/20">
                  <RotateCcw className="mr-2 h-4 w-4" />Reset
                </Button>
              </div>
            </CardHeader>

            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-8">
              <div className="space-y-6">

                {/* ── User Type Selection (plain select — only 2 options) ── */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4" />
                    Select User Type
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select value={userType} onValueChange={handleUserTypeChange}>
                    <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
                      <SelectValue placeholder="-- Select User Type --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distributor">
                        <div className="flex items-center gap-2"><User className="h-4 w-4" />Distributor</div>
                      </SelectItem>
                      <SelectItem value="retailer">
                        <div className="flex items-center gap-2"><User className="h-4 w-4" />Retailer</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Searchable Distributor / Retailer Dropdown ── */}
                {userType && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <User className="h-4 w-4" />
                      Select {userType === "distributor" ? "Distributor" : "Retailer"}
                      <span className="text-destructive">*</span>
                    </Label>

                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading {userType}s...</span>
                      </div>
                    ) : currentList.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                        No {userType}s found under your account
                      </div>
                    ) : (
                      <div className="relative" ref={dropdownRef}>
                        {/* Trigger */}
                        <button
                          type="button"
                          onClick={() => setDropdownOpen((prev) => !prev)}
                          className="flex h-12 w-full items-center justify-between rounded-md border-2 border-border bg-background px-3 text-sm transition-colors hover:border-primary focus:border-primary focus:outline-none"
                        >
                          <span className={selectedUserLabel ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {selectedUserLabel || `-- Select ${userType === "distributor" ? "Distributor" : "Retailer"} --`}
                          </span>
                          <div className="flex items-center gap-1">
                            {selectedUserId && (
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
                              {filteredList.length === 0 ? (
                                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                  No {userType}s match your search
                                </li>
                              ) : (
                                filteredList.map((item: any) => {
                                  const id = item.distributor_id || item.retailer_id;
                                  const name = item.distributor_name || item.retailer_name;
                                  const phone = item.distributor_phone || item.retailer_phone;
                                  const balance = item.wallet_balance;
                                  return (
                                    <li
                                      key={id}
                                      onClick={() => handleUserSelect(id, name)}
                                      className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-muted ${
                                        selectedUserId === id ? "bg-primary/10" : ""
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">{name}</span>
                                      </div>
                                      <span className="pl-5 text-xs text-muted-foreground">
                                        {phone} • Balance: ₹{formatAmount(balance)}
                                      </span>
                                    </li>
                                  );
                                })
                              )}
                            </ul>

                            {/* Footer count */}
                            <div className="border-t border-border bg-muted/10 px-3 py-1.5 text-xs text-muted-foreground">
                              Showing {filteredList.length} of {currentList.length} {userType}(s)
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* User Details Display */}
                {userDetails && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-100">
                      <Wallet className="h-5 w-5" />
                      {userType === "distributor" ? "Distributor" : "Retailer"} Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <User className="h-3 w-3" />Name
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-red-900 dark:text-red-100">{userDetails.name}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <Phone className="h-3 w-3" />Phone
                        </div>
                        <p className="mt-1 text-sm font-semibold text-red-900 dark:text-red-100">{userDetails.phone}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <CreditCard className="h-3 w-3" />User ID
                        </div>
                        <p className="mt-1 break-all text-sm font-mono font-semibold text-red-900 dark:text-red-100">{userDetails.userId}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <Wallet className="h-3 w-3" />Current Balance
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
                  <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wallet className="h-4 w-4" />Revert Amount<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, "");
                      if (value.split(".").length <= 2) setAmount(value);
                    }}
                    placeholder="Enter amount to revert"
                    disabled={!userDetails}
                    className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                    style={{ fontSize: "16px" }}
                  />
                  {userDetails && (
                    <p className="text-xs text-muted-foreground">
                      Maximum revertable amount: ₹{formatAmount(userDetails.currentBalance)}
                    </p>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="flex items-center gap-2 text-sm font-semibold text-foreground">
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
                    <h3 className="mb-3 text-sm font-semibold text-red-900 dark:text-red-100">Revert Summary</h3>
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
                    onClick={() => navigate("/master")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRevert}
                    disabled={isProcessing || !userDetails || !amount || parseFloat(amount) <= 0}
                    className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                  >
                    {isProcessing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><RotateCcw className="mr-2 h-4 w-4" />Process Revert</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Note */}
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Important Notes:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><span className="mt-1 text-primary">•</span><span>Select user type first, then choose a specific distributor or retailer</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 text-primary">•</span><span>Revert amount cannot exceed the user's current wallet balance</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 text-primary">•</span><span>All revert transactions are logged and can be tracked</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 text-primary">•</span><span>Remarks are optional but recommended for record-keeping</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}