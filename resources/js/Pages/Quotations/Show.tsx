import { Head, Link, router } from '@inertiajs/react';
import { Download, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateIN } from '@/lib/format';

type Item = {
    id: number; product_name: string; hsn_code: string | null;
    qty: string; unit: string | null; unit_price: string;
    discount_pct: string; tax_rate: string; line_total: string;
};

type Quotation = {
    id: number;
    quotation_code: string;
    customer_name: string;
    customer_company: string | null;
    customer_address: string | null;
    customer_gstin: string | null;
    customer_phone: string | null;
    quotation_date: string;
    valid_until: string | null;
    status: string;
    subtotal: string;
    tax_total: string;
    discount_amount: string;
    total: string;
    notes: string | null;
    terms: string | null;
    items: Item[];
    creator?: { id: number; name: string } | null;
};

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export default function QuotationShow({ quotation }: { quotation: Quotation }) {
    const setStatus = (status: string) => {
        router.patch(`/quotations/${quotation.id}/status`, { status }, { preserveScroll: true });
    };

    const destroy = () => {
        if (!confirm(`Delete ${quotation.quotation_code}? This cannot be undone.`)) return;
        router.delete(`/quotations/${quotation.id}`);
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: quotation.quotation_code }]}>
            <Head title={quotation.quotation_code} />
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight font-mono">{quotation.quotation_code}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {quotation.customer_company || quotation.customer_name} · {formatDateIN(quotation.quotation_date)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Select value={quotation.status} onValueChange={setStatus}>
                            <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button asChild variant="outline">
                            <a href={`/quotations/${quotation.id}/pdf`}><Download className="h-4 w-4 mr-1" /> PDF</a>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={`/quotations/${quotation.id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                        </Button>
                        <Button variant="outline" onClick={destroy} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
                    <CardContent className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-1">
                        <div><span className="text-muted-foreground">Name: </span>{quotation.customer_name}</div>
                        {quotation.customer_company && <div><span className="text-muted-foreground">Company: </span>{quotation.customer_company}</div>}
                        {quotation.customer_gstin && <div><span className="text-muted-foreground">GSTIN: </span><span className="font-mono">{quotation.customer_gstin}</span></div>}
                        {quotation.customer_phone && <div><span className="text-muted-foreground">Phone: </span><span className="font-mono">{quotation.customer_phone}</span></div>}
                        {quotation.customer_address && <div className="sm:col-span-2"><span className="text-muted-foreground">Address: </span>{quotation.customer_address}</div>}
                        {quotation.valid_until && <div><span className="text-muted-foreground">Valid until: </span>{formatDateIN(quotation.valid_until)}</div>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-4 py-2">#</th>
                                    <th className="px-4 py-2">Description</th>
                                    <th className="px-4 py-2 text-right">Qty</th>
                                    <th className="px-4 py-2 text-right">Rate</th>
                                    <th className="px-4 py-2 text-right">Disc%</th>
                                    <th className="px-4 py-2 text-right">Tax%</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((it, i) => (
                                    <tr key={it.id} className="border-b last:border-0">
                                        <td className="px-4 py-2 font-mono text-muted-foreground">{i + 1}</td>
                                        <td className="px-4 py-2">
                                            {it.product_name}
                                            {it.hsn_code && <span className="text-xs text-muted-foreground font-mono"> · HSN {it.hsn_code}</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{Number(it.qty)} {it.unit}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(Number(it.unit_price))}</td>
                                        <td className="px-4 py-2 text-right font-mono">{Number(it.discount_pct) || '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{Number(it.tax_rate) || '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(Number(it.line_total))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end p-4">
                            <div className="w-64 space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(Number(quotation.subtotal))}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{formatCurrency(Number(quotation.tax_total))}</span></div>
                                {Number(quotation.discount_amount) > 0 && (
                                    <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono">− {formatCurrency(Number(quotation.discount_amount))}</span></div>
                                )}
                                <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span className="font-mono">{formatCurrency(Number(quotation.total))}</span></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {(quotation.notes || quotation.terms) && (
                    <Card>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 text-sm">
                            {quotation.notes && (
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
                                    <p className="whitespace-pre-line">{quotation.notes}</p>
                                </div>
                            )}
                            {quotation.terms && (
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Terms</div>
                                    <p className="whitespace-pre-line">{quotation.terms}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
