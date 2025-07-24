import React, { useState } from "react";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "./hooks/useToast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "./ui/button";
import { useMagicLink } from "@/hooks/useLogin";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { sendMagicLinkMutation } = useMagicLink();

  const { mutate: login, isPending, error } = sendMagicLinkMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    login({ email: email.trim() });
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-zinc-900 dark:to-zinc-800">
        <div className="w-full max-w-md animate-scale-in">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  We've sent a verification link to your email address
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>Didn't receive the email? Check your spam folder or</p>
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium text-indigo-600 hover:text-indigo-400"
                  onClick={() => setShowSuccess(false)}
                >
                  try again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Enter your email to receive a verification link
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
                    disabled={isPending}
                    className="pl-10 h-12 transition-all focus:ring-2 focus:ring-indigo-600"
                    autoComplete="email"
                    autoFocus
                  />
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-scale-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg font-medium"
                disabled={isPending || !email.trim()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending verification link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-5 w-5" />
                    Send Verification Link
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You'll receive a secure link to access your account
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 text-sm text-muted-foreground dark:bg-zinc-800 dark:border-zinc-700">
          <p className="font-medium mb-2">Demo Information:</p>
          <ul className="space-y-1 text-xs">
            <li>• Use any valid email for success</li>
            <li>• Try "error@example.com" to see error handling</li>
            <li>• Try "notfound@example.com" for user not found</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
