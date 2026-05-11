import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ComboOption = {
    value: string;
    label: string;
    sublabel?: string;
};

type Props = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: ComboOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    className?: string;
};

export function Combobox({
    id,
    value,
    onChange,
    options,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyLabel = 'No results.',
    className,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => options.find((o) => o.value === value),
        [options, value],
    );

    const filtered = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.toLowerCase();
        return options.filter((o) =>
            o.label.toLowerCase().includes(q)
            || (o.sublabel ?? '').toLowerCase().includes(q),
        );
    }, [options, query]);

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
                >
                    <span className="truncate">{selected ? selected.label : placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[260px]"
            >
                <div className="relative border-b">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="h-9 border-0 pl-8 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>
                    ) : (
                        filtered.map((o) => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent',
                                    o.value === value && 'bg-accent',
                                )}
                            >
                                <Check className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate">{o.label}</p>
                                    {o.sublabel && <p className="truncate text-[10px] text-muted-foreground">{o.sublabel}</p>}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
