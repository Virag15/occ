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
        customer_reference_number: string | null;
        customer_po_number: string | null;
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
    const o = shipment.order;
    const c = o.customer;

    return (
        <>
            <Head title={`Picking Slip — ${shipment.shipment_code}`} />
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    @page { size: A5 portrait; margin: 8mm; }
                }
                @media screen {
                    body { background: #e7e5e0; }
                }
                .slip {
                    width: 148mm;
                    min-height: 210mm;
                    box-sizing: border-box;
                    color: #1f1d1a;
                    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
                    font-size: 9pt;
                    line-height: 1.35;
                }
                .slip h1 { font-size: 13pt; letter-spacing: 0.5pt; }
                .slip .mono { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace; }
                .slip .label { font-size: 7pt; letter-spacing: 0.6pt; text-transform: uppercase; color: #6b6660; }
                .slip table { border-collapse: collapse; width: 100%; }
                .slip thead th { font-size: 7pt; letter-spacing: 0.6pt; text-transform: uppercase; color: #6b6660; padding: 4pt 3pt; border-top: 0.8pt solid #2a2722; border-bottom: 0.4pt solid #c5beb2; text-align: left; font-weight: 600; }
                .slip tbody td { padding: 5pt 3pt; border-bottom: 0.3pt solid #ddd6c8; vertical-align: top; }
                .slip tbody tr:last-child td { border-bottom: none; }
                .slip tfoot td { padding: 4pt 3pt; font-weight: 700; border-top: 0.8pt solid #2a2722; }
                .slip .num { text-align: right; font-variant-numeric: tabular-nums; }
                .slip .frame { border: 0.5pt solid #2a2722; padding: 5pt 7pt; border-radius: 1pt; }
                .slip .accent { background: #f5f1e8; }
                .slip .checkbox { display: inline-block; width: 10pt; height: 10pt; border: 0.8pt solid #2a2722; border-radius: 1pt; }
            `}</style>

            <div className="min-h-screen p-4 md:p-6">
                {/* Print toolbar — screen only */}
                <div className="no-print mx-auto mb-4 flex max-w-[148mm] items-center justify-between gap-2">
                    <p className="text-xs text-gray-600">A5 picking slip — warehouse internal. Tick boxes as items are collected.</p>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                            <Printer className="h-4 w-4" /> Print
                        </button>
                        <button onClick={() => window.close()} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                            <X className="h-4 w-4" /> Close
                        </button>
                    </div>
                </div>

                {/* A5 slip */}
                <div className="slip mx-auto bg-white p-[8mm] shadow-md print:shadow-none print:m-0 print:p-0">
                    {/* Header band */}
                    <div className="flex items-start justify-between border-b border-[#2a2722] pb-2">
                        <div>
                            <p className="label">Warehouse — internal document</p>
                            <h1 className="font-bold">GC COMMUNICATION</h1>
                            <p className="text-[8pt] text-[#6b6660]">Nashik · Switchgear distribution</p>
                        </div>
                        <div className="text-right">
                            <p className="label">Picking slip</p>
                            <p className="mono mt-0.5 text-[11pt] font-bold tracking-tight">{shipment.shipment_code}</p>
                            <p className="text-[7pt] text-[#6b6660]">Generated {generatedAt}</p>
                            {o.priority && o.priority !== 'normal' && (
                                <p className="mt-1 inline-block rounded border border-[#2a2722] px-1.5 py-0.5 text-[7pt] font-bold uppercase tracking-wider">{o.priority}</p>
                            )}
                        </div>
                    </div>

                    {/* Order + Customer band */}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="frame">
                            <p className="label mb-1">Customer</p>
                            <p className="font-semibold">{c.name}</p>
                            {c.company && <p className="text-[8pt] text-[#6b6660]">{c.company}</p>}
                            {(c.city || c.state) && <p className="text-[8pt] text-[#6b6660]">{[c.city, c.state].filter(Boolean).join(', ')}</p>}
                        </div>
                        <div className="frame accent">
                            <p className="label mb-1">Order</p>
                            <table className="w-full text-[8pt]">
                                <tbody>
                                    <tr>
                                        <td className="py-0.5 pr-2 text-[#6b6660]">Order #</td>
                                        <td className="mono py-0.5 font-semibold">{o.order_code}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-0.5 pr-2 text-[#6b6660]">Placed</td>
                                        <td className="py-0.5">{fmt(o.order_date)}</td>
                                    </tr>
                                    {o.customer_reference_number && (
                                        <tr>
                                            <td className="py-0.5 pr-2 text-[#6b6660]">Cust ref</td>
                                            <td className="mono py-0.5 font-semibold">{o.customer_reference_number}</td>
                                        </tr>
                                    )}
                                    {o.customer_po_number && (
                                        <tr>
                                            <td className="py-0.5 pr-2 text-[#6b6660]">PO #</td>
                                            <td className="mono py-0.5 font-semibold">{o.customer_po_number}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Items */}
                    <table className="mt-2">
                        <thead>
                            <tr>
                                <th style={{ width: '6mm' }}>#</th>
                                <th>Product</th>
                                <th style={{ width: '22mm' }}>SKU</th>
                                <th className="num" style={{ width: '12mm' }}>Qty</th>
                                <th style={{ width: '10mm' }}>Unit</th>
                                <th style={{ width: '12mm' }} className="text-center">Picked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shipment.items.map((item, i) => (
                                <tr key={item.id}>
                                    <td className="text-[#6b6660]">{i + 1}</td>
                                    <td className="font-medium">{item.order_item?.product_name ?? '—'}</td>
                                    <td className="mono text-[7.5pt] text-[#6b6660]">{item.order_item?.product?.sku ?? '—'}</td>
                                    <td className="num font-semibold">{Number(item.qty)}</td>
                                    <td className="text-[#6b6660]">{item.order_item?.unit ?? ''}</td>
                                    <td className="text-center"><span className="checkbox" /></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="label">Total units</td>
                                <td className="num">{totalQty}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>

                    {shipment.notes && (
                        <div className="frame mt-2 text-[8pt]">
                            <p className="label mb-0.5">Notes</p>
                            <p className="whitespace-pre-line">{shipment.notes}</p>
                        </div>
                    )}

                    {/* Signatures */}
                    <div className="mt-3 grid grid-cols-2 gap-4 text-[8pt]">
                        <div>
                            <p className="mb-6">Picked by:</p>
                            <div className="border-b border-dashed border-[#6b6660]" />
                            <p className="mt-1 text-[7pt] text-[#6b6660]">Name &amp; signature</p>
                        </div>
                        <div>
                            <p className="mb-6">Verified by:</p>
                            <div className="border-b border-dashed border-[#6b6660]" />
                            <p className="mt-1 text-[7pt] text-[#6b6660]">Name &amp; signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
