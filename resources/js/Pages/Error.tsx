import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Home, ShieldX, Search, ServerCrash, Clock, Ban } from 'lucide-react';

type Props = {
    status: number;
    /** Exception message — only sent in debug mode for 5xx. */
    debug?: string | null;
};

type Info = {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: 'amber' | 'red' | 'muted';
};

const META: Record<number, Info> = {
    403: {
        title: 'You don\'t have access',
        description: 'Your role doesn\'t allow this page. Ask an owner or manager to grant access if you need it.',
        icon: ShieldX,
        tone: 'amber',
    },
    404: {
        title: 'Page not found',
        description: 'This link is old or the record was deleted. Use the navigation to find what you need.',
        icon: Search,
        tone: 'muted',
    },
    419: {
        title: 'Session expired',
        description: 'You were away a while and were signed out for security. Sign in again to continue.',
        icon: Clock,
        tone: 'amber',
    },
    429: {
        title: 'Too many requests',
        description: 'You\'re going a bit fast. Wait a few seconds and try again.',
        icon: Ban,
        tone: 'amber',
    },
    500: {
        title: 'Something broke on our side',
        description: 'This one\'s on us, not you. Try again in a moment — if it keeps happening, tell the OCC team the time it occurred.',
        icon: ServerCrash,
        tone: 'red',
    },
    503: {
        title: 'Down for a quick update',
        description: 'OCC is being updated. This usually takes under a minute — try again shortly.',
        icon: ServerCrash,
        tone: 'muted',
    },
};

export default function ErrorPage({ status, debug }: Props) {
    const info: Info = META[status] ?? {
        title: 'That didn\'t work',
        description: 'Something unexpected happened. Try again, or head back to your dashboard.',
        icon: ServerCrash,
        tone: 'red',
    };
    const Icon = info.icon;
    const iconWrap = {
        amber: 'bg-amber-500/10 text-amber-700 border-amber-200',
        red: 'bg-red-500/10 text-red-600 border-red-200',
        muted: 'bg-muted text-muted-foreground border-border',
    }[info.tone];

    return (
        <>
            <Head title={`${info.title} — OCC`} />

            <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-6">
                <div className="w-full max-w-md space-y-6">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1">
                        <span className="text-2xl font-bold tracking-tight text-foreground">OCC</span>
                        <span className="text-xs text-muted-foreground">GC Communication</span>
                    </Link>

                    <Card className="shadow-sm">
                        <CardContent className="p-8 text-center">
                            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${iconWrap}`}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground tabular-nums">
                                Error {status}
                            </p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight">{info.title}</h1>
                            <p className="mt-3 text-sm text-muted-foreground">{info.description}</p>

                            {debug && (
                                <pre className="mt-4 max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
                                    {debug}
                                </pre>
                            )}

                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                {status === 419 ? (
                                    <Button asChild>
                                        <Link href="/login"><ArrowLeft className="mr-1 h-4 w-4" /> Sign in again</Link>
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={() => window.history.back()}>
                                            <ArrowLeft className="mr-1 h-4 w-4" /> Go back
                                        </Button>
                                        <Button asChild>
                                            <Link href="/dashboard"><Home className="mr-1 h-4 w-4" /> Dashboard</Link>
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
