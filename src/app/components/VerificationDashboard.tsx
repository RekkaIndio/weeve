'use client';

import { useEffect, useState } from 'react';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface VerificationProgress {
  user_id: string;
  name: string;
  is_verified: boolean;
  verification_tier: string | null;
  verified_at: string | null;
  
  // Progress percentages
  bronze_stories_pct: number;
  bronze_contributions_pct: number;
  bronze_views_pct: number;
  bronze_engagement_pct: number;
  bronze_active_days_pct: number;
  bronze_followers_pct: number;
  bronze_account_age_pct: number;
  
  // Current values
  total_stories_created: number;
  total_contributions: number;
  total_views_received: number;
  total_engagement_score: number;
  days_active: number;
  total_followers: number;
  engagement_ratio: number;
  account_age_days: number;
  profile_complete: boolean;
  tokens_earned: number;
  tokens_spent: number;
  email_verified: boolean;
  phone_verified: boolean;
  
  // Requirements
  bronze_req_stories: number;
  bronze_req_contributions: number;
  bronze_req_views: number;
  bronze_req_engagement: number;
  bronze_req_active_days: number;
  bronze_req_followers: number;
  
  // Eligibility
  eligible_bronze: boolean;
  eligible_silver: boolean;
  eligible_gold: boolean;
}

interface Requirement {
  tier: string;
  min_stories_created: number;
  min_contributions: number;
  min_views_received: number;
  min_engagement_score: number;
  min_days_active: number;
  min_groups_created: number;
  min_followers: number;
  min_engagement_ratio: number;
  min_account_age_days: number;
  require_profile_complete: boolean;
  min_tokens_earned: number;
  min_tokens_spent: number;
  require_email_verified: boolean;
  require_phone_verified: boolean;
  max_violations: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  previous_tier: string | null;
  new_tier: string | null;
  reason: string;
  created_at: string;
}

interface VerificationDashboardProps {
  userId: string;
}

export default function VerificationDashboard({ userId }: VerificationDashboardProps) {
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/verification/progress?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setProgress(data.progress);
        setRequirements(data.requirements);
        setAuditLog(data.auditLog || []);
      } else {
        console.error('Failed to load verification progress:', data.error);
      }
    } catch (error) {
      console.error('Error loading verification progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    try {
      setChecking(true);
      setMessage(null);

      const response = await fetch('/api/verification/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        await loadProgress();
      } else {
        setMessage(data.error || 'Failed to check verification');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setMessage('An error occurred while checking verification');
    } finally {
      setChecking(false);
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'bronze':
        return 'text-amber-600';
      case 'silver':
        return 'text-gray-400';
      case 'gold':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  const getTierBgColor = (tier: string | null) => {
    switch (tier) {
      case 'bronze':
        return 'bg-amber-50 border-amber-200';
      case 'silver':
        return 'bg-gray-50 border-gray-200';
      case 'gold':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Unable to load verification progress</p>
      </div>
    );
  }

  const bronzeReq = requirements.find(r => r.tier === 'bronze');
  const silverReq = requirements.find(r => r.tier === 'silver');
  const goldReq = requirements.find(r => r.tier === 'gold');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              Verification Status
              {progress.is_verified && (
                <CheckBadgeIcon className={`w-8 h-8 ${getTierColor(progress.verification_tier)}`} />
              )}
            </h1>
            <p className="text-gray-600 mt-1">
              Earn your verified badge by engaging with the community
            </p>
          </div>
          <button
            onClick={checkVerification}
            disabled={checking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checking ? 'Checking...' : 'Check Eligibility'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('Congratulations') || message.includes('upgraded')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.includes('not eligible') || message.includes('removed')
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {progress.is_verified && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${getTierBgColor(progress.verification_tier)}`}>
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className={`w-6 h-6 ${getTierColor(progress.verification_tier)}`} />
              <span className="font-semibold capitalize">
                {progress.verification_tier} Tier Verified
              </span>
              <span className="text-sm text-gray-600 ml-auto">
                Since {new Date(progress.verified_at!).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Current Tier Progress */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {progress.is_verified ? 'Your Progress' : 'Progress to Bronze Verification'}
        </h2>

        <div className="space-y-4">
          <ProgressItem
            label="Stories Created"
            current={progress.total_stories_created}
            required={progress.bronze_req_stories}
            percentage={progress.bronze_stories_pct}
          />
          <ProgressItem
            label="Contributions (Weeves)"
            current={progress.total_contributions}
            required={progress.bronze_req_contributions}
            percentage={progress.bronze_contributions_pct}
          />
          <ProgressItem
            label="Total Views"
            current={progress.total_views_received}
            required={progress.bronze_req_views}
            percentage={progress.bronze_views_pct}
          />
          <ProgressItem
            label="Engagement Score"
            current={progress.total_engagement_score}
            required={progress.bronze_req_engagement}
            percentage={progress.bronze_engagement_pct}
          />
          <ProgressItem
            label="Active Days"
            current={progress.days_active}
            required={progress.bronze_req_active_days}
            percentage={progress.bronze_active_days_pct}
          />
          <ProgressItem
            label="Followers"
            current={progress.total_followers}
            required={progress.bronze_req_followers}
            percentage={progress.bronze_followers_pct}
          />
          <ProgressItem
            label="Account Age (Days)"
            current={progress.account_age_days}
            required={bronzeReq?.min_account_age_days || 14}
            percentage={progress.bronze_account_age_pct}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            {progress.profile_complete ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            <span className={progress.profile_complete ? 'text-green-700' : 'text-gray-600'}>
              Profile Complete
            </span>
          </div>
          <div className="flex items-center gap-2">
            {progress.email_verified ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            <span className={progress.email_verified ? 'text-green-700' : 'text-gray-600'}>
              Email Verified
            </span>
          </div>
        </div>
      </div>

      {/* Tier Requirements */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Verification Tiers</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {bronzeReq && (
            <TierCard
              tier="bronze"
              name="Bronze"
              requirements={bronzeReq}
              eligible={progress.eligible_bronze}
              current={progress.verification_tier === 'bronze'}
            />
          )}
          {silverReq && (
            <TierCard
              tier="silver"
              name="Silver"
              requirements={silverReq}
              eligible={progress.eligible_silver}
              current={progress.verification_tier === 'silver'}
            />
          )}
          {goldReq && (
            <TierCard
              tier="gold"
              name="Gold"
              requirements={goldReq}
              eligible={progress.eligible_gold}
              current={progress.verification_tier === 'gold'}
            />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {auditLog.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold capitalize">{entry.action}</span>
                  {entry.new_tier && (
                    <span className="ml-2 text-sm text-gray-600">
                      to {entry.new_tier} tier
                    </span>
                  )}
                  <p className="text-sm text-gray-600">{entry.reason}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressItem({
  label,
  current,
  required,
  percentage,
}: {
  label: string;
  current: number;
  required: number;
  percentage: number;
}) {
  const isComplete = current >= required;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
          {current} / {required}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            isComplete ? 'bg-green-600' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  name,
  requirements,
  eligible,
  current,
}: {
  tier: string;
  name: string;
  requirements: Requirement;
  eligible: boolean;
  current: boolean;
}) {
  const colorClasses = {
    bronze: 'border-amber-300 bg-amber-50',
    silver: 'border-gray-300 bg-gray-50',
    gold: 'border-yellow-300 bg-yellow-50',
  }[tier];

  const iconColor = {
    bronze: 'text-amber-600',
    silver: 'text-gray-400',
    gold: 'text-yellow-500',
  }[tier];

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses} ${current ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        <CheckBadgeIcon className={`w-6 h-6 ${iconColor}`} />
      </div>
      {current && (
        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded mb-2">
          Current Tier
        </span>
      )}
      {eligible && !current && (
        <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded mb-2">
          Eligible!
        </span>
      )}
      <ul className="text-xs space-y-1 text-gray-700">
        <li>• {requirements.min_stories_created} stories</li>
        <li>• {requirements.min_contributions} contributions</li>
        <li>• {requirements.min_views_received} views</li>
        <li>• {requirements.min_engagement_score} engagement</li>
        <li>• {requirements.min_followers} followers</li>
        <li>• {requirements.min_account_age_days} days old</li>
      </ul>
    </div>
  );
}
