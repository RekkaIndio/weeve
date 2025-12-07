'use client';

import { CheckBadgeIcon } from '@heroicons/react/24/solid';

interface VerificationBadgeProps {
  isVerified: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function VerificationBadge({
  isVerified,
  tier,
  size = 'md',
  showLabel = false,
  className = '',
}: VerificationBadgeProps) {
  if (!isVerified || !tier) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const colorClasses = {
    bronze: 'text-amber-600',
    silver: 'text-gray-400',
    gold: 'text-yellow-500',
  };

  const labelTextSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <CheckBadgeIcon
        className={`${sizeClasses[size]} ${colorClasses[tier]}`}
        title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} Verified`}
      />
      {showLabel && (
        <span className={`font-medium ${colorClasses[tier]} ${labelTextSize[size]} capitalize`}>
          {tier}
        </span>
      )}
    </div>
  );
}
