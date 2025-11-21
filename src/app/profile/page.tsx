"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Settings, Grid, Bookmark, Share2, Wallet, UserPlus, X, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { currentUser, stories, setCurrentUser } = useStore();
  const [activeTab, setActiveTab] = useState<'weeves' | 'saved'>('weeves');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar || '');

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const myStories = stories.filter(s => s.participants.some(p => p.id === currentUser.id));
  // Mock saved stories - in production this would come from the store/database
  const savedStories = stories.filter(s => s.id === 's1' || s.id === 's2');

  const handleSave = () => {
    setCurrentUser({
      ...currentUser,
      name: editName,
      avatar: editAvatar
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar || '');
    setIsEditing(false);
  };

  const inviteCode = currentUser.inviteCode || currentUser.id;
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}?ref=${inviteCode}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Join me on Weeve!',
      text: `Check out this cool storytelling app! Use my invite code ${inviteCode} to join.`,
      url: inviteLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">{currentUser.name}</h1>
        <div className="flex items-center gap-4">
          <Link href="/wallet" className="flex items-center gap-1 bg-gray-800 px-3 py-1.5 rounded-full">
            <Wallet className="w-4 h-4 text-[#EC1D99]" />
            <span className="text-sm font-bold">{currentUser.tokens}</span>
          </Link>
          <button onClick={() => setShowInviteModal(true)} className="text-white hover:text-gray-300 transition-colors">
            <UserPlus className="w-6 h-6" />
          </button>
          <Link href="/settings">
            <Settings className="w-6 h-6 text-white hover:text-gray-300 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center px-4 mb-8">
        <div className="relative mb-4 group">
          <img
            src={isEditing ? editAvatar : currentUser.avatar}
            alt={currentUser.name}
            className="w-24 h-24 rounded-full border-4 border-black bg-gray-800 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${editName}`;
            }}
          />
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <span className="text-xs font-bold">Preview</span>
            </div>
          )}
          {!isEditing && (
            <div className="absolute bottom-0 right-0 bg-[#EC1D99] p-1.5 rounded-full border-2 border-black">
              <Share2 className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-3 mb-6">
            <div>
              <label className="text-xs text-gray-500 ml-1">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#EC1D99]"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 ml-1">Avatar URL</label>
              <input
                type="text"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#EC1D99]"
                placeholder="https://..."
              />
              <p className="text-[10px] text-gray-600 mt-1 ml-1">Paste an image URL to change your avatar</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-[#EC1D99] text-white font-bold py-2 rounded-lg text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">@{currentUser.name.toLowerCase().replace(/\s+/g, '_')}</h2>
            <p className="text-sm text-gray-400 text-center max-w-xs mb-6">
              Storyteller, dreamer, and weaver of tales. 🌌
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 mb-6">
              <div className="text-center">
                <div className="font-bold text-lg">{myStories.length}</div>
                <div className="text-xs text-gray-500">Weeves</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">142</div>
                <div className="text-xs text-gray-500">Contributions</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">1.5k</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
            </div>

            <div className="flex gap-2 w-full max-w-xs">
              <button
                onClick={() => {
                  setEditName(currentUser.name);
                  setEditAvatar(currentUser.avatar || '');
                  setIsEditing(true);
                }}
                className="flex-1 bg-white text-black font-bold py-2 rounded-lg text-sm text-center hover:bg-gray-200 transition-colors"
              >
                Edit Profile
              </button>
              <button className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                Share Profile
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-1">
        <button
          onClick={() => setActiveTab('weeves')}
          className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'weeves'
            ? 'border-white text-white'
            : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
          <Grid className="w-6 h-6" />
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'saved'
            ? 'border-white text-white'
            : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {activeTab === 'weeves' ? (
          <>
            {myStories.map(story => {
              const isWaiting = story.mode === 'invite' &&
                story.status === 'active' &&
                story.currentTurnUserId &&
                story.currentTurnUserId !== currentUser.id;

              const waitingForUser = isWaiting
                ? story.participants.find(p => p.id === story.currentTurnUserId)
                : null;

              return (
                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                  <img
                    src={story.coverImage || story.contributions[0]?.mediaUrl || "https://via.placeholder.com/300"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Waiting Overlay */}
                  {isWaiting && waitingForUser && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center backdrop-blur-[2px]">
                      <div className="relative mb-2">
                        <div className="w-10 h-10 rounded-full border-2 border-[#EC1D99] p-0.5 animate-pulse">
                          <img
                            src={waitingForUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser.name}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white mb-0.5">Waiting for</span>
                      <span className="text-[10px] text-[#EC1D99] font-medium truncate max-w-full">
                        {waitingForUser.name.split(' ')[0]}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    {story.contributions.length}
                  </div>
                </Link>
              );
            })}
            {/* Fillers if needed, but now we have more stories */}
            {myStories.length < 6 && [1, 2, 3].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-900/50"></div>
            ))}
          </>
        ) : (
          <>
            {savedStories.length > 0 ? (
              savedStories.map(story => (
                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                  <img
                    src={story.coverImage || story.contributions[0]?.mediaUrl || "https://via.placeholder.com/300"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-2 right-2">
                    <Bookmark className="w-4 h-4 text-white fill-white drop-shadow-md" />
                  </div>
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    {story.contributions.length}
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                <Bookmark className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No saved weeves yet</p>
                <p className="text-xs mt-1">Tap the bookmark icon to save weeves</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xs p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#EC1D99]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-[#EC1D99]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Invite Friends</h3>
              <p className="text-sm text-gray-400">Share your unique link to earn rewards when friends join!</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 ml-1 mb-1 block">Your Invite Link</label>
                <div className="flex items-center gap-2 bg-black rounded-lg p-1 border border-gray-800">
                  <input
                    readOnly
                    value={inviteLink}
                    className="bg-transparent text-sm text-gray-300 px-2 py-1.5 w-full focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded-md transition-colors ${copied ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleNativeShare}
                className="w-full bg-[#EC1D99] hover:bg-[#EC1D99]/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
