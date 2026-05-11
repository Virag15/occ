import { Head } from '@inertiajs/react';
import { Plug, MessageCircle, FileSpreadsheet, Webhook } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettingsShell } from './SettingsShell';

const INTEGRATIONS = [
    {
        id: 'tally',
        title: 'TallyPrime bridge',
        icon: FileSpreadsheet,
        status: 'planned',
        description: 'Bi-directional sync of customers, products, stock, vouchers and ledger entries. OCC becomes the UX layer on top of Tally.',
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp (AiSensy)',
        icon: MessageCircle,
        status: 'planned',
        description: 'Automated messages: order confirmation, LR share, dispatch notification, payment reminder, delivery confirmation request.',
    },
    {
        id: 'webhooks',
        title: 'Webhooks',
        icon: Webhook,
        status: 'planned',
        description: 'Outbound webhooks on order events (status change, payment received, return raised) for partner integrations.',
    },
];

export default function Integrations() {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Settings' }, { label: 'Integrations' }]}>
            <Head title="Integrations" />

            <SettingsShell active="integrations">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Plug className="h-4 w-4 text-muted-foreground" /> Available integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {INTEGRATIONS.map((it) => {
                                const Icon = it.icon;
                                return (
                                    <div key={it.id} className="rounded-md border p-3 transition-colors hover:bg-muted/30">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="text-sm font-medium">{it.title}</h3>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{it.status}</Badge>
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{it.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-4 rounded border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                            Integrations land in Phase 4 of the roadmap. See <code className="rounded bg-muted px-1 font-mono">PHASES.md</code> in the project root for sequencing.
                        </p>
                    </CardContent>
                </Card>
            </SettingsShell>
        </AdminLayout>
    );
}
