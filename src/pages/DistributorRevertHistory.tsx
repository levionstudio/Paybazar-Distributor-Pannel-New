import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { 
  Loader2, 
  RefreshCw, 
  History, 
  ArrowLeft, 
  Search, 
  Filter,
  X,
  Download,
  Calendar,
  IndianRupee,
  Users,
  FileText
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface RevertTransaction {
  revert_transaction_id: number;
  revert_from_id: string;
  revert_on_id: string;
  revert_from_name: string;
  revert_on_name: string;
  amount: number;
  remarks: string;
  created_at: string;
}

export default function DistributorRevertHistory() {
  const navigate = useNavigate();
  const [distributorId, setDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<RevertTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<RevertTransaction[]>([]);
  const [searched, setSearched] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Filters
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

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
      
      // Token expiry check
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

  // Auto-fetch on mount
  useEffect(() => {
    if (distributorId) {
      fetchRevertTransactions();
    }
  }, [distributorId]);

  // Get user type from ID prefix
  const getUserType = (id: string): string => {
    if (!id) return "Unknown";

    if (id.startsWith("R")) return "Retailer";
 
    return "Unknown";
  };

  // Fetch revert transactions
  const fetchRevertTransactions = async () => {
    if (!distributorId) {
      toast.error("Distributor ID not found. Please login again.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsLoadingData(true);
    setSearched(true);

    try {
      const payload: any = {
        id: distributorId,
      };

      if (startDate) {
        payload.start_date = new Date(startDate).toISOString();
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        payload.end_date = endDateTime.toISOString();
      }

      console.log("Fetching with payload:", payload);

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/revert/get/revert/from`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data && response.data.status === "success") {
        const transactionList = response.data.data || [];
        
        // Sort by created_at (most recent first)
        const sortedTransactions = [...transactionList].sort((a, b) => {
          try {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB.getTime() - dateA.getTime();
          } catch {
            return 0;
          }
        });
        
        setTransactions(sortedTransactions);
        setFilteredTransactions(sortedTransactions);
        setCurrentPage(1);
        
        if (sortedTransactions.length > 0) {
          toast.success(`Loaded ${sortedTransactions.length} revert transaction${sortedTransactions.length > 1 ? 's' : ''}`);
        } else {
          toast.info("No revert transactions found");
        }
      } else {
        setTransactions([]);
        setFilteredTransactions([]);
        toast.info("No revert transactions found");
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setTransactions([]);
      setFilteredTransactions([]);
      
      if (error.response?.status === 404) {
        toast.info("No revert transactions found");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to fetch revert transactions"
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...transactions];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((txn) => {
        const userType = getUserType(txn.revert_on_id);
        return userType.toLowerCase().includes(statusFilter.toLowerCase());
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((txn) => 
        txn.revert_on_name.toLowerCase().includes(query) ||
        txn.revert_from_name.toLowerCase().includes(query) ||
        txn.revert_on_id.toLowerCase().includes(query) ||
        txn.remarks.toLowerCase().includes(query) ||
        txn.amount.toString().includes(query)
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [statusFilter, searchQuery, transactions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRevertTransactions();
  };

  const handleClearFilters = () => {
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredTransactions.map((record, index) => ({
        "S.No": index + 1,
        "Transaction ID": record.revert_transaction_id,
        "From ID": record.revert_from_id,
        "From Name": record.revert_from_name,
        "To ID": record.revert_on_id,
        "To Name": record.revert_on_name,
        "User Type": getUserType(record.revert_on_id),
        "Amount (₹)": record.amount.toFixed(2),
        "Remarks": record.remarks,
        "Date & Time": formatDate(record.created_at),
      }));

      // Add summary row
      const totalAmount = filteredTransactions.reduce(
        (sum, record) => sum + record.amount,
        0
      );

      const summaryRow = {
        "S.No": "",
        "Transaction ID": "",
        "From ID": "",
        "From Name": "TOTAL",
        "To ID": "",
        "To Name": "",
        "User Type": "",
        "Amount (₹)": totalAmount.toFixed(2),
        "Remarks": `Total Records: ${filteredTransactions.length}`,
        "Date & Time": "",
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);

      const columnWidths = [
        { wch: 8 },  // S.No
        { wch: 15 }, // Transaction ID
        { wch: 15 }, // From ID
        { wch: 25 }, // From Name
        { wch: 15 }, // To ID
        { wch: 25 }, // To Name
        { wch: 20 }, // User Type
        { wch: 15 }, // Amount
        { wch: 30 }, // Remarks
        { wch: 20 }, // Date & Time
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Revert Transactions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Distributor_Revert_Transactions_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);

      toast.success("Revert transactions exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
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
        hour12: true,
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

  // Calculate totals
  const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const totalRecords = filteredTransactions.length;

  // Get counts by user type
  const userTypeCounts = {
  
    retailer: filteredTransactions.filter(t => getUserType(t.revert_on_id) === "Retailer").length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedTransactions = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);

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
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Revert Transaction History</h1>
              <p className="mt-1 text-sm text-white/80">
                View and manage all your revert transactions
              </p>
            </div>
            <Button
              onClick={fetchRevertTransactions}
              variant="ghost"
              size="sm"
              disabled={isLoadingData}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
          {/* Stats Cards */}
          {searched && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <History className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-bold text-foreground">{totalRecords}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <IndianRupee className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold text-foreground">₹{formatAmount(totalAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          

              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-muted-foreground">Retailers</p>
                      <p className="text-xl font-bold text-foreground">
                        {userTypeCounts.retailer}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters Section */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 rounded-full bg-white/30"></div>
                <div>
                  <CardTitle className="text-xl font-semibold">Filters</CardTitle>
                  <CardDescription className="mt-1 text-white/90">
                    Filter transactions by date range and user type
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setEndDate(e.target.value);
                      }}
                      max={getTodayDate()}
                      className="h-11 bg-background"
                      disabled={isLoadingData}
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-sm font-medium">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      // max={getTodayDate()+}
                      className="h-11 bg-background"
                      disabled={isLoadingData}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="status-filter" className="text-sm font-medium">
                      User Type
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                     
                        <SelectItem value="retailer">Retailer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="text-sm font-medium">
                      Search
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 pl-10 bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={isLoadingData}
                    className="paybazaar-gradient h-11 font-semibold text-white shadow-lg hover:opacity-90"
                  >
                    {isLoadingData ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Apply Filters
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="h-11"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardContent className="p-0">
              {/* Table Controls */}
              {filteredTransactions.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/30 px-4 md:px-6 py-4 gap-3 border-b">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Show</span>
                    <Select
                      value={recordsPerPage.toString()}
                      onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 w-20 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-medium">entries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Showing {indexOfFirstRecord + 1} to{" "}
                      {Math.min(indexOfLastRecord, filteredTransactions.length)} of{" "}
                      {filteredTransactions.length} entries
                    </span>
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      disabled={filteredTransactions.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                {isLoadingData ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : paginatedTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                      <History className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searched
                        ? "Try adjusting your filters or search query"
                        : "Click 'Apply Filters' to load transactions"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          S.No
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          Transaction ID
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          From
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          To
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          User Type
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          Amount (₹)
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          Remarks
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase whitespace-nowrap px-4">
                          Date & Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((txn, idx) => {
                        const userType = getUserType(txn.revert_on_id);

                        return (
                          <TableRow
                            key={txn.revert_transaction_id}
                            className={`border-b hover:bg-muted/50 transition-colors ${
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }`}
                          >
                            {/* S.No */}
                            <TableCell className="py-4 px-4 text-center text-sm font-medium">
                              {indexOfFirstRecord + idx + 1}
                            </TableCell>

                            {/* Transaction ID */}
                            <TableCell className="py-4 px-4 text-center">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-mono text-xs">
                                #{txn.revert_transaction_id}
                              </Badge>
                            </TableCell>

                            {/* From */}
                            <TableCell className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-sm">
                                  {txn.revert_from_name}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {txn.revert_from_id}
                                </span>
                              </div>
                            </TableCell>

                            {/* To */}
                            <TableCell className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-sm">
                                  {txn.revert_on_name}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {txn.revert_on_id}
                                </span>
                              </div>
                            </TableCell>

                            {/* User Type */}
                            <TableCell className="py-4 px-4 text-center">
                              <Badge className="bg-muted text-foreground border-border font-medium text-xs">
                                {userType}
                              </Badge>
                            </TableCell>

                            {/* Amount */}
                            <TableCell className="py-4 px-4 text-center">
                              <span className="font-bold text-base text-red-600">
                                ₹{formatAmount(txn.amount)}
                              </span>
                            </TableCell>

                            {/* Remarks */}
                            <TableCell className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate">
                                  {txn.remarks}
                                </span>
                              </div>
                            </TableCell>

                            {/* Date & Time */}
                            <TableCell className="py-4 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {formatDate(txn.created_at)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {filteredTransactions.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/30 border-t px-4 md:px-6 py-4 gap-3">
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
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
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Important Notes:
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>All revert transactions are tracked and logged for audit purposes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Use filters to narrow down transactions by date range and user type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Export to Excel for detailed analysis and record keeping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Transaction amounts are displayed in Indian Rupees (₹)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}