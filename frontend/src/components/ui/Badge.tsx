import clsx from 'clsx';

type Tone = 'green' | 'red' | 'slate' | 'amber' | 'indigo' | 'gold' | 'purple';

const toneClasses: Record<Tone, string> = {
  green: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-500/30',
  red: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-rose-600/20 dark:ring-rose-500/30',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-500/10 dark:ring-slate-700',
  amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-500/30',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-600/20 dark:ring-indigo-500/30',
  gold: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 ring-yellow-600/20 dark:ring-yellow-500/30',
  purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-purple-600/20 dark:ring-purple-500/30',
};

const dotClasses: Record<Tone, string> = {
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  indigo: 'bg-indigo-500',
  gold: 'bg-yellow-500',
  purple: 'bg-purple-500',
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  pulse?: boolean;
}

export function Badge({ tone = 'slate', children, pulse }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset shadow-xs transition-all',
        toneClasses[tone],
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dotClasses[tone])} />
          <span className={clsx('relative inline-flex h-2 w-2 rounded-full', dotClasses[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
