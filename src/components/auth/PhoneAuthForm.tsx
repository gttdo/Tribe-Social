import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { authService, formatPhoneE164, formatPhoneDisplay, mapAuthError } from '../../services/auth';
import { OtpVerification } from './OtpVerification';
import { Loader2, AlertCircle, Phone } from 'lucide-react';

interface PhoneAuthFormProps {
  onAuthComplete: () => void;
}

export function PhoneAuthForm({ onAuthComplete }: PhoneAuthFormProps) {
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setFormattedPhone(formatPhoneDisplay(digits));
  };

  const handleSendCode = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setIsSending(true);
    const e164 = formatPhoneE164(phone);

    try {
      const { error: sendError } = await authService.signInWithPhone(e164);
      if (sendError) {
        setError(mapAuthError(sendError));
      } else {
        setFormattedPhone(e164);
        setCodeSent(true);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsSending(false);
    }
  };

  if (codeSent) {
    return (
      <OtpVerification
        phone={formattedPhone}
        onVerified={onAuthComplete}
        onBack={() => setCodeSent(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone-input">Phone number</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-lavender/50 text-sm">+1</span>
          <Input
            id="phone-input"
            type="tel"
            placeholder="(555) 123-4567"
            value={formattedPhone}
            onChange={handlePhoneChange}
            className="pl-10"
            autoComplete="tel"
          />
        </div>
        <p className="text-xs text-muted-lavender/50">We'll send you a verification code via SMS</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20" role="alert">
          <AlertCircle className="w-4 h-4 text-glitch-red shrink-0" />
          <p className="text-sm text-glitch-red">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSendCode}
        className="w-full h-12 text-base font-semibold bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
        disabled={phone.length !== 10 || isSending}
      >
        {isSending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4 mr-2" />
            Send Verification Code
          </>
        )}
      </Button>
    </div>
  );
}
