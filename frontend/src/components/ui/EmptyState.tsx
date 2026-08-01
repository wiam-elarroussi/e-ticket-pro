export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 py-12 text-sm text-slate-500 dark:text-slate-400">
      {message}
    </div>
  );
}
