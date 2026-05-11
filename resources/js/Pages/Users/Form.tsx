import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLES = [
    { value: 'owner', desc: 'Full access — users, settings, everything.' },
    { value: 'manager', desc: 'Almost everything except billing & user management.' },
    { value: 'accounts', desc: 'Customers, orders payments, read-only elsewhere.' },
    { value: 'warehouse', desc: 'Dispatch + delivery actions on Orders. Read-only on masters.' },
    { value: 'viewer', desc: 'Read-only across the board.' },
];

type Existing = { id: number; name: string; email: string; role: string };

type FormShape = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
};

export default function UserForm({ user }: { user?: Existing | null }) {
    const isEdit = !!user?.id;
    const form = useForm<FormShape>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role: user?.role ?? 'viewer',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'User updated' : 'User created');
        if (isEdit) {
            form.patch(route('users.update', { user: user!.id }), { onSuccess });
        } else {
            form.post(route('users.store'), { onSuccess });
        }
    };

    return (
        <>
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                    <Link href={route('users.index')}>
                        <ArrowLeft className="h-4 w-4" /> Back to Users
                    </Link>
                </Button>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Basic info</Label>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Name *" id="name" error={form.errors.name}>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                        </Field>
                        <Field label="Email *" id="email" error={form.errors.email}>
                            <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                        </Field>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">Password</Label>
                    {isEdit && <p className="-mt-2 text-sm text-muted-foreground">Leave blank to keep the current password.</p>}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label={isEdit ? 'New password' : 'Password *'} id="password" error={form.errors.password}>
                            <Input id="password" type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} autoComplete="new-password" />
                        </Field>
                        <Field label="Confirm password" id="password_confirmation" error={form.errors.password_confirmation}>
                            <Input id="password_confirmation" type="password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} autoComplete="new-password" />
                        </Field>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">Role</Label>
                    <Field label="Role *" id="role" error={form.errors.role}>
                        <Select value={form.data.role} onValueChange={(v: string) => form.setData('role', v)}>
                            <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        <div className="flex flex-col">
                                            <span className="capitalize">{r.value}</span>
                                            <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                <Separator />

                <div className="flex gap-3">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Update user' : 'Create user'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={route('users.index')}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
