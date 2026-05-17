import { Head } from '@inertiajs/react';
import { Printer, X } from '@/lib/icons';

type SlipItem = {
    id: number;
    qty: number | string;
    order_item: {
        id: number;
        product_name: string;
        unit?: string | null;
        hsn_code?: string | null;
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
        customer_reference_number: string | null;
        customer_po_number: string | null;
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

type CompanyPayload = {
    company_name: string;
    address_line_1: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    gstin: string | null;
    phone: string | null;
    email: string | null;
    invoice_footer_note: string | null;
    logo_data_uri: string | null;
};

export default function PackingSlip({ shipment, company }: { shipment: SlipShipment; company: CompanyPayload }) {
    const generatedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const totalQty = shipment.items.reduce((s, i) => s + Number(i.qty || 0), 0);
    const c = shipment.order.customer;
    const o = shipment.order;

    return (
        <>
            <Head title={`Packing Slip — ${shipment.shipment_code}`} />
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
                .slip tbody td { padding: 4pt 3pt; border-bottom: 0.3pt solid #ddd6c8; vertical-align: top; }
                .slip tbody tr:last-child td { border-bottom: none; }
                .slip tfoot td { padding: 4pt 3pt; font-weight: 700; border-top: 0.8pt solid #2a2722; }
                .slip .num { text-align: right; font-variant-numeric: tabular-nums; }
                .slip .frame { border: 0.5pt solid #2a2722; padding: 5pt 7pt; border-radius: 1pt; }
                .slip .accent { background: #f5f1e8; }
            `}</style>

            <div className="min-h-screen p-4 md:p-6">
                {/* Print toolbar — screen only */}
                <div className="no-print mx-auto mb-4 flex max-w-[148mm] items-center justify-between gap-2">
                    <p className="text-xs text-gray-600">A5 packing slip — three copies recommended (customer, transporter, file).</p>
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
                    <div className="flex items-start justify-between gap-3 border-b border-[#2a2722] pb-2">
                        <div className="flex items-start gap-3 min-w-0">
                            {company.logo_data_uri && (
                                <img src={company.logo_data_uri} alt="logo" style={{ maxWidth: '40pt', maxHeight: '40pt' }} />
                            )}
                            <div className="min-w-0">
                                <p className="label">Authorized Distributor</p>
                                <h1 className="font-bold uppercase tracking-wide">{company.company_name}</h1>
                                <p className="text-[8pt] text-[#6b6660]">
                                    {[company.address_line_1, company.city, company.state, company.pincode].filter(Boolean).join(', ')}
                                </p>
                                {company.gstin && <p className="mono text-[8pt] text-[#6b6660]">GSTIN: {company.gstin}</p>}
                                {company.invoice_footer_note && <p className="text-[7.5pt] text-[#6b6660]">{company.invoice_footer_note}</p>}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="label">Packing slip</p>
                            <p className="mono mt-0.5 text-[11pt] font-bold tracking-tight">{shipment.shipment_code}</p>
                            <p className="text-[7pt] text-[#6b6660]">Generated {generatedAt}</p>
                            {o.priority && o.priority !== 'normal' && (
                                <p className="mt-1 inline-block rounded border border-[#2a2722] px-1.5 py-0.5 text-[7pt] font-bold uppercase tracking-wider">{o.priority}</p>
                            )}
                        </div>
                    </div>

                    {/* Ship-to & Order info */}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="frame">
                            <p className="label mb-1">Ship to</p>
                            <p className="font-semibold">{c.name}</p>
                            {c.company && <p className="text-[8pt] text-[#6b6660]">{c.company}</p>}
                            {c.delivery_address && <p className="whitespace-pre-line text-[8pt]">{c.delivery_address}</p>}
                            {(c.city || c.state) && <p className="text-[8pt]">{[c.city, c.state].filter(Boolean).join(', ')}</p>}
                            {c.gstin && <p className="mono text-[8pt]">GSTIN: {c.gstin}</p>}
                            {c.phone && <p className="mono text-[8pt]">{c.phone}</p>}
                        </div>
                        <div className="frame accent">
                            <p className="label mb-1">Order reference</p>
                            <table className="w-full text-[8pt]">
                                <tbody>
                                    <tr>
                                        <td className="py-0.5 pr-2 text-[#6b6660]">Order #</td>
                                        <td className="mono py-0.5 font-semibold">{o.order_code}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-0.5 pr-2 text-[#6b6660]">Order date</td>
                                        <td className="py-0.5">{fmt(o.order_date)}</td>
                                    </tr>
                                    {o.customer_reference_number && (
                                        <tr>
                                            <td className="py-0.5 pr-2 text-[#6b6660]">Your ref</td>
                                            <td className="mono py-0.5 font-semibold">{o.customer_reference_number}</td>
                                        </tr>
                                    )}
                                    {o.customer_po_number && (
                                        <tr>
                                            <td className="py-0.5 pr-2 text-[#6b6660]">Your PO</td>
                                            <td className="mono py-0.5 font-semibold">{o.customer_po_number}</td>
                                        </tr>
                                    )}
                                    {o.invoice_number && (
                                        <tr>
                                            <td className="py-0.5 pr-2 text-[#6b6660]">Invoice #</td>
                                            <td className="mono py-0.5">{o.invoice_number}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dispatch / Carrier band */}
                    <div className="mt-2 grid grid-cols-4 gap-1 text-[8pt]">
                        <DispatchCell label="Transporter" value={shipment.transporter?.name ?? '—'} />
                        <DispatchCell label="LR number" value={shipment.lr_number ?? '—'} mono />
                        <DispatchCell label="Vehicle" value={shipment.vehicle_number ?? '—'} mono />
                        <DispatchCell label="Dispatched" value={fmt(shipment.dispatch_date)} />
                        <DispatchCell label="Expected" value={fmt(shipment.expected_delivery)} />
                        <DispatchCell label="Boxes" value={shipment.number_of_boxes != null ? String(shipment.number_of_boxes) : '—'} />
                        <DispatchCell label="Weight" value={shipment.parcel_weight_kg ? `${shipment.parcel_weight_kg} kg` : '—'} />
                        <DispatchCell label="Packed by" value={shipment.packed_by ?? '—'} />
                    </div>

                    {/* Items */}
                    <table className="mt-2">
                        <thead>
                            <tr>
                                <th style={{ width: '8mm' }}>#</th>
                                <th>Product</th>
                                <th style={{ width: '20mm' }}>SKU</th>
                                <th className="num" style={{ width: '12mm' }}>Qty</th>
                                <th style={{ width: '10mm' }}>Unit</th>
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
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="label" style={{ borderTop: '0.8pt solid #2a2722' }}>Total units</td>
                                <td className="num">{totalQty}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>

                    {shipment.notes && (
                        <div className="frame mt-2 text-[8pt]">
                            <p className="label mb-0.5">Notes</p>
                            <p className="whitespace-pre-line">{shipment.notes}</p>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <p className="mt-2 text-[7pt] leading-snug text-[#6b6660]">
                        Goods once dispatched will not be taken back. Any damage or shortage must be reported within 48 hours with photo evidence on +91-XXXX-XXXXXX. E&amp;OE. Subject to Nashik jurisdiction.
                    </p>

                    {/* Signatures */}
                    <div className="mt-3 grid grid-cols-2 gap-4 text-[8pt]">
                        <div>
                            <p className="mb-6">For GC Communication:</p>
                            <div className="border-b border-dashed border-[#6b6660]" />
                            <p className="mt-1 text-[7pt] text-[#6b6660]">Authorised Signatory</p>
                        </div>
                        <div>
                            <p className="mb-6">Received in good condition:</p>
                            <div className="border-b border-dashed border-[#6b6660]" />
                            <p className="mt-1 text-[7pt] text-[#6b6660]">Customer signature &amp; date</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function DispatchCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="rounded-[1pt] border border-[#c5beb2] px-1.5 py-1">
            <p className="label">{label}</p>
            <p className={`mt-0.5 truncate font-semibold ${mono ? 'mono' : ''}`}>{value}</p>
        </div>
    );
}
