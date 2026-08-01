import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'rounded-xl border-0 bg-white dark:bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:focus:ring-emerald-500 transition-all',
            error && 'ring-rose-500 focus:ring-rose-500',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
