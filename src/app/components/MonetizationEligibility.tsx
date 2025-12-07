'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, LockClosedIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';

interface MonetizationStatus {
  can_monetize: boolean;
  is_restricted: boolean;
  restriction_reason: string | null;
  enabled_at: string | null;
  progress: {
    account_age_days: number;
    account_age_required: number;
    account_age_met: boolean;
    stories_created: number;
    stories_required: number;
    stories_met: boolean;
    tokens_earned: number;
    tokens_required: number;
    tokens_met: boolean;
    profile_complete: boolean;
    email_verified: boolean;
    no_violations: boolean;
  };
}

interface MonetizationEligibilityProps {
  userId: string;
  compact?: boolean;
}

export default function MonetizationEligibility({ userId, compact = false }: MonetizationEligibilityProps) {
  const [status, setStatus] = useState<MonetizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, [userId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/monetization/status?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.status) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error loading monetization status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    try {
      setChecking(true);
      setMessage(null);

      const response = await fetch('/api/monetization/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        await loadStatus();
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setMessage('An error occurred while checking eligibility');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const progress = status.progress;
  const allRequirementsMet = 
    progress.account_age_met &&
    progress.stories_met &&
    progress.tokens_met &&
    progress.profile_complete &&
    progress.email_verified &&
    progress.no_violations;

  // Compact view for settings/profile
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Story Monetization</h3>
              <p className="text-sm text-gray-600">
                {status.can_monetize ? 'Enabled' : 'Not yet eligible'}
              </p>
            </div>
          </div>
          {status.can_monetize ? (
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          ) : (
            <LockClosedIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
        {!status.can_monetize && !status.is_restricted && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Requirements:</p>
            <div className="space-y-1 text-xs">
              <RequirementItem met={progress.account_age_met}>
                Account {progress.account_age_days}/{progress.account_age_required} days old
              </RequirementItem>
              <RequirementItem met={progress.stories_met}>
                {progress.stories_created}/{progress.stories_required} public stories
              </RequirementItem>
              <RequirementItem met={progress.tokens_met}>
                {progress.tokens_earned}/{progress.tokens_required} tokens earned
              </RequirementItem>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CurrencyDollarIcon className="w-8 h-8" />
              Monetization Eligibility
            </h1>
            <p className="text-purple-100 mt-1">
              Earn from your stories by meeting simple requirements
            </p>
          </div>
          {status.can_monetize && (
            <CheckCircleIcon className="w-16 h-16 text-white/90" />
          )}
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.includes('Congratulations')
              ? 'bg-green-500/20 text-white border border-white/30'
              : 'bg-white/20 text-white border border-white/30'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Restriction Notice */}
      {status.is_restricted && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Monetization Restricted</h3>
              <p className="text-sm text-red-700 mt-1">{status.restriction_reason}</p>
              <p className="text-xs text-red-600 mt-2">
                Please contact support if you believe this is an error.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      {!status.is_restricted && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Current Status</h2>
            <button
              onClick={checkEligibility}
              disabled={checking}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {checking ? 'Checking...' : 'Check Eligibility'}
            </button>
          </div>

          {status.can_monetize ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">You're all set!</h3>
                  <p className="text-sm text-green-700">
                    You can now charge for your stories. Set a price when creating or editing a story.
                  </p>
                  {status.enabled_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Enabled since {new Date(status.enabled_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <LockClosedIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Complete the requirements below to unlock monetization
                </span>
              </div>

              <div className="space-y-3">
                <RequirementCard
                  met={progress.account_age_met}
                  title="Account Age"
                  description={`${progress.account_age_days} / ${progress.account_age_required} days`}
                  percentage={Math.min(100, (progress.account_age_days / progress.account_age_required) * 100)}
                />
                
                <RequirementCard
                  met={progress.stories_met}
                  title="Public Stories"
                  description={`${progress.stories_created} / ${progress.stories_required} created`}
                  percentage={Math.min(100, (progress.stories_created / progress.stories_required) * 100)}
                />
                
                <RequirementCard
                  met={progress.tokens_met}
                  title="Tokens Earned"
                  description={`${progress.tokens_earned} / ${progress.tokens_required} earned`}
                  percentage={Math.min(100, (progress.tokens_earned / progress.tokens_required) * 100)}
                />
                
                <RequirementCard
                  met={progress.profile_complete}
                  title="Complete Profile"
                  description="Name and avatar set"
                  percentage={progress.profile_complete ? 100 : 0}
                />
                
                <RequirementCard
                  met={progress.email_verified}
                  title="Email Verified"
                  description="Confirmed email address"
                  percentage={progress.email_verified ? 100 : 0}
                />
                
                <RequirementCard
                  met={progress.no_violations}
                  title="Clean Record"
                  description="No community violations"
                  percentage={progress.no_violations ? 100 : 0}
                />
              </div>

              {allRequirementsMet && (
                <button
                  onClick={checkEligibility}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                >
                  🎉 Activate Monetization
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Groups can monetize immediately</li>
          <li>• Set fair prices to encourage engagement</li>
          <li>• Quality content gets more views and earnings</li>
          <li>• Engage with the community to earn tokens</li>
        </ul>
      </div>
    </div>
  );
}

function RequirementItem({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <CheckCircleIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      )}
      <span className={met ? 'text-green-700' : 'text-gray-600'}>{children}</span>
    </div>
  );
}

function RequirementCard({
  met,
  title,
  description,
  percentage,
}: {
  met: boolean;
  title: string;
  description: string;
  percentage: number;
}) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      met ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {met ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
            )}
            <h4 className={`font-semibold ${met ? 'text-green-900' : 'text-gray-900'}`}>
              {title}
            </h4>
          </div>
          <p className={`text-sm ml-7 ${met ? 'text-green-700' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
      <div className="ml-7">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              met ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
