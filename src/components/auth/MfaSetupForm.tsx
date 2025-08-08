'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

interface MfaSetupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface MfaSetupResponse {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  error?: string;
  message?: string;
}

enum SetupStep {
  INITIATE = 'initiate',
  SCAN_QR = 'scan-qr',
  VERIFY = 'verify',
  BACKUP_CODES = 'backup-codes',
  COMPLETE = 'complete',
}

export function MfaSetupForm({
  onSuccess,
  onCancel,
  className = '',
}: MfaSetupFormProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.INITIATE);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }>({ secret: '', qrCode: '', backupCodes: [] });

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false);

  const handleInitiateSetup = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      const data: MfaSetupResponse = await response.json();

      if (!response.ok) {
        setErrors([data.error || 'Failed to initiate MFA setup']);
        return;
      }

      if (data.success && data.secret && data.qrCode && data.backupCodes) {
        setSetupData({
          secret: data.secret,
          qrCode: data.qrCode,
          backupCodes: data.backupCodes,
        });
        setCurrentStep(SetupStep.SCAN_QR);
      }

    } catch (error) {
      console.error('MFA setup initiation error:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors(['Please enter a valid 6-digit code']);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({
          verificationCode,
        }),
      });

      const data: MfaSetupResponse = await response.json();

      if (!response.ok) {
        setErrors([data.error || 'Verification failed']);
        return;
      }

      if (data.success) {
        setCurrentStep(SetupStep.BACKUP_CODES);
      }

    } catch (error) {
      console.error('MFA setup verification error:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess();
    }
    setCurrentStep(SetupStep.COMPLETE);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const downloadBackupCodes = () => {
    const codesText = setupData.backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    const codesText = setupData.backupCodes.join('\n');
    navigator.clipboard.writeText(codesText).then(() => {
      // Could add a toast notification here
      console.log('Backup codes copied to clipboard');
    });
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: SetupStep.INITIATE, label: 'Setup' },
      { key: SetupStep.SCAN_QR, label: 'Scan' },
      { key: SetupStep.VERIFY, label: 'Verify' },
      { key: SetupStep.BACKUP_CODES, label: 'Backup' },
      { key: SetupStep.COMPLETE, label: 'Complete' },
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
              index <= currentIndex 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {index < currentIndex ? (
                <Icons.Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <Card className={`w-full max-w-md mx-auto p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icons.Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Setup Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

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

        {/* Step Content */}
        {currentStep === SetupStep.INITIATE && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <Icons.Smartphone className="mx-auto h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Get Started</h3>
                <p className="text-sm text-muted-foreground">
                  You'll need an authenticator app on your phone to generate verification codes.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recommended apps:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Google Authenticator</li>
                <li>• Microsoft Authenticator</li>
                <li>• Authy</li>
                <li>• 1Password</li>
              </ul>
            </div>

            <Button
              onClick={handleInitiateSetup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue Setup'
              )}
            </Button>
          </div>
        )}

        {currentStep === SetupStep.SCAN_QR && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <h3 className="font-semibold">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Open your authenticator app and scan this QR code
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img 
                src={setupData.qrCode} 
                alt="MFA QR Code" 
                className="w-48 h-48"
              />
            </div>

            {/* Manual Entry Option */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Can't scan? Enter this code manually:
              </p>
              <div className="p-2 bg-muted rounded font-mono text-xs break-all">
                {setupData.secret}
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep(SetupStep.VERIFY)}
              className="w-full"
            >
              I've Added the Account
            </Button>
          </div>
        )}

        {currentStep === SetupStep.VERIFY && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <h3 className="font-semibold">Verify Setup</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                  if (errors.length > 0) setErrors([]);
                }}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-wider"
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleVerifySetup}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Enable MFA'
              )}
            </Button>
          </div>
        )}

        {currentStep === SetupStep.BACKUP_CODES && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <Icons.Key className="mx-auto h-12 w-12 text-amber-500" />
              <div>
                <h3 className="font-semibold">Save Your Backup Codes</h3>
                <p className="text-sm text-muted-foreground">
                  These codes can be used if you lose access to your authenticator app
                </p>
              </div>
            </div>

            {/* Backup Codes */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setupData.backupCodes.map((code, index) => (
                  <div key={index} className="text-center p-1">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadBackupCodes}
                  className="flex-1"
                >
                  <Icons.Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={copyBackupCodes}
                  className="flex-1"
                >
                  <Icons.Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Acknowledgment */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={backupCodesAcknowledged}
                  onChange={(e) => setBackupCodesAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="acknowledge" className="text-sm text-muted-foreground">
                  I have safely stored these backup codes. I understand that without them, 
                  I may lose access to my account if I lose my authenticator device.
                </label>
              </div>

              <Button
                onClick={handleComplete}
                disabled={!backupCodesAcknowledged}
                className="w-full"
              >
                Complete Setup
              </Button>
            </div>
          </div>
        )}

        {currentStep === SetupStep.COMPLETE && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Icons.CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-600">Setup Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is now enabled for your account
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                Your account is now more secure. You'll need to provide a code from your 
                authenticator app each time you log in.
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Done
            </Button>
          </div>
        )}

        {/* Cancel Button (except on complete step) */}
        {currentStep !== SetupStep.COMPLETE && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full"
            >
              Cancel Setup
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}