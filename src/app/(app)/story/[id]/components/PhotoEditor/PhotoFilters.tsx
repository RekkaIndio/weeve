import { PHOTO_FILTERS } from "../../constants/filters";

interface PhotoFiltersProps {
    currentFilter: string;
    onSelectFilter: (id: string) => void;
    previewImage: string;
}

export function PhotoFilters({ currentFilter, onSelectFilter, previewImage }: PhotoFiltersProps) {
    return (
        <div className="fixed bottom-36 left-0 right-0 z-[110] pointer-events-auto animate-in slide-in-from-bottom duration-200">
            <div
                className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide bg-gradient-to-t from-black/80 to-transparent"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {PHOTO_FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => onSelectFilter(filter.id)}
                        className={`shrink-0 flex flex-col items-center gap-1.5 transition-all ${currentFilter === filter.id ? 'scale-105' : 'opacity-80 hover:opacity-100'}`}
                    >
                        {/* Filter preview thumbnail */}
                        <div
                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${currentFilter === filter.id ? 'border-[#EC1D99]' : 'border-white/20'}`}
                            style={{ filter: filter.filter }}
                        >
                            <img
                                src={previewImage}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className={`text-xs font-medium ${currentFilter === filter.id ? 'text-[#EC1D99]' : 'text-white/70'}`}>
                            {filter.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
