import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { AlertCircle, Trash2 } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import type { OrderItem } from '@/types/entities';

const CONDITIONS = [
    { value: 'damaged_in_transit', label: 'Damaged in transit' },
    { value: 'manufacturing_defect', label: 'Manufacturing defect' },
    { value: 'wrong_item', label: 'Wrong item' },
    { value: 'excess', label: 'Excess delivery' },
    { value: 'other', label: 'Other' },
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const REPORTED_VIA = ['whatsapp', 'phone', 'email', 'in_person'];

type LineRow = {
    order_item_id: number;
    product_name: string;
    sku: string | null;
    delivered: number;
    already_returned: number;
    eligible: number;
    selected: boolean;
    qty_returned: string;
    condition: string;
    reason: string;
};

export function ReportReturnDialog({
    open,
    onClose,
    orderId,
    customerId,
    orderItems,
}: {
    open: boolean;
    onClose: () => void;
    orderId: number;
    customerId: number;
    orderItems: OrderItem[];
}) {
    const eligibleItems = useMemo(
        () => orderItems
            .filter((oi) => oi.id && (Number(oi.qty_delivered ?? 0) - Number(oi.qty_returned ?? 0)) > 0)
            .map<LineRow>((oi) => ({
                order_item_id: oi.id as number,
                product_name: oi.product_name,
                sku: oi.product?.sku ?? null,
                delivered: Number(oi.qty_delivered ?? 0),
                already_returned: Number(oi.qty_returned ?? 0),
                eligible: Number(oi.qty_delivered ?? 0) - Number(oi.qty_returned ?? 0),
                selected: false,
                qty_returned: '',
                condition: 'damaged_in_transit',
                reason: '',
            })),
        [orderItems],
    );

    const [lines, setLines] = useState<LineRow[]>(eligibleItems);

    useEffect(() => {
        if (open) setLines(eligibleItems);
    }, [open, eligibleItems]);

    const form = useForm({
        related_order_id: orderId,
        customer_id: customerId,
        date_reported: new Date().toISOString().slice(0, 10),
        severity: 'medium',
        reported_via: 'whatsapp',
        case_title: '',
        reason_detail: '',
    });

    const toggleLine = (idx: number, selected: boolean) => {
        setLines((prev) => prev.map((l, i) => i === idx
            ? { ...l, selected, qty_returned: selected && !l.qty_returned ? String(l.eligible) : l.qty_returned }
            : l));
    };

    const updateLine = (idx: number, patch: Partial<LineRow>) => {
        setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
    };

    const selectedLines = lines.filter((l) => l.selected);
    const hasErrors = selectedLines.some((l) => {
        const q = Number(l.qty_returned);
        return !q || q <= 0 || q > l.eligible;
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (selectedLines.length === 0) {
            toast.error('Pick at least one line item to return.');
            return;
        }
        if (hasErrors) {
            toast.error('Each selected line needs a qty between 1 and its eligible amount.');
            return;
        }

        form.transform((data) => ({
            ...data,
            items: selectedLines.map((l) => ({
                order_item_id: l.order_item_id,
                qty_returned: Number(l.qty_returned),
                condition: l.condition,
                reason: l.reason || null,
            })),
        }));
        form.post(route('returns.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Return case created.');
                form.reset();
                onClose();
            },
            onError: (errs: Record<string, string>) => toast.error(Object.values(errs).join(', ')),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { form.reset(); onClose(); } }}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Report a return</DialogTitle>
                    <DialogDescription>
                        Tick the lines being returned. Only delivered, un-returned quantities can be raised. A new case will be created — quantities are reserved immediately and refund back to delivered if the case is rejected later.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4" noValidate>
                    {/* Case-level fields */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label>Reported on</Label>
                            <DatePicker
                                value={form.data.date_reported}
                                onChange={(d) => {
                                    if (!d) { form.setData('date_reported', ''); return; }
                                    const yyyy = d.getFullYear();
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    form.setData('date_reported', `${yyyy}-${mm}-${dd}`);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Severity</Label>
                            <Select value={form.data.severity} onValueChange={(v) => form.setData('severity', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Reported via</Label>
                            <Select value={form.data.reported_via} onValueChange={(v) => form.setData('reported_via', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {REPORTED_VIA.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="case_title">Case title (optional)</Label>
                        <Input
                            id="case_title"
                            value={form.data.case_title}
                            onChange={(e) => form.setData('case_title', e.target.value)}
                            placeholder="e.g. 3 boxes damaged on Gati delivery"
                        />
                    </div>

                    {/* Line picker */}
                    {lines.length === 0 ? (
                        <div className="rounded border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                            <AlertCircle className="mx-auto mb-1 h-4 w-4" />
                            No delivered, un-returned line items on this order yet. A return can be reported once goods have been marked delivered.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="w-8 px-2 py-2" />
                                        <th className="px-2 py-2 text-left">Product</th>
                                        <th className="px-2 py-2 text-right">Delivered</th>
                                        <th className="px-2 py-2 text-right">Eligible</th>
                                        <th className="px-2 py-2 text-right">Qty to return</th>
                                        <th className="px-2 py-2 text-left">Condition</th>
                                        <th className="w-8 px-1 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, i) => {
                                        const q = Number(l.qty_returned);
                                        const invalid = l.selected && (!q || q <= 0 || q > l.eligible);
                                        return (
                                            <tr key={l.order_item_id} className="border-t align-top">
                                                <td className="px-2 py-2">
                                                    <Checkbox
                                                        checked={l.selected}
                                                        onCheckedChange={(c) => toggleLine(i, !!c)}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <p className="font-medium">{l.product_name}</p>
                                                    {l.sku && <p className="font-mono text-[10px] text-muted-foreground">{l.sku}</p>}
                                                    {l.selected && (
                                                        <Textarea
                                                            rows={1}
                                                            placeholder="Reason (optional)…"
                                                            className="mt-1 h-7 min-h-0 text-xs"
                                                            value={l.reason}
                                                            onChange={(e) => updateLine(i, { reason: e.target.value })}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums">{l.delivered}</td>
                                                <td className="px-2 py-2 text-right font-semibold tabular-nums">{l.eligible}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={l.eligible}
                                                        step="0.001"
                                                        disabled={!l.selected}
                                                        value={l.qty_returned}
                                                        onChange={(e) => updateLine(i, { qty_returned: e.target.value })}
                                                        className={invalid ? 'h-8 border-destructive' : 'h-8'}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Select
                                                        value={l.condition}
                                                        onValueChange={(v) => updateLine(i, { condition: v })}
                                                        disabled={!l.selected}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-1 py-2">
                                                    {l.selected && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => toggleLine(i, false)}
                                                            title="Remove from return"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="reason_detail">Overall reason / context</Label>
                        <Textarea
                            id="reason_detail"
                            rows={2}
                            value={form.data.reason_detail}
                            onChange={(e) => form.setData('reason_detail', e.target.value)}
                            placeholder="Anything else the inspector should know about this case…"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={form.processing || lines.length === 0 || selectedLines.length === 0 || hasErrors}
                        >
                            {form.processing ? 'Creating…' : `Create return case${selectedLines.length > 0 ? ` (${selectedLines.length} line${selectedLines.length === 1 ? '' : 's'})` : ''}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
