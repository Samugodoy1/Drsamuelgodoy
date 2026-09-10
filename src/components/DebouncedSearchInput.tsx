import { useEffect, useState } from 'react';
import { Search } from '../icons';

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  inputClassName?: string;
}

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  delay = 180,
  className = 'relative flex-1',
  inputClassName = 'w-full h-10 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-all text-base',
}: DebouncedSearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (local === value) return;
    const timer = window.setTimeout(() => onChange(local), delay);
    return () => window.clearTimeout(timer);
  }, [local, value, delay, onChange]);

  return (
    <div className={className}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="search"
        placeholder={placeholder}
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        className={inputClassName}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
