import { FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { Plus } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

const MODES = ['neft', 'rtgs', 'upi', 'cheque', 'cash'];

export function RecordPaymentDialog({
    open,
    onClose,
    orderId,
    suggestedAmount,
}: {
    open: boolean;
    onClose: () => void;
    orderId: number;
    suggestedAmount?: number;
}) {
    const form = useForm({
        paid_on: new Date().toISOString().slice(0, 10),
        amount: suggestedAmount ? suggestedAmount.toFixed(2) : '',
        mode: 'neft',
        reference: '',
        notes: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('payments.store', { order: orderId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Payment recorded.');
                form.reset();
                onClose();
            },
            onError: (errs) => toast.error(Object.values(errs).join(', ')),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { form.reset(); onClose(); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record a payment</DialogTitle>
                    <DialogDescription>
                        Each row in the payments ledger represents one received payment. The order's payment status auto-updates from the running sum.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} noValidate className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="paid_on" className="text-xs">Received on *</Label>
                            <DatePicker
                                id="paid_on"
                                value={form.data.paid_on}
                                onChange={(d) => {
                                    if (!d) return;
                                    const yyyy = d.getFullYear();
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    form.setData('paid_on', `${yyyy}-${mm}-${dd}`);
                                }}
                            />
                            {form.errors.paid_on && <p className="text-[10px] text-destructive">{form.errors.paid_on}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="amount" className="text-xs">Amount (₹) *</Label>
                            <Input
                                id="amount"
                                type="number" step="0.01" min="0.01"
                                value={form.data.amount}
                                onChange={(e) => form.setData('amount', e.target.value)}
                                className="text-right tabular-nums"
                                required
                            />
                            {form.errors.amount && <p className="text-[10px] text-destructive">{form.errors.amount}</p>}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="mode" className="text-xs">Mode *</Label>
                            <Select value={form.data.mode} onValueChange={(v) => form.setData('mode', v)}>
                                <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MODES.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {form.errors.mode && <p className="text-[10px] text-destructive">{form.errors.mode}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="reference" className="text-xs">Reference</Label>
                            <Input
                                id="reference"
                                value={form.data.reference}
                                onChange={(e) => form.setData('reference', e.target.value)}
                                placeholder="UTR / txn ID / cheque #"
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">UTR for NEFT/RTGS, transaction ID for UPI, cheque number for cheque.</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            rows={2}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Bank, branch, anything else worth recording"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {form.processing ? 'Recording…' : 'Record payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
