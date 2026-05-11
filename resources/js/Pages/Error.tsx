import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Home, ShieldX, Search, ServerCrash, Clock } from 'lucide-react';

type Props = {
    status: number;
    message?: string;
};

const meta: Record<number, { title: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: 'amber' | 'red' | 'muted' }> = {
    403: {
        title: 'Forbidden',
        description: "You don't have permission to view this. If you think this is a mistake, ask your owner or manager to update your role.",
        icon: ShieldX,
        tone: 'amber',
    },
    404: {
        title: 'Page not found',
        description: "We couldn't find what you were looking for. The link might be old, or the record may have been deleted.",
        icon: Search,
        tone: 'muted',
    },
    419: {
        title: 'Session expired',
        description: 'You were away for a while and your session timed out for security. Sign in again to continue.',
        icon: Clock,
        tone: 'amber',
    },
    500: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred on our side. Please try again. If it keeps happening, share the time it occurred with your admin.',
        icon: ServerCrash,
        tone: 'red',
    },
    503: {
        title: 'Down for maintenance',
        description: "We're updating OCC. Try again in a minute or two.",
        icon: ServerCrash,
        tone: 'muted',
    },
};

export default function ErrorPage({ status, message }: Props) {
    const info = meta[status] ?? {
        title: 'Unexpected error',
        description: message ?? 'An error occurred.',
        icon: ServerCrash,
        tone: 'red' as const,
    };
    const Icon = info.icon;
    const iconWrap = {
        amber: 'bg-amber-500/10 text-amber-700 border-amber-200',
        red: 'bg-red-500/10 text-red-600 border-red-200',
        muted: 'bg-muted text-muted-foreground border-border',
    }[info.tone];

    return (
        <>
            <Head title={`${status} — ${info.title}`} />

            <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-6">
                <div className="w-full max-w-md space-y-6">
                    <Link href="/" className="flex flex-col items-center gap-1">
                        <span className="text-2xl font-bold tracking-tight text-foreground">OCC</span>
                        <span className="text-xs text-muted-foreground">GC Communication</span>
                    </Link>

                    <Card className="shadow-sm">
                        <CardContent className="p-8 text-center">
                            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${iconWrap}`}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground tabular-nums">Error {status}</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight">{info.title}</h1>
                            <p className="mt-3 text-sm text-muted-foreground">
                                {message ?? info.description}
                            </p>

                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                {status === 419 ? (
                                    <Button asChild>
                                        <Link href="/login"><ArrowLeft className="h-4 w-4 mr-1" /> Sign in again</Link>
                                    </Button>
                                ) : (
                                    <>
                                        <Button asChild variant="outline" onClick={() => window.history.back()}>
                                            <span><ArrowLeft className="h-4 w-4 mr-1" /> Go back</span>
                                        </Button>
                                        <Button asChild>
                                            <Link href="/"><Home className="h-4 w-4 mr-1" /> Go to dashboard</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center text-[11px] text-muted-foreground">
                        Switchgear distribution operations · OCC
                    </p>
                </div>
            </div>
        </>
    );
}
