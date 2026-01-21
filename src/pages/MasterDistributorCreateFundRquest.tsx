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
import { Building2, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

/* -------------------- TYPES -------------------- */

interface TokenData {
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

/* -------------------- COMPONENT -------------------- */

const RequestFunds = () => {
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
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
const [banks, setBanks] = useState<AdminBank[]>([]);


  /* -------------------- BANK DETAILS -------------------- */

  const companyBankDetails = [
    {
      bankName: "AXIS BANK",
      accountHolder: "PAYBAZAAR TECHNOLOGIES PRIVATE LIMITED",
      accountNumber: "925020043148912",
      ifscCode: "UTIB0000056",
    },
    {
      bankName: "IDFC FIRST Bank",
      accountHolder: "PAYBAZAAR TECHNOLOGIES PRIVATE LIMITED",
      accountNumber: "10248252306",
      ifscCode: "IDFB0020137",
    },
  ];

  const copyToClipboard = (text: string, field: string, bankIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedField(`${field}-${bankIndex}`);
    toast({ title: "Copied!", description: `${field} copied to clipboard` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const redirectTo = useCallback(
    (path: string) => navigate(path, { replace: true }),
    [navigate]
  );

  /* -------------------- AUTH CHECK -------------------- */

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || !userRole) {
      redirectTo("/login");
      return;
    }

    try {
      const decoded: TokenData = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        redirectTo("/login");
        return;
      }

      setTokenData(decoded);
      setRole(userRole);
    } catch (err) {
      console.error("Token decode failed", err);
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      redirectTo("/login");
    } finally {
      setIsCheckingAuth(false);
    }
  }, [redirectTo]);


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


  /* -------------------- WALLET BALANCE -------------------- */

  useEffect(() => {
    const fetchWalletBalance = async () => {
      const token = localStorage.getItem("authToken");
      if (!token || !tokenData) return;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/${
            tokenData.user_id
          }`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "success") {
          setWalletBalance(Number(res.data.data.balance));
        }
      } catch {
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();
  }, [tokenData]);

  /* -------------------- FORM HELPERS -------------------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    if (!formData.bank_name) return toastError("Please select a bank");
    if (!formData.request_date) return toastError("Request date is required");
    if (!formData.utr_number) return toastError("UTR number is required");
    if (!formData.amount || Number(formData.amount) <= 0)
      return toastError("Amount must be greater than 0");
    return true;
  };

  const toastError = (msg: string) => {
    toast({
      title: "Validation Error",
      description: msg,
      variant: "destructive",
    });
    return false;
  };

  /* -------------------- SUBMIT -------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenData) {
      redirectTo("/login");
      return;
    }

    if (!validateForm()) return;

    const token = localStorage.getItem("authToken");
    if (!token) return redirectTo("/login");

    const payload = {
      requester_id: tokenData.user_id,
      request_to_id: tokenData.admin_id,
      amount: Number(formData.amount),
      bank_name: formData.bank_name,
      request_date: new Date(formData.request_date).toISOString(),
      utr_number: formData.utr_number,
      remarks: formData.remarks.trim() || "Admin, please approve",
    };

    try {
      setLoading(true);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/fund_request/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.status === "success") {
        toast({ title: "Success", description: data.message });

        setFormData({
          bank_name: "",
          request_date: "",
          utr_number: "",
          amount: "",
          remarks: "",
        });

        setTimeout(
          () => redirectTo(role === "master" ? "/master" : "/distributor"),
          1200
        );
      } else {
        toast({
          title: "Request Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.response?.data?.message || "Something went wrong",
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
        <div className="flex min-h-screen items-center justify-center">
          Checking authentication...
        </div>
      </DashboardLayout>
    );
  }

  /* -------------------- UI (UNCHANGED) -------------------- */

  return (
    <DashboardLayout role="master">
      <div className="flex-1 bg-muted/10">
        <main className="flex flex-col items-center p-6">
          {/* Bank Details Section */}
          <div className="mb-6 flex w-full max-w-3xl flex-col">
            <Card className="overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Transfer Funds to Paybazaar Account
                </CardTitle>
                <CardDescription>
                  Please transfer the amount to one of the following bank
                  accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {companyBankDetails.map((bank, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">
                          {bank.bankName}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">
                            Account Holder
                          </p>
                          <p className="font-medium text-foreground">
                            {bank.accountHolder}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">
                            Account Number
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-medium text-foreground">
                              {bank.accountNumber}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  bank.accountNumber,
                                  "account",
                                  index
                                )
                              }
                              className="rounded p-1 transition-colors hover:bg-muted"
                              title="Copy Account Number"
                            >
                              {copiedField === `account-${index}` ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">
                            IFSC Code
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-medium text-foreground">
                              {bank.ifscCode}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(bank.ifscCode, "ifsc", index)
                              }
                              className="rounded p-1 transition-colors hover:bg-muted"
                              title="Copy IFSC Code"
                            >
                              {copiedField === `ifsc-${index}` ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
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
            </Card>
          </div>

          {/* Fund Request Form */}
          <div className="flex w-full max-w-3xl flex-col">
            <Card className="animate-fade-in overflow-hidden rounded-xl border border-border shadow-lg">
              <CardHeader className="paybazaar-gradient rounded-t-xl text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full bg-white/30"></div>
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      Request E-Value
                    </CardTitle>
                    <CardDescription className="mt-1 text-white/90">
                      Submit your fund request with transaction details
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
                        required
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
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{bank.bank_name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          IFSC: {bank.ifsc_code}
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

                  {/* Remarks - Now Optional */}
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
                      onClick={() =>
                        navigate(role === "master" ? "/master" : "/distributor")
                      }
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      className="paybazaar-gradient h-12 flex-1 font-semibold text-white shadow-lg hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default RequestFunds;
