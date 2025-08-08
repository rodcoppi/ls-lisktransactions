'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

interface MfaVerificationFormProps {
  mfaTempToken: string;
  onSuccess?: (user: any, tokens: any) => void;
  onCancel?: () => void;
  redirectTo?: string;
  className?: string;
}

interface MfaVerificationResponse {
  success: boolean;
  user?: any;
  tokens?: any;
  session?: any;
  error?: string;
}

export function MfaVerificationForm({
  mfaTempToken,
  onSuccess,
  onCancel,
  redirectTo = '/dashboard',
  className = '',
}: MfaVerificationFormProps) {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [attempts, setAttempts] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Token expired
      setErrors(['MFA token has expired. Please log in again.']);
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);

    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }

    // Auto-submit when 6 digits are entered
    if (numericValue.length === 6 && !isLoading) {
      handleSubmit(numericValue);
    }
  };

  const handleSubmit = async (codeToSubmit?: string) => {
    const mfaCode = codeToSubmit || code;

    if (!mfaCode || mfaCode.length !== 6) {
      setErrors(['Please enter a valid 6-digit code']);
      return;
    }

    if (attempts >= 5) {
      setErrors(['Too many failed attempts. Please log in again.']);
      return;
    }

    if (timeRemaining <= 0) {
      setErrors(['MFA token has expired. Please log in again.']);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({
          code: mfaCode,
          tempToken: mfaTempToken,
        }),
      });

      const data: MfaVerificationResponse = await response.json();

      if (!response.ok) {
        if (data.error) {
          setErrors([data.error]);
          setAttempts(prev => prev + 1);
          setCode(''); // Clear the code for retry
        } else {
          setErrors(['Verification failed. Please try again.']);
        }
        return;
      }

      // Successful verification
      if (data.success && data.user && data.tokens) {
        // Store tokens
        localStorage.setItem('access_token', data.tokens.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (onSuccess) {
          onSuccess(data.user, data.tokens);
        } else {
          router.push(redirectTo);
        }
      }

    } catch (error) {
      console.error('MFA verification error:', error);
      setErrors(['Network error. Please check your connection and try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/auth/login');
    }
  };

  const isFormDisabled = isLoading || timeRemaining <= 0 || attempts >= 5;

  return (
    <Card className={`w-full max-w-md mx-auto p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icons.Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
          }`}>
            <Icons.Clock className="h-4 w-4" />
            <span>Time remaining: {formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2">
              <Icons.AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MFA Code Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mfaCode" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              ref={inputRef}
              id="mfaCode"
              name="mfaCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              disabled={isFormDisabled}
              placeholder="000000"
              className={`text-center text-2xl font-mono tracking-wider ${
                errors.length > 0 ? 'border-destructive focus:ring-destructive' : ''
              }`}
              autoComplete="one-time-code"
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the code exactly as shown in your authenticator app
            </p>
          </div>

          {/* Manual Submit Button (for cases where auto-submit fails) */}
          {code.length === 6 && !isLoading && (
            <Button
              onClick={() => handleSubmit()}
              className="w-full"
              disabled={isFormDisabled}
            >
              Verify Code
            </Button>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Verifying...</span>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-center space-x-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < code.length
                    ? 'bg-primary'
                    : 'bg-muted border-2 border-muted-foreground/20'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {code.length}/6 digits entered
          </p>
        </div>

        {/* Attempts Warning */}
        {attempts >= 3 && attempts < 5 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Icons.AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                {5 - attempts} attempts remaining
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full"
            disabled={isLoading}
          >
            Cancel & Return to Login
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Having trouble? Make sure your device's time is accurate and try again.
          </p>
          <p className="text-xs text-muted-foreground">
            If you can't access your authenticator app, contact support.
          </p>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            This additional layer of security protects your account
          </p>
        </div>
      </div>
    </Card>
  );
}