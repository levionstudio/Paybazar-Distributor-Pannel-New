import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_email: string;
  retailer_phone: string;
  wallet_balance: number;
  is_blocked: boolean;
  kyc_status: boolean;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DistributorDashboard = () => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [distributorId, setDistributorId] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("❌ Authentication token not found");
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log("📦 Decoded token:", decoded);
      
      const id = decoded?.user_id; // user_id is the distributor_id
      const name = decoded?.user_name; // user_name is the distributor_name

      if (!id) {
        console.error("❌ Distributor ID missing in token");
        setError("Distributor ID missing in token.");
        setLoading(false);
        return;
      }

      console.log("✅ Distributor ID:", id);
      console.log("✅ Distributor Name:", name);

      setDistributorId(id);
      setDistributorName(name || "Distributor");
    } catch (err) {
      console.error("❌ Token decode error:", err);
      setError("Failed to decode token.");
      setLoading(false);
    }
  }, []);

  // Fetch retailers + wallet
  const fetchData = async () => {
    if (!distributorId) {
      console.warn("⚠️ Distributor ID not available yet");
      return;
    }
    
    setLoading(true);

    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("❌ Authentication token missing");
      setError("Authentication token missing.");
      setLoading(false);
      return;
    }

    console.log("🔄 Fetching data for Distributor:", distributorId);

    try {
      // Fetch retailers using correct endpoint
const retailerEndpoint = `${API_BASE_URL}/retailer/get/distributor/${distributorId}?limit=100&offset=0`;
      console.log("📡 Retailers endpoint:", retailerEndpoint);
      
      const res = await axios.get(retailerEndpoint, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });

      console.log("📦 Retailers response:", res.data);

      if (res.data.status === "success") {
        let data = res.data?.data;
        
        // Handle different response structures
        let retailersList: Retailer[] = [];
        
        if (Array.isArray(data)) {
          retailersList = data;
        } else if (data?.retailers && Array.isArray(data.retailers)) {
          retailersList = data.retailers;
        }

        console.log(`✅ Found ${retailersList.length} retailers`);
        setRetailers(retailersList);
        setFilteredRetailers(retailersList);
        setError(null);
      } else {
        console.error("❌ Failed to load retailers:", res.data);
        setRetailers([]);
        setFilteredRetailers([]);
        setError(res.data.message || "Failed to load retailers.");
      }

      // Fetch wallet balance using correct endpoint
      const walletEndpoint = `${API_BASE_URL}/wallet/get/balance/distributor/${distributorId}`;
      console.log("💰 Wallet endpoint:", walletEndpoint);
      
      const walletRes = await axios.get(walletEndpoint, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });

      console.log("💵 Wallet response:", walletRes.data);

      if (walletRes.data.status === "success") {
        const balance = walletRes.data?.data?.balance ?? 
                       walletRes.data?.data?.wallet_balance ?? 
                       0;
        console.log("✅ Wallet balance:", balance);
        setWalletBalance(Number(balance));
      } else {
        console.warn("⚠️ Wallet balance not found in response");
        setWalletBalance(0);
      }
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      setError(err.response?.data?.message || "Failed to load data");
      setRetailers([]);
      setFilteredRetailers([]);
      setWalletBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [distributorId]);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRetailers(retailers);
      setCurrentPage(1);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = retailers.filter((retailer) => {
      const searchableFields = [
        retailer.retailer_id,
        retailer.retailer_name,
        retailer.retailer_email,
        retailer.retailer_phone,
      ];

      return searchableFields.some((field) =>
        String(field).toLowerCase().includes(searchLower)
      );
    });

    setFilteredRetailers(filtered);
    setCurrentPage(1);
  }, [searchTerm, retailers]);

  // Stats
  const totalRetailers = retailers.length;
  const activeRetailers = retailers.filter((r) => !r.is_blocked).length;
  const totalBalance = retailers.reduce(
    (sum, r) => sum + (r.wallet_balance || 0),
    0
  );
  const avgBalance = totalRetailers > 0 ? totalBalance / totalRetailers : 0;

  // Top retailers by balance
  const topRetailers = [...retailers]
    .sort((a, b) => (b.wallet_balance || 0) - (a.wallet_balance || 0))
    .slice(0, 5);

  // Pagination
  const totalPages = Math.ceil(filteredRetailers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedRetailers = filteredRetailers.slice(startIndex, endIndex);

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const exportData = filteredRetailers.map((retailer, index) => ({
        "S.No": index + 1,
        "Retailer ID": retailer.retailer_id,
        "Name": retailer.retailer_name,
        "Email": retailer.retailer_email,
        "Phone": retailer.retailer_phone,
        "Wallet Balance (₹)": (retailer.wallet_balance || 0).toFixed(2),
        "KYC Status": retailer.kyc_status ? "Verified" : "Pending",
        "Status": retailer.is_blocked ? "Blocked" : "Active",
      }));

      // Add summary row
      const summaryRow = {
        "S.No": "",
        "Retailer ID": "",
        "Name": "",
        "Email": "",
        "Phone": "TOTAL:",
        "Wallet Balance (₹)": totalBalance.toFixed(2),
        "KYC Status": "",
        "Status": "",
      };

      const finalData = [...exportData, summaryRow];

      const worksheet = XLSX.utils.json_to_sheet(finalData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },
        { wch: 20 },
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Retailers");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Retailers_List_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  return (
    <DashboardLayout role="distributor" >
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="paybazaar-gradient text-white p-6">
          <div>
            <h1 className="text-2xl font-bold">Distributor Dashboard</h1>
            <p className="text-white/80 text-sm mt-1">
              Welcome back, {distributorName}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Wallet Balance */}
            <Card className="paybazaar-gradient text-white border-0 shadow-md">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Wallet Balance
                </p>
                <p className="text-3xl font-bold">
                  ₹
                  {walletBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Total Retailers */}
            <Card className="paybazaar-gradient text-white border-0 shadow-md">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Total Retailers
                </p>
                <p className="text-3xl font-bold">{totalRetailers}</p>
              </CardContent>
            </Card>

            {/* Total Distribution */}
            <Card className="paybazaar-gradient text-white border-0 shadow-md">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Total Distribution
                </p>
                <p className="text-3xl font-bold">
                  ₹
                  {totalBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Average Balance */}
            <Card className="paybazaar-gradient text-white border-0 shadow-md">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Average Balance
                </p>
                <p className="text-3xl font-bold">
                  ₹
                  {avgBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Retailers */}
            <Card className="border-0 shadow-md lg:col-span-1">
              <CardHeader className="paybazaar-gradient text-white">
                <CardTitle className="text-lg">Top 5 Retailers</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {topRetailers.length > 0 ? (
                  <div className="space-y-4">
                    {topRetailers.map((retailer, index) => (
                      <div
                        key={retailer.retailer_id}
                        className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {retailer.retailer_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {retailer.retailer_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">
                            ₹
                            {(retailer.wallet_balance || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No retailers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution Overview */}
            <Card className="border-0 shadow-md lg:col-span-2">
              <CardHeader className="paybazaar-gradient text-white">
                <CardTitle className="text-lg">
                  Distribution Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Network Stats */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">
                          Network Status
                        </span>
                        <Badge className="bg-green-500 text-white">
                          Active
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {activeRetailers} / {totalRetailers}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Active Retailers
                      </p>
                    </div>

                    {/* <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">
                          Fund Distribution
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {((totalBalance / (walletBalance || 1)) * 100).toFixed(
                          1
                        )}
                        %
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Of Total Balance
                      </p>
                    </div> */}
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Highest Balance
                      </span>
                      <span className="font-bold">
                        ₹
                        {topRetailers.length > 0
                          ? (topRetailers[0].wallet_balance || 0).toLocaleString(
                              "en-IN"
                            )
                          : "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Lowest Balance
                      </span>
                      <span className="font-bold">
                        ₹
                        {retailers.length > 0
                          ? (
                              [...retailers].sort(
                                (a, b) => (a.wallet_balance || 0) - (b.wallet_balance || 0)
                              )[0].wallet_balance || 0
                            ).toLocaleString("en-IN")
                          : "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Total Network
                      </span>
                      <span className="font-bold">
                        {totalRetailers} Users
                      </span>
                    </div>
                    {/* <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        Available to Distribute
                      </span>
                      <span className="font-bold text-primary">
                        ₹
                        {(walletBalance - totalBalance).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div> */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Retailers Table */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="paybazaar-gradient text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Retailers List</CardTitle>
                <Button
                  onClick={exportToExcel}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  disabled={filteredRetailers.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Table Controls */}
              <div className="paybazaar-gradient p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">
                      Show
                    </span>
                    <Select
                      value={entriesPerPage.toString()}
                      onValueChange={(value) => {
                        setEntriesPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-white font-medium">
                      entries
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">
                      Search:
                    </span>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-56 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                      placeholder="Search retailers..."
                    />
                    <Button
                      onClick={fetchData}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-white hover:bg-white/20"
                      disabled={loading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading retailers...
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center py-20">
                    <p className="text-red-600 font-semibold mb-4">{error}</p>
                    <Button onClick={fetchData} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : paginatedRetailers.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-lg font-semibold mb-2">
                      {searchTerm
                        ? "No matching retailers found"
                        : "No retailers found"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "No retailers have been added yet"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="paybazaar-gradient hover:opacity-95">
                        <TableHead className="font-bold text-white text-center">
                          RETAILER ID
                        </TableHead>
                        <TableHead className="font-bold text-white text-center">
                          NAME
                        </TableHead>
                        <TableHead className="font-bold text-white text-center">
                          EMAIL
                        </TableHead>
                        <TableHead className="font-bold text-white text-center">
                          PHONE
                        </TableHead>
                        <TableHead className="font-bold text-white text-center">
                          WALLET BALANCE (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center">
                          STATUS
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedRetailers.map((retailer, index) => (
                        <TableRow
                          key={retailer.retailer_id}
                          className={`${
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          } hover:bg-muted/50 transition-colors`}
                        >
                          <TableCell className="text-center font-mono text-sm py-4">
                            {retailer.retailer_id}
                          </TableCell>
                          <TableCell className="text-center font-medium py-4">
                            {retailer.retailer_name}
                          </TableCell>
                          <TableCell className="text-center text-sm py-4">
                            {retailer.retailer_email}
                          </TableCell>
                          <TableCell className="text-center font-mono py-4">
                            {retailer.retailer_phone}
                          </TableCell>
                          <TableCell className="text-center font-semibold py-4">
                            ₹
                            {(retailer.wallet_balance || 0).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <Badge className={retailer.is_blocked ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}>
                              {retailer.is_blocked ? "Blocked" : "Active"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {filteredRetailers.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredRetailers.length)} of{" "}
                    {filteredRetailers.length} entries
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
};

export default DistributorDashboard;