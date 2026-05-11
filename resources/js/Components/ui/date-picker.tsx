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

export function DatePicker({
    value,
    onChange,
    placeholder = 'Pick a date',
    className,
    id,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const selected = value ? new Date(value) : undefined;

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
