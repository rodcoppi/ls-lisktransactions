'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

interface LoginFormProps {
  onSuccess?: (user: any, tokens: any) => void;
  onMfaRequired?: (mfaTempToken: string) => void;
  redirectTo?: string;
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  success: boolean;
  requiresMfa?: boolean;
  mfaTempToken?: string;
  user?: any;
  tokens?: any;
  session?: any;
  error?: string;
}

export function LoginForm({ 
  onSuccess, 
  onMfaRequired, 
  redirectTo = '/dashboard',
  className = '' 
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const router = useRouter();

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string[]> = {};

    if (!formData.email) {
      newErrors.email = ['Email is required'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = ['Please enter a valid email address'];
    }

    if (!formData.password) {
      newErrors.password = ['Password is required'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Rate limiting on client side
    if (loginAttempts >= 5) {
      setErrors({ general: ['Too many login attempts. Please wait before trying again.'] });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        if (data.error) {
          // Handle specific error types
          if (data.error.includes('locked')) {
            setErrors({ general: ['Account temporarily locked due to multiple failed attempts'] });
          } else if (data.error.includes('credentials')) {
            setErrors({ general: ['Invalid email or password'] });
            setLoginAttempts(prev => prev + 1);
          } else {
            setErrors({ general: [data.error] });
          }
        } else {
          setErrors({ general: ['Login failed. Please try again.'] });
        }
        return;
      }

      if (data.requiresMfa) {
        // MFA verification required
        if (onMfaRequired && data.mfaTempToken) {
          onMfaRequired(data.mfaTempToken);
        } else {
          setErrors({ general: ['MFA verification required but no handler provided'] });
        }
        return;
      }

      // Successful login
      if (data.success && data.user && data.tokens) {
        // Store tokens in memory/localStorage based on rememberMe
        if (formData.rememberMe) {
          localStorage.setItem('access_token', data.tokens.accessToken);
        } else {
          sessionStorage.setItem('access_token', data.tokens.accessToken);
        }

        // Store user info
        localStorage.setItem('user', JSON.stringify(data.user));

        if (onSuccess) {
          onSuccess(data.user, data.tokens);
        } else {
          router.push(redirectTo);
        }
      }

    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: ['Network error. Please check your connection and try again.'] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const isFormDisabled = isLoading || loginAttempts >= 5;

  return (
    <Card className={`w-full max-w-md mx-auto p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        {/* General Errors */}
        {errors.general && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2">
              <Icons.AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="space-y-1">
                {errors.general.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-destructive focus:ring-destructive' : ''}
              disabled={isFormDisabled}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <div className="space-y-1">
                {errors.email.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'border-destructive focus:ring-destructive pr-10' : 'pr-10'}
                disabled={isFormDisabled}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isFormDisabled}
              >
                {showPassword ? (
                  <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="space-y-1">
                {errors.password.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                disabled={isFormDisabled}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
                Remember me
              </label>
            </div>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isFormDisabled}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isFormDisabled}
          >
            {isLoading ? (
              <>
                <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/register')}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Rate Limiting Warning */}
        {loginAttempts >= 3 && loginAttempts < 5 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Icons.AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Warning: {5 - loginAttempts} attempts remaining before temporary lockout
              </p>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </Card>
  );
}