import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil, Package, IndianRupee, AlertTriangle, Warehouse, Info, TrendingDown, TrendingUp, ShoppingCart, ClipboardList, History, Users } from '@/lib/icons';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
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
    total_qty_sold: number;
    total_revenue: number;
    order_count: number;
    avg_sale_price: number;
};

type TopBuyer = { id: number; name: string; company: string | null; qty: string | number; revenue: string | number; orders: number };
type MonthPoint = { month: string; label: string; qty: number; revenue: number };

export default function ProductShow({
    product,
    stats,
    top_buyers = [],
    monthly_sales = [],
}: {
    product: Product & { stock_items?: StockItem[] };
    stats: Stats;
    top_buyers?: TopBuyer[];
    monthly_sales?: MonthPoint[];
}) {
    const hasSalesActivity = monthly_sales.some((m) => m.qty > 0);
    const total = stats.total_stock;
    const negative = total < 0;
    const min = product.min_order_level ? Number(product.min_order_level) : null;
    const reorder = product.reorder_level ? Number(product.reorder_level) : null;
    const reorderQty = min !== null ? Math.max(0, min - total) : 0;
    const margin = product.default_sale_price && product.default_purchase_price
        ? Number(product.default_sale_price) - Number(product.default_purchase_price)
        : null;
    const marginPct = margin !== null && Number(product.default_sale_price) > 0
        ? (margin / Number(product.default_sale_price)) * 100
        : null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Products', href: '/products' }, { label: product.name }]}>
            <Head title={product.name} />

            {/* Compact header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 shrink-0">
                        <Link href={route('products.index')}><ArrowLeft className="h-4 w-4" /> Back</Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                        {product.sku && <span className="font-mono">{product.sku}</span>}
                        {product.brand && <Badge variant="secondary" className="text-[10px]">{product.brand}</Badge>}
                        {product.category && <span>· {product.category}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'Active' : 'Inactive'}</Badge>
                    {negative && <Badge className="border border-red-200 bg-red-500/10 text-red-600"><AlertTriangle className="h-3 w-3 mr-1" /> Negative</Badge>}
                    {!negative && stats.is_below_min && <Badge className="border border-red-200 bg-red-500/10 text-red-600">Below min</Badge>}
                    {!negative && !stats.is_below_min && stats.is_below_reorder && <Badge className="border border-amber-200 bg-amber-500/10 text-amber-700">Reorder</Badge>}
                    <Button asChild>
                        <Link href={route('products.edit', { product: product.id })}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                    </Button>
                </div>
            </div>

            {/* ============================================================
                50/50 split: LEFT = product context, RIGHT = decision support
                ============================================================ */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* ============== LEFT — Product context ============== */}
                <div className="space-y-6">
                    {/* Pricing snapshot */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <IndianRupee className="h-4 w-4 text-muted-foreground" /> Pricing snapshot
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="grid grid-cols-3 gap-3">
                                <Kpi label="MRP" value={formatCurrency(product.mrp)} />
                                <Kpi label="Sale price" value={formatCurrency(product.default_sale_price)} />
                                <Kpi label="Purchase price" value={formatCurrency(product.default_purchase_price)} />
                            </div>
                            {margin !== null && (
                                <div className="mt-3 flex items-baseline justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                                    <span className="text-muted-foreground">Per-unit margin (ex-GST)</span>
                                    <span className="font-medium tabular-nums">{formatCurrency(margin)} {marginPct !== null && <span className="text-muted-foreground">· {marginPct.toFixed(0)}%</span>}</span>
                                </div>
                            )}
                            <div className="mt-2 flex items-baseline justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                                <span className="text-muted-foreground">GST · HSN</span>
                                <span className="font-medium tabular-nums">{product.gst_rate ? `${product.gst_rate}%` : '—'} · <span className="font-mono">{product.hsn_code || '—'}</span></span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product file */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Package className="h-4 w-4 text-muted-foreground" /> Product file
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-1.5 text-xs">
                            <KV label="SKU" value={product.sku} mono />
                            <KV label="Brand" value={product.brand} />
                            <KV label="Category" value={product.category} />
                            <KV label="Unit" value={product.unit} />
                            <KV label="HSN" value={product.hsn_code} mono />
                            <KV label="GST rate" value={product.gst_rate ? `${product.gst_rate}%` : null} />
                            <KV label="Min level" value={product.min_order_level !== null ? `${product.min_order_level} ${product.unit ?? ''}` : null} />
                            <KV label="Reorder level" value={product.reorder_level !== null ? `${product.reorder_level} ${product.unit ?? ''}` : null} />
                            <KV label="Tally synced" value={product.tally_synced_at ? formatDateIN(product.tally_synced_at) : <span className="italic">never</span>} />
                            {product.description && (
                                <>
                                    <Separator className="my-2" />
                                    <p className="text-muted-foreground">Description</p>
                                    <p>{product.description}</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stock by godown */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Warehouse className="h-4 w-4 text-muted-foreground" /> Stock by godown
                            </CardTitle>
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
                                                <th className="px-3 py-2 text-right font-medium">In</th>
                                                <th className="px-3 py-2 text-right font-medium">Out</th>
                                                <th className="px-3 py-2 text-right font-medium">Closing</th>
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
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ============== RIGHT — Decision support ============== */}
                <div className="space-y-6">
                    {/* Stock position headline */}
                    <Card className={cn(negative && 'border-red-200', !negative && stats.is_below_min && 'border-red-200', !negative && !stats.is_below_min && stats.is_below_reorder && 'border-amber-200')}>
                        <CardContent className="p-5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Stock on hand</p>
                            <p className={cn('mt-1 text-4xl font-bold tabular-nums', negative ? 'text-red-600' : stats.is_below_min ? 'text-red-600' : stats.is_below_reorder ? 'text-amber-700' : 'text-foreground')}>
                                {total.toLocaleString('en-IN')} <span className="text-base text-muted-foreground">{product.unit ?? ''}</span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">Aggregated across {stats.godown_count} godown{stats.godown_count === 1 ? '' : 's'}</p>

                            {/* Threshold context */}
                            <div className="mt-4 space-y-1.5 text-xs">
                                {min !== null && (
                                    <ThresholdLine label="Minimum" value={min} unit={product.unit} current={total} />
                                )}
                                {reorder !== null && (
                                    <ThresholdLine label="Reorder at" value={reorder} unit={product.unit} current={total} />
                                )}
                            </div>

                            {negative && product.negative_stock_reason && (
                                <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <p>{product.negative_stock_reason}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Decision card */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" /> Decisions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3 text-xs">
                            {min !== null && total < min ? (
                                <DecisionRow
                                    icon={TrendingDown}
                                    tone="red"
                                    title={`Reorder ${reorderQty.toLocaleString('en-IN')} ${product.unit ?? 'units'} to clear min`}
                                    detail={`Stock is ${(min - total).toLocaleString('en-IN')} ${product.unit ?? ''} below the minimum order level. Raise a purchase order with the vendor for at least this much.`}
                                />
                            ) : reorder !== null && total <= reorder ? (
                                <DecisionRow
                                    icon={TrendingDown}
                                    tone="amber"
                                    title="Reorder soon"
                                    detail={`At or below the reorder level of ${reorder} ${product.unit ?? ''}. Consider raising a PO before stock hits minimum.`}
                                />
                            ) : (
                                <DecisionRow
                                    icon={ShoppingCart}
                                    tone="green"
                                    title="Stock healthy"
                                    detail="Above reorder level — no action needed today."
                                />
                            )}

                            {negative && (
                                <DecisionRow
                                    icon={AlertTriangle}
                                    tone="red"
                                    title="Resolve negative stock"
                                    detail="Either receive inward stock from the vendor, or correct the Tally entry that caused the negative. Negative stock blocks accurate Available-to-Promise calculations."
                                />
                            )}

                            {!product.is_active && (
                                <DecisionRow
                                    icon={AlertTriangle}
                                    tone="amber"
                                    title="Marked inactive"
                                    detail="This product won't appear in new-order picklists. Activate it from the Edit page if you intend to keep selling."
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Sales summary — KPIs derived from OCC's own order lines */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Sales summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <Kpi label="Units sold" value={stats.total_qty_sold > 0 ? `${stats.total_qty_sold.toLocaleString('en-IN')} ${product.unit ?? ''}` : '0'} />
                                <Kpi label="Revenue" value={formatCurrency(stats.total_revenue)} />
                                <Kpi label="Orders" value={String(stats.order_count)} />
                                <Kpi label="Avg sale price" value={stats.avg_sale_price > 0 ? formatCurrency(stats.avg_sale_price) : '—'} />
                            </div>
                            {!hasSalesActivity && (
                                <p className="mt-3 rounded border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                                    No sale activity in the last 12 months — chart and top-buyers will populate as orders come in.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Monthly volume — last 12 months */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <History className="h-4 w-4 text-muted-foreground" /> Monthly volume
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly_sales} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                        <RTooltip
                                            contentStyle={{ fontSize: 11, padding: 6 }}
                                            formatter={(value, name) => name === 'qty' ? [`${value} ${product.unit ?? ''}`, 'Qty'] : [formatCurrency(value as number), 'Revenue']}
                                        />
                                        <Bar dataKey="qty" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top buyers */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Users className="h-4 w-4 text-muted-foreground" /> Top buyers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {top_buyers.length === 0 ? (
                                <p className="px-4 pb-4 text-sm text-muted-foreground">No buyers yet for this product.</p>
                            ) : (
                                <div className="divide-y">
                                    {top_buyers.map((b) => (
                                        <Link
                                            key={b.id}
                                            href={route('customers.show', { customer: b.id })}
                                            className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{b.name}</p>
                                                {b.company && <p className="truncate text-[10px] text-muted-foreground">{b.company}</p>}
                                            </div>
                                            <div className="ml-3 text-right">
                                                <p className="font-mono tabular-nums">{Number(b.qty).toLocaleString('en-IN')} {product.unit ?? ''}</p>
                                                <p className="text-[10px] tabular-nums text-muted-foreground">{formatCurrency(b.revenue)} · {b.orders} order{b.orders === 1 ? '' : 's'}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

function Kpi({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-bold tabular-nums">{value}</p>
        </div>
    );
}

function ThresholdLine({ label, value, unit, current }: { label: string; value: number; unit: string | null; current: number }) {
    const diff = current - value;
    const ok = diff >= 0;
    return (
        <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}: {value.toLocaleString('en-IN')} {unit ?? ''}</span>
            <span className={cn('tabular-nums font-medium', ok ? 'text-emerald-600' : 'text-red-600')}>
                {ok ? `+${diff.toLocaleString('en-IN')}` : diff.toLocaleString('en-IN')}
            </span>
        </div>
    );
}

function DecisionRow({ icon: Icon, tone, title, detail }: { icon: React.ComponentType<{ className?: string }>; tone: 'red' | 'amber' | 'green'; title: string; detail: string }) {
    const toneCls = {
        red: 'border-red-200 bg-red-50 text-red-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }[tone];
    return (
        <div className={cn('flex items-start gap-2 rounded-md border px-3 py-2', toneCls)}>
            <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 opacity-90">{detail}</p>
            </div>
        </div>
    );
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[110px_1fr] items-start gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn(mono && 'font-mono')}>{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );
}
