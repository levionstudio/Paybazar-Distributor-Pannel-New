import { useState, useEffect } from "react";
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
import { Loader2, RotateCcw, ArrowLeft, User, Wallet, Phone, CreditCard } from "lucide-react";
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
  distributor_id: string;
  name: string;
  phone: string;
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
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [distributorId, setDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Decode token and get distributor ID
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log("Decoded Token:", decoded);
      
      // ✅ Token expiry check
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // ✅ Get user_id from token (this is the Distributor ID)
      const distributorId = decoded?.user_id;
      console.log("Distributor ID:", distributorId);
      
      if (!distributorId) {
        console.error("Distributor ID not found in token");
        setLoading(false);
        return;
      }

      setDistributorId(distributorId);
    } catch (err) {
      console.error("Token decode error", err);
      toast.error("Invalid session. Please login again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch retailers list when distributorId is available
  useEffect(() => {
    if (!distributorId) return;

    const fetchRetailers = async () => {
      setIsLoadingRetailers(true);
      const token = localStorage.getItem("authToken");
      
      try {
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}`;
        
        console.log("Fetching retailers from:", endpoint);
        
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Retailers response:", data);

        if (response.ok && data.status === "success") {
          const retailersList = data.data.retailers || [];
          setRetailers(retailersList);
          
          if (retailersList.length === 0) {
            toast.info("No retailers found under your account");
          } else {
            toast.success(`Loaded ${retailersList.length} retailer(s)`);
          }
        } else {
          console.error("Failed to fetch retailers:", data);
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
      
      console.log("Fetching retailer details from:", endpoint);
      
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Retailer details response:", data);

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
        console.error("Failed to fetch retailer details:", data);
        toast.error(data.message || "Failed to load retailer details");
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching retailer details:", error);
      toast.error("Failed to load retailer details");
      setUserDetails(null);
    }
  };

  // Handle retailer selection
  const handleRetailerChange = (retailerId: string) => {
    setSelectedRetailerId(retailerId);
    fetchRetailerDetails(retailerId);
  };

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
    if (revertAmount > retailers.wallet_balance) {
      console.error("Insufficient balance:", {
        requested: revertAmount,
        available: userDetails.currentBalance,
      });
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

      console.log("Sending revert request:", payload);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Revert response:", data);

      if (response.ok && (data.status === "success" || data.success)) {
        toast.success(data.message || data.msg || "Revert processed successfully");
        
        // Reset form
        setAmount("");
        setRemarks("");
        setUserDetails(null);
        setSelectedRetailerId("");
        
        // Refresh retailers list to get updated balances
        window.location.reload();
      } else {
        console.error("Revert failed:", data);
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
    setAmount("");
    setRemarks("");
    setUserDetails(null);
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
                {/* Retailer Selection Dropdown */}
                <div className="space-y-2">
                  <Label
                    htmlFor="retailer"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Select Retailer
                    <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingRetailers ? (
                    <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Loading retailers...
                      </span>
                    </div>
                  ) : retailers.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No retailers found under your account
                    </div>
                  ) : (
                    <Select
                      value={selectedRetailerId}
                      onValueChange={handleRetailerChange}
                    >
                      <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
                        <SelectValue placeholder="-- Select Retailer --" />
                      </SelectTrigger>
                      <SelectContent>
                        {retailers.map((retailer) => (
                          <SelectItem
                            key={retailer.retailer_id}
                            value={retailer.retailer_id}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{retailer.retailer_name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {retailer.retailer_phone} • Balance: ₹{formatAmount(retailer.wallet_balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3">
                      Revert Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700 dark:text-red-300">Amount to Revert:</span>
                        <span className="text-lg font-bold text-red-900 dark:text-red-100">
                          ₹{formatAmount(parseFloat(amount))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-red-200 dark:border-red-800">
                        <span className="text-sm text-red-700 dark:text-red-300">New Balance (After Revert):</span>
                        <span className="text-base font-semibold text-red-900 dark:text-red-100">
                          ₹{formatAmount(userDetails.currentBalance - parseFloat(amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
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
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Important Notes:
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Select a retailer from the dropdown to view their details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Revert amount cannot exceed the retailer's current wallet balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>All revert transactions are logged and can be tracked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
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