import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import CreateDistributorModal from "@/components/CreateDistributorModal";
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
import { Download, RefreshCw } from "lucide-react";
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

interface Distributor {
  distributor_unique_id: string;
  distributor_name: string;
  distributor_email: string;
  distributor_phone: string;
  distributor_wallet_balance: string;
}

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

const MasterDashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [masterDistributorId, setMasterDistributorId] = useState("");
  const [masterDistributorName, setMasterDistributorName] = useState("");

  // Decode token on mount
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
      
      const id = decoded?.user_id; // user_id is the master_distributor_id
      const name = decoded?.user_name; // user_name is the master_distributor_name

      if (!id) {
        console.error("❌ Master Distributor ID missing in token");
        setError("Master Distributor ID missing in token.");
        setLoading(false);
        return;
      }

      console.log("✅ Master Distributor ID:", id);
      console.log("✅ Master Distributor Name:", name);

      setMasterDistributorId(id);
      setMasterDistributorName(name || "Master Distributor");
    } catch (err) {
      console.error("❌ Token decode error:", err);
      setError("Failed to decode token.");
      setLoading(false);
    }
  }, []);

  // Fetch both distributors and wallet balance
  const fetchData = async () => {
    if (!masterDistributorId) {
      console.warn("⚠️ Master Distributor ID not available yet");
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

    console.log("🔄 Fetching data for Master Distributor:", masterDistributorId);

    try {
      // Fetch distributors
      const distEndpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/get/distributors/${masterDistributorId}`;
      console.log("📡 Distributors endpoint:", distEndpoint);
      
      const distRes = await axios.get(distEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📦 Distributors response:", distRes.data);

      let data = distRes.data?.data;

      if (distRes.data.status === "success") {
        if (Array.isArray(data)) {
          console.log(`✅ Found ${data.length} distributors`);
          setDistributors(data);
          setFilteredDistributors(data);
        } else {
          console.warn("⚠️ Distributors data is not an array");
          setDistributors([]);
          setFilteredDistributors([]);
        }
        setError("");
      } else {
        console.error("❌ Failed to load distributors:", distRes.data);
        setError("Failed to load distributors");
        setDistributors([]);
        setFilteredDistributors([]);
      }

      // Fetch wallet balance
      const walletEndpoint = `${import.meta.env.VITE_API_BASE_URL}/wallet/get/balance/md/${masterDistributorId}`;
      console.log("💰 Wallet endpoint:", walletEndpoint);
      
      const walletRes = await axios.get(walletEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("💵 Wallet response:", walletRes.data);

      const wData = walletRes.data?.data?.wallet_balance;

      if (walletRes.data.status === "success" && wData !== undefined) {
        const balance = Number(wData);
        console.log("✅ Wallet balance:", balance);
        setWalletBalance(balance);
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
      setDistributors([]);
      setFilteredDistributors([]);
      setWalletBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [masterDistributorId]);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDistributors(distributors);
      setCurrentPage(1);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = distributors.filter((dist) => {
      const searchableFields = [
        dist.distributor_unique_id,
        dist.distributor_name,
        dist.distributor_email,
        dist.distributor_phone,
      ];

      return searchableFields.some((field) =>
        String(field).toLowerCase().includes(searchLower)
      );
    });

    setFilteredDistributors(filtered);
    setCurrentPage(1);
  }, [searchTerm, distributors]);

  const totalDistribution = distributors.reduce(
    (sum, d) => sum + parseFloat(d.distributor_wallet_balance || "0"),
    0
  );

  const activeDistributors = distributors.length;
  const avgBalance =
    activeDistributors > 0 ? totalDistribution / activeDistributors : 0;

  // Top distributors by balance
  const topDistributors = [...distributors]
    .sort(
      (a, b) =>
        parseFloat(b.distributor_wallet_balance || "0") -
        parseFloat(a.distributor_wallet_balance || "0")
    )
    .slice(0, 5);

  // Pagination
  const totalPages = Math.ceil(filteredDistributors.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedDistributors = filteredDistributors.slice(startIndex, endIndex);

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const exportData = filteredDistributors.map((dist, index) => ({
        "S.No": index + 1,
        "Distributor ID": dist.distributor_unique_id,
        "Name": dist.distributor_name,
        "Email": dist.distributor_email,
        "Phone": dist.distributor_phone,
        "Wallet Balance (₹)": parseFloat(dist.distributor_wallet_balance || "0").toFixed(2),
        "Status": "Active"
      }));

      const summaryRow = {
        "S.No": "",
        "Distributor ID": "",
        "Name": "",
        "Email": "",
        "Phone": "TOTAL:",
        "Wallet Balance (₹)": totalDistribution.toFixed(2),
        "Status": ""
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);

      const columnWidths = [
        { wch: 8 },
        { wch: 20 },
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Distributors");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Distributors_List_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  return (
    <DashboardLayout role="master">
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="paybazaar-gradient text-white p-6">
          <div>
            <h1 className="text-2xl font-bold">Master Distributor Dashboard</h1>
            <p className="text-white/80 text-sm mt-1">
              Welcome back, {masterDistributorName}
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

            {/* Total Distributors */}
            <Card className="paybazaar-gradient text-white border-0 shadow-md">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Total Distributors
                </p>
                <p className="text-3xl font-bold">{activeDistributors}</p>
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
                  {totalDistribution.toLocaleString("en-IN", {
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
            {/* Top Distributors */}
            <Card className="border-0 shadow-md lg:col-span-1">
              <CardHeader className="paybazaar-gradient text-white">
                <CardTitle className="text-lg">Top 5 Distributors</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {topDistributors.length > 0 ? (
                  <div className="space-y-4">
                    {topDistributors.map((dist, index) => (
                      <div
                        key={dist.distributor_unique_id}
                        className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {dist.distributor_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {dist.distributor_unique_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">
                            ₹
                            {parseFloat(
                              dist.distributor_wallet_balance || "0"
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No distributors yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution Overview */}
            <Card className="border-0 shadow-md lg:col-span-2">
              <CardHeader className="paybazaar-gradient text-white">
                <CardTitle className="text-lg">Distribution Overview</CardTitle>
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
                        <Badge className="bg-green-500 text-white">Active</Badge>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {activeDistributors} / {distributors.length}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Active Distributors
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">
                          Fund Distribution
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {((totalDistribution / (walletBalance || 1)) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Of Total Balance
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Highest Balance
                      </span>
                      <span className="font-bold">
                        ₹
                        {topDistributors.length > 0
                          ? parseFloat(
                              topDistributors[0].distributor_wallet_balance || "0"
                            ).toLocaleString("en-IN")
                          : "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Lowest Balance
                      </span>
                      <span className="font-bold">
                        ₹
                        {distributors.length > 0
                          ? parseFloat(
                              [...distributors].sort(
                                (a, b) =>
                                  parseFloat(a.distributor_wallet_balance || "0") -
                                  parseFloat(b.distributor_wallet_balance || "0")
                              )[0].distributor_wallet_balance || "0"
                            ).toLocaleString("en-IN")
                          : "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Total Network
                      </span>
                      <span className="font-bold">{distributors.length} Users</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        Available to Distribute
                      </span>
                      <span className="font-bold text-primary">
                        ₹
                        {(walletBalance - totalDistribution).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distributors Table */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="paybazaar-gradient text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Distributors List</CardTitle>
                <Button
                  onClick={exportToExcel}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  disabled={filteredDistributors.length === 0}
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
                    <span className="text-sm text-white font-medium">Show</span>
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
                    <span className="text-sm text-white font-medium">entries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">Search:</span>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-56 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                      placeholder="Search distributors..."
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
                      Loading distributors...
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
                ) : paginatedDistributors.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-lg font-semibold mb-2">
                      {searchTerm
                        ? "No matching distributors found"
                        : "No distributors found"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "Add your first distributor to get started"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="paybazaar-gradient hover:opacity-95">
                        <TableHead className="font-bold text-white text-center">
                          DISTRIBUTOR ID
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
                      {paginatedDistributors.map((dist, index) => (
                        <TableRow
                          key={dist.distributor_unique_id}
                          className={`${
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          } hover:bg-muted/50 transition-colors`}
                        >
                          <TableCell className="text-center font-mono text-sm py-4">
                            {dist.distributor_unique_id}
                          </TableCell>
                          <TableCell className="text-center font-medium py-4">
                            {dist.distributor_name}
                          </TableCell>
                          <TableCell className="text-center text-sm py-4">
                            {dist.distributor_email}
                          </TableCell>
                          <TableCell className="text-center font-mono py-4">
                            {dist.distributor_phone}
                          </TableCell>
                          <TableCell className="text-center font-semibold py-4">
                            ₹
                            {parseFloat(
                              dist.distributor_wallet_balance || "0"
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <Badge className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {filteredDistributors.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredDistributors.length)} of{" "}
                    {filteredDistributors.length} entries
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
        </div>

        <CreateDistributorModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={() => {
            fetchData();
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default MasterDashboard;