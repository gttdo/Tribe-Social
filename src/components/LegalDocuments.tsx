import React, { useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, FileText, Shield } from 'lucide-react';

interface LegalDocumentsProps {
  document: 'privacy' | 'terms';
  onBack: () => void;
}

export function LegalDocuments({ document, onBack }: LegalDocumentsProps) {
  const renderPrivacyPolicy = () => (
    <div className="space-y-6 text-muted-lavender/90 font-body leading-relaxed">
      <div className="text-center space-y-4 mb-8">
        <Shield className="w-12 h-12 text-neon-lilac mx-auto opacity-80" />
        <h1 className="text-2xl font-headline text-pearl-white">Privacy Policy</h1>
        <p className="text-sm text-muted-lavender/60">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">1. Information We Collect</h2>
        <div className="space-y-3 pl-4">
          <div>
            <h3 className="font-medium text-pearl-white">Account Information</h3>
            <p>When you create an account, we collect your username, email address or phone number, and password. You may also provide optional profile information like your bio and core realm preference.</p>
          </div>
          <div>
            <h3 className="font-medium text-pearl-white">Content You Share</h3>
            <p>We collect and store the posts, comments, reactions, and media you share on Tribe Board. This includes text, images, videos, and audio recordings.</p>
          </div>
          <div>
            <h3 className="font-medium text-pearl-white">Usage Information</h3>
            <p>We automatically collect information about how you use our service, including your interactions with content, features you use, and time spent on the platform.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">2. How We Use Your Information</h2>
        <div className="space-y-3 pl-4">
          <p>• Provide and maintain the Tribe Board service</p>
          <p>• Personalize your experience and show relevant content</p>
          <p>• Facilitate communication between users</p>
          <p>• Send important service updates and notifications</p>
          <p>• Improve our service and develop new features</p>
          <p>• Ensure safety and prevent abuse</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">3. Information Sharing</h2>
        <div className="space-y-3 pl-4">
          <p>We don't sell your personal information. We may share information in these limited circumstances:</p>
          <p>• With other users according to your privacy settings</p>
          <p>• With service providers who help us operate Tribe Board</p>
          <p>• When required by law or to protect safety</p>
          <p>• If our company is acquired (with advance notice to you)</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">4. Your Privacy Controls</h2>
        <div className="space-y-3 pl-4">
          <p>You control your privacy on Tribe Board:</p>
          <p>• Choose who can see your profile and posts</p>
          <p>• Control who can follow you and send messages</p>
          <p>• Delete your content or account at any time</p>
          <p>• Download your data</p>
          <p>• Manage notification preferences</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">5. Data Security</h2>
        <div className="space-y-3 pl-4">
          <p>We protect your information using industry-standard security measures including encryption, secure servers, and regular security audits. However, no online service is 100% secure.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">6. Data Retention</h2>
        <div className="space-y-3 pl-4">
          <p>We keep your information for as long as your account is active. When you delete your account, we remove your personal information within 30 days, though some data may be retained for legal or safety reasons.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">7. Contact Us</h2>
        <div className="space-y-3 pl-4">
          <p>If you have questions about this Privacy Policy, contact us at privacy@tribeboard.app</p>
        </div>
      </section>
    </div>
  );

  const renderTermsOfService = () => (
    <div className="space-y-6 text-muted-lavender/90 font-body leading-relaxed">
      <div className="text-center space-y-4 mb-8">
        <FileText className="w-12 h-12 text-soft-blush mx-auto opacity-80" />
        <h1 className="text-2xl font-headline text-pearl-white">Terms of Service</h1>
        <p className="text-sm text-muted-lavender/60">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">1. Acceptance of Terms</h2>
        <div className="space-y-3 pl-4">
          <p>By using Tribe Board, you agree to these Terms of Service. If you don't agree with any part of these terms, you may not use our service.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">2. Age Requirements</h2>
        <div className="space-y-3 pl-4">
          <p>You must be at least 13 years old to use Tribe Board. Users under 18 should have parental permission. We design our platform with teen safety in mind.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">3. Account Responsibilities</h2>
        <div className="space-y-3 pl-4">
          <p>• You're responsible for keeping your account secure</p>
          <p>• Don't share your password or let others use your account</p>
          <p>• Provide accurate information when creating your account</p>
          <p>• One person, one account - don't create multiple accounts</p>
          <p>• Let us know if your account is compromised</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">4. Community Guidelines</h2>
        <div className="space-y-3 pl-4">
          <p>Tribe Board is a positive space for teens. We don't allow:</p>
          <p>• Harassment, bullying, or hate speech</p>
          <p>• Adult content or sexually explicit material</p>
          <p>• Illegal activities or dangerous content</p>
          <p>• Spam, scams, or misleading information</p>
          <p>• Content that violates others' privacy or rights</p>
          <p>• Impersonation or fake accounts</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">5. Content Ownership</h2>
        <div className="space-y-3 pl-4">
          <p>• You own the content you post on Tribe Board</p>
          <p>• By posting, you give us permission to display and distribute your content</p>
          <p>• Don't post content you don't have rights to</p>
          <p>• Respect others' intellectual property</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">6. Service Availability</h2>
        <div className="space-y-3 pl-4">
          <p>We strive to keep Tribe Board available 24/7, but we can't guarantee uninterrupted service. We may need to take the service down for maintenance or updates.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">7. Termination</h2>
        <div className="space-y-3 pl-4">
          <p>• You can delete your account at any time</p>
          <p>• We may suspend or terminate accounts that violate these terms</p>
          <p>• We'll give you notice before termination when possible</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">8. Changes to Terms</h2>
        <div className="space-y-3 pl-4">
          <p>We may update these terms from time to time. We'll notify you of significant changes and give you a chance to review them before they take effect.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-headline text-electric-blue">9. Contact Information</h2>
        <div className="space-y-3 pl-4">
          <p>Questions about these terms? Contact us at legal@tribeboard.app</p>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-hidden">
      {/* Floating aesthetic elements */}
      <div className="absolute top-20 left-8 w-3 h-3 bg-soft-blush/40 rounded-full animate-pulse float opacity-60" />
      <div className="absolute top-32 right-12 w-2 h-2 bg-neon-lilac/50 rounded-full animate-bounce opacity-50" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-16 w-4 h-4 bg-electric-blue/30 rounded-full animate-pulse float opacity-40" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={onBack}
            className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full">
          <div className="rounded-2xl soft-blur border border-muted-lavender/20 p-6 h-full">
            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
              {document === 'privacy' ? renderPrivacyPolicy() : renderTermsOfService()}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}