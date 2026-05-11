import { Mail, Phone } from 'lucide-react';
import { Badge, BadgeColor } from '@/Components/ui/badge';

export type PropertyType =
    | 'text'
    | 'mono'
    | 'number'
    | 'currency'
    | 'date'
    | 'checkbox'
    | 'phone'
    | 'email'
    | 'badge'
    | 'multi_select';

export type PropertyValue = string | number | boolean | string[] | null | undefined;

const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

function formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PropertyCell({
    type,
    value,
    badgeColor,
}: {
    type: PropertyType;
    value: PropertyValue;
    badgeColor?: BadgeColor;
}) {
    if (value === null || value === undefined || value === '') {
        return <span className="text-[var(--color-muted-foreground)]/50">—</span>;
    }

    switch (type) {
        case 'text':
            return <span>{String(value)}</span>;

        case 'mono':
            return <span className="font-mono text-[13px] tabular-nums">{String(value)}</span>;

        case 'number':
            return <span className="tabular-nums">{String(value)}</span>;

        case 'currency':
            return (
                <span className="tabular-nums">
                    {inr.format(Number(value))}
                </span>
            );

        case 'date':
            return <span className="tabular-nums">{formatDate(String(value))}</span>;

        case 'checkbox':
            return (
                <span aria-label={value ? 'yes' : 'no'}>
                    {value ? '✓' : ''}
                </span>
            );

        case 'phone':
            return (
                <a
                    href={`tel:${value}`}
                    className="inline-flex items-center gap-1 font-mono text-[13px] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Phone className="h-3 w-3 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
                    {String(value)}
                </a>
            );

        case 'email':
            return (
                <a
                    href={`mailto:${value}`}
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Mail className="h-3 w-3 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
                    {String(value)}
                </a>
            );

        case 'badge':
            return <Badge color={badgeColor ?? 'default'}>{String(value)}</Badge>;

        case 'multi_select': {
            const arr = Array.isArray(value) ? value : [];
            if (arr.length === 0) {
                return <span className="text-[var(--color-muted-foreground)]/50">—</span>;
            }
            return (
                <span className="flex flex-wrap gap-1">
                    {arr.map((v) => (
                        <Badge key={v} color={badgeColor ?? 'default'}>
                            {v}
                        </Badge>
                    ))}
                </span>
            );
        }

        default:
            return <span>{String(value)}</span>;
    }
}
