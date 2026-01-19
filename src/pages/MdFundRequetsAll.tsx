"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { DashboardLayout } from "@/components/DashboardLayout";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FundRequest {
  fund_request_id: number;
  requester_id: string;
  request_to_id: string;
  amount: number;
  bank_name: string;
  request_date: string;
  utr_number: string;
  request_status: string;
  remarks: string;
reject_remarks: string;
  created_at: string;
  updated_at: string;
}

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface FundRequestFilter {
  start_date?: string;
  end_date?: string;
  status?: string;
  id: string;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MasterDistributorFundRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<FundRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [distributorId, setDistributorId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states - Initialize with today's date
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // ✅ Decode token and get master distributor user_id
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("Authentication token missing.");
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);

      // token expiry check
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        setError("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // ✅ MASTER DISTRIBUTOR ID = user_id from token
      console.log("Decoded Token:", decoded);
      console.log("Master Distributor ID (user_id):", decoded.user_id);
      setDistributorId(decoded.user_id);
    } catch (err) {
      console.error("Failed to decode token.", err);
      setError("Invalid session. Please login again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!distributorId) return;
    fetchData();
  }, [distributorId]);

const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      // ✅ Build filter payload
      // For Master Distributor: id = their user_id (they are the REQUESTER)
      const filterPayload: FundRequestFilter = {
        id: distributorId, // This should be M000003 or similar
      };

      // Add optional filters if set
      if (startDate) {
        // Format: "2026-01-14T00:00:00Z"
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        filterPayload.start_date = startDateTime.toISOString();
      }
      if (endDate) {
        // Format: "2026-01-14T23:59:59Z"
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filterPayload.end_date = endDateTime.toISOString();
      }
      if (statusFilter !== "ALL") {
        filterPayload.status = statusFilter;
      }

      // ✅ Calculate pagination offset
      const offset = (currentPage - 1) * recordsPerPage;

      // ✅ Build query params for pagination
      const queryParams = new URLSearchParams({
        limit: recordsPerPage.toString(),
        offset: offset.toString(),
      });

      console.log("=== API REQUEST ===");
      console.log("Endpoint:", import.meta.env.VITE_API_BASE_URL + "/fund_request/get/requester");
      console.log("Filter Payload:", JSON.stringify(filterPayload, null, 2));
      console.log("Pagination:", { limit: recordsPerPage, offset });
      console.log("Master Distributor ID:", distributorId);

      // ✅ POST request to get fund requests where Master Distributor is the REQUESTER
      const res = await axios.post(
        import.meta.env.VITE_API_BASE_URL + `/fund_request/get/requester?${queryParams.toString()}`,
        filterPayload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log("=== API RESPONSE ===");
      console.log("Full Response:", res.data);
      console.log("Response Status:", res.data.status);
      console.log("Response Data:", res.data.data);

      if (res.data.status === "success") {
        // ✅ Extract fund_requests array from response
        let fundRequestsData: any[] = [];
        
        if (res.data.data && res.data.data.fund_requests) {
          fundRequestsData = res.data.data.fund_requests;
          console.log("Found fund_requests in data.fund_requests");
        } else if (res.data.fund_requests) {
          fundRequestsData = res.data.fund_requests;
          console.log("Found fund_requests directly in response");
        } else if (Array.isArray(res.data.data)) {
          fundRequestsData = res.data.data;
          console.log("data is directly an array");
        } else {
          console.log("No fund_requests found in response");
        }
        
        console.log("Extracted fund_requests array:", fundRequestsData);
        console.log("Array length:", fundRequestsData.length);
        
        // Ensure we always have an array
        const fundRequests: FundRequest[] = Array.isArray(fundRequestsData) 
          ? fundRequestsData 
          : [];
        
        console.log("=== FINAL DATA ===");
        console.log("Final fund requests count:", fundRequests.length);
        console.log("Fund requests:", fundRequests);
        
        setRequests(fundRequests);
        setFilteredRequests(fundRequests);
        
        if (fundRequests.length === 0) {
          setError("No fund requests found for the selected filters.");
        } else {
          setError(null);
        }
      } else {
        console.log("API response status is not success");
        setRequests([]);
        setFilteredRequests([]);
        setError(res.data.message || "Failed to load fund requests.");
      }

      // ✅ Fetch wallet balance for master distributor
      try {
        const walletRes = await axios.get(
          import.meta.env.VITE_API_BASE_URL + `/md/wallet/get/balance/${distributorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("Wallet Response:", walletRes.data);
        const balance = walletRes.data?.data?.balance;
        setWalletBalance(balance ? Number(balance) : 0);
      } catch (walletErr) {
        console.error("Error fetching wallet balance:", walletErr);
        // Don't fail the whole request if wallet fetch fails
        setWalletBalance(0);
      }
    } catch (err: any) {
      console.error("=== ERROR ===");
      console.error("Error fetching fund requests:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      // Always ensure we have arrays set
      setRequests([]);
      setFilteredRequests([]);
      
      if (err.response?.status === 404) {
        setError("No fund requests found.");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to fetch fund requests. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Apply search filter (client-side)
  useEffect(() => {
    let filtered = [...requests];

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.requester_id?.toLowerCase().includes(searchLower) ||
          req.request_to_id?.toLowerCase().includes(searchLower) ||
          req.bank_name?.toLowerCase().includes(searchLower) ||
          req.utr_number?.toLowerCase().includes(searchLower) ||
          req.remarks?.toLowerCase().includes(searchLower) ||
          req.fund_request_id?.toString().includes(searchLower)
      );
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [searchTerm, requests]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
  };

  // Apply filters (triggers API call)
  const applyFilters = () => {
    fetchData();
  };

  // Format date - Only show date without time
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Pagination logic
  const safeFilteredRequests = Array.isArray(filteredRequests) ? filteredRequests : [];
  const totalPages = Math.ceil(safeFilteredRequests.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = safeFilteredRequests.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case "APPROVED":
        return "border-green-200 bg-green-50 text-green-700";
      case "PENDING":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "REJECTED":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

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
              <h1 className="text-2xl font-bold">My Fund Requests</h1>
              <p className="mt-1 text-sm text-white/80">
                View and track your fund requests to Admin
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
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
                <div className="flex gap-2">
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    onClick={applyFilters}
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Apply
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Search
                  </Label>
                  <Input
                    placeholder="Search by ID, bank, UTR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-slate-300 bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fund Requests Table */}
          <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
            <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full bg-white/30"></div>
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      Fund Requests
                    </CardTitle>
                    <CardDescription className="mt-1 text-white/90">
                      {safeFilteredRequests.length} request
                      {safeFilteredRequests.length !== 1 ? "s" : ""} found
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={fetchData}
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
                    Showing {indexOfFirstRecord + 1} to{" "}
                    {Math.min(indexOfLastRecord, safeFilteredRequests.length)} of{" "}
                    {safeFilteredRequests.length} entries
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading fund requests...
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-lg font-semibold text-foreground">
                      {error}
                    </p>
                  </div>
                ) : safeFilteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-lg font-semibold text-foreground">
                      No fund requests found
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
                          Request ID
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Requested To
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Bank Name
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          UTR Number
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Request Date
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Amount (₹)
                        </TableHead>
                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Remarks
                        </TableHead>
                          <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Reject Reason 
                          </TableHead>

                        <TableHead className="text-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {currentRecords.map((req, idx) => (
                        <TableRow
                          key={req.fund_request_id}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          } transition-colors duration-200 hover:bg-paybazaar-blue/5`}
                        >
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {indexOfFirstRecord + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm font-semibold text-slate-700">
                            #{req.fund_request_id}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm font-semibold text-slate-700">
                            {req.request_to_id}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {req.bank_name || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center font-mono text-sm text-slate-700">
                            {req.utr_number || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            {formatDate(req.request_date)}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm font-semibold text-slate-700">
                            ₹{" "}
                            {req.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            {req.remarks || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm text-slate-700">
                            {req.reject_remarks || "-"}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge className={getStatusBadge(req.request_status)}>
                              {req.request_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {safeFilteredRequests.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                              className={
                                currentPage === pageNum
                                  ? "paybazaar-gradient text-white"
                                  : ""
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
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
        </div>
      </div>
    </DashboardLayout>
  );
}