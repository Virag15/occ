import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';

type Row = {
    id: number;
    quotation_code: string;
    customer_name: string;
    customer_company: string | null;
    quotation_date: string;
    valid_until: string | null;
    status: string;
    total: string;
    customer?: { id: number; name: string } | null;
};

type Props = {
    rows: Row[];
    pagination: { total: number; current_page: number; last_page: number; from: number | null; to: number | null };
    filters: { q: string; status: string };
    statuses: string[];
};

const STATUS_TONE: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700',
};

export default function QuotationsIndex({ rows, pagination, filters, statuses }: Props) {
    const [q, setQ] = useState(filters.q);

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/quotations', { q, status: filters.status }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations' }]}>
            <Head title="Quotations" />
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {pagination.total} total · no order needed to create one
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/quotations/create"><Plus className="h-4 w-4 mr-1" /> New quotation</Link>
                    </Button>
                </div>

                <form onSubmit={search} className="flex flex-wrap gap-2 mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input value={q} onChange={(e) => setQ(e.target.value)}
                               placeholder="Search code, customer" className="pl-8 w-64" />
                    </div>
                    <Button type="submit" variant="outline">Search</Button>
                    {statuses.map((s) => (
                        <Link key={s}
                              href={`/quotations?status=${filters.status === s ? '' : s}${q ? `&q=${q}` : ''}`}
                              className={cn(
                                  'inline-flex items-center px-3 py-1.5 rounded-md border text-sm capitalize transition-colors',
                                  filters.status === s
                                      ? 'border-zinc-900 bg-zinc-900 text-white'
                                      : 'border-zinc-200 hover:border-zinc-400',
                              )}>
                            {s}
                        </Link>
                    ))}
                </form>

                <Card>
                    <CardContent className="p-0">
                        {rows.length === 0 ? (
                            <div className="text-center py-16 text-sm text-muted-foreground">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                No quotations yet. Create one — you don't need an order first.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Valid until</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id}
                                            className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                                            onClick={() => router.visit(`/quotations/${r.id}`)}>
                                            <td className="px-4 py-3 font-mono font-medium">{r.quotation_code}</td>
                                            <td className="px-4 py-3">
                                                {r.customer_company || r.customer_name}
                                                {r.customer_company && (
                                                    <span className="text-muted-foreground"> · {r.customer_name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{formatDateIN(r.quotation_date)}</td>
                                            <td className="px-4 py-3">{r.valid_until ? formatDateIN(r.valid_until) : '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge className={cn('capitalize', STATUS_TONE[r.status])}>{r.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(r.total))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
