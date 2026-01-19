import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, User, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

/* -------------------- TYPES -------------------- */

interface DashboardLayoutProps {
  children: ReactNode;
  role: "master" | "distributor";
}

interface JWTPayload {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

/* -------------------- COMPONENT -------------------- */

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<JWTPayload | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigateToProfile = () => {
  if (!user?.user_id) return;

  if (user.user_id.startsWith("D")) {
    navigate("/profilee");
  } else if (user.user_id.startsWith("M")) {
    navigate("/profile");
  } else {
    // fallback (optional safety)
    navigate("/profile");
  }
};


  /* ---------- AUTH + TOKEN DECODE ---------- */
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedRole = localStorage.getItem("userRole");

    console.log("🔐 Auth token:", token);
    console.log("👤 Stored role:", storedRole);

    if (!token || storedRole !== role) {
      console.warn("❌ Token missing or role mismatch");
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      console.log("📦 Decoded JWT:", decoded);

      // ⏰ Expiry check
      if (decoded.exp * 1000 < Date.now()) {
        console.warn("⏰ Token expired");
        handleLogout();
        return;
      }

      console.log("✅ Token valid");
      console.log("🆔 User ID:", decoded.user_id);
      console.log("🧑 User Name:", decoded.user_name);
      console.log("🎭 User Role:", decoded.user_role);

      setUser(decoded);
      fetchWalletBalance(decoded.user_id, token);
    } catch (err) {
      console.error("❌ Token decode failed:", err);
      handleLogout();
    }
  }, [navigate, role]);

  /* ---------- WALLET FETCH (ONLY HERE) ---------- */
  const fetchWalletBalance = async (userId: string, token: string) => {
    try {
      const endpoint =
        role === "master"
          ? `/wallet/get/balance/md/${userId}`
          : `/wallet/get/balance/distributor/${userId}`;

      console.log("💰 Wallet endpoint:", endpoint);

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("💵 Wallet API response:", res.data);

      if (res.data?.status === "success") {
        const balance = Number(res.data.data?.wallet_balance ?? 0);
        console.log("✅ Wallet balance:", balance);
        setWalletBalance(balance);
      } else {
        console.warn("⚠️ Wallet fetch unsuccessful");
        setWalletBalance(0);
      }
    } catch (err) {
      console.error("❌ Wallet fetch failed:", err);
      setWalletBalance(0);
    }
  };

  /* ---------- OUTSIDE CLICK ---------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    console.log("🚪 Logging out user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  /* ---------- INITIALS ---------- */
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar role={role} />
        

        <div className="flex-1 flex flex-col">
          {/* HEADER */}
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="h-full px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-accent rounded-lg p-2" />
                <h1 className="text-xl font-semibold">
                  {role === "master" ? "Master Distributor" : "Distributor"} Dashboard
                </h1>
              </div>

              <div className="flex items-center gap-4 relative" ref={menuRef}>
                {/* WALLET */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    ₹{walletBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* USER */}
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={() => setOpenMenu((p) => !p)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">
                    {user?.user_name}
                  </span>
                </Button>

                {/* MENU */}
                <AnimatePresence>
                  {openMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-14 w-56 rounded-xl border bg-card shadow-lg"
                    >
                      <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                        ID: {user?.user_id}
                      </div>

                    <button
  onClick={navigateToProfile}
  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-muted"
>

                        <User className="h-4 w-4" />
                        Profile
                      </button>

                    <button
  onClick={() => {
    setOpenMenu(false); // just close menu
  }}
  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
>
  <FileText className="h-4 w-4" />
  Documents
</button>


                      <button
                        onClick={() => {
                          setShowLogoutDialog(true);
                          setOpenMenu(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>

      {/* LOGOUT CONFIRM */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
