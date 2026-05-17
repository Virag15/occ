import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Search, Filter, Phone, Mail, MessageCircle, Building2, Calendar,
    UserPlus, ArrowRight, X, ChevronDown,
} from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Platform admin sales pipeline. Kanban-ish view of all leads, grouped
 * by status. Click a card to open the side sheet for status changes,
 * assignment, and notes. The "Provision" action is enabled only for
 * leads in `paid` status — converts the lead into a tenant.
 *
 * Design follows the existing AdminLayout / shadcn-card pattern so it
 * sits naturally inside the OCC app.
 */

type PlatformUser = { id: number; name: string; email: string };
type ConvertedTenant = { id: number; name: string; uuid: string };

type Lead = {
    id: number;
    name: string;
    business_name: string;
    phone: string;
    email: string | null;
    current_software: string | null;
    orders_per_month: string | null;
    notes: string | null;
    source: string;
    status: string;
    assigned_to: number | null;
    assigned_to_user?: PlatformUser | null;
    converted_tenant_id: number | null;
    converted_tenant?: ConvertedTenant | null;
    created_at: string;
};

type Props = {
    leads_by_status: Record<string, Lead[]>;
    counts: Record<string, number>;
    platform_users: PlatformUser[];
    filters: { status: string; q: string };
    statuses: string[];
};

const STATUS_LABEL: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    demo_done: 'Demo done',
    quote_sent: 'Quote sent',
    paid: 'Paid',
    provisioned: 'Provisioned',
    lost: 'Lost',
};

const STATUS_TONE: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    demo_done: 'bg-purple-50 text-purple-700 border-purple-200',
    quote_sent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    provisioned: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    lost: 'bg-zinc-50 text-zinc-500 border-zinc-200',
};

export default function AdminLeadsIndex({
    leads_by_status, counts, platform_users, filters, statuses,
}: Props) {
    const [openLead, setOpenLead] = useState<Lead | null>(null);
    const [search, setSearch] = useState(filters.q);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/leads', { q: search, status: filters.status }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const clearFilters = () => router.get('/admin/leads');

    return (
        <AdminLayout>
            <Head title="Leads" />

            <div className="p-6 max-w-[1600px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Sales pipeline</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            {Object.values(counts).reduce((a, b) => Number(a) + Number(b), 0)} leads total
                        </p>
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search business, name, phone, email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                        <Button type="submit" variant="outline">Search</Button>
                        {(filters.q || filters.status) && (
                            <Button type="button" variant="ghost" onClick={clearFilters}>
                                <X className="h-4 w-4" /> Clear
                            </Button>
                        )}
                    </form>
                </div>

                {/* Status filter chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {statuses.map((s) => {
                        const active = filters.status === s;
                        return (
                            <Link
                                key={s}
                                href={`/admin/leads?status=${active ? '' : s}${filters.q ? `&q=${filters.q}` : ''}`}
                                preserveScroll
                                className={cn(
                                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
                                    active
                                        ? 'border-zinc-900 bg-zinc-900 text-white'
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                                )}
                            >
                                {STATUS_LABEL[s] ?? s}
                                <span className={cn(
                                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold',
                                    active ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-600',
                                )}>
                                    {counts[s] ?? 0}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statuses
                        .filter((s) => filters.status === '' || filters.status === s)
                        .map((status) => (
                            <div key={status} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className={cn(
                                        'inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-semibold',
                                        STATUS_TONE[status],
                                    )}>
                                        {STATUS_LABEL[status] ?? status}
                                        <span className="text-[10px]">{(leads_by_status[status] ?? []).length}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(leads_by_status[status] ?? []).length === 0 && (
                                        <div className="text-xs text-zinc-400 px-3 py-6 text-center border border-dashed border-zinc-200 rounded-md">
                                            No leads
                                        </div>
                                    )}
                                    {(leads_by_status[status] ?? []).map((lead) => (
                                        <LeadCard key={lead.id} lead={lead} onOpen={() => setOpenLead(lead)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            <LeadDrawer
                lead={openLead}
                onClose={() => setOpenLead(null)}
                statuses={statuses}
                platformUsers={platform_users}
            />
        </AdminLayout>
    );
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
    return (
        <button
            onClick={onOpen}
            className="w-full text-left bg-white border border-zinc-200 rounded-md p-3 hover:border-zinc-400 hover:shadow-sm transition-all"
        >
            <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-zinc-900 truncate">{lead.business_name}</div>
                    <div className="text-xs text-zinc-500 truncate">{lead.name}</div>
                </div>
            </div>
            <div className="mt-2 text-xs text-zinc-500 flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {lead.phone}
                </span>
                {lead.orders_per_month && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        {lead.orders_per_month.replace('_', '–')}/mo
                    </span>
                )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                <span>{formatDateIN(lead.created_at)}</span>
                <span>{lead.source.replace('_', ' ')}</span>
            </div>
            {lead.assigned_to_user && (
                <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    Assigned to {lead.assigned_to_user.name}
                </div>
            )}
        </button>
    );
}

function LeadDrawer({
    lead, onClose, statuses, platformUsers,
}: {
    lead: Lead | null;
    onClose: () => void;
    statuses: string[];
    platformUsers: PlatformUser[];
}) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        status: lead?.status ?? '',
        assigned_to: lead?.assigned_to ? String(lead.assigned_to) : '',
        notes: lead?.notes ?? '',
    });

    if (!lead) return null;

    const save = () => {
        patch(`/admin/leads/${lead.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const provision = () => {
        router.post(`/admin/leads/${lead.id}/provision`, {}, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}`;
    const callUrl = `tel:${lead.phone.replace(/\s/g, '')}`;
    const emailUrl = lead.email ? `mailto:${lead.email}` : null;

    return (
        <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{lead.business_name}</SheetTitle>
                    <SheetDescription>
                        {lead.name} · captured {formatDateIN(lead.created_at)}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-4">
                    {/* Quick-reach buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <a href={whatsappUrl} target="_blank" rel="noopener"
                           className="inline-flex flex-col items-center gap-1 p-2 rounded-md border border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-[11px] font-medium">WhatsApp</span>
                        </a>
                        <a href={callUrl}
                           className="inline-flex flex-col items-center gap-1 p-2 rounded-md border border-zinc-200 hover:border-zinc-400 transition-colors">
                            <Phone className="h-4 w-4 text-zinc-700" />
                            <span className="text-[11px] font-medium">Call</span>
                        </a>
                        {emailUrl ? (
                            <a href={emailUrl}
                               className="inline-flex flex-col items-center gap-1 p-2 rounded-md border border-zinc-200 hover:border-zinc-400 transition-colors">
                                <Mail className="h-4 w-4 text-zinc-700" />
                                <span className="text-[11px] font-medium">Email</span>
                            </a>
                        ) : (
                            <div className="inline-flex flex-col items-center gap-1 p-2 rounded-md border border-zinc-100 text-zinc-300">
                                <Mail className="h-4 w-4" />
                                <span className="text-[11px]">No email</span>
                            </div>
                        )}
                    </div>

                    {/* Submitted info */}
                    <dl className="space-y-2 text-sm">
                        <Detail label="Phone" value={lead.phone} />
                        {lead.email && <Detail label="Email" value={lead.email} />}
                        {lead.current_software && <Detail label="Current software" value={lead.current_software} />}
                        {lead.orders_per_month && <Detail label="Orders / month" value={lead.orders_per_month.replace('_', '–')} />}
                        <Detail label="Source" value={lead.source.replace('_', ' ')} />
                        {lead.converted_tenant && (
                            <Detail label="Tenant" value={lead.converted_tenant.name} />
                        )}
                    </dl>

                    {/* Status + assignment */}
                    <div className="space-y-3 border-t pt-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.status && <div className="text-[11px] text-red-600 mt-1">{errors.status}</div>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Assigned to</label>
                            <Select
                                value={data.assigned_to || 'none'}
                                onValueChange={(v) => setData('assigned_to', v === 'none' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {platformUsers.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Notes</label>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={4}
                                placeholder="Call notes, quote details, follow-up plan..."
                                maxLength={5000}
                            />
                        </div>
                    </div>
                </div>

                <SheetFooter className="flex-row gap-2 justify-between sm:justify-between">
                    {lead.status === 'paid' && !lead.converted_tenant_id ? (
                        <Button onClick={provision} variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            <ArrowRight className="h-4 w-4 mr-1" /> Provision tenant
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={save} disabled={processing}>Save</Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-zinc-900 font-medium">{value}</dd>
        </div>
    );
}
