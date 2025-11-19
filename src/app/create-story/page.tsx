'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateStory from '@/app/components/CreateStory';

interface CreateStoryFormState {
  title: string;
  description: string;
  mode: 'invite' | 'open';
  selectedFriends: Array<{ id: string; name: string }>;
  maxWeeves: string;
  inviteCount: number;
  hashtags?: string[];
}

export default function CreateStoryDemo() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdData, setCreatedData] = useState<CreateStoryFormState | null>(null);

  const router = useRouter();
  const handleBack = () => {
    // Navigate back or to home
    if (typeof window !== 'undefined') {
      // Prefer history back, but fallback to home
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  const handleCreateStory = async (data: CreateStoryFormState) => {
    // Simulate API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setCreatedData(data);
        setShowSuccess(true);
        console.log('Story created:', data);
        resolve();
      }, 2000);
    });
  };

  if (showSuccess && createdData) {
    return (
      <div className="h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#EC1D99] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="mb-3">
            <div className="text-xs text-[#9CA3AF]">Contributors</div>
            <div className="text-xl font-bold text-[#1F2937] mb-1">{createdData.mode === 'invite' ? createdData.inviteCount : (createdData.maxWeeves || 'Unlimited')}</div>
          </div>
          <h2
            className="text-2xl font-bold text-[#9333EA] mb-2"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Story Created!
          </h2>
          <p
            className="text-[#1F2937] mb-6"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            &quot;{createdData.title}&quot; has been created successfully.
          </p>
          <div className="bg-[#FDF2F8] p-4 rounded-lg mb-6 text-left">
            <p
              className="text-sm text-[#9CA3AF] mb-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <strong>Mode:</strong>{' '}
              {createdData.mode === 'invite' ? 'Invite Specific People' : 'Open to All'}
            </p>
            {createdData.mode === 'invite' && createdData.selectedFriends.length > 0 && (
              <p
                className="text-sm text-[#9CA3AF] mb-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <strong>Invited:</strong>{' '}
                {createdData.selectedFriends.map(f => f.name).join(', ')}
              </p>
            )}
            {createdData.mode === 'open' && createdData.maxWeeves && (
              <p
                className="text-sm text-[#9CA3AF]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <strong>Max Weeves:</strong> {createdData.maxWeeves}
              </p>
            )}
            {createdData.hashtags && createdData.hashtags.length > 0 && (
              <p
                className="text-sm text-[#9CA3AF]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <strong>Hashtags:</strong> {createdData.hashtags.map(h => `#${h}`).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={handleBack}
            className="w-full px-6 py-3 bg-[#EC1D99] text-white rounded-lg font-bold hover:bg-[#D41C84] transition-colors"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Create Another Story
          </button>
        </div>
      </div>
    );
  }

  return <CreateStory onBack={handleBack} onCreateStory={handleCreateStory} />;
}
