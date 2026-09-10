export function AppRouteFallback() {
  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 pt-16" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 bg-slate-100 rounded-lg animate-pulse mb-6" />
      <div className="space-y-3">
        <div className="h-24 bg-white rounded-2xl animate-pulse" />
        <div className="h-24 bg-white rounded-2xl animate-pulse" />
        <div className="h-24 bg-white rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
