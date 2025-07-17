import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { useToast } from '@/hooks/use-toast';

interface LoginFormData {
  email: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface LoginError {
  message: string;
  code?: string;
  status?: number;
}

const loginApi = async (data: LoginFormData): Promise<LoginResponse> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (!data.email) {
    throw new Error('Email is required');
  }
  
  if (!data.email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }
  
  if (data.email === 'error@example.com') {
    throw new Error('Something went wrong. Please try again.');
  }
  
  if (data.email === 'notfound@example.com') {
    throw new Error('No account found with this email address');
  }
  
  return {
    success: true,
    message: 'Verification email sent successfully!',
    data: { userId: '123', email: data.email }
  };
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setShowSuccess(true);
      toast({
        title: "Success!",
        description: data.message,
        className: "border-success text-success-foreground"
      });
      
      setEmail('');
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    login({ email: email.trim() });
  };


  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in">
          <Card className="shadow-elegant border-0">
            <CardHeader className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center animate-pulse-glow">
                <CheckCircle className="w-8 h-8 text-success-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
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
                  className="p-0 h-auto font-medium text-primary hover:text-primary-glow"
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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-elegant border-0">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    disabled={isPending}
                    className="pl-10 h-12 transition-smooth focus:shadow-glow"
                    autoComplete="email"
                    autoFocus
                  />
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-scale-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:shadow-glow transition-smooth font-medium"
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

        {/* Demo Information */}
        <div className="mt-6 p-4 bg-card rounded-lg border border-border/50 text-sm text-muted-foreground">
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