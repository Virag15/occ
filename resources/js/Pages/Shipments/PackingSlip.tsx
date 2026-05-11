import { Head } from '@inertiajs/react';
import { Printer, X } from 'lucide-react';

type SlipItem = {
    id: number;
    qty: number | string;
    order_item: {
        id: number;
        product_name: string;
        unit?: string | null;
        product?: { id: number; sku?: string | null } | null;
    } | null;
};

type SlipShipment = {
    id: number;
    shipment_code: string;
    packing_slip_generated_at: string | null;
    packed_by: string | null;
    number_of_boxes: number | null;
    parcel_weight_kg: string | null;
    lr_number: string | null;
    vehicle_number: string | null;
    driver_name: string | null;
    driver_contact: string | null;
    dispatch_date: string | null;
    expected_delivery: string | null;
    pickup_scheduled_date: string | null;
    notes: string | null;
    transporter: { id: number; name: string } | null;
    order: {
        id: number;
        order_code: string;
        order_date: string;
        invoice_number: string | null;
        priority: string | null;
        customer: {
            name: string;
            company?: string | null;
            phone?: string | null;
            delivery_address?: string | null;
            city?: string | null;
            state?: string | null;
            gstin?: string | null;
        };
    };
    items: SlipItem[];
};

function fmt(date: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PackingSlip({ shipment }: { shipment: SlipShipment }) {
    const generatedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const totalQty = shipment.items.reduce((s, i) => s + Number(i.qty || 0), 0);
    const c = shipment.order.customer;

    return (
        <>
            <Head title={`Packing Slip — ${shipment.shipment_code}`} />
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    @page { margin: 15mm; size: A4; }
                }
                @media screen {
                    body { background: #f4f3ef; }
                }
            `}</style>
            <div className="min-h-screen p-4 md:p-8">
                <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">This slip ships with the parcel. Three copies recommended: customer, transporter, file.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Printer className="h-4 w-4" /> Print
                        </button>
                        <button
                            onClick={() => window.close()}
                            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
                        >
                            <X className="h-4 w-4" /> Close
                        </button>
                    </div>
                </div>

                <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b pb-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">GC Communication</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight">Packing Slip</h1>
                            <p className="text-xs text-muted-foreground">Authorized distributor — C&amp;S Electric, BCH Electric, Luker, Suraj, Kaycee</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                            <p className="font-mono text-sm font-semibold text-foreground">{shipment.shipment_code}</p>
                            <p className="mt-0.5">Generated {generatedAt}</p>
                        </div>
                    </div>

                    {/* Order + Ship-to */}
                    <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Order</p>
                            <p className="font-mono font-semibold">{shipment.order.order_code}</p>
                            <p className="text-xs text-muted-foreground">Order date: {fmt(shipment.order.order_date)}</p>
                            {shipment.order.invoice_number && (
                                <p className="mt-1 text-xs"><span className="text-muted-foreground">Invoice: </span><span className="font-mono">{shipment.order.invoice_number}</span></p>
                            )}
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Ship to</p>
                            <p className="font-semibold">{c.name}</p>
                            {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                            {c.delivery_address && <p className="whitespace-pre-line text-xs text-muted-foreground">{c.delivery_address}</p>}
                            {(c.city || c.state) && (
                                <p className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                            )}
                            {c.gstin && <p className="font-mono text-xs text-muted-foreground">GSTIN: {c.gstin}</p>}
                            {c.phone && <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                    </div>

                    {/* Dispatch info grid */}
                    <div className="mt-5 grid grid-cols-3 gap-3 rounded border border-gray-300 p-3 text-xs">
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Transporter</p>
                            <p className="font-medium">{shipment.transporter?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">LR Number</p>
                            <p className="font-mono font-medium">{shipment.lr_number ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Vehicle</p>
                            <p className="font-mono font-medium">{shipment.vehicle_number ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Dispatched</p>
                            <p className="font-medium">{fmt(shipment.dispatch_date)}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Expected delivery</p>
                            <p className="font-medium">{fmt(shipment.expected_delivery)}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Packed by</p>
                            <p className="font-medium">{shipment.packed_by ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">No. of boxes</p>
                            <p className="font-medium">{shipment.number_of_boxes ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Total weight</p>
                            <p className="font-medium">{shipment.parcel_weight_kg ? `${shipment.parcel_weight_kg} kg` : '—'}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-muted-foreground">Driver</p>
                            <p className="font-medium">
                                {shipment.driver_name ?? '—'}
                                {shipment.driver_contact && <span className="block font-mono">{shipment.driver_contact}</span>}
                            </p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mt-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <th className="py-2 text-left">#</th>
                                    <th className="py-2 text-left">Product</th>
                                    <th className="py-2 text-left">SKU</th>
                                    <th className="py-2 pl-2 text-right">Qty</th>
                                    <th className="py-2 pl-2 text-left">Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipment.items.map((item, i) => (
                                    <tr key={item.id} className="border-b last:border-0 align-top">
                                        <td className="py-3 text-xs text-muted-foreground">{i + 1}</td>
                                        <td className="py-3 pr-2 font-medium">{item.order_item?.product_name ?? '—'}</td>
                                        <td className="py-3 pr-2 font-mono text-xs text-muted-foreground">{item.order_item?.product?.sku ?? '—'}</td>
                                        <td className="py-3 pl-2 text-right font-semibold">{Number(item.qty)}</td>
                                        <td className="py-3 pl-2 text-xs text-muted-foreground">{item.order_item?.unit ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2">
                                    <td colSpan={3} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total units</td>
                                    <td className="py-2 pl-2 text-right text-base font-bold">{totalQty}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {shipment.notes && (
                        <div className="mt-6 rounded border border-gray-300 p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                            <p className="whitespace-pre-line text-xs">{shipment.notes}</p>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="mt-6 text-[10px] text-muted-foreground">
                        <p>Goods once dispatched will not be taken back. Any damage / shortage must be reported within 48 hours of receipt with photo evidence. E&amp;OE.</p>
                    </div>

                    {/* Signatures */}
                    <div className="mt-8 grid grid-cols-2 gap-12 text-xs text-muted-foreground">
                        <div>
                            <p className="mb-8">For GC Communication:</p>
                            <div className="border-b border-dashed border-gray-500" />
                            <p className="mt-1">Authorised Signatory</p>
                        </div>
                        <div>
                            <p className="mb-8">Received in good condition:</p>
                            <div className="border-b border-dashed border-gray-500" />
                            <p className="mt-1">Customer Signature &amp; Date</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
