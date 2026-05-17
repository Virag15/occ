import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Receipt, Landmark, FileText } from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { SettingsShell } from './SettingsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LedgerMap = {
    sales_ledgers: Record<string, string> | null;
    purchase_ledgers: Record<string, string> | null;
    output_cgst_ledger: string | null;
    output_sgst_ledger: string | null;
    output_igst_ledger: string | null;
    input_cgst_ledger: string | null;
    input_sgst_ledger: string | null;
    input_igst_ledger: string | null;
    round_off_ledger: string | null;
    discount_ledger: string | null;
    freight_ledger: string | null;
    default_bank_ledger: string | null;
    cash_ledger: string | null;
};

type Row = { rate: string; ledger: string };

function mapToRows(m: Record<string, string> | null): Row[] {
    const rows = Object.entries(m ?? {}).map(([rate, ledger]) => ({ rate, ledger }));
    return rows.length ? rows : [{ rate: '', ledger: '' }];
}

function rowsToMap(rows: Row[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const r of rows) {
        const rate = r.rate.trim();
        const ledger = r.ledger.trim();
        if (rate !== '' && ledger !== '' && !Number.isNaN(Number(rate))) out[rate] = ledger;
    }
    return out;
}

/** Module-scope so the input keeps focus across renders (see Company.tsx note). */
function Field({
    id, label, value, onChange, hint,
}: {
    id: string; label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

function RateRows({
    title, rows, setRows,
}: {
    title: string; rows: Row[]; setRows: (r: Row[]) => void;
}) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-medium">{title}</p>
            {rows.map((row, i) => (
                <div key={i} className="flex items-end gap-2">
                    <div className="w-24 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">GST %</Label>
                        <Input
                            value={row.rate}
                            onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, rate: e.target.value } : r)))}
                            className="font-mono text-xs"
                            placeholder="18"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Tally ledger name</Label>
                        <Input
                            value={row.ledger}
                            onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ledger: e.target.value } : r)))}
                            className="font-mono text-xs"
                            placeholder="Sales - GST 18%"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)}
                        aria-label="Remove row"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { rate: '', ledger: '' }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add rate
            </Button>
        </div>
    );
}

export default function TallyMapping({
    map, missing, tally_enabled,
}: {
    map: LedgerMap;
    missing: string[];
    tally_enabled: boolean;
}) {
    const [salesRows, setSalesRows] = useState<Row[]>(mapToRows(map.sales_ledgers));
    const [purchaseRows, setPurchaseRows] = useState<Row[]>(mapToRows(map.purchase_ledgers));

    const form = useForm({
        output_cgst_ledger: map.output_cgst_ledger ?? '',
        output_sgst_ledger: map.output_sgst_ledger ?? '',
        output_igst_ledger: map.output_igst_ledger ?? '',
        input_cgst_ledger: map.input_cgst_ledger ?? '',
        input_sgst_ledger: map.input_sgst_ledger ?? '',
        input_igst_ledger: map.input_igst_ledger ?? '',
        round_off_ledger: map.round_off_ledger ?? '',
        discount_ledger: map.discount_ledger ?? '',
        freight_ledger: map.freight_ledger ?? '',
        default_bank_ledger: map.default_bank_ledger ?? '',
        cash_ledger: map.cash_ledger ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            sales_ledgers: rowsToMap(salesRows),
            purchase_ledgers: rowsToMap(purchaseRows),
        }));
        form.post('/settings/tally-mapping', {
            preserveScroll: true,
            onSuccess: () => toast.success('Tally ledger mapping saved'),
            onError: () => toast.error('Could not save — check the fields'),
        });
    };

    const f = form.data;
    const set = (k: keyof typeof f) => (v: string) => form.setData(k, v);

    return (
        <AdminLayout>
            <Head title="Tally mapping" />
            <SettingsShell active="tally-mapping">
                <form onSubmit={submit} className="space-y-5">
                    {missing.length > 0 && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                            <p className="font-medium text-amber-700">Mapping incomplete</p>
                            <p className="text-xs text-amber-700/80">
                                Vouchers cannot be pushed to Tally until these are set:{' '}
                                <span className="font-mono">{missing.join(', ')}</span>.
                            </p>
                        </div>
                    )}
                    {!tally_enabled && (
                        <p className="text-xs text-muted-foreground">
                            Tally is not connected yet, so ledger names are free-typed. Once the bridge
                            is live they become pick-lists validated against your real chart of accounts.
                        </p>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Receipt className="h-4 w-4 text-emerald-600" /> Sales &amp; purchase ledgers (by GST rate)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <RateRows title="Sales ledgers" rows={salesRows} setRows={setSalesRows} />
                            <RateRows title="Purchase ledgers" rows={purchaseRows} setRows={setPurchaseRows} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4 text-blue-600" /> GST tax ledgers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-3">
                            <Field id="ocgst" label="Output CGST" value={f.output_cgst_ledger} onChange={set('output_cgst_ledger')} />
                            <Field id="osgst" label="Output SGST" value={f.output_sgst_ledger} onChange={set('output_sgst_ledger')} />
                            <Field id="oigst" label="Output IGST" value={f.output_igst_ledger} onChange={set('output_igst_ledger')} />
                            <Field id="icgst" label="Input CGST" value={f.input_cgst_ledger} onChange={set('input_cgst_ledger')} />
                            <Field id="isgst" label="Input SGST" value={f.input_sgst_ledger} onChange={set('input_sgst_ledger')} />
                            <Field id="iigst" label="Input IGST" value={f.input_igst_ledger} onChange={set('input_igst_ledger')} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Landmark className="h-4 w-4 text-amber-600" /> Money &amp; adjustment ledgers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-3">
                            <Field id="bank" label="Default bank" value={f.default_bank_ledger} onChange={set('default_bank_ledger')} hint="Receipts/payments land here" />
                            <Field id="cash" label="Cash" value={f.cash_ledger} onChange={set('cash_ledger')} />
                            <Field id="round" label="Round off" value={f.round_off_ledger} onChange={set('round_off_ledger')} hint="Invoice rupee rounding" />
                            <Field id="disc" label="Discount" value={f.discount_ledger} onChange={set('discount_ledger')} />
                            <Field id="freight" label="Freight" value={f.freight_ledger} onChange={set('freight_ledger')} />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            <Save className="mr-1.5 h-4 w-4" /> Save mapping
                        </Button>
                    </div>
                </form>
            </SettingsShell>
        </AdminLayout>
    );
}
