import { useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, ComboOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Truck } from '@/lib/icons';
import type { OrderItem, TransporterLite } from '@/types/entities';

type LineRow = { order_item_id: number; qty: number | string };

export function CreateShipmentDialog({
    open,
    onClose,
    orderId,
    orderItems,
    transporters,
}: {
    open: boolean;
    onClose: () => void;
    orderId: number;
    orderItems: OrderItem[];
    transporters: TransporterLite[];
}) {
    const openByLine = useMemo(() => {
        const map: Record<number, number> = {};
        orderItems.forEach((oi) => {
            const ordered = Number(oi.qty_ordered) || 0;
            const packed = Number(oi.qty_packed ?? 0);
            const cancelled = Number(oi.qty_cancelled ?? 0);
            map[oi.id!] = Math.max(0, ordered - packed - cancelled);
        });
        return map;
    }, [orderItems]);

    const initialLines = (): LineRow[] => orderItems
        .filter((oi) => (openByLine[oi.id!] ?? 0) > 0)
        .map((oi) => ({ order_item_id: oi.id!, qty: openByLine[oi.id!] }));

    const form = useForm<{
        transporter_id: number | string;
        lr_number: string;
        vehicle_number: string;
        driver_name: string;
        driver_contact: string;
        pickup_scheduled_date: string;
        expected_delivery: string;
        packed_by: string;
        number_of_boxes: number | string;
        parcel_weight_kg: number | string;
        notes: string;
        items: LineRow[];
    }>({
        transporter_id: '',
        lr_number: '',
        vehicle_number: '',
        driver_name: '',
        driver_contact: '',
        pickup_scheduled_date: '',
        expected_delivery: '',
        packed_by: '',
        number_of_boxes: '',
        parcel_weight_kg: '',
        notes: '',
        items: initialLines(),
    });

    // Reset line defaults whenever the dialog reopens
    useEffect(() => {
        if (open) form.setData('items', initialLines());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const [errors, setErrors] = useState<string | null>(null);

    const setLineQty = (orderItemId: number, qty: string) => {
        const next = form.data.items.map((r) =>
            r.order_item_id === orderItemId ? { ...r, qty } : r,
        );
        form.setData('items', next);
    };

    const toggleLine = (oi: OrderItem) => {
        const present = form.data.items.find((r) => r.order_item_id === oi.id);
        if (present) {
            form.setData('items', form.data.items.filter((r) => r.order_item_id !== oi.id));
        } else {
            form.setData('items', [...form.data.items, { order_item_id: oi.id!, qty: openByLine[oi.id!] }]);
        }
    };

    const setDate = (key: 'pickup_scheduled_date' | 'expected_delivery') => (d: Date | undefined) => {
        if (!d) return;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        form.setData(key, `${yyyy}-${mm}-${dd}`);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setErrors(null);

        const chosen = form.data.items.filter((r) => Number(r.qty) > 0);
        if (chosen.length === 0) {
            setErrors('Pick at least one line item with qty > 0.');
            return;
        }
        for (const r of chosen) {
            const open = openByLine[r.order_item_id] ?? 0;
            if (Number(r.qty) > open + 0.001) {
                setErrors(`Qty for line ${r.order_item_id} exceeds open (${open}).`);
                return;
            }
        }

        form.transform((d) => ({ ...d, items: chosen }));
        form.post(route('shipments.store', { order: orderId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Shipment created');
                form.reset();
                onClose();
            },
            onError: (e) => {
                const msg = Object.values(e).join(', ');
                setErrors(msg || 'Could not create shipment.');
                toast.error(msg || 'Could not create shipment.');
            },
        });
    };

    const transporterOptions: ComboOption[] = transporters.map((t) => ({ value: String(t.id), label: t.name }));

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Create shipment</DialogTitle>
                    <DialogDescription>
                        Pick which line items go in this shipment and how much. The shipment will start in <strong>packed</strong> status — advance it to dispatched / delivered as it moves.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4" noValidate>
                    {/* Line items table */}
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium w-8"></th>
                                    <th className="px-3 py-2 text-left font-medium">Product</th>
                                    <th className="px-3 py-2 text-right font-medium">Ordered</th>
                                    <th className="px-3 py-2 text-right font-medium">Open</th>
                                    <th className="px-3 py-2 text-right font-medium w-32">Ship qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderItems.map((oi) => {
                                    const open = openByLine[oi.id!] ?? 0;
                                    const selected = form.data.items.find((r) => r.order_item_id === oi.id);
                                    const disabled = open <= 0;
                                    return (
                                        <tr key={oi.id} className={`border-t border-border/40 ${disabled ? 'opacity-50' : ''}`}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    disabled={disabled}
                                                    checked={!!selected}
                                                    onChange={() => toggleLine(oi)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-medium">{oi.product_name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(oi.qty_ordered).toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-medium">{open.toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2">
                                                {selected && (
                                                    <Input
                                                        type="number" step="0.001" min="0" max={open}
                                                        value={selected.qty as number}
                                                        onChange={(e) => setLineQty(oi.id!, e.target.value)}
                                                        className="h-7 text-right tabular-nums"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {orderItems.length === 0 && (
                                    <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">This order has no line items yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Dispatch fields */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="transporter_id" className="text-xs">Transporter</Label>
                            <Combobox
                                value={form.data.transporter_id ? String(form.data.transporter_id) : ''}
                                onChange={(v) => form.setData('transporter_id', Number(v))}
                                options={transporterOptions}
                                placeholder="Select transporter"
                                searchPlaceholder="Search transporters…"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="lr_number" className="text-xs">LR number</Label>
                            <Input id="lr_number" className="font-mono text-xs" value={form.data.lr_number} onChange={(e) => form.setData('lr_number', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Pickup scheduled</Label>
                            <DatePicker value={form.data.pickup_scheduled_date} onChange={setDate('pickup_scheduled_date')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Expected delivery</Label>
                            <DatePicker value={form.data.expected_delivery} onChange={setDate('expected_delivery')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Vehicle</Label>
                            <Input className="font-mono text-xs" value={form.data.vehicle_number} onChange={(e) => form.setData('vehicle_number', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Driver name</Label>
                            <Input value={form.data.driver_name} onChange={(e) => form.setData('driver_name', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Packed by</Label>
                            <Input value={form.data.packed_by} onChange={(e) => form.setData('packed_by', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Boxes</Label>
                                <Input type="number" value={form.data.number_of_boxes} onChange={(e) => form.setData('number_of_boxes', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Weight (kg)</Label>
                                <Input type="number" step="0.01" value={form.data.parcel_weight_kg} onChange={(e) => form.setData('parcel_weight_kg', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {errors && <p className="text-xs text-destructive">{errors}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Creating…' : 'Create shipment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
