import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Eye, Download, Search, Calendar, ArrowLeft, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

interface DecodedToken {
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface TDSCommission {
  tds_commision_id: number;
  transaction_id: string;
  user_id: string;
  user_name: string;
  commision: number;
  tds: number;
  paid_commision: number;
  pan_number: string;
  status: string;
  created_at: string;
}

const MDTDSCommissionPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  // All transactions from API (unfiltered)
  const [allTransactionsRaw, setAllTransactionsRaw] = useState<TDSCommission[]>([]);
  
  // Filtered transactions based on all filters
  const [filteredTransactions, setFilteredTransactions] = useState<TDSCommission[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TDSCommission | null>(null);

  // Decode token
  useEffect(() => {
    if (!token) {
      toast.error("No authentication token found. Please login.");
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      
      if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("authToken");
        navigate("/login");
        return;
      }
      
      setUserId(decoded.user_id);
      setUserName(decoded.user_name);
    } catch (error) {
      toast.error("Invalid token. Please login again.");
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch ALL TDS commissions from API (no query params for filtering)
  const fetchAllTransactions = useCallback(async () => {
    if (!userId || !token) {
      return;
    }

    setLoading(true);
    setSearched(true);
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/commision/get/tds/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const list: TDSCommission[] = response.data?.data?.tds_commisions || [];
      
      // Sort by date (newest first)
      const sorted = list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllTransactionsRaw(sorted);
      
      if (sorted.length > 0) {
        toast.success(`Loaded ${sorted.length} TDS commission${sorted.length > 1 ? 's' : ''}`);
      } else {
        toast.info("No TDS commissions found");
      }
    } catch (error: any) {
      setAllTransactionsRaw([]);
      
      if (error.response?.status === 404) {
        toast.info("No TDS commissions found");
      } else {
        toast.error(error.response?.data?.message || "Failed to fetch TDS commissions");
      }
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  // Fetch data on component mount
  useEffect(() => {
    if (userId && token) {
      fetchAllTransactions();
    }
  }, [userId, token, fetchAllTransactions]);

  // Apply all filters (date, status, search) on the frontend
  useEffect(() => {
    let filtered = [...allTransactionsRaw];

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.created_at);
        const txDateStr = txDate.toISOString().split('T')[0];
        
        const start = startDate || "1900-01-01";
        const end = endDate || "2100-12-31";
        
        return txDateStr >= start && txDateStr <= end;
      });
    }

    // Status filter
    if (statusFilter && statusFilter !== "ALL") {
      filtered = filtered.filter((t) => t.status.toUpperCase() === statusFilter.toUpperCase());
    }

    // Search filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        t.transaction_id.toLowerCase().includes(s) ||
        t.user_id.toLowerCase().includes(s) ||
        t.user_name.toLowerCase().includes(s) ||
        t.pan_number.toLowerCase().includes(s) ||
        t.tds_commision_id.toString().includes(s)
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allTransactionsRaw, startDate, endDate, statusFilter, searchTerm]);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setCurrentPage(1);
    toast.success("All filters cleared");
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      if (filteredTransactions.length === 0) {
        toast.error("No TDS commissions to export");
        return;
      }

      const data = filteredTransactions.map((t, i) => ({
        "S.No": i + 1,
        "Date & Time": formatDate(t.created_at),
        "TDS Commission ID": t.tds_commision_id,
        "Transaction ID": t.transaction_id,
        "User ID": t.user_id,
        "User Name": t.user_name,
        "PAN Number": t.pan_number,
        "Commission (₹)": t.commision.toFixed(2),
        "TDS (₹)": t.tds.toFixed(2),
        "Paid Commission (₹)": t.paid_commision.toFixed(2),
        "Status": t.status,
      }));

      // Calculate totals from filtered data
      const totalCommission = filteredTransactions.reduce((sum, t) => sum + t.commision, 0);
      const totalTDS = filteredTransactions.reduce((sum, t) => sum + t.tds, 0);
      const totalPaidCommission = filteredTransactions.reduce((sum, t) => sum + t.paid_commision, 0);

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "TDS Commission ID": "",
        "Transaction ID": "TOTAL",
        "User ID": "",
        "User Name": "",
        "PAN Number": "",
        "Commission (₹)": totalCommission.toFixed(2),
        "TDS (₹)": totalTDS.toFixed(2),
        "Paid Commission (₹)": totalPaidCommission.toFixed(2),
        "Status": "",
      };

      const finalData = [...data, summaryRow];
      const ws = XLSX.utils.json_to_sheet(finalData);

      ws["!cols"] = [
        { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 38 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 18 }, { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TDS Commissions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `MD_TDS_Commissions_${userId}_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredTransactions.length} TDS commissions successfully`);
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case "SUCCESS":
        return <Badge className="bg-green-50 text-green-700 border-green-300">Success</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-50 text-red-700 border-red-300">Failed</Badge>;
      case "DEDUCTED":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-300">Deducted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleViewDetails = (transaction: TDSCommission) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  // Stats calculations based on filtered data
  const totalCommission = filteredTransactions.reduce((sum, t) => sum + t.commision, 0);
  const totalTDS = filteredTransactions.reduce((sum, t) => sum + t.tds, 0);
  const totalPaidCommission = filteredTransactions.reduce((sum, t) => sum + t.paid_commision, 0);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedTransactions = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <DashboardLayout role="master">
      <div className="min-h-screen bg-muted/10">
        {/* PAGE HEADER */}
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
              <h1 className="text-2xl font-bold">TDS Commissions</h1>
              <p className="mt-1 text-sm text-white/80">
                View and manage your TDS commission records
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
          {/* Stats Cards */}
          {searched && filteredTransactions.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Total Commission</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{formatAmount(totalCommission)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Total TDS Deducted</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{formatAmount(totalTDS)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Net Paid Commission</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{formatAmount(totalPaidCommission)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || getTodayDate()}
                    className="border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={getTodayDate()}
                    className="border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Status</Label>
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => setStatusFilter(value)}
                  >
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="DEDUCTED">Deducted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Search
                  </Label>
                  <Input
                    placeholder="Search by transaction ID, PAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-slate-300 bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  Transaction History ({filteredTransactions.length} records)
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={fetchAllTransactions}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    className="text-white hover:bg-white/20"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </Button>
                  <Button
                    onClick={exportToExcel}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    disabled={filteredTransactions.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Controls */}
              {filteredTransactions.length > 0 && (
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
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-medium text-slate-700">entries</span>
                    </div>
                    <div className="text-sm text-slate-700">
                      Showing {filteredTransactions.length === 0 ? 0 : indexOfFirstRecord + 1} to{" "}
                      {Math.min(indexOfLastRecord, filteredTransactions.length)} of{" "}
                      {filteredTransactions.length} entries
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Loading TDS commissions...</p>
                  </div>
                ) : paginatedTransactions.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="mb-2 text-lg font-semibold">No TDS commissions found</p>
                    <p className="text-sm text-muted-foreground">
                      {searched
                        ? "Try adjusting your filters or search terms"
                        : "Click 'Refresh' to load commissions"}
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
                          TDS ID
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          PAN Number
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Commission (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          TDS (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Paid (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Status
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx, idx) => (
                        <TableRow
                          key={tx.tds_commision_id}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          } border-b transition-colors duration-200 hover:bg-paybazaar-blue/5`}
                        >
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {indexOfFirstRecord + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {formatDate(tx.created_at)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge className="border-blue-200 bg-blue-50 font-mono text-xs text-blue-700">
                              {tx.tds_commision_id}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-xs font-semibold text-slate-700">
                            {tx.pan_number}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-blue-600">
                            ₹{formatAmount(tx.commision)}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-red-600">
                            ₹{formatAmount(tx.tds)}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-green-600">
                            ₹{formatAmount(tx.paid_commision)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            {getStatusBadge(tx.status)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(tx)}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {filteredTransactions.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
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
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
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
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Note */}
          <Card className="border-gray-200 bg-gray-50 shadow-md">
            <CardContent className="p-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                About TDS on Commissions:
              </h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>TDS is deducted at 2% on all commission earnings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>Paid Commission = Original Commission - TDS Amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>TDS certificates will be issued as per tax regulations</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>TDS Commission Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">TDS Commission ID</Label>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {selectedTransaction.tds_commision_id}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">User ID</Label>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {selectedTransaction.user_id}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">User Name</Label>
                    <p className="mt-1 font-medium">{selectedTransaction.user_name}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">PAN Number</Label>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {selectedTransaction.pan_number}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedTransaction.status)}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Commission Amount</Label>
                    <p className="mt-1 text-lg font-semibold text-blue-600">
                      ₹{formatAmount(selectedTransaction.commision)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">TDS Deducted</Label>
                    <p className="mt-1 text-lg font-semibold text-red-600">
                      ₹{formatAmount(selectedTransaction.tds)}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">Paid Commission (After TDS)</Label>
                    <p className="mt-1 text-xl font-semibold text-green-600">
                      ₹{formatAmount(selectedTransaction.paid_commision)}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">Created At</Label>
                    <p className="mt-1 font-medium">
                      {formatDate(selectedTransaction.created_at)}
                    </p>
                  </div>
                </div>

                {/* TDS Calculation Breakdown */}
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="pt-6">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">TDS Calculation Breakdown</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Commission:</span>
                        <span className="font-medium text-blue-600">₹{formatAmount(selectedTransaction.commision)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">TDS Deducted (2%):</span>
                        <span className="font-medium text-red-600">- ₹{formatAmount(selectedTransaction.tds)}</span>
                      </div>
                      <div className="my-2 h-px bg-gray-300"></div>
                      <div className="flex justify-between text-base">
                        <span className="font-semibold text-gray-700">Net Paid Commission:</span>
                        <span className="font-bold text-green-600">₹{formatAmount(selectedTransaction.paid_commision)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MDTDSCommissionPage;