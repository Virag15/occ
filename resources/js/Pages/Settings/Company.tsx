import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Save, Image as ImageIcon, Building2, MapPin, Receipt, Landmark, FileText } from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { SettingsShell } from './SettingsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Settings = {
    id: number;
    logo_path: string | null;
    signature_path: string | null;
    company_name: string;
    legal_name: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    state_code: string | null;
    pincode: string | null;
    gstin: string | null;
    pan: string | null;
    cin: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    bank_name: string | null;
    bank_branch: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    bank_ifsc: string | null;
    upi_id: string | null;
    signatory_name: string | null;
    signatory_designation: string | null;
    terms_and_conditions: string | null;
    invoice_footer_note: string | null;
    invoice_declaration: string | null;
    quotation_layout: string | null;
};

/**
 * Module-scope so its identity is stable across renders. Defining this
 * inside the page component remounts the <Input> on every keystroke,
 * which drops focus after one character.
 */
function Field({
    id, label, value, onChange, error, mono = false, type = 'text',
}: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; mono?: boolean; type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={mono ? 'font-mono text-xs' : ''}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function CompanySettings({ settings }: { settings: Settings }) {
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo_path ? `/storage/${settings.logo_path}` : null);
    const [sigPreview, setSigPreview] = useState<string | null>(settings.signature_path ? `/storage/${settings.signature_path}` : null);

    const form = useForm({
        company_name: settings.company_name ?? '',
        legal_name: settings.legal_name ?? '',
        address_line_1: settings.address_line_1 ?? '',
        address_line_2: settings.address_line_2 ?? '',
        city: settings.city ?? '',
        state: settings.state ?? '',
        state_code: settings.state_code ?? '',
        pincode: settings.pincode ?? '',
        gstin: settings.gstin ?? '',
        pan: settings.pan ?? '',
        cin: settings.cin ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        website: settings.website ?? '',
        bank_name: settings.bank_name ?? '',
        bank_branch: settings.bank_branch ?? '',
        bank_account_number: settings.bank_account_number ?? '',
        bank_account_holder: settings.bank_account_holder ?? '',
        bank_ifsc: settings.bank_ifsc ?? '',
        upi_id: settings.upi_id ?? '',
        signatory_name: settings.signatory_name ?? '',
        signatory_designation: settings.signatory_designation ?? '',
        terms_and_conditions: settings.terms_and_conditions ?? '',
        invoice_footer_note: settings.invoice_footer_note ?? '',
        invoice_declaration: settings.invoice_declaration ?? '',
        quotation_layout: settings.quotation_layout ?? 'classic',
        logo: null as File | null,
        signature: null as File | null,
    });

    const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        form.setData('logo', f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(f);
        }
    };

    const onSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        form.setData('signature', f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setSigPreview(reader.result as string);
            reader.readAsDataURL(f);
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('settings.company.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => toast.success('Settings saved.'),
            onError: (errs) => toast.error(Object.values(errs).join(', ')),
        });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Settings' }, { label: 'Company' }]}>
            <Head title="Company settings" />

            <SettingsShell active="company">
            <form onSubmit={submit} className="space-y-6">

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><ImageIcon className="h-4 w-4 text-muted-foreground" /> Logo &amp; signature</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded border bg-muted/30 shrink-0">
                                {logoPreview
                                    ? <img src={logoPreview} alt="logo" className="max-h-full max-w-full" />
                                    : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs">Company logo</Label>
                                <Input type="file" accept="image/*" onChange={onLogo} />
                                <p className="text-xs text-muted-foreground">Appears top-left on the invoice PDF. Max 5MB. Compressed to 600px JPEG.</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center gap-4">
                            <div className="flex h-24 w-44 items-center justify-center overflow-hidden rounded border bg-white shrink-0">
                                {sigPreview
                                    ? <img src={sigPreview} alt="signature" className="max-h-full max-w-full" />
                                    : <span className="text-xs italic text-muted-foreground">no signature</span>}
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs">Authorised signature</Label>
                                <Input type="file" accept="image/*" onChange={onSignature} />
                                <p className="text-xs text-muted-foreground">
                                    Upload a scanned signature (transparent PNG looks best). Appears above the signatory name on the invoice PDF.
                                    Tip: photograph signature on a plain white sheet for cleanest result.
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-1.5">
                            <Label className="text-xs">Document layout</Label>
                            <Select
                                value={form.data.quotation_layout}
                                onValueChange={(v) => form.setData('quotation_layout', v)}
                            >
                                <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classic">Classic — logo left, title right</SelectItem>
                                    <SelectItem value="banner">Banner — logo &amp; identity centred on top</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Applies to the quotation PDF, the on-screen preview, and (later) invoices.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-muted-foreground" /> Company identity</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
                        <Field id="company_name" label="Display name *" value={form.data.company_name} onChange={(v) => form.setData('company_name', v)} error={form.errors.company_name} />
                        <Field id="legal_name" label="Legal name" value={form.data.legal_name} onChange={(v) => form.setData('legal_name', v)} error={form.errors.legal_name} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-muted-foreground" /> Address & contact</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
                        <Field id="address_line_1" label="Address line 1" value={form.data.address_line_1} onChange={(v) => form.setData('address_line_1', v)} />
                        <Field id="address_line_2" label="Address line 2" value={form.data.address_line_2} onChange={(v) => form.setData('address_line_2', v)} />
                        <Field id="city" label="City" value={form.data.city} onChange={(v) => form.setData('city', v)} />
                        <Field id="state" label="State" value={form.data.state} onChange={(v) => form.setData('state', v)} />
                        <Field id="state_code" label="State code (2-digit, e.g. 27 for Maharashtra)" value={form.data.state_code} onChange={(v) => form.setData('state_code', v)} mono />
                        <Field id="pincode" label="PIN code" value={form.data.pincode} onChange={(v) => form.setData('pincode', v)} mono />
                        <Field id="phone" label="Phone" value={form.data.phone} onChange={(v) => form.setData('phone', v)} mono />
                        <Field id="email" label="Email" value={form.data.email} onChange={(v) => form.setData('email', v)} type="email" />
                        <Field id="website" label="Website" value={form.data.website} onChange={(v) => form.setData('website', v)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Receipt className="h-4 w-4 text-muted-foreground" /> Tax identifiers</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-3">
                        <Field id="gstin" label="GSTIN (15 chars)" value={form.data.gstin} onChange={(v) => form.setData('gstin', v.toUpperCase())} mono error={form.errors.gstin} />
                        <Field id="pan" label="PAN" value={form.data.pan} onChange={(v) => form.setData('pan', v.toUpperCase())} mono error={form.errors.pan} />
                        <Field id="cin" label="CIN (if applicable)" value={form.data.cin} onChange={(v) => form.setData('cin', v.toUpperCase())} mono />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Landmark className="h-4 w-4 text-muted-foreground" /> Bank details (printed on invoice)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
                        <Field id="bank_name" label="Bank name" value={form.data.bank_name} onChange={(v) => form.setData('bank_name', v)} />
                        <Field id="bank_branch" label="Branch" value={form.data.bank_branch} onChange={(v) => form.setData('bank_branch', v)} />
                        <Field id="bank_account_holder" label="A/c holder's name" value={form.data.bank_account_holder} onChange={(v) => form.setData('bank_account_holder', v)} />
                        <Field id="bank_account_number" label="Account number" value={form.data.bank_account_number} onChange={(v) => form.setData('bank_account_number', v)} mono />
                        <Field id="bank_ifsc" label="IFSC code" value={form.data.bank_ifsc} onChange={(v) => form.setData('bank_ifsc', v.toUpperCase())} mono />
                        <Field id="upi_id" label="UPI ID" value={form.data.upi_id} onChange={(v) => form.setData('upi_id', v)} mono />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-muted-foreground" /> Invoice signoff & terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field id="signatory_name" label="Signatory name" value={form.data.signatory_name} onChange={(v) => form.setData('signatory_name', v)} />
                            <Field id="signatory_designation" label="Signatory designation" value={form.data.signatory_designation} onChange={(v) => form.setData('signatory_designation', v)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="terms_and_conditions" className="text-xs">Terms &amp; conditions (printed on every invoice)</Label>
                            <Textarea
                                id="terms_and_conditions"
                                rows={4}
                                value={form.data.terms_and_conditions}
                                onChange={(e) => form.setData('terms_and_conditions', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="invoice_declaration" className="text-xs">Declaration (printed near the signature)</Label>
                            <Textarea
                                id="invoice_declaration"
                                rows={3}
                                placeholder="We declare that this quotation shows the actual price of the goods described and that all particulars are true and correct."
                                value={form.data.invoice_declaration}
                                onChange={(e) => form.setData('invoice_declaration', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="invoice_footer_note" className="text-xs">Invoice footer note</Label>
                            <Input
                                id="invoice_footer_note"
                                value={form.data.invoice_footer_note}
                                onChange={(e) => form.setData('invoice_footer_note', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={form.processing}>
                        <Save className="h-4 w-4 mr-1" /> {form.processing ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>
            </form>
            </SettingsShell>
        </AdminLayout>
    );
}
