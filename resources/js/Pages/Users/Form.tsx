import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';
import { Save, UserCircle, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROLES = [
    { value: 'owner', desc: 'Full access — users, settings, everything.' },
    { value: 'manager', desc: 'Almost everything except billing & user management.' },
    { value: 'accounts', desc: 'Customers, orders, payments. Read-only elsewhere.' },
    { value: 'warehouse', desc: 'Dispatch + delivery actions on Orders. Read-only on masters.' },
    { value: 'viewer', desc: 'Read-only across the board.' },
];

type Existing = { id: number; name: string; email: string; role: string };

type FormShape = {
    name: string; email: string;
    password: string; password_confirmation: string;
    role: string;
};

export default function UserForm({ user }: { user?: Existing | null }) {
    const isEdit = !!user?.id;
    const form = useForm<FormShape>({
        name: user?.name ?? '', email: user?.email ?? '',
        password: '', password_confirmation: '',
        role: user?.role ?? 'viewer',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'User updated' : 'User created');
        if (isEdit) form.patch(route('users.update', { user: user!.id }), { onSuccess });
        else form.post(route('users.store'), { onSuccess });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {isEdit ? user!.name : 'New user'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isEdit ? `Editing ${user!.email}` : 'Invite a team member by creating their account'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={route('users.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing} size="sm">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {form.processing ? 'Saving…' : isEdit ? 'Update user' : 'Create user'}
                    </Button>
                </div>
            </div>

            <Section icon={UserCircle} title="Identity">
                <Grid cols={2}>
                    <Field label="Name *" id="name" error={form.errors.name}>
                        <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    </Field>
                    <Field label="Email *" id="email" error={form.errors.email} help="Used to log in">
                        <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                    </Field>
                </Grid>
            </Section>

            <Section icon={Lock} title="Password">
                {isEdit && (
                    <p className="-mt-1 mb-2 text-xs text-muted-foreground">
                        Leave both fields blank to keep the current password.
                    </p>
                )}
                <Grid cols={2}>
                    <Field label={isEdit ? 'New password' : 'Password *'} id="password" error={form.errors.password}>
                        <Input id="password" type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirm password" id="password_confirmation" error={form.errors.password_confirmation}>
                        <Input id="password_confirmation" type="password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} autoComplete="new-password" />
                    </Field>
                </Grid>
            </Section>

            <Section icon={Shield} title="Role & access">
                <Field label="Role *" id="role" error={form.errors.role} help="Determines what the user can see and change">
                    <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
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
            </Section>

            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" asChild>
                    <Link href={route('users.index')}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    <Save className="h-4 w-4 mr-1" />
                    {form.processing ? 'Saving…' : isEdit ? 'Update user' : 'Create user'}
                </Button>
            </div>
        </form>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">{children}</CardContent>
        </Card>
    );
}

function Grid({ cols, children }: { cols: 1 | 2; children: React.ReactNode }) {
    const classes: Record<number, string> = {
        1: 'grid gap-3',
        2: 'grid gap-3 sm:grid-cols-2',
    };
    return <div className={classes[cols]}>{children}</div>;
}

function Field({ label, id, error, help, children }: { label: string; id: string; error?: string; help?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            {label && <Label htmlFor={id} className="text-xs">{label}</Label>}
            {children}
            {help && !error && <p className="text-[10px] text-muted-foreground">{help}</p>}
            {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
    );
}
