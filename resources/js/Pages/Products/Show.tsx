import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil, Package, IndianRupee, AlertTriangle, Warehouse, Info } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product, StockItem } from '@/types/entities';

type Stats = {
    total_stock: number;
    godown_count: number;
    is_below_min: boolean;
    is_below_reorder: boolean;
};

export default function ProductShow({
    product,
    stats,
}: {
    product: Product & { stock_items?: StockItem[] };
    stats: Stats;
}) {
    const total = stats.total_stock;
    const negative = total < 0;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Products', href: '/products' }, { label: product.name }]}>
            <Head title={product.name} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                        <Link href={route('products.index')}><ArrowLeft className="h-4 w-4" /> Back</Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{product.name}</h1>
                        <p className="text-xs text-muted-foreground">
                            {product.sku && <><span className="font-mono">{product.sku}</span> · </>}
                            {product.brand && <Badge variant="secondary" className="text-[10px] ml-0">{product.brand}</Badge>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'Active' : 'Inactive'}</Badge>
                    {negative && <Badge className="border border-red-200 bg-red-500/10 text-red-600"><AlertTriangle className="h-3 w-3 mr-1" /> Negative stock</Badge>}
                    {!negative && stats.is_below_min && <Badge className="border border-red-200 bg-red-500/10 text-red-600">Below min</Badge>}
                    {!negative && !stats.is_below_min && stats.is_below_reorder && <Badge className="border border-amber-200 bg-amber-500/10 text-amber-700">Reorder</Badge>}
                    <Button asChild>
                        <Link href={route('products.edit', { product: product.id })}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                    </Button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={Warehouse} label="Stock on hand" value={`${total.toLocaleString('en-IN')} ${product.unit ?? ''}`} sub={`Across ${stats.godown_count} godown${stats.godown_count === 1 ? '' : 's'}`} tone={negative ? 'red' : 'normal'} />
                <KpiCard icon={IndianRupee} label="MRP" value={formatCurrency(product.mrp)} sub={product.gst_rate ? `GST ${product.gst_rate}%` : ''} />
                <KpiCard icon={IndianRupee} label="Sale price" value={formatCurrency(product.default_sale_price)} sub="Default ex-GST" />
                <KpiCard icon={IndianRupee} label="Purchase price" value={formatCurrency(product.default_purchase_price)} sub="Default ex-GST" />
            </div>

            {negative && product.negative_stock_reason && (
                <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium">Negative stock — recorded reason:</p>
                        <p>{product.negative_stock_reason}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Product file (left) */}
                <Card className="lg:col-span-1">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Package className="h-4 w-4 text-muted-foreground" /> Product file</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2 text-xs">
                        <KV label="SKU" value={product.sku} mono />
                        <KV label="Brand" value={product.brand} />
                        <KV label="Category" value={product.category} />
                        <KV label="HSN code" value={product.hsn_code} mono />
                        <KV label="Unit" value={product.unit} />
                        <KV label="GST rate" value={product.gst_rate ? `${product.gst_rate}%` : null} />
                        <Separator />
                        <KV label="MRP" value={formatCurrency(product.mrp)} />
                        <KV label="Sale price" value={formatCurrency(product.default_sale_price)} />
                        <KV label="Purchase price" value={formatCurrency(product.default_purchase_price)} />
                        <Separator />
                        <KV label="Min level" value={product.min_order_level} />
                        <KV label="Reorder level" value={product.reorder_level} />
                        <Separator />
                        <KV label="Tally synced" value={product.tally_synced_at ? formatDateIN(product.tally_synced_at) : <span className="italic">never</span>} />
                        {product.description && (<><Separator /><div><p className="text-muted-foreground mb-1">Description</p><p>{product.description}</p></div></>)}
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stock by godown */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium"><Warehouse className="h-4 w-4 text-muted-foreground" /> Stock by godown</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!product.stock_items || product.stock_items.length === 0) ? (
                                <p className="px-4 pb-4 text-sm text-muted-foreground">No stock records yet — Tally bridge will populate godown-wise stock on next sync.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium">Godown</th>
                                                <th className="px-3 py-2 text-right font-medium">Opening</th>
                                                <th className="px-3 py-2 text-right font-medium">Inward</th>
                                                <th className="px-3 py-2 text-right font-medium">Outward</th>
                                                <th className="px-3 py-2 text-right font-medium">Closing</th>
                                                <th className="px-3 py-2 text-right font-medium">As of</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {product.stock_items.map((s) => {
                                                const closing = Number(s.qty_closing ?? 0);
                                                return (
                                                    <tr key={s.id} className="border-t border-border/40">
                                                        <td className="px-3 py-2 font-medium">{s.godown_name}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(s.qty_opening).toLocaleString('en-IN')}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">+{Number(s.qty_inward).toLocaleString('en-IN')}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">-{Number(s.qty_outward).toLocaleString('en-IN')}</td>
                                                        <td className={cn('px-3 py-2 text-right tabular-nums font-medium', closing < 0 && 'text-red-600')}>{closing.toLocaleString('en-IN')}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{s.as_of_date ? formatDateIN(s.as_of_date) : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tally history placeholder */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Purchase &amp; sale history</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-3 text-xs">
                                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="space-y-1">
                                    <p className="font-medium">Awaiting Tally bridge</p>
                                    <p className="text-muted-foreground">
                                        Latest purchase price + vendor, latest sale price + customer, price-trend chart, volume-trend chart, top customers — all populate on the first Tally sync. The bridge stub is wired; real ODBC connection lands in Phase 4.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'normal' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone?: 'normal' | 'red' }) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="space-y-0.5 min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                        <span className={cn('block text-xl font-bold tabular-nums tracking-tight', tone === 'red' && 'text-red-600')}>{value}</span>
                        <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                    <div className="flex size-7 items-center justify-center rounded-md bg-muted shrink-0">
                        <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[110px_1fr] items-start gap-3 py-0.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn(mono && 'font-mono')}>{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );
}
