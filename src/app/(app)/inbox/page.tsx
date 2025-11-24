import React from 'react';

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] p-4">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-[#9333EA]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Inbox
          </h1>
        </header>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-[#1F2937]" style={{ fontFamily: 'Inter, sans-serif' }}>
            No messages yet. Your messages will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}
