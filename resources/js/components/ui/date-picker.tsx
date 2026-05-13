import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DatePickerProps = {
    value?: string | Date | null;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    disabled?: boolean;
};

function parseLocalDate(value: string | Date | null | undefined): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    // Parse YYYY-MM-DD as LOCAL midnight to avoid UTC-shift bugs in IST and other
    // timezones ahead of UTC. `new Date('2026-05-12')` would parse as UTC midnight,
    // which shows as 2026-05-11 23:30 in IST.
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DatePicker({
    value,
    onChange,
    placeholder = 'Pick a date',
    className,
    id,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const selected = parseLocalDate(value);

    function handleSelect(date: Date | undefined) {
        if (date) onChange(date);
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !value && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {selected ? format(selected, 'PPP') : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}
