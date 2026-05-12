import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    Plug, FileSpreadsheet, MessageCircle, Webhook, RefreshCw, CircleCheck, CircleAlert, Play, Database, Users, Package, Boxes, Clock,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsShell } from './SettingsShell';
import { cn } from '@/lib/utils';

type TallySummary = {
    enabled: boolean;
    host: string;
    port: number;
    company: string;
    endpoint: string;
};

type TallyLog = {
    id: number;
    entity_type: string;
    direction: string;
    status: 'running' | 'success' | 'partial' | 'failed' | 'demo';
    records_processed: number;
    records_created: number;
    records_updated: number;
    records_failed: number;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
    trigger?: { id: number; name: string } | null;
};

const STATUS_PILL: Record<TallyLog['status'], string> = {
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    partial: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    failed:  'bg-red-500/10 text-red-700 border-red-200',
    running: 'bg-blue-500/10 text-blue-700 border-blue-200',
    demo:    'bg-muted text-muted-foreground border-border',
};

const ENTITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    customers: Users,
    products: Package,
    stock: Boxes,
    all: Database,
};

export default function Integrations({
    tally,
    tally_logs,
    tally_last_synced,
}: {
    tally: TallySummary;
    tally_logs: TallyLog[];
    tally_last_synced: Record<string, string | null>;
}) {
    const [syncing, setSyncing] = useState<string | null>(null);

    const triggerSync = (type: string) => {
        setSyncing(type);
        router.post(route('settings.tally.sync'), { type }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Tally ${type} sync complete`),
            onError: (e) => toast.error(Object.values(e).join(', ')),
            onFinish: () => setSyncing(null),
        });
    };

    const ping = () => {
        router.post(route('settings.tally.ping'), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(tally.enabled ? 'Ping sent — see status above' : 'Tally is disabled (TALLY_ENABLED=false)'),
        });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Settings' }, { label: 'Integrations' }]}>
            <Head title="Integrations" />

            <SettingsShell active="integrations">
                <div className="space-y-5">
                    {/* ─── Tally bridge ─────────────────────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                        TallyPrime bridge
                                        {tally.enabled
                                            ? <Badge className="border bg-emerald-500/10 text-emerald-700 border-emerald-200">connected</Badge>
                                            : <Badge variant="outline" className="text-[10px] uppercase">demo mode</Badge>}
                                    </CardTitle>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Bi-directional sync of customers, products and stock. {tally.enabled
                                            ? <>Connected to <span className="font-mono">{tally.endpoint}</span> · company "<span className="font-mono">{tally.company}</span>".</>
                                            : <>Set <span className="font-mono">TALLY_ENABLED=true</span> in your .env and configure host / port / company to connect to a live instance. Until then, syncs run in demo mode against canned data.</>}
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onClick={ping}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Test connection
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {/* Sync actions */}
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {(['customers', 'products', 'stock', 'all'] as const).map((entity) => {
                                    const Icon = ENTITY_ICON[entity];
                                    const last = tally_last_synced[entity] ?? null;
                                    const isThisSyncing = syncing === entity;
                                    return (
                                        <div key={entity} className="rounded-md border p-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium capitalize">{entity === 'all' ? 'Full sync' : entity}</span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                                {last
                                                    ? <>Last synced {new Date(last).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                                                    : <>Never synced</>}
                                            </p>
                                            <Button
                                                size="sm"
                                                variant={entity === 'all' ? 'default' : 'outline'}
                                                disabled={!!syncing}
                                                onClick={() => triggerSync(entity)}
                                                className="mt-2 w-full"
                                            >
                                                {isThisSyncing
                                                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Syncing…</>
                                                    : <><Play className="h-3.5 w-3.5 mr-1" /> Sync now</>}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sync log */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" /> Recent sync activity
                                    </h3>
                                    {tally_logs.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground">Showing last {tally_logs.length}</span>
                                    )}
                                </div>
                                {tally_logs.length === 0 ? (
                                    <p className="mt-2 rounded-md border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                                        No sync runs yet. Hit "Sync now" above to try it out — runs in demo mode if Tally isn't connected.
                                    </p>
                                ) : (
                                    <div className="mt-2 overflow-hidden rounded-md border">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">When</th>
                                                    <th className="px-3 py-2 text-left font-semibold">Entity</th>
                                                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                                                    <th className="px-3 py-2 text-right font-semibold">Created</th>
                                                    <th className="px-3 py-2 text-right font-semibold">Updated</th>
                                                    <th className="px-3 py-2 text-right font-semibold">Failed</th>
                                                    <th className="px-3 py-2 text-left font-semibold">By</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tally_logs.map((log) => (
                                                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                                                        <td className="px-3 py-2 text-muted-foreground tabular-nums">
                                                            {new Date(log.started_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-3 py-2 capitalize">{log.entity_type}</td>
                                                        <td className="px-3 py-2">
                                                            <Badge className={cn('border text-[10px] uppercase', STATUS_PILL[log.status])}>
                                                                {log.status === 'success' && <CircleCheck className="mr-0.5 inline h-3 w-3" />}
                                                                {log.status === 'failed' && <CircleAlert className="mr-0.5 inline h-3 w-3" />}
                                                                {log.status}
                                                            </Badge>
                                                            {log.error_message && (
                                                                <p className="mt-0.5 text-[10px] text-red-600" title={log.error_message}>
                                                                    {log.error_message.length > 60 ? log.error_message.slice(0, 60) + '…' : log.error_message}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{log.records_created}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{log.records_updated}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">
                                                            <span className={log.records_failed > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                                                {log.records_failed}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-muted-foreground">{log.trigger?.name ?? 'System'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ─── Other integrations (planned) ─────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Plug className="h-4 w-4 text-muted-foreground" /> Coming soon
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PlannedRow
                                    icon={MessageCircle}
                                    title="WhatsApp (AiSensy)"
                                    description="Automated messages on key events: order confirmation, LR share, dispatch notification, payment reminder, delivery confirmation."
                                />
                                <PlannedRow
                                    icon={Webhook}
                                    title="Webhooks"
                                    description="Outbound webhooks on order events for partner integrations."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SettingsShell>
        </AdminLayout>
    );
}

function PlannedRow({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
    return (
        <div className="rounded-md border p-3 transition-colors hover:bg-muted/30">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{title}</h4>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Planned</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
    );
}
