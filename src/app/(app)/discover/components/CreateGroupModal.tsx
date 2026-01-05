import { X } from "lucide-react";

interface CreateGroupModalProps {
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    newGroupName: string;
    setNewGroupName: (val: string) => void;
    newGroupDesc: string;
    setNewGroupDesc: (val: string) => void;
    isPrivate: boolean;
    setIsPrivate: (val: boolean) => void;
    creating: boolean;
}

export default function CreateGroupModal({
    onClose,
    onSubmit,
    newGroupName,
    setNewGroupName,
    newGroupDesc,
    setNewGroupDesc,
    isPrivate,
    setIsPrivate,
    creating,
}: CreateGroupModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-1">Create New Group</h2>
                <p className="text-sm text-gray-500 mb-6">Build a space for your community</p>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Group Name</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all text-white placeholder-gray-600"
                            placeholder="e.g. Photography Lovers"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                        <textarea
                            value={newGroupDesc}
                            onChange={(e) => setNewGroupDesc(e.target.value)}
                            className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all h-28 resize-none text-white placeholder-gray-600"
                            placeholder="What is this group about?"
                        />
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-800 bg-black/30 cursor-pointer hover:border-gray-700 transition-colors">
                        <div className="relative flex items-center mt-1">
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-transparent text-[#EC1D99] focus:ring-[#EC1D99] focus:ring-offset-0 focus:ring-offset-transparent"
                            />
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-white">Private Group</span>
                            <span className="block text-xs text-gray-500">Only people with an invite link can join this group.</span>
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#EC1D99]/20 active:scale-[0.99]"
                    >
                        {creating ? 'Creating Group...' : 'Create Group'}
                    </button>
                </form>
            </div>
        </div>
    );
}
