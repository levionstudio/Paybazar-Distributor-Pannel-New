import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

const retailerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
})

type RetailerFormData = z.infer<typeof retailerSchema>

const CreateRetailerPage = () => {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RetailerFormData>({
    resolver: zodResolver(retailerSchema),
  })

  const onSubmit = async (data: RetailerFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Retailer created successfully",
        description: `${data.name} has been added to your network.`,
      })

      reset()
    } catch (error) {
      toast({
        title: "Failed to create retailer",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
      
      <div className="w-full max-w-lg bg-card p-8 rounded-2xl shadow-lg border border-border">
        <h1 className="text-3xl font-bold mb-2 text-center">Create New Retailer</h1>
        <p className="text-muted-foreground text-center mb-6">
          Add a new retailer to your network. They’ll receive login credentials via email.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
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
              placeholder="jane@example.com"
              {...register("email")}
              className="h-11"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className="h-11"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
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
              className="flex-1 gradient-secondary hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Retailer"}
            </Button>
          </div>
        </form>
      </div>

      <Toaster />
    </div>
  )
}

export default CreateRetailerPage
