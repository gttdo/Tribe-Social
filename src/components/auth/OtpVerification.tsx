import React, { useState } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { Button } from '../ui/button';
import { authService, mapAuthError } from '../../services/auth';
import { Loader2, ArrowLeft, AlertCircle, Shield } from 'lucide-react';

interface OtpVerificationProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

export function OtpVerification({ phone, onVerified, onBack }: OtpVerificationProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setError('');
    setIsVerifying(true);

    try {
      const { error: verifyError } = await authService.verifyOtp(phone, code);
      if (verifyError) {
        setError(mapAuthError(verifyError));
      } else {
        onVerified();
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);
    try {
      const { error: resendError } = await authService.signInWithPhone(phone);
      if (resendError) setError(mapAuthError(resendError));
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-electric-blue/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-electric-blue" />
        </div>
        <h3 className="text-xl font-semibold font-display text-pearl-white">Verify your phone</h3>
        <p className="text-sm text-muted-lavender/70">
          Enter the 6-digit code sent to <span className="text-pearl-white font-medium">{phone}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={handleVerify}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20" role="alert">
          <AlertCircle className="w-4 h-4 text-glitch-red shrink-0" />
          <p className="text-sm text-glitch-red">{error}</p>
        </div>
      )}

      <Button
        onClick={handleVerify}
        className="w-full h-12 text-base font-semibold bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
        disabled={code.length !== 6 || isVerifying}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button onClick={onBack} className="text-muted-lavender/70 hover:text-electric-blue transition-colors">
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          Back
        </button>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="text-electric-blue hover:text-electric-blue/80 transition-colors disabled:opacity-50"
        >
          {isResending ? 'Sending...' : "Didn't get a code? Resend"}
        </button>
      </div>
    </div>
  );
}
