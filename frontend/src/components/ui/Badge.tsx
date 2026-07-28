import clsx from 'clsx';

type Tone = 'green' | 'red' | 'slate' | 'amber' | 'indigo';

const toneClasses: Record<Tone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  slate: 'bg-slate-50 text-slate-600 ring-slate-500/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
