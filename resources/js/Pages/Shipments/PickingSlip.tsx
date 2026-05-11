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
    picking_slip_generated_at: string | null;
    notes: string | null;
    order: {
        id: number;
        order_code: string;
        order_date: string;
        priority: string | null;
        customer: {
            name: string;
            company?: string | null;
            city?: string | null;
            state?: string | null;
        };
    };
    items: SlipItem[];
};

function fmt(date: string | null) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PickingSlip({ shipment }: { shipment: SlipShipment }) {
    const generatedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const totalQty = shipment.items.reduce((s, i) => s + Number(i.qty || 0), 0);

    return (
        <>
            <Head title={`Picking Slip — ${shipment.shipment_code}`} />
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
                    <p className="text-xs text-muted-foreground">Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘P</kbd> or click Print. Close this tab when done.</p>
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
                            <h1 className="mt-1 text-2xl font-bold tracking-tight">Picking Slip</h1>
                            <p className="text-xs text-muted-foreground">Warehouse internal — collect items per row, tick on completion</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                            <p className="font-mono text-sm font-semibold text-foreground">{shipment.shipment_code}</p>
                            <p className="mt-0.5">Generated {generatedAt}</p>
                        </div>
                    </div>

                    {/* Order + Customer */}
                    <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Order</p>
                            <p className="font-mono font-semibold">{shipment.order.order_code}</p>
                            <p className="text-xs text-muted-foreground">Placed {fmt(shipment.order.order_date)}</p>
                            {shipment.order.priority && shipment.order.priority !== 'normal' && (
                                <p className="mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                    Priority: {shipment.order.priority}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Customer</p>
                            <p className="font-semibold">{shipment.order.customer.name}</p>
                            {shipment.order.customer.company && (
                                <p className="text-xs text-muted-foreground">{shipment.order.customer.company}</p>
                            )}
                            {(shipment.order.customer.city || shipment.order.customer.state) && (
                                <p className="text-xs text-muted-foreground">
                                    {[shipment.order.customer.city, shipment.order.customer.state].filter(Boolean).join(', ')}
                                </p>
                            )}
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
                                    <th className="w-16 py-2 text-center">Picked</th>
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
                                        <td className="py-3 text-center">
                                            <span className="inline-block h-5 w-5 rounded border-2 border-gray-400" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2">
                                    <td colSpan={3} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total units</td>
                                    <td className="py-2 pl-2 text-right text-base font-bold">{totalQty}</td>
                                    <td colSpan={2} />
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

                    {/* Signatures */}
                    <div className="mt-10 grid grid-cols-2 gap-12 text-xs text-muted-foreground">
                        <div>
                            <p className="mb-8">Picked by:</p>
                            <div className="border-b border-dashed border-gray-500" />
                            <p className="mt-1">Name &amp; Signature</p>
                        </div>
                        <div>
                            <p className="mb-8">Verified by:</p>
                            <div className="border-b border-dashed border-gray-500" />
                            <p className="mt-1">Name &amp; Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
