"use client";
import React, { Suspense } from 'react';
import { useDiscoverLogic } from './hooks/useDiscoverLogic';

import DiscoverHeader from './components/DiscoverHeader';
import ViewTabs from './components/ViewTabs';
import FeedTypeFilters from './components/FeedTypeFilters';
import GroupStoriesView from './components/GroupStoriesView';
import PeopleView from './components/PeopleView';
import AllStoriesView from './components/AllStoriesView';
import CreateGroupModal from './components/CreateGroupModal';
import DiscoveryFeedOverlay from './components/DiscoveryFeedOverlay';

function DiscoverContent() {
    const {
        // State
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        feedType, setFeedType,
        showCreateGroup, setShowCreateGroup,
        newGroupName, setNewGroupName,
        newGroupDesc, setNewGroupDesc,
        isPrivate, setIsPrivate,
        creating,
        peopleResults,
        isSearchingPeople,

        // Data
        currentUser,
        groups,
        userGroupIds,
        stories,
        filteredStories,
        trendingStories,
        groupStories,
        selectedStoryIndex,

        // Actions
        handleCreateGroup,
        handleSendFriendRequest,
        openStoryInOverlay,
        router,
        searchParams
    } = useDiscoverLogic();

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Sticky Header Container for Search, Tabs, and Filters */}
            <div className="sticky top-0 z-20 bg-black">
                {/* Search Header */}
                <DiscoverHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    currentUser={currentUser}
                />
                {/* View Tabs */}
                <ViewTabs
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />

                {/* Feed Type Filter Chips - Only show in Stories view */}
                {viewMode === 'all' && !searchQuery.trim() && (
                    <FeedTypeFilters
                        feedType={feedType}
                        setFeedType={setFeedType}
                    />
                )}
            </div>

            {/* Content Area */}
            {viewMode === 'groups' ? (
                <GroupStoriesView
                    groupStories={groupStories}
                    groups={groups}
                    userGroupIds={userGroupIds}
                    searchQuery={searchQuery}
                    currentUser={currentUser}
                    openStoryInOverlay={openStoryInOverlay}
                    setShowCreateGroup={setShowCreateGroup}
                />
            ) : viewMode === 'people' ? (
                <PeopleView
                    peopleResults={peopleResults}
                    isSearchingPeople={isSearchingPeople}
                    handleSendFriendRequest={handleSendFriendRequest}
                />
            ) : (
                <AllStoriesView
                    searchQuery={searchQuery}
                    feedType={feedType}
                    stories={stories}
                    filteredStories={filteredStories}
                    trendingStories={trendingStories}
                    peopleResults={peopleResults}
                    openStoryInOverlay={openStoryInOverlay}
                    setViewMode={setViewMode}
                />
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onSubmit={handleCreateGroup}
                    newGroupName={newGroupName}
                    setNewGroupName={setNewGroupName}
                    newGroupDesc={newGroupDesc}
                    setNewGroupDesc={setNewGroupDesc}
                    isPrivate={isPrivate}
                    setIsPrivate={setIsPrivate}
                    creating={creating}
                />
            )}

            {/* Discovery Feed Overlay - TikTok-style full-screen scrollable feed */}
            {selectedStoryIndex !== null && (
                <DiscoveryFeedOverlay
                    initialIndex={selectedStoryIndex}
                    stories={filteredStories}
                    onClose={() => {
                        // Remove storyIdParam from URL to close overlay
                        const newParams = new URLSearchParams(searchParams?.toString());
                        newParams.delete('storyId');
                        router.push(`/discover?${newParams.toString()}`, { scroll: false });
                    }}
                />
            )}
        </div>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
            <DiscoverContent />
        </Suspense>
    );
}
