import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Trash2, Mail, Send, Printer } from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';
import { formatCurrency, formatDateIN } from '@/lib/format';

type Invoice = {
    id: number;
    invoice_code: string;
    customer_name: string;
    customer_company: string | null;
    customer_email: string | null;
    invoice_date: string;
    due_date: string | null;
    status: string;
    total: string;
    quotation_id: number | null;
};

type Props = { invoice: Invoice };

const STATUSES = ['draft', 'sent', 'paid', 'cancelled'];

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'outline',
    paid: 'default',
    cancelled: 'destructive',
};

export default function InvoiceShow({ invoice }: Props) {
    const confirm = useConfirm();

    const setStatus = (status: string) => {
        router.patch(`/invoices/${invoice.id}/status`, { status }, { preserveScroll: true });
    };

    const destroy = async () => {
        const ok = await confirm({
            title: `Delete ${invoice.invoice_code}?`,
            description: 'This cannot be undone.',
            confirmText: 'Delete',
            destructive: true,
        });
        if (!ok) return;
        router.delete(`/invoices/${invoice.id}`);
    };

    const [mailOpen, setMailOpen] = useState(false);
    const mail = useForm({ to: invoice.customer_email ?? '', cc: '', message: '' });
    const sendMail = (e: React.FormEvent) => {
        e.preventDefault();
        mail.post(`/invoices/${invoice.id}/email`, {
            preserveScroll: true,
            onSuccess: () => {
                setMailOpen(false);
                mail.reset('message', 'cc');
                toast.success(`Invoice emailed to ${mail.data.to}.`);
            },
            onError: (errs) => toast.error(Object.values(errs).join(', ') || 'Could not send the email.'),
        });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: invoice.invoice_code }]}>
            <Head title={invoice.invoice_code} />

            <div className="-m-4 sm:-m-6">
                <div className="sticky -top-4 z-30 border-b bg-background sm:-top-6">
                    <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
                        <Button asChild variant="ghost" size="sm" className="-ml-2">
                            <Link href="/invoices"><ArrowLeft className="mr-1 h-4 w-4" /> Invoices</Link>
                        </Button>
                        <span className="font-mono text-sm font-semibold tracking-tight">{invoice.invoice_code}</span>
                        <Badge variant={STATUS_VARIANT[invoice.status] ?? 'secondary'} className="capitalize">
                            {invoice.status}
                        </Badge>
                        <span className="hidden text-sm text-muted-foreground sm:inline">
                            {invoice.customer_company || invoice.customer_name} · {formatCurrency(Number(invoice.total))}
                        </span>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <Select value={invoice.status} onValueChange={setStatus}>
                                <SelectTrigger size="sm" className="w-32 capitalize"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="default" size="sm" onClick={() => setMailOpen(true)}>
                                <Mail className="mr-1 h-4 w-4" /> Email
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href={`/invoices/${invoice.id}/pdf?inline=1`} target="_blank" rel="noopener">
                                    <Printer className="mr-1 h-4 w-4" /> Print
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href={`/invoices/${invoice.id}/pdf`}><FileDown className="mr-1 h-4 w-4" /> PDF</a>
                            </Button>
                            {invoice.quotation_id && (
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/quotations/${invoice.quotation_id}`}>Source quote</Link>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={destroy}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Dialog open={mailOpen} onOpenChange={setMailOpen}>
                    <DialogContent className="sm:max-w-md">
                        <form onSubmit={sendMail}>
                            <DialogHeader>
                                <DialogTitle>Email invoice {invoice.invoice_code}</DialogTitle>
                                <DialogDescription>
                                    Sends a branded HTML email with the PDF attached. Marks a draft as “sent”.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_to" className="text-xs">To *</Label>
                                    <Input id="mail_to" type="email" required value={mail.data.to}
                                           onChange={(e) => mail.setData('to', e.target.value)}
                                           placeholder="customer@example.com" />
                                    {mail.errors.to && <p className="text-xs text-destructive">{mail.errors.to}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_cc" className="text-xs">CC (optional)</Label>
                                    <Input id="mail_cc" type="email" value={mail.data.cc}
                                           onChange={(e) => mail.setData('cc', e.target.value)} />
                                    {mail.errors.cc && <p className="text-xs text-destructive">{mail.errors.cc}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_msg" className="text-xs">Message (optional)</Label>
                                    <Textarea id="mail_msg" rows={4} value={mail.data.message}
                                              onChange={(e) => mail.setData('message', e.target.value)}
                                              placeholder="Adds a short note above the summary in the email." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setMailOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={mail.processing}>
                                    <Send className="mr-1 h-4 w-4" />
                                    {mail.processing ? 'Sending…' : 'Send email'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* The document — the real PDF, guaranteed identical to download/email */}
                <div className="bg-muted/40 p-4 sm:p-6">
                    <iframe
                        title={`Invoice ${invoice.invoice_code}`}
                        src={`/invoices/${invoice.id}/pdf?inline=1`}
                        className="mx-auto block h-[78vh] w-full max-w-4xl rounded-lg border bg-white shadow-sm"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
