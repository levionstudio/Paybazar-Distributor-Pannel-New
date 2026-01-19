import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff } from "lucide-react"; // <-- Import eye icons here

const distributorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
});

type DistributorFormData = z.infer<typeof distributorSchema>;

interface DecodedToken {
  data: {
    admin_id?: string;
    master_distributor_id?: string;
  };
  exp: number;
}

const CreateDistributorPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const role = localStorage.getItem("userRole") || "master";

  const token = localStorage.getItem("authToken");

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false); // <-- State for password toggle

  // Decode IDs
  let admin_id = "";
  let master_distributor_id = "";

  if (token) {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      admin_id = decoded?.data?.admin_id || "";
      master_distributor_id = decoded?.data?.master_distributor_id || "";
    } catch (e) {
      console.error("Error decoding token:", e);
    }
  }

  // Fetch wallet balance dynamically
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!master_distributor_id || !token) {
        setWalletBalance(0);
        return;
      }

      try {
        const res = await axios.get(
          `https://server.paybazaar.in/md/wallet/get/balance/${master_distributor_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.data.status === "success" && res.data.data?.balance) {
          setWalletBalance(Number(res.data.data.balance));
        } else {
          setWalletBalance(0);
        }
      } catch (err) {
        console.error("Wallet fetch error:", err);
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();
  }, [master_distributor_id, token]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema),
  });

  const onSubmit = async (data: DistributorFormData) => {
    if (!admin_id || !master_distributor_id) {
      toast({
        title: "Invalid Session",
        description: "Missing required authentication info. Please log in again.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/md/create/distributor`,
        {
          admin_id,
          master_distributor_id,
          distributor_name: data.name,
          distributor_email: data.email,
          distributor_password: data.password,
          distributor_phone: data.phone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const res = response.data;

      if (res.status === "success") {
        toast({
          title: "Distributor Created",
          description: res.message || `${data.name} added successfully.`,
        });
        reset();
      } else {
        toast({
          title: "Creation Failed",
          description: res.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error creating distributor:", error);
      toast({
        title: "Network Error",
        description: error.response?.data?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout role={role} walletBalance={walletBalance}>
      <div className="flex flex-col max-w-2xl mx-auto">
        <Card>
          <CardHeader className="gradient-primary text-primary-foreground rounded-t-xl">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-2xl">Create New Distributor</CardTitle>
                <CardDescription className="text-primary-foreground/80 mt-1">
                  Add a new distributor to your network.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 bg-card p-8 rounded-xl shadow-md border border-border"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Paybazzar"
                {...register("name")}
                className="h-11"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="paybazzar@gmail.com"
                {...register("email")}
                className="h-11"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password with eye toggle */}
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password")}
                className="h-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-12 -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                {...register("phone")}
                className="h-11"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="flex-1"
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-primary hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Distributor"}
              </Button>
            </div>
          </form>
        </Card>

        <Toaster />
      </div>
    </DashboardLayout>
  );
};

export default CreateDistributorPage;
