import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-6">
            <div className="w-full max-w-sm space-y-6">
                <Link href="/" className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold tracking-tight text-foreground">OCC</span>
                    <span className="text-xs text-muted-foreground">GC Communication</span>
                </Link>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        {children}
                    </CardContent>
                </Card>

                <p className="text-center text-[11px] text-muted-foreground">
                    Switchgear distribution operations
                </p>
            </div>
        </div>
    );
}
