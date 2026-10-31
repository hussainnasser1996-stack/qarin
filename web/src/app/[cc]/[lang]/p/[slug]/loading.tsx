export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="panel p-7 grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="w-[180px] h-[180px] rounded-xl bg-sunk" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 rounded bg-sunk" />
          <div className="h-4 w-1/3 rounded bg-sunk" />
          <div className="h-16 w-64 rounded-xl bg-sunk" />
        </div>
      </div>
      <div className="panel h-64" />
    </div>
  );
}
