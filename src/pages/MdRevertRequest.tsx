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
import { Loader2, RotateCcw, ArrowLeft, User, Phone, CreditCard, Wallet } from "lucide-react";
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
  master_distributor_id: string;
  name: string;
  phone: string;
  wallet_balance: number;
}

interface Retailer {
  retailer_id: string;
  distributor_id: string;
  name: string;
  phone: string;
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
  const [userType, setUserType] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [masterDistributorId, setMasterDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Decode token and get master distributor ID
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log("Decoded Token:", decoded);
      
      // Token expiry check
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // ✅ Get user_id from token (this is the Master Distributor ID)
      const mdId = decoded?.user_id;
      console.log("Master Distributor ID:", mdId);
      
      if (!mdId) {
        console.error("Master Distributor ID not found in token");
        setLoading(false);
        return;
      }

      setMasterDistributorId(mdId);
    } catch (err) {
      console.error("Token decode error", err);
      toast.error("Invalid session. Please login again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch distributors or retailers when user type is selected
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
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${masterDistributorId}`;
        } else if (userType === "retailer") {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/md/${masterDistributorId}`;
        }

        console.log("Fetching users from:", endpoint);

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Users response:", data);

        if (response.ok && data.status === "success") {
          if (userType === "distributor") {
            const distributorsList = data.data.distributors || [];
            setDistributors(distributorsList);
            
            if (distributorsList.length === 0) {
              toast.info("No distributors found under your account");
            } else {
              toast.success(`Loaded ${distributorsList.length} distributor(s)`);
            }
          } else if (userType === "retailer") {
            const retailersList = data.data.retailers || [];
            setRetailers(retailersList);
            
            if (retailersList.length === 0) {
              toast.info("No retailers found under your account");
            } else {
              toast.success(`Loaded ${retailersList.length} retailer(s)`);
            }
          }
        } else {
          console.error("Failed to fetch users:", data);
          toast.error(data.message || "Failed to load users");
          setDistributors([]);
          setRetailers([]);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
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
      let endpoint = "";
      
      if (type === "distributor") {
        endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/distributor/${userId}`;
      } else if (type === "retailer") {
        endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${userId}`;
      }

      console.log("Fetching user details from:", endpoint);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("User details response:", data);

      if (response.ok && data.status === "success") {
        let user: any;

        if (type === "distributor") {
          user = data.data.distributor;
          
          const details: UserDetails = {
            name: user.Name || "N/A",
            phone: user.Phone || "N/A",
            userId: user.DistributorID || "N/A",
            currentBalance: Number(user.WalletBalance) || 0,
          };
          
          setUserDetails(details);
          toast.success(`Selected: ${details.name}`);
        } else if (type === "retailer") {
          user = data.data.retailer;
          
          const details: UserDetails = {
            name: user.Name || "N/A",
            phone: user.Phone || "N/A",
            userId: user.RetailerID || "N/A",
            currentBalance: Number(user.WalletBalance) || 0,
          };
          
          setUserDetails(details);
          toast.success(`Selected: ${details.name}`);
        }
      } else {
        console.error("Failed to fetch user details:", data);
        toast.error(data.message || "Failed to load user details");
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
      setUserDetails(null);
    }
  };

  const handleUserTypeChange = (value: string) => {
    setUserType(value);
    setSelectedUserId("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setDistributors([]);
    setRetailers([]);
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    fetchUserDetails(userId, userType);
  };

  const handleRevert = async () => {
    if (!userDetails) {
      toast.error("Please select a user first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const revertAmount = parseFloat(amount);
    if (revertAmount > userDetails.currentBalance) {
      const userTypeText = userType === "distributor" ? "Distributor" : "Retailer";
      toast.error(
        `Insufficient balance of ${userTypeText} for revert. Current balance: ₹${userDetails.currentBalance.toFixed(2)}`
      );
      return;
    }

    if (!masterDistributorId) {
      toast.error("Authentication error. Please login again.");
      return;
    }

    setIsProcessing(true);
    try {
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/revert/create`;
      const token = localStorage.getItem("authToken");

      const payload = {
        from_id: masterDistributorId,
        on_id: selectedUserId,
        amount: revertAmount,
        remarks: remarks.trim() || `Revert request processed by master distributor for ${userType}`,
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
        setSelectedUserId("");
        setUserType("");
        
        // Refresh page
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
    setUserType("");
    setSelectedUserId("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setDistributors([]);
    setRetailers([]);
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
                Process revert requests for Distributors and Retailers
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
                      Select user type and process fund revert
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
                {/* User Type Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="userType"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
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
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Distributor
                        </div>
                      </SelectItem>
                      <SelectItem value="retailer">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Retailer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User Selection (Distributor or Retailer) */}
                {userType && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="user"
                      className="flex items-center gap-2 text-sm font-semibold text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Select {userType === "distributor" ? "Distributor" : "Retailer"}
                      <span className="text-destructive">*</span>
                    </Label>
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center rounded-lg border-2 border-border bg-background p-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Loading {userType}s...
                        </span>
                      </div>
                    ) : (userType === "distributor" && distributors.length === 0) ||
                      (userType === "retailer" && retailers.length === 0) ? (
                      <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                        No {userType}s found under your account
                      </div>
                    ) : (
                      <Select
                        value={selectedUserId}
                        onValueChange={handleUserSelection}
                      >
                        <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
                          <SelectValue placeholder={`-- Select ${userType === "distributor" ? "Distributor" : "Retailer"} --`} />
                        </SelectTrigger>
                        <SelectContent>
                          {userType === "distributor" &&
                            distributors.map((distributor) => (
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
                                    {distributor.phone} • Balance: ₹{formatAmount(distributor.wallet_balance)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          {userType === "retailer" &&
                            retailers.map((retailer) => (
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
                                    {retailer.phone} • Balance: ₹{formatAmount(retailer.wallet_balance)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                          User ID
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
                    onClick={() => navigate("/master")}
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
                  <span>Select user type first, then choose a specific distributor or retailer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Revert amount cannot exceed the user's current wallet balance</span>
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