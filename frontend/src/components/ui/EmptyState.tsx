export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 py-12 text-sm text-slate-500">
      {message}
    </div>
  );
}
