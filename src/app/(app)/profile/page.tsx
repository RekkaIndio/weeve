"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Settings, Grid, Bookmark, Share2, Wallet, UserPlus, X, Copy, Check, Camera, Clock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/auth";
import { capturePhoto } from "@/lib/camera";

export default function ProfilePage() {
  const { currentUser, stories, setCurrentUser, friends, fetchFriends } = useStore();
  const [activeTab, setActiveTab] = useState<'weeves' | 'saved' | 'waiting'>('weeves');

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const myStories = currentUser ? stories.filter(s => s.participants.some(p => p.id === currentUser.id && (p.status === 'accepted' || p.status === undefined))) : [];
  // Waiting stories include: pending invites (status='waiting') OR active stories where it's the user's turn
  const waitingStories = currentUser ? stories.filter(s => {
    const userParticipant = s.participants.find(p => p.id === currentUser.id);
    if (!userParticipant) return false;

    // Show if pending invite
    if (userParticipant.status === 'waiting') return true;

    // Show if it's their turn in an active story
    if (s.status === 'active' && s.currentTurnUserId === currentUser.id) return true;

    return false;
  }) : [];
  // Mock saved stories - in production this would come from the store/database
  const savedStories = stories.filter(s => s.id === 's1' || s.id === 's2');

  const handleSave = async () => {
    if (!currentUser) return;
    const trimmedName = editName.trim();
    if (trimmedName.length === 0) {
      toast.error('Display name cannot be empty');
      return;
    }

    const trimmedAvatar = editAvatar.trim();
    const updates: { name: string; avatar?: string } = { name: trimmedName };
    if (trimmedAvatar.length > 0) {
      updates.avatar = trimmedAvatar;
    }

    try {
      const { error } = await updateUserProfile(currentUser.id, updates);
      if (error) throw error;

      setCurrentUser({
        ...currentUser,
        name: trimmedName,
        avatar: trimmedAvatar.length > 0 ? trimmedAvatar : currentUser.avatar,
      });
      toast.success('Profile updated!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar || '');
    setIsEditing(false);
  };

  const handleAvatarClick = async () => {
    const file = await capturePhoto();
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update user avatar in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: avatarUrl })
        .eq('user_id', currentUser.id);

      if (updateError) throw updateError;

      // Update local state
      setCurrentUser({
        ...currentUser,
        avatar: avatarUrl
      });
      setEditAvatar(avatarUrl);

      toast.success('Avatar updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const inviteCode = currentUser?.inviteCode || currentUser?.id || '';
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

  // Show loading state if user is not yet loaded
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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

      <div className="flex flex-col items-center px-4 mb-8">
        <div
          className="relative mb-4 group cursor-pointer"
          onClick={!isEditing ? handleAvatarClick : undefined}
        >
          <img
            src={isEditing ? editAvatar : currentUser.avatar}
            alt={currentUser.name}
            className={`w-24 h-24 rounded-full border-4 border-black bg-gray-800 object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${editName}`;
            }}
          />
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
            </div>
          )}
          {!isEditing && !uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          )}
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
                <div className="font-bold text-lg">{friends.length}</div>
                <div className="text-xs text-gray-500">Friends</div>
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
        <button
          onClick={() => setActiveTab('waiting')}
          className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'waiting'
            ? 'border-white text-white'
            : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
          <div className="relative">
            <Clock className="w-6 h-6" />
            {waitingStories.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#EC1D99] rounded-full border-2 border-black"></div>
            )}
          </div>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {activeTab === 'weeves' && (
          <>
            {myStories.map(story => {
              const sortedContributions = (story.contributions || [])
                .slice()
                .sort((a, b) => a.timestamp - b.timestamp);
              const hasContributions = sortedContributions.length > 0;
              const firstContribution = sortedContributions[0];
              const waitingForFirstContribution = !hasContributions;

              const waitingForUser = story.currentTurnUserId
                ? story.participants.find(p => p.id === story.currentTurnUserId)
                : null;

              const isWaitingForNextCreator = !waitingForFirstContribution && story.status === 'active' && story.currentTurnUserId && story.currentTurnUserId !== currentUser.id;
              const isMyTurn = !waitingForFirstContribution && story.status === 'active' && story.currentTurnUserId === currentUser.id;

              const firstMediaType = firstContribution?.mediaType;
              const firstMediaUrl = firstContribution?.mediaUrl;

              return (
                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                  {waitingForFirstContribution ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm w-full max-w-[85%]">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-[#EC1D99]/70 p-0.5 animate-pulse">
                            <img
                              src={waitingForUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser?.name || 'Storyteller'}`}
                              alt={waitingForUser?.name || 'Next creator'}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                          </div>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-gray-300">Waiting for</span>
                        <span className="text-sm font-bold text-white truncate max-w-full">
                          {waitingForUser?.name?.split(' ')[0] || 'a collaborator'}
                        </span>
                      </div>
                    </div>
                  ) : firstMediaType === 'video' && firstMediaUrl ? (
                    <video
                      src={firstMediaUrl}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : firstMediaType === 'image' && firstMediaUrl ? (
                    <img
                      src={firstMediaUrl}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={story.title}
                    />
                  ) : firstContribution ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3 text-center">
                      <p className="text-sm font-semibold leading-snug line-clamp-5">
                        {firstContribution.content}
                      </p>
                    </div>
                  ) : (
                    <img
                      src={story.coverImage || "https://via.placeholder.com/300"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={story.title}
                    />
                  )}

                  {!waitingForFirstContribution && isMyTurn && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="bg-[#EC1D99] text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-lg animate-pulse border-2 border-white">
                        Your Turn!
                      </div>
                    </div>
                  )}

                  {!waitingForFirstContribution && isWaitingForNextCreator && waitingForUser && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center backdrop-blur-[2px]">
                      <div className="relative mb-2">
                        <div className="w-10 h-10 rounded-full border-2 border-[#EC1D99] p-0.5 animate-pulse">
                          <img
                            src={waitingForUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser.name}`}
                            className="w-full h-full rounded-full object-cover"
                            alt={waitingForUser.name}
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
        )}

        {activeTab === 'saved' && (
          <>
            {savedStories.length > 0 ? (
              savedStories.map(story => {
                const sortedContributions = (story.contributions || [])
                  .slice()
                  .sort((a, b) => a.timestamp - b.timestamp);
                const hasContributions = sortedContributions.length > 0;
                const firstContribution = sortedContributions[0];
                const waitingForFirstContribution = !hasContributions;

                const waitingForUser = story.currentTurnUserId
                  ? story.participants.find(p => p.id === story.currentTurnUserId)
                  : null;

                const firstMediaType = firstContribution?.mediaType;
                const firstMediaUrl = firstContribution?.mediaUrl;

                return (
                  <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                    {waitingForFirstContribution ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3">
                        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm w-full max-w-[85%]">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-[#EC1D99]/70 p-0.5 animate-pulse">
                              <img
                                src={waitingForUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser?.name || 'Storyteller'}`}
                                alt={waitingForUser?.name || 'Next creator'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                            </div>
                          </div>
                          <span className="text-[11px] uppercase tracking-wide text-gray-300">Waiting for</span>
                          <span className="text-sm font-bold text-white truncate max-w-full">
                            {waitingForUser?.name?.split(' ')[0] || 'a collaborator'}
                          </span>
                        </div>
                      </div>
                    ) : firstMediaType === 'video' && firstMediaUrl ? (
                      <video
                        src={firstMediaUrl}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : firstMediaType === 'image' && firstMediaUrl ? (
                      <img
                        src={firstMediaUrl}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={story.title}
                      />
                    ) : firstContribution ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3 text-center">
                        <p className="text-sm font-semibold leading-snug line-clamp-5">
                          {firstContribution.content}
                        </p>
                      </div>
                    ) : (
                      <img
                        src={story.coverImage || "https://via.placeholder.com/300"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={story.title}
                      />
                    )}

                    <div className="absolute top-2 right-2">
                      <Bookmark className="w-4 h-4 text-white fill-white drop-shadow-md" />
                    </div>
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      {story.contributions.length}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                <Bookmark className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No saved weeves yet</p>
                <p className="text-xs mt-1">Tap the bookmark icon to save weeves</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'waiting' && (
          <>
            {waitingStories.length > 0 ? (
              waitingStories.map(story => (
                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden border-2 border-[#EC1D99]/50">
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <div className="w-12 h-12 rounded-full bg-[#EC1D99] flex items-center justify-center mb-2 animate-pulse">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs font-bold text-white">Your Turn!</p>
                  </div>
                  <img
                    src={story.coverImage || story.contributions[0]?.mediaUrl || "https://via.placeholder.com/300"}
                    className="w-full h-full object-cover opacity-50"
                    alt={story.title}
                  />
                </Link>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                <Clock className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No pending invites</p>
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
