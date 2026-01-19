import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-light px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="mb-4 text-6xl font-heading font-bold text-gradient">404</h1>
        <p className="mb-2 text-2xl font-heading font-semibold">Page Not Found</p>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild size="lg" className="gradient-primary hover:opacity-90">
          <Link to="/login">
            <Home className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
