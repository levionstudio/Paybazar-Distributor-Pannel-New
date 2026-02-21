"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Download,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Transaction {
  wallet_transaction_id: string;
  user_id: string;
  reference_id: string;
  credit_amount: number;
  debit_amount?: number;
  before_balance: number;
  after_balance: number;
  transaction_reason: string;
  remarks: string;
  created_at: string;
}

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Constants ───────────────────────────────────────────────
const FETCH_LIMIT = 1000; // how many records to pull per request
const FETCH_OFFSET = 0;

export default function DistributorTransactions() {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributorId, setDistributorId] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Helper – today as YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Filter states
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");

  // ─── 1. Decode token on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      const distId = decoded?.user_id;

      if (!distId) {
        console.error("❌ Distributor ID not found in token");
        setLoading(false);
        return;
      }

      setDistributorId(distId);

      // ✅ Fixed: wallet balance uses the correct endpoint (not transactions endpoint)
      fetchWalletBalance(token, distId);
    } catch (err) {
      console.error("❌ Token decode error", err);
      setLoading(false);
    }
  }, []);

  // ─── 2. Fetch transactions when distributorId is ready ─────
  useEffect(() => {
    if (!distributorId) return;
    const token = localStorage.getItem("authToken");
    if (token) fetchTransactions(token, distributorId);
  }, [distributorId]);

  // ─── 3. Frontend filtering ─────────────────────────────────
  useEffect(() => {
    let filtered = [...transactions];

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((txn) => {
        const txnDate = new Date(txn.created_at);
        return txnDate >= start && txnDate <= end;
      });
    }

    // Type filter (CREDIT / DEBIT)
    if (typeFilter !== "ALL") {
      filtered = filtered.filter((txn) =>
        txn.credit_amount > 0 ? typeFilter === "CREDIT" : typeFilter === "DEBIT"
      );
    }

    // Reason filter
    if (reasonFilter !== "ALL") {
      filtered = filtered.filter(
        (txn) => txn.transaction_reason === reasonFilter
      );
    }

    // Search across all fields
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((txn) =>
        Object.values(txn).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [transactions, startDate, endDate, typeFilter, reasonFilter, searchTerm]);

  // ─── Fetch wallet balance ──────────────────────────────────
  // ✅ Fixed: was incorrectly calling the transactions endpoint instead of balance endpoint
  const fetchWalletBalance = async (token: string, id: string) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/wallet/get/balance/distributor/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const balance =
        res.data?.data?.balance ??
        res.data?.data?.wallet_balance ??
        0;
      setWalletBalance(balance ? Number(balance) : 0);
    } catch (err) {
      console.error("❌ Wallet balance fetch error:", err);
      setWalletBalance(0);
    }
  };

  // ─── Fetch all transactions with limit + offset ────────────
  // ✅ Fixed: added ?limit=1000&offset=0 query params to get all records
  const fetchTransactions = async (token: string, id: string) => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/wallet/get/transactions/distributor/${id}?limit=${FETCH_LIMIT}&offset=${FETCH_OFFSET}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("📦 Transactions API Response:", res.data);

      if (res.data.status === "success") {
        let txnData = res.data.data;
        let txns: Transaction[] = [];

        // Handle different response structures
        if (Array.isArray(txnData)) {
          txns = txnData;
        } else if (txnData?.transactions && Array.isArray(txnData.transactions)) {
          txns = txnData.transactions;
        } else if (txnData?.wallet_transactions && Array.isArray(txnData.wallet_transactions)) {
          txns = txnData.wallet_transactions;
        }

        // Sort newest first
        txns.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        console.log(`✅ Transactions fetched: ${txns.length}`);
        setTransactions(txns);
        setFilteredTransactions(txns);
      } else {
        console.warn("⚠️ No transactions found");
        setTransactions([]);
        setFilteredTransactions([]);
      }
    } catch (err: any) {
      console.error("❌ Transactions fetch error:", err.response?.data || err.message);
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Clear all filters ─────────────────────────────────────
  const clearFilters = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
    setSearchTerm("");
    setTypeFilter("ALL");
    setReasonFilter("ALL");
    setCurrentPage(1);
  };

  // ─── Refresh ───────────────────────────────────────────────
  const handleRefresh = () => {
    const token = localStorage.getItem("authToken");
    if (!token || !distributorId) return;
    fetchTransactions(token, distributorId);
    fetchWalletBalance(token, distributorId);
  };

  // ─── Export to Excel ───────────────────────────────────────
  const exportToExcel = () => {
    try {
      const exportData = filteredTransactions.map((txn, index) => ({
        "S.No": index + 1,
        "Date & Time": txn.created_at
          ? new Date(txn.created_at).toLocaleString("en-IN")
          : "N/A",
        "Reference ID": txn.reference_id || "N/A",
        Type: txn.credit_amount > 0 ? "CREDIT" : "DEBIT",
        "Credit Amount (₹)": parseFloat(txn.credit_amount?.toString() || "0").toFixed(2),
        "Debit Amount (₹)": parseFloat(txn.debit_amount?.toString() || "0").toFixed(2),
        "Before Balance (₹)": parseFloat(txn.before_balance?.toString() || "0").toFixed(2),
        "After Balance (₹)": parseFloat(txn.after_balance?.toString() || "0").toFixed(2),
        Reason: txn.transaction_reason || "N/A",
        Remarks: txn.remarks || "N/A",
      }));

      const totalCredit = filteredTransactions.reduce(
        (sum, txn) => sum + parseFloat(txn.credit_amount?.toString() || "0"),
        0
      );
      const totalDebit = filteredTransactions.reduce(
        (sum, txn) => sum + parseFloat(txn.debit_amount?.toString() || "0"),
        0
      );

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "Reference ID": "TOTAL",
        Type: "",
        "Credit Amount (₹)": totalCredit.toFixed(2),
        "Debit Amount (₹)": totalDebit.toFixed(2),
        "Before Balance (₹)": "",
        "After Balance (₹)": "",
        Reason: "",
        Remarks: "",
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);
      worksheet["!cols"] = [
        { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 20 }, { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      XLSX.writeFile(workbook, `Distributor_Transactions_${getTodayDate()}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // ─── Helpers ───────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getTransactionType = (txn: Transaction) =>
    txn.credit_amount > 0 ? "CREDIT" : "DEBIT";

  const getAmount = (txn: Transaction) =>
    txn.credit_amount > 0 ? txn.credit_amount : txn.debit_amount || 0;

  // ─── Pagination calc ───────────────────────────────────────
  const totalRecords = filteredTransactions.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);

  // ──────────────────────────────────────────────────────────
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
              <h1 className="text-2xl font-bold">Wallet Transactions</h1>
              <p className="mt-1 text-sm text-white/80">
                View and manage your wallet transaction history
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">

          {/* ── Filters ──────────────────────────────────────── */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </div>
                </CardTitle>
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">

                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border-slate-300 bg-white"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={getTodayDate()}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border-slate-300 bg-white"
                  />
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Type
                  </Label>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Reason
                  </Label>
                  <Select
                    value={reasonFilter}
                    onValueChange={(v) => { setReasonFilter(v); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Reasons</SelectItem>
                      <SelectItem value="FUND_REQUEST">Fund Request</SelectItem>
                      <SelectItem value="FUND_TRANSFER">Fund Transfer</SelectItem>
                      <SelectItem value="COMMISSION">Commission</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Search
                  </Label>
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Active filter summary */}
              {(startDate !== getTodayDate() || endDate !== getTodayDate() || typeFilter !== "ALL" || reasonFilter !== "ALL" || searchTerm) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(startDate !== getTodayDate() || endDate !== getTodayDate()) && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      📅 {startDate} → {endDate}
                    </Badge>
                  )}
                  {typeFilter !== "ALL" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Type: {typeFilter}
                    </Badge>
                  )}
                  {reasonFilter !== "ALL" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Reason: {reasonFilter}
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Search: "{searchTerm}"
                    </Badge>
                  )}
                  <Badge className="gap-1 bg-primary/10 text-primary text-xs">
                    {totalRecords} result(s)
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Transactions Table ────────────────────────────── */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  Transaction History ({totalRecords} records)
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={exportToExcel}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    disabled={totalRecords === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Table Controls */}
              <div className="border-b border-border/40 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Show</span>
                    <Select
                      value={recordsPerPage.toString()}
                      onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 w-20 border-slate-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-medium text-slate-700">entries</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    Showing {totalRecords > 0 ? indexOfFirstRecord + 1 : 0} to{" "}
                    {Math.min(indexOfLastRecord, totalRecords)} of {totalRecords} entries
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : currentRecords.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="mb-2 text-lg font-semibold">No transactions found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || typeFilter !== "ALL" || reasonFilter !== "ALL"
                        ? "Try adjusting your filters or search terms"
                        : "No transactions available for the selected date range"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        {["S.No", "Date & Time", "Reference ID", "Type", "Amount (₹)", "Before Bal (₹)", "After Bal (₹)", "Reason", "Remarks"].map((h) => (
                          <TableHead key={h} className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {currentRecords.map((txn, idx) => (
                        <TableRow
                          key={txn.wallet_transaction_id}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"} transition-colors duration-200 hover:bg-primary/5`}
                        >
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {indexOfFirstRecord + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            {formatDate(txn.created_at)}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm text-slate-700">
                            {txn.reference_id || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge
                              className={
                                getTransactionType(txn) === "CREDIT"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-red-200 bg-red-50 text-red-700"
                              }
                            >
                              {getTransactionType(txn)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`py-3 text-center text-sm font-semibold ${
                              getTransactionType(txn) === "CREDIT" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {getTransactionType(txn) === "CREDIT" ? "+" : "-"}₹{" "}
                            {getAmount(txn).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            ₹ {txn.before_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            ₹ {txn.after_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            {txn.transaction_reason || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            {txn.remarks || "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {totalRecords > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={currentPage === pageNum ? "paybazaar-gradient text-white" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}