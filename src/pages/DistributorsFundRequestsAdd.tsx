import { useState, useEffect, useCallback } from "react";
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
import { Building2, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface AdminBank {
  admin_bank_id: number;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}


const RequestFundsDistributor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

const [formData, setFormData] = useState({
  bank_name: "",
  request_date: "",
  utr_number: "",
  amount: "",
  remarks: "",
});

  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
const [banks, setBanks] = useState<AdminBank[]>([]);
  
    useEffect(() => {
  const fetchBanks = async () => {
    try {
      if (!tokenData?.admin_id) return;

      const token = localStorage.getItem("authToken");

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/bank/get/admin/${tokenData.admin_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Banks API response:", res.data);

      if (res.data.status === "success") {
        setBanks(res.data.data.admin_banks); // 👈 NOT .banks
      }
    } catch (err) {
      console.error("Bank fetch failed:", err);
      setBanks([]);
    }
  };

  fetchBanks();
}, [tokenData?.admin_id]);

    

  // // Bank details for fund transfer
  // const companyBankDetails = [
  //   {
  //     bankName: "AXIS BANK",
  //     accountHolder: "PAYBAZAAR TECHNOLOGIES PRIVATE LIMITED",
  //     accountNumber: "925020043148912",
  //     ifscCode: "UTIB0000056",
  //   },
  //   {
  //     bankName: "IDFC FIRST Bank",
  //     accountHolder: "PAYBAZAAR TECHNOLOGIES PRIVATE LIMITED",
  //     accountNumber: "10248252306",
  //     ifscCode: "IDFB0020137",
  //   },
  // ];

  const copyToClipboard = (text: string, field: string, bankIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedField(`${field}-${bankIndex}`);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const redirectTo = useCallback(
    (path: string) => {
      navigate(path, { replace: true });
    },
    [navigate]
  );

  // ✅ Decode token with correct user_id field
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page.",
          variant: "destructive",
        });
        redirectTo("/login");
        return;
      }

      try {
        const decoded: DecodedToken = jwtDecode(token);
        console.log("Decoded Token:", decoded);

        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken");
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          redirectTo("/login");
          return;
        }

        // ✅ Check for user_id (this is the Distributor ID)
        if (!decoded.user_id) {
          toast({
            title: "Invalid Token",
            description: "Distributor ID missing.",
            variant: "destructive",
          });
          redirectTo("/login");
          return;
        }

        console.log("Distributor ID (user_id):", decoded.user_id);
        setTokenData(decoded);
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("authToken");
        toast({
          title: "Authentication Error",
          description: "Invalid session. Please log in again.",
          variant: "destructive",
        });
        redirectTo("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [toast, redirectTo]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      const distributorId = tokenData?.user_id;
      const token = localStorage.getItem("authToken");

      if (!distributorId || !token) return;

      try {
        const res = await axios.get(
          import.meta.env.VITE_API_BASE_URL + `/distributor/wallet/get/balance/${distributorId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Wallet Balance Response:", res.data);

        if (
          res.data.status === "success" &&
          res.data.data?.balance !== undefined
        ) {
          setWalletBalance(Number(res.data.data.balance));
        } else {
          setWalletBalance(0);
        }
      } catch (err) {
        console.error("Wallet fetch error:", err);
        setWalletBalance(0);
      }
    };

    if (tokenData) {
      fetchWalletBalance();
    }
  }, [tokenData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.bank_name) {
      errors.bank_name = "Please select a bank";
    }
    if (!formData.request_date) {
      errors.request_date = "Request date is required";
    }
    if (!formData.utr_number) {
      errors.utr_number = "UTR number is required";
    }
    if (!formData.amount) {
      errors.amount = "Amount is required";
    } else if (parseFloat(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0";
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenData) {
      toast({
        title: "Authentication Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      redirectTo("/login");
      return;
    }

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit the request.",
        variant: "destructive",
      });
      redirectTo("/login");
      return;
    }

    // ✅ Build payload with correct fields from token
    const payload = {
      requester_id: tokenData.user_id, // Distributor ID
      request_to_id: tokenData.admin_id, // Admin ID (who they're requesting TO)
      bank_name: formData.bank_name,
      request_date: new Date(formData.request_date).toISOString(),
      utr_number: formData.utr_number,
      amount: parseFloat(formData.amount),
      remarks: formData.remarks.trim() || "Admin, please approve",
    };

    console.log("=== FUND REQUEST SUBMISSION ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      setLoading(true);
      toast({
        title: "Submitting Request",
        description: "Please wait while we process your fund request...",
      });

      const { data } = await axios.post(
        import.meta.env.VITE_API_BASE_URL + "/fund_request/create",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", data);

      if (data.status === "success") {
        toast({
          title: "Success",
          description:
            data.message ||
            "Fund request submitted successfully. We will process it shortly.",
        });

        // Reset form
        setFormData({
          bank_name: "",
          request_date: "",
          utr_number: "",
          amount: "",
          remarks: "",
        });

        setTimeout(() => {
          toast({
            title: "Redirecting",
            description: "Redirecting to dashboard...",
          });
          redirectTo("/distributor");
        }, 1500);
      } else {
        toast({
          title: "Request Failed",
          description:
            data.message || "Failed to submit fund request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Fund request error:", err);

      let errorMessage = "Something went wrong. Please try again.";

      if (err.response) {
        if (err.response.status === 400) {
          errorMessage =
            err.response.data?.message ||
            "Invalid request data. Please check all fields.";
        } else if (err.response.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          setTimeout(() => redirectTo("/login"), 2000);
        } else if (err.response.status === 403) {
          errorMessage = "You don't have permission to perform this action.";
        } else if (err.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast({
        title: "Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything until authentication check finishes
  if (isCheckingAuth) {
    return (
      <DashboardLayout role="distributor" >
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="animate-pulse text-lg text-muted-foreground">
            Checking authentication...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="distributor" >
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
            {/* <div>
              <h1 className="text-2xl font-bold">Request E-Value</h1>
              <p className="mt-1 text-sm text-white/80">
                Submit your fund request with transaction details
              </p>
            </div> */}
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
          {/* Bank Details Section */}
          {/* <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 rounded-full bg-white/30"></div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <Building2 className="h-5 w-5" />
                    Transfer Funds to Paybazaar Account
                  </CardTitle>
                  <CardDescription className="mt-1 text-white/90">
                    Please transfer the amount to one of the following bank accounts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {companyBankDetails.map((bank, index) => (
                  <div
                    key={index}
                    className="rounded-lg border-2 border-border bg-background p-4 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-foreground">
                        {bank.bankName}
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Account Holder
                        </p>
                        <p className="font-medium text-foreground">
                          {bank.accountHolder}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Account Number
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-semibold text-foreground">
                            {bank.accountNumber}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                bank.accountNumber,
                                "Account Number",
                                index
                              )
                            }
                            className="rounded p-1 transition-colors hover:bg-muted"
                            title="Copy Account Number"
                          >
                            {copiedField === `Account Number-${index}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          IFSC Code
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-semibold text-foreground">
                            {bank.ifscCode}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(bank.ifscCode, "IFSC Code", index)
                            }
                            className="rounded p-1 transition-colors hover:bg-muted"
                            title="Copy IFSC Code"
                          >
                            {copiedField === `IFSC Code-${index}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> After transferring funds, please fill
                  the form below with your transaction details (UTR number,
                  amount, etc.) to complete the fund request.
                </p>
              </div>
            </CardContent>
          </Card> */}

          {/* Fund Request Form */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 rounded-full bg-white/30"></div>
                <div>
                  <CardTitle className="text-xl font-semibold">
                    Fund Request Form
                  </CardTitle>
                  <CardDescription className="mt-1 text-white/90">
                    Fill in your transaction details below
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-background to-muted/30 p-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                aria-label="Fund request form"
              >
                <div className="grid grid-cols-2 gap-6">
                  {/* Bank Name Dropdown */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="bank_name"
                      className="flex items-center gap-1 text-sm font-semibold text-foreground"
                    >
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                 <Select
  value={formData.bank_name}
  onValueChange={(value) =>
    setFormData((prev) => ({ ...prev, bank_name: value }))
  }
>
  <SelectTrigger>
    <SelectValue placeholder="Select Bank" />
  </SelectTrigger>

  <SelectContent>
    {banks.map((bank) => (
      <SelectItem
        key={bank.admin_bank_id}
        value={bank.bank_name}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{bank.bank_name}</span>
          <span className="text-xs text-muted-foreground">
            ({bank.ifsc_code})
          </span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>

                  </div>

                  {/* Request Date */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="request_date"
                      className="flex items-center gap-1 text-sm font-semibold text-foreground"
                    >
                      Request Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="request_date"
                      type="date"
                      value={formData.request_date}
                      onChange={handleChange}
                      className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                      required
                      aria-required="true"
                    />
                  </div>

                  {/* UTR Number */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="utr_number"
                      className="flex items-center gap-1 text-sm font-semibold text-foreground"
                    >
                      UTR Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="utr_number"
                      type="text"
                      value={formData.utr_number}
                      onChange={handleChange}
                      className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                      placeholder="Enter UTR Number"
                      required
                      aria-required="true"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="flex items-center gap-1 text-sm font-semibold text-foreground"
                    >
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={handleChange}
                      className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                      placeholder="Enter Amount"
                      min="0"
                      step="0.01"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                {/* Remarks - Optional */}
                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="flex items-center gap-1 text-sm font-semibold text-foreground"
                  >
                    Remarks{" "}
                    <span className="text-xs text-muted-foreground">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    className="min-h-[120px] resize-none border-2 border-border bg-background transition-colors focus:border-primary"
                    placeholder="Enter any additional notes or remarks (leave empty for default message)"
                  />
                  <p className="text-xs text-muted-foreground">
                    If left empty, default message will be: "Admin, please
                    approve"
                  </p>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 border-2 hover:bg-muted"
                    disabled={loading}
                    onClick={() => navigate("/distributor")}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Submit Request"}
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

export default RequestFundsDistributor;