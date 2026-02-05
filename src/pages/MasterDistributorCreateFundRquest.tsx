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
import { Building2, ArrowLeft, AlertCircle } from "lucide-react";
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

const RequestFunds = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    request_type: "NORMAL",
    bank_name: "",
    request_date: "",
    utr_number: "",
    amount: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [banks, setBanks] = useState<AdminBank[]>([]);

  const redirectTo = useCallback(
    (path: string) => {
      navigate(path, { replace: true });
    },
    [navigate]
  );

  /* -------------------- AUTH CHECK -------------------- */

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

        if (!decoded.user_id) {
          toast({
            title: "Invalid Token",
            description: "Master Distributor ID missing.",
            variant: "destructive",
          });
          redirectTo("/login");
          return;
        }

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

  /* -------------------- FETCH BANKS -------------------- */

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

        if (res.data.status === "success") {
          setBanks(res.data.data.admin_banks);
        }
      } catch (err) {
        console.error("Bank fetch failed:", err);
        setBanks([]);
      }
    };

    fetchBanks();
  }, [tokenData?.admin_id]);

  /* -------------------- FORM HANDLERS -------------------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRequestTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      request_type: value,
      // Clear bank and UTR fields when switching to ADVANCE
      bank_name: value === "ADVANCE" ? "" : prev.bank_name,
      utr_number: value === "ADVANCE" ? "" : prev.utr_number,
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.request_type) {
      errors.request_type = "Please select a request type";
    }

    // For NORMAL requests, bank_name and utr_number are required
    if (formData.request_type === "NORMAL") {
      if (!formData.bank_name) {
        errors.bank_name = "Please select a bank";
      }
      if (!formData.utr_number) {
        errors.utr_number = "UTR number is required for normal requests";
      }
    }

    if (!formData.request_date) {
      errors.request_date = "Request date is required";
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

  /* -------------------- SUBMIT -------------------- */

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

    // Build payload
    const payload: any = {
      requester_id: tokenData.user_id,
      request_to_id: tokenData.admin_id,
      amount: parseFloat(formData.amount),
      request_date: new Date(formData.request_date).toISOString(),
      request_type: formData.request_type,
      remarks: formData.remarks.trim() || "Admin, please approve",
    };

    // Add bank_name and utr_number only for NORMAL requests
    if (formData.request_type === "NORMAL") {
      payload.bank_name = formData.bank_name;
      payload.utr_number = formData.utr_number;
    } else {
      // For ADVANCE requests, set as empty strings
      payload.bank_name = "";
      payload.utr_number = "";
    }

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

      if (data.status === "success") {
        toast({
          title: "Success",
          description:
            data.message ||
            "Fund request submitted successfully. We will process it shortly.",
        });

        // Reset form
        setFormData({
          request_type: "NORMAL",
          bank_name: "",
          request_date: "",
          utr_number: "",
          amount: "",
          remarks: "",
        });

        setTimeout(() => {
          redirectTo("/master");
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

  /* -------------------- LOADING -------------------- */

  if (isCheckingAuth) {
    return (
      <DashboardLayout role="master">
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="animate-pulse text-lg text-muted-foreground">
            Checking authentication...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isNormalRequest = formData.request_type === "NORMAL";
  const isAdvanceRequest = formData.request_type === "ADVANCE";

  /* -------------------- RENDER -------------------- */

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
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Request Type Selection - Always First */}
                <div className="space-y-2">
                  <Label
                    htmlFor="request_type"
                    className="flex items-center gap-1 text-sm font-semibold text-foreground"
                  >
                    Request Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={handleRequestTypeChange}
                    required
                  >
                    <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
                      <SelectValue placeholder="Select Request Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">Bank Transfer</span>
                          
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="ADVANCE">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">Advance Credit Request</span>
                          
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Info message based on request type */}
                  {isNormalRequest && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        For normal requests, please transfer funds to the selected bank account and provide the UTR number.
                      </p>
                    </div>
                  )}

                  {isAdvanceRequest && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        Advance requests do not require bank transfer details. Funds will be credited based on admin approval.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Bank Name Dropdown - Only for NORMAL */}
                  {isNormalRequest && (
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
                        required={isNormalRequest}
                      >
                        <SelectTrigger className="h-12 border-2 border-border bg-background transition-colors focus:border-primary">
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
                  )}

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
                      max={new Date().toISOString().split("T")[0]}
                      className="h-12 border-2 border-border bg-background transition-colors focus:border-primary"
                      required
                    />
                  </div>

                  {/* UTR Number - Only for NORMAL */}
                  {isNormalRequest && (
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
                        required={isNormalRequest}
                      />
                    </div>
                  )}

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
                    onClick={() => navigate("/master")}
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

export default RequestFunds;