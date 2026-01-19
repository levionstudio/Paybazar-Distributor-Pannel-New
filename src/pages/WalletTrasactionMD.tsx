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

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MdTransactions() {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterDistributorId, setMasterDistributorId] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Helper function to get today's date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Filter states
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");

  // Applied filters (only update on search/filter action)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    searchTerm: "",
    typeFilter: "ALL",
    reasonFilter: "ALL",
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log("Decoded Token:", decoded);
      
      const mdId = decoded?.user_id;
      console.log("Master Distributor ID:", mdId);
      
      if (!mdId) {
        console.error("Master Distributor ID not found in token");
        setLoading(false);
        return;
      }
      
      setMasterDistributorId(mdId);
      fetchWalletBalance(token, mdId);
    } catch (err) {
      console.error("Token decode error", err);
      setLoading(false);
    }
  }, []);

  // Fetch transactions when pagination or applied filters change
  useEffect(() => {
    if (masterDistributorId) {
      const token = localStorage.getItem("authToken");
      if (token) {
        fetchTransactions(token, masterDistributorId);
      }
    }
  }, [masterDistributorId, currentPage, recordsPerPage, appliedFilters]);

  const fetchWalletBalance = async (token: string, id: string) => {
    try {
      const res = await axios.get(
        import.meta.env.VITE_API_BASE_URL + `/md/wallet/get/balance/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Wallet Balance Response:", res.data);
      const balance = res.data?.data?.balance;
      setWalletBalance(balance ? Number(balance) : 0);
    } catch (err) {
      console.error("Wallet balance fetch error:", err);
      setWalletBalance(0);
    }
  };

  const fetchTransactions = async (token: string, id: string) => {
    try {
      setLoading(true);
      console.log("Fetching transactions for MD ID:", id);
      
      // Calculate offset
      const offset = (currentPage - 1) * recordsPerPage;
      
      // Build query parameters
      const params: any = {
        limit: recordsPerPage,
        offset: offset,
      };

      // Add filters to params
      if (appliedFilters.startDate) {
        params.start_date = appliedFilters.startDate;
      }
      if (appliedFilters.endDate) {
        params.end_date = appliedFilters.endDate;
      }
      if (appliedFilters.typeFilter !== "ALL") {
        params.type = appliedFilters.typeFilter;
      }
      if (appliedFilters.reasonFilter !== "ALL") {
        params.reason = appliedFilters.reasonFilter;
      }
      if (appliedFilters.searchTerm.trim()) {
        params.search = appliedFilters.searchTerm.trim();
      }

      console.log("API Request params:", params);
      
      const res = await axios.get(
        import.meta.env.VITE_API_BASE_URL + `/wallet/get/transactions/md/${id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: params
        }
      );
      
      console.log("Transactions API Response:", res.data);
      
      if (res.data.status === "success" && res.data.data?.transactions) {
        const txns = res.data.data.transactions;
        setTransactions(txns);
        
        // Set pagination info
        const paginationInfo: PaginationInfo = res.data.data.pagination || {
          total: txns.length,
          page: currentPage,
          limit: recordsPerPage,
          totalPages: 1,
        };
        
        setTotalRecords(paginationInfo.total);
        setTotalPages(paginationInfo.totalPages);
        
        console.log("Transactions fetched:", txns.length);
        console.log("Pagination info:", paginationInfo);
      } else {
        console.log("No transactions found in response");
        setTransactions([]);
        setTotalRecords(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("Transactions fetch error:", err);
      setTransactions([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters({
      startDate,
      endDate,
      searchTerm,
      typeFilter,
      reasonFilter,
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
    setSearchTerm("");
    setTypeFilter("ALL");
    setReasonFilter("ALL");
    setAppliedFilters({
      startDate: today,
      endDate: today,
      searchTerm: "",
      typeFilter: "ALL",
      reasonFilter: "ALL",
    });
    setCurrentPage(1);
  };

  // Export to Excel (fetch all data for export)
  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token || !masterDistributorId) return;

      // Fetch all transactions for export
      const params: any = {
        limit: totalRecords || 10000, // Get all records
        offset: 0,
      };

      // Add current filters
      if (appliedFilters.startDate) params.start_date = appliedFilters.startDate;
      if (appliedFilters.endDate) params.end_date = appliedFilters.endDate;
      if (appliedFilters.typeFilter !== "ALL") params.type = appliedFilters.typeFilter;
      if (appliedFilters.reasonFilter !== "ALL") params.reason = appliedFilters.reasonFilter;
      if (appliedFilters.searchTerm.trim()) params.search = appliedFilters.searchTerm.trim();

      const res = await axios.get(
        import.meta.env.VITE_API_BASE_URL + `/wallet/get/transactions/md/${masterDistributorId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: params
        }
      );

      const allTransactions = res.data.data?.transactions || [];

      const exportData = allTransactions.map((txn: Transaction, index: number) => ({
        "S.No": index + 1,
        "Date & Time": txn.created_at
          ? new Date(txn.created_at).toLocaleString("en-IN")
          : "N/A",
        "Transaction ID": txn.wallet_transaction_id || "N/A",
        "Reference ID": txn.reference_id || "N/A",
        "Type": txn.credit_amount > 0 ? "CREDIT" : "DEBIT",
        "Credit Amount (₹)": parseFloat(txn.credit_amount?.toString() || "0").toFixed(2),
        "Debit Amount (₹)": parseFloat(txn.debit_amount?.toString() || "0").toFixed(2),
        "Before Balance (₹)": parseFloat(txn.before_balance?.toString() || "0").toFixed(2),
        "After Balance (₹)": parseFloat(txn.after_balance?.toString() || "0").toFixed(2),
        "Reason": txn.transaction_reason || "N/A",
        "Remarks": txn.remarks || "N/A",
      }));

      // Add summary row
      const totalCredit = allTransactions.reduce(
        (sum: number, txn: Transaction) => sum + parseFloat(txn.credit_amount?.toString() || "0"),
        0
      );
      const totalDebit = allTransactions.reduce(
        (sum: number, txn: Transaction) => sum + parseFloat(txn.debit_amount?.toString() || "0"),
        0
      );

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "Transaction ID": "TOTAL",
        "Reference ID": "",
        "Type": "",
        "Credit Amount (₹)": totalCredit.toFixed(2),
        "Debit Amount (₹)": totalDebit.toFixed(2),
        "Before Balance (₹)": "",
        "After Balance (₹)": "",
        "Reason": "",
        "Remarks": "",
      };

      const finalData = [...exportData, summaryRow];

      const worksheet = XLSX.utils.json_to_sheet(finalData);

      // Set column widths
      const columnWidths = [
        { wch: 8 }, // S.No
        { wch: 20 }, // Date & Time
        { wch: 20 }, // Transaction ID
        { wch: 15 }, // Reference ID
        { wch: 10 }, // Type
        { wch: 18 }, // Credit Amount
        { wch: 18 }, // Debit Amount
        { wch: 18 }, // Before Balance
        { wch: 18 }, // After Balance
        { wch: 20 }, // Reason
        { wch: 30 }, // Remarks
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `MD_Wallet_Transactions_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // Refresh transactions
  const handleRefresh = () => {
    const token = localStorage.getItem("authToken");
    if (!token || !masterDistributorId) return;

    fetchTransactions(token, masterDistributorId);
    fetchWalletBalance(token, masterDistributorId);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Determine transaction type
  const getTransactionType = (txn: Transaction) => {
    return txn.credit_amount > 0 ? "CREDIT" : "DEBIT";
  };

  // Get amount for display
  const getAmount = (txn: Transaction) => {
    return txn.credit_amount > 0 ? txn.credit_amount : (txn.debit_amount || 0);
  };

  // Calculate display indices
  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;
  const indexOfLastRecord = Math.min(indexOfFirstRecord + recordsPerPage, totalRecords);

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
              <h1 className="text-2xl font-bold">Wallet Transactions</h1>
              <p className="mt-1 text-sm text-white/80">
                View and manage your wallet transaction history
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
          {/* Filters Section */}
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
                    onChange={(e) => setStartDate(e.target.value)}
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
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-slate-300 bg-white"
                  />
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Type
                  </Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                  <Select value={reasonFilter} onValueChange={setReasonFilter}>
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyFilters();
                      }
                    }}
                    className="border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Apply Filters Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={applyFilters}
                  className="paybazaar-gradient text-white"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
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
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
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
                    <span className="text-sm font-medium text-slate-700">
                      Show
                    </span>
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
                    <span className="text-sm font-medium text-slate-700">
                      entries
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">
                    Showing {totalRecords > 0 ? indexOfFirstRecord + 1 : 0} to{" "}
                    {indexOfLastRecord} of {totalRecords} entries
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading transactions...
                    </p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="mb-2 text-lg font-semibold">
                      No transactions found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          S.No
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Date & Time
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Transaction ID
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Reference ID
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Type
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Amount (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Before Bal (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          After Bal (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Reason
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Remarks
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {transactions.map((txn, idx) => (
                        <TableRow
                          key={txn.wallet_transaction_id}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          } transition-colors duration-200 hover:bg-paybazaar-blue/5`}
                        >
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {indexOfFirstRecord + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {formatDate(txn.created_at)}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm font-semibold text-slate-700">
                            #{txn.wallet_transaction_id}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm font-semibold text-slate-700">
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
                          <TableCell className={`py-3 text-center text-sm font-semibold ${
                            getTransactionType(txn) === "CREDIT" ? "text-green-600" : "text-red-600"
                          }`}>
                            {getTransactionType(txn) === "CREDIT" ? "+" : "-"}₹{" "}
                            {getAmount(txn).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            ₹{" "}
                            {txn.before_balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            ₹{" "}
                            {txn.after_balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
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
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              currentPage === pageNum ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={
                              currentPage === pageNum
                                ? "paybazaar-gradient text-white"
                                : ""
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
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