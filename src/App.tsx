import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import MasterDashboard from "./pages/MasterDashboard";
import DistributorDashboard from "./pages/DistributorDashboard";
import RequestFund from "./pages/DistributorsFundRequestsAdd";
import NotFound from "./pages/NotFound";
import CreateRetailerPage from "./pages/CreateRetailer";
import CreateDistributorPage from "./pages/CreateDistributor";
import RequestFunds from "./pages/MasterDistributorCreateFundRquest";
import RequestFundsDistributor from "./pages/DistributorsFundRequestsAdd";
import DistributorTransactions from "./pages/WalletTrasactionDistributor";
import MdTransactions from "./pages/WalletTrasactionMD";
import DistributorFundRequests from "./pages/DistributorFundRequestAll";
import MdFundRequests from "./pages/MasterDistributorCreateFundRquest";
import MasterDistributorFundRequests from "./pages/MdFundRequetsAll";
import MdFundRetailer from "./pages/MdFundRetailer";
import MdFundDistributor from "./pages/MdFundDistributor";
import DistributorFundRetailer from "./pages/DistributorFundRetailer";
import MdRevertRequest from "./pages/MdRevertRequest";
import MdRevertHistory from "./pages/MdRevertHistory";
import DistributorRevertRequest from "./pages/DistributorRevertRequest";
import DistributorRevertHistory from "./pages/DistributorRevertHistory";
import Profile from "./pages/Profile";
import MasterDistributorProfile from "./pages/ProfileMd";
import MDTDSCommissionPage from "./pages/TdsMd";
import DistributorTDSCommissionPage from "./pages/TdsDistributor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/master" element={<MasterDashboard />} />
          <Route path="/master/*" element={<MasterDashboard />} />
          <Route path="/distributor" element={<DistributorDashboard />} />
          <Route path="/distributor/create" element={<CreateRetailerPage />} />
          <Route path="/master/create" element={<CreateDistributorPage />} />
          <Route path="/distributor/*" element={<DistributorDashboard />} />
          <Route path="/request-funds" element={<RequestFunds />} />
          <Route path="/request-funds/distributor" element={<RequestFundsDistributor />} />
          <Route path="/transactions/distributor" element={<DistributorTransactions />} />
          <Route path="/transactions/md" element={<MdTransactions />} />
           <Route path="/md/requestfund" element={<MasterDistributorFundRequests />} />
           <Route path="/distributor/requestedfund" element={<DistributorFundRequests />} />
          <Route path="/md/fund/retailer" element={<MdFundRetailer />} />
          <Route path="/md/fund/distributor" element={<MdFundDistributor />} />
          <Route path="/distributor/fund/retailer" element={<DistributorFundRetailer />} />
          <Route path="/md/revert/request" element={<MdRevertRequest />} />
          <Route path="/distributor/revert/request" element={<DistributorRevertRequest />} />
          <Route path="/md/revert/history" element={<MdRevertHistory />} />
          <Route path="/distributor/revert/history" element={<DistributorRevertHistory />} />
         <Route path="/profile" element={<MasterDistributorProfile />} />
          <Route path="/profilee" element={<Profile />} />
          <Route path ="/md/tds/history" element={<MDTDSCommissionPage />} />
          <Route path ="/distributor/tds/history" element={<DistributorTDSCommissionPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
