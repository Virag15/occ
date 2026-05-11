import { format } from 'date-fns';

const IST_TZ = 'Asia/Kolkata';

export function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: IST_TZ,
    });
}

export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: IST_TZ,
    });
}

export function formatTime(value: string | Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: IST_TZ,
    });
}

export function formatShortDate(value: string | Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: IST_TZ,
    });
}

export function toISODate(date: Date | null | undefined): string {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
}
