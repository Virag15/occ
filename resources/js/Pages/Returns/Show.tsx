import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Search, FileText } from '@/lib/icons';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { useConfirm } from '@/components/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReturnCase } from '@/types/entities';

const RESOLUTION_TYPES = ['replacement', 'credit_note', 'refund', 'repair'];

function statusClasses(s: string): string {
    const map: Record<string, string> = {
        reported: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        under_inspection: 'bg-blue-500/10 text-blue-600 border-blue-200',
        resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        rejected: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[s] ?? 'bg-muted');
}

export default function ReturnShow({ returnCase }: { returnCase: ReturnCase }) {
    const r = returnCase;
    const confirm = useConfirm();
    const [resolveOpen, setResolveOpen] = useState(false);
    const resolveForm = useForm({
        resolution_type: 'credit_note',
        resolution_date: new Date().toISOString().slice(0, 10),
        credit_note_number: '',
        replacement_lr_number: '',
        internal_notes: '',
    });

    const startInspection = () => {
        router.patch(route('returns.start-inspection', { return: r.id }), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Inspection started.'),
        });
    };

    const submitResolve = (e: FormEvent) => {
        e.preventDefault();
        resolveForm.patch(route('returns.resolve', { return: r.id }), {
            preserveScroll: true,
            onSuccess: () => { toast.success('Case resolved.'); setResolveOpen(false); },
            onError: (errs) => toast.error(Object.values(errs).join(', ')),
        });
    };

    const reject = async () => {
        const ok = await confirm({
            title: `Reject case ${r.case_code}?`,
            description: 'Quantities will release back to delivered.',
            confirmText: 'Reject case',
            destructive: true,
        });
        if (!ok) return;
        router.patch(route('returns.reject', { return: r.id }), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Case rejected.'),
        });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Returns', href: '/returns' }, { label: r.case_code }]}>
            <Head title={r.case_code} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1.5">
                        <Link href={route('returns.index')}><ArrowLeft className="h-4 w-4" /> Back</Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <p className="text-xs text-muted-foreground">Reported {formatDateIN(r.date_reported)}{r.creator?.name ? ` by ${r.creator.name}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={statusClasses(r.case_status)}>{r.case_status.replace(/_/g, ' ')}</Badge>
                    {r.severity && <Badge variant="outline">{r.severity}</Badge>}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT — context */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Customer &amp; order</CardTitle></CardHeader>
                        <CardContent className="space-y-2 p-4 pt-2 text-sm">
                            <p><span className="text-muted-foreground">Customer:</span> {r.customer?.name ?? '—'}{r.customer?.company ? ` · ${r.customer.company}` : ''}</p>
                            {r.customer?.phone && <p className="font-mono text-xs"><span className="text-muted-foreground">Phone: </span>{r.customer.phone}</p>}
                            {r.order && (
                                <p>
                                    <span className="text-muted-foreground">Order: </span>
                                    <Link href={route('orders.show', { order: r.order.id })} className="font-mono hover:underline">{r.order.order_code}</Link>
                                    {r.order.order_value && <span className="ml-2 text-muted-foreground">· value {formatCurrency(r.order.order_value)}</span>}
                                </p>
                            )}
                            {r.reported_via && <p className="text-xs"><span className="text-muted-foreground">Reported via: </span>{r.reported_via}</p>}
                            {r.value_at_risk && <p className="text-xs"><span className="text-muted-foreground">Value at risk: </span>{formatCurrency(r.value_at_risk)}</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Items returned ({r.items?.length ?? 0})</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            {(!r.items || r.items.length === 0) ? (
                                <p className="p-4 text-sm text-muted-foreground">No items linked.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                                            <th className="px-3 py-2 text-left">Product</th>
                                            <th className="px-3 py-2 text-right">Qty</th>
                                            <th className="px-3 py-2 text-left">Condition</th>
                                            <th className="px-3 py-2 text-left">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {r.items.map((it) => (
                                            <tr key={it.id} className="border-b last:border-0 align-top">
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">{it.order_item?.product_name ?? '—'}</p>
                                                    {it.order_item?.product?.sku && <p className="font-mono text-[10px] text-muted-foreground">{it.order_item.product.sku}</p>}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold tabular-nums">{Number(it.qty_returned)}</td>
                                                <td className="px-3 py-2 text-xs">{it.condition.replace(/_/g, ' ')}</td>
                                                <td className="px-3 py-2 text-xs text-muted-foreground">{it.reason ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    {r.reason_detail && (
                        <Card>
                            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Reason detail</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-2 text-sm whitespace-pre-line">{r.reason_detail}</CardContent>
                        </Card>
                    )}
                </div>

                {/* RIGHT — actions + timeline */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Status timeline</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-2">
                            <ol className="space-y-3 text-xs">
                                <li className="flex gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                    <div><span className="font-medium">Reported</span> {formatDateIN(r.date_reported)} {r.creator?.name && <span className="text-muted-foreground">by {r.creator.name}</span>}</div>
                                </li>
                                {r.inspection_started_at && (
                                    <li className="flex gap-3">
                                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                                        <div><span className="font-medium">Inspection started</span> {formatDateIN(r.inspection_started_at)} {r.inspector?.name && <span className="text-muted-foreground">by {r.inspector.name}</span>}</div>
                                    </li>
                                )}
                                {r.resolution_date && (
                                    <li className="flex gap-3">
                                        <span className={cn('mt-1 h-2 w-2 rounded-full', r.case_status === 'rejected' ? 'bg-red-500' : 'bg-emerald-500')} />
                                        <div>
                                            <span className="font-medium">{r.case_status === 'rejected' ? 'Rejected' : 'Resolved'}</span> {formatDateIN(r.resolution_date)} {r.resolver?.name && <span className="text-muted-foreground">by {r.resolver.name}</span>}
                                            {r.resolution_type && <p className="mt-0.5 text-muted-foreground">via {r.resolution_type.replace(/_/g, ' ')}</p>}
                                            {r.credit_note_number && <p className="mt-0.5 font-mono">Credit note: {r.credit_note_number}</p>}
                                            {r.replacement_lr_number && <p className="mt-0.5 font-mono">Replacement LR: {r.replacement_lr_number}</p>}
                                        </div>
                                    </li>
                                )}
                            </ol>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Actions</CardTitle></CardHeader>
                        <CardContent className="space-y-2 p-4 pt-2">
                            {r.case_status === 'reported' && (
                                <Button onClick={startInspection} className="w-full">
                                    <Search className="h-3.5 w-3.5 mr-2" /> Start inspection
                                </Button>
                            )}
                            {['reported', 'under_inspection'].includes(r.case_status) && (
                                <>
                                    <Button onClick={() => setResolveOpen(true)} className="w-full">
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Resolve case…
                                    </Button>
                                    <Button onClick={reject} variant="outline" className="w-full text-destructive hover:text-red-700">
                                        <XCircle className="h-3.5 w-3.5 mr-2" /> Reject case
                                    </Button>
                                </>
                            )}
                            {['resolved', 'rejected'].includes(r.case_status) && (
                                <p className="rounded border bg-muted/30 p-3 text-xs text-muted-foreground">
                                    Case is {r.case_status}. To make further changes, contact the owner.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {r.internal_notes && (
                        <Card>
                            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Internal notes</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-2 text-sm whitespace-pre-line">{r.internal_notes}</CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Resolve dialog */}
            <Dialog open={resolveOpen} onOpenChange={(o) => !o && setResolveOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve {r.case_code}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitResolve} className="space-y-3" noValidate>
                        <div className="space-y-1.5">
                            <Label>Resolution type *</Label>
                            <Select value={resolveForm.data.resolution_type} onValueChange={(v) => resolveForm.setData('resolution_type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {RESOLUTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Resolution date</Label>
                            <Input type="date" value={resolveForm.data.resolution_date} onChange={(e) => resolveForm.setData('resolution_date', e.target.value)} />
                        </div>
                        {resolveForm.data.resolution_type === 'credit_note' && (
                            <div className="space-y-1.5">
                                <Label>Credit note number</Label>
                                <Input value={resolveForm.data.credit_note_number} onChange={(e) => resolveForm.setData('credit_note_number', e.target.value)} />
                            </div>
                        )}
                        {resolveForm.data.resolution_type === 'replacement' && (
                            <div className="space-y-1.5">
                                <Label>Replacement LR number</Label>
                                <Input value={resolveForm.data.replacement_lr_number} onChange={(e) => resolveForm.setData('replacement_lr_number', e.target.value)} />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label>Internal notes</Label>
                            <Textarea rows={2} value={resolveForm.data.internal_notes} onChange={(e) => resolveForm.setData('internal_notes', e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={resolveForm.processing}>Resolve</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
