import React, { useEffect, useState } from "react";
import axios from "axios";
import {jwtDecode} from "jwt-decode";
import { Wallet } from "lucide-react";

interface DecodedToken {
  data: {
    master_distributor_id?: string;
    distributor_id?: string;
  };
  exp: number;
}

interface DashboardHeaderProps {
  title: string;
  walletBalance: number;
}

const DashboardHeader = ({ title, walletBalance }: DashboardHeaderProps) => {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-heading font-bold text-gradient">
                PayBazaar
              </h1>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>

          {/* Right - Wallet Balance */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-wallet-bg border-2 border-wallet-border shadow-sm">
              <Wallet className="w-5 h-5 text-wallet-text" />
              <div className="text-right">
                <div className="text-xs text-muted-foreground font-medium">
                  Balance
                </div>
                <div className="text-lg font-heading font-bold text-wallet-text">
                  ₹{walletBalance.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const DashboardPage = () => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole") as "master" | "distributor" | null;

    if (!token) {
      setWalletBalance(0);
      setLoading(false);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);

      let apiUrl = "";
      if (userRole === "master" && decoded.data.master_distributor_id) {
        apiUrl = `https://server.paybazaar.in/md/wallet/get/balance/${decoded.data.master_distributor_id}`;
      } else if (userRole === "distributor" && decoded.data.distributor_id) {
        apiUrl = `https://server.paybazaar.in/distributor/wallet/get/balance/${decoded.data.distributor_id}`;
      } else {
        setWalletBalance(0);
        setLoading(false);
        return;
      }

      axios
        .get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.data.status === "success" && res.data.data?.balance) {
            setWalletBalance(Number(res.data.data.balance));
            setError(null);
          } else {
            setWalletBalance(0);
            setError("Failed to fetch wallet balance");
          }
        })
        .catch((err) => {
          console.error("Wallet balance fetch error:", err);
          setWalletBalance(0);
          setError("Error fetching wallet balance");
        })
        .finally(() => setLoading(false));
    } catch (err) {
      console.error("Token decode error:", err);
      setWalletBalance(0);
      setError("Invalid token");
      setLoading(false);
    }
  }, []);

  return (
    <>
      <DashboardHeader title="Dashboard" walletBalance={walletBalance} />
      <main className="p-4">
        {loading && <p>Loading wallet balance...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <p>Welcome! Your current wallet balance is ₹{walletBalance.toLocaleString("en-IN")}.</p>
        )}
        {/* Add your dashboard content here */}
      </main>
    </>
  );
};

export default DashboardPage;
