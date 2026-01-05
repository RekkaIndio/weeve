
interface ViewTabsProps {
    viewMode: 'all' | 'groups' | 'people';
    setViewMode: (mode: 'all' | 'groups' | 'people') => void;
}

export default function ViewTabs({ viewMode, setViewMode }: ViewTabsProps) {
    return (
        <div className="flex items-center gap-6 px-2 border-b border-gray-800 mb-4 overflow-x-auto">
            <button
                onClick={() => setViewMode('all')}
                className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'all' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Stories
                {viewMode === 'all' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                )}
            </button>
            <button
                onClick={() => setViewMode('groups')}
                className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'groups' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Groups
                {viewMode === 'groups' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                )}
            </button>
            <button
                onClick={() => setViewMode('people')}
                className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'people' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
                People
                {viewMode === 'people' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                )}
            </button>
        </div>
    );
}
