import React from 'react';

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] p-4">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-[#9333EA]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Search
          </h1>
        </header>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <input
            className="w-full rounded-md border p-3"
            placeholder="Search for stories, friends, or tags..."
          />
          <p className="mt-3 text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Try searching for &quot;mystery&quot; or &quot;space&quot;.
          </p>
        </div>
      </div>
    </main>
  );
}
