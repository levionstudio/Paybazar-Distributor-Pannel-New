import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2, ArrowLeft, Wallet, User, Phone, CreditCard } from "lucide-react";
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
  master_distributor_id: string;
  name: string;
  phone: string;
  email: string;
  wallet_balance: number;
  is_blocked: boolean;
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

interface RetailerDetails {
  name: string;
  phone: string;
  userId: string;
  currentBalance: number;
}

const MdFundRetailer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedDistributorId, setSelectedDistributorId] = useState("");
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailerDetails, setRetailerDetails] = useState<RetailerDetails | null>(null);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isLoadingDistributors, setIsLoadingDistributors] = useState(false);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Decode token with corrected structure
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = "/login";
        return;
      }

      try {
        const decoded: DecodedToken = jwtDecode(token);

        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken");
          toast({
            title: "Session Expired",
            description: "Please log in again.",
            variant: "destructive",
          });
          window.location.href = "/login";
          return;
        }

        if (!decoded.user_id) {
          toast({
            title: "Invalid Token",
            description: "User ID missing.",
            variant: "destructive",
          });
          window.location.href = "/login";
          return;
        }

        // Verify user role is master distributor
        if (decoded.user_role !== "master_distributor") {
          toast({
            title: "Access Denied",
            description: "This page is only accessible to master distributors.",
            variant: "destructive",
          });
          window.location.href = "/login";
          return;
        }

        setTokenData(decoded);
      } catch {
        toast({
          title: "Invalid Token",
          description: "Please login again",
          variant: "destructive",
        });
        window.location.href = "/login";
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    if (!tokenData) return;

    const fetchBalance = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/md/${tokenData.user_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.status === "success") {
          setWalletBalance(Number(res.data.data.wallet_balance));
        }
      } catch {
        setWalletBalance(0);
      }
    };

    fetchBalance();
  }, [tokenData]);

  // Fetch distributors list
  useEffect(() => {
    if (!tokenData?.user_id) return;

    const fetchDistributors = async () => {
      setIsLoadingDistributors(true);
      const token = localStorage.getItem("authToken");

      try {
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${tokenData.user_id}`;

        console.log("Fetching distributors from:", endpoint);

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Distributors response:", data);

        if (response.ok && data.status === "success") {
          const distributorsList = data.data.distributors || [];
          setDistributors(distributorsList);

          if (distributorsList.length === 0) {
            toast({
              title: "No Distributors",
              description: "No distributors found under your account",
              variant: "default",
            });
          }
        } else {
          console.error("Failed to fetch distributors:", data);
          toast({
            title: "Error",
            description: data.message || "Failed to load distributors",
            variant: "destructive",
          });
          setDistributors([]);
        }
      } catch (error) {
        console.error("Error fetching distributors:", error);
        toast({
          title: "Error",
          description: "Failed to load distributors. Please try again.",
          variant: "destructive",
        });
        setDistributors([]);
      } finally {
        setIsLoadingDistributors(false);
      }
    };

    fetchDistributors();
  }, [tokenData]);

  // Fetch retailers when distributor is selected
  useEffect(() => {
    if (!selectedDistributorId) {
      setRetailers([]);
      return;
    }

    const fetchRetailers = async () => {
      setIsLoadingRetailers(true);
      const token = localStorage.getItem("authToken");

      try {
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${selectedDistributorId}`;

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
            toast({
              title: "No Retailers",
              description: "No retailers found under this distributor",
              variant: "default",
            });
          }
        } else {
          console.error("Failed to fetch retailers:", data);
          toast({
            title: "Error",
            description: data.message || "Failed to load retailers",
            variant: "destructive",
          });
          setRetailers([]);
        }
      } catch (error) {
        console.error("Error fetching retailers:", error);
        toast({
          title: "Error",
          description: "Failed to load retailers. Please try again.",
          variant: "destructive",
        });
        setRetailers([]);
      } finally {
        setIsLoadingRetailers(false);
      }
    };

    fetchRetailers();
  }, [selectedDistributorId]);

  const handleDistributorChange = (distributorId: string) => {
    setSelectedDistributorId(distributorId);
    setSelectedRetailerId("");
    setRetailerDetails(null);
    setAmount("");
    setRemarks("");
  };

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

        const details: RetailerDetails = {
          name: retailer.Name || "N/A",
          phone: retailer.Phone || "N/A",
          userId: retailer.RetailerID || "N/A",
          currentBalance: Number(retailer.WalletBalance) || 0,
        };

        setRetailerDetails(details);
      } else {
        console.error("Failed to fetch retailer details:", data);
        toast({
          title: "Error",
          description: data.message || "Failed to load retailer details",
          variant: "destructive",
        });
        setRetailerDetails(null);
      }
    } catch (error) {
      console.error("Error fetching retailer details:", error);
      toast({
        title: "Error",
        description: "Failed to load retailer details",
        variant: "destructive",
      });
      setRetailerDetails(null);
    }
  };

  const handleRetailerSelection = (retailerId: string) => {
    setSelectedRetailerId(retailerId);
    fetchRetailerDetails(retailerId);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!retailerDetails) {
      toast({
        title: "Error",
        description: "Please select a retailer",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount);

    // Check Master Distributor's wallet balance
    if (amountValue > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough balance in your wallet. Current balance: ₹${walletBalance.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        variant: "destructive",
      });
      return;
    }

    if (!tokenData) return;

    const token = localStorage.getItem("authToken");

    // Payload for fund transfer from master distributor to retailer
    const payload = {
      from_id: tokenData.user_id,        // Master Distributor's user_id
      to_id: selectedRetailerId,         // Retailer's retailer_id
      amount: amountValue,
      remarks: remarks.trim() || "Fund transfer from master distributor to retailer",
    };

    console.log("Fund Transfer Payload:", payload);
    console.log("Master Distributor Balance:", walletBalance);
    console.log("Transfer Amount:", amountValue);

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/fund_transfer/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast({
        title: "Fund Transfer Successful",
        description: data.message || "Funds transferred to retailer successfully.",
      });

      // Reset form
      setSelectedDistributorId("");
      setSelectedRetailerId("");
      setRetailerDetails(null);
      setAmount("");
      setRemarks("");
      setRetailers([]);

      // Refresh wallet balance
      try {
        const balanceRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/md/${tokenData.user_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (balanceRes.data.status === "success") {
          setWalletBalance(Number(balanceRes.data.data.balance));
        }
      } catch (balanceErr) {
        console.error("Failed to refresh balance:", balanceErr);
      }

      setTimeout(() => navigate("/master"), 800);
    } catch (err: any) {
      console.error("Fund Transfer Error:", err.response?.data || err);
      toast({
        title: "Transfer Failed",
        description:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    <DashboardLayout role="master" >
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
              <h1 className="text-2xl font-bold">Fund Retailer</h1>
              <p className="mt-1 text-sm text-white/80">
                Transfer funds to retailer's wallet
              </p>
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
                  <CardTitle className="text-xl font-semibold">
                    Add Funds to Retailer
                  </CardTitle>
                  <CardDescription className="mt-1 text-white/90">
                    Select distributor and retailer to transfer funds
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Balance Display */}
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-700 dark:text-green-300" />
                      <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                        Your Current Balance
                      </span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ₹{walletBalance.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                {/* Distributor Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="distributor"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Select Distributor
                    <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingDistributors ? (
                    <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Loading distributors...
                      </span>
                    </div>
                  ) : distributors.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No distributors found under your account
                    </div>
                  ) : (
                    <Select
                      value={selectedDistributorId}
                      onValueChange={handleDistributorChange}
                    >
                      <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
                        <SelectValue placeholder="-- Select Distributor --" />
                      </SelectTrigger>
                      <SelectContent>
                        {distributors.map((distributor) => (
                          <SelectItem
                            key={distributor.distributor_id}
                            value={distributor.distributor_id}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{distributor.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {distributor.phone} • Balance: ₹{distributor.wallet_balance.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Retailer Selection */}
                {selectedDistributorId && (
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
                        No retailers found under this distributor
                      </div>
                    ) : (
                      <Select
                        value={selectedRetailerId}
                        onValueChange={handleRetailerSelection}
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
                                  <span className="font-medium">{retailer.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {retailer.phone} • Balance: ₹{retailer.wallet_balance.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Retailer Details Display */}
                {retailerDetails && (
                  <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-blue-900 dark:text-blue-100">
                      <Wallet className="h-5 w-5" />
                      Retailer Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <User className="h-3 w-3" />
                          Name
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {retailerDetails.name}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <Phone className="h-3 w-3" />
                          Phone
                        </div>
                        <p className="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {retailerDetails.phone}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <CreditCard className="h-3 w-3" />
                          User ID
                        </div>
                        <p className="mt-1 break-all text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                          {retailerDetails.userId}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <Wallet className="h-3 w-3" />
                          Current Balance
                        </div>
                        <p className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">
                          ₹{retailerDetails.currentBalance.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <Wallet className="h-4 w-4" />
                    Amount
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="decimal"
                    placeholder="Enter amount to transfer"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, "");
                      if (value.split(".").length <= 2) {
                        setAmount(value);
                      }
                    }}
                    disabled={!retailerDetails}
                    required
                    min="1"
                    step="0.01"
                    className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                    style={{ fontSize: "16px" }}
                  />
                  {amount && parseFloat(amount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {parseFloat(amount) > walletBalance ? (
                        <span className="text-destructive font-semibold">
                          ⚠️ Insufficient balance in your wallet! You need ₹
                          {(parseFloat(amount) - walletBalance).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          more.
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Your balance after transfer: ₹
                          {(walletBalance - parseFloat(amount)).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="flex items-center gap-1 text-sm font-semibold text-foreground"
                  >
                    Remarks
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[100px] resize-none border-2 border-border bg-background transition-colors focus:border-primary"
                    placeholder="Enter any additional notes or remarks (leave empty for default message)"
                    disabled={!retailerDetails}
                  />
                  <p className="text-xs text-muted-foreground">
                    If left empty, default message will be: "Fund transfer from master distributor to retailer"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 border-2 hover:bg-muted"
                    disabled={loading}
                    onClick={() => navigate("/master")}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                    disabled={loading || !retailerDetails || !amount || parseFloat(amount) > walletBalance}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Add Funds
                      </>
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

export default MdFundRetailer;