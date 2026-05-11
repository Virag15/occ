import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { PageProps } from '@/types';

type EditProps = PageProps<{ mustVerifyEmail: boolean; status?: string }>;

export default function Edit() {
    const { props } = usePage<EditProps>();
    const user = props.auth.user;
    const mustVerifyEmail = props.mustVerifyEmail;
    const status = props.status;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Profile' }]}>
            <Head title="Profile" />

            <div className="space-y-8">
                <ProfileInfoSection user={user} mustVerifyEmail={mustVerifyEmail} status={status} />
                <Separator />
                <PasswordSection />
                <Separator />
                <DeleteAccountSection />
            </div>
        </AdminLayout>
    );
}

function ProfileInfoSection({ user, mustVerifyEmail, status }: { user: { name: string; email: string }; mustVerifyEmail: boolean; status?: string }) {
    const form = useForm({ name: user.name, email: user.email });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Profile updated'),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <Label className="text-base font-semibold">Profile information</Label>
                <p className="text-sm text-muted-foreground mt-1">Update your account&apos;s display name and email.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name" id="name" error={form.errors.name}>
                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                </Field>
                <Field label="Email" id="email" error={form.errors.email}>
                    <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                </Field>
            </div>

            {mustVerifyEmail && user.email && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Your email address is unverified.{' '}
                    <Link
                        href={route('verification.send')}
                        method="post"
                        as="button"
                        className="font-medium underline hover:text-amber-700"
                    >
                        Click here to resend the verification email.
                    </Link>
                    {status === 'verification-link-sent' && (
                        <p className="mt-1 font-medium text-emerald-700">
                            A new verification link has been sent to your email.
                        </p>
                    )}
                </div>
            )}

            <div>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    );
}

function PasswordSection() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                toast.success('Password updated');
            },
            onError: (errors) => {
                if (errors.password) {
                    form.reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errors.current_password) {
                    form.reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <Label className="text-base font-semibold">Password</Label>
                <p className="text-sm text-muted-foreground mt-1">Use a long random password to keep your account secure.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Current password" id="current_password" error={form.errors.current_password}>
                    <Input
                        ref={currentPasswordInput}
                        id="current_password"
                        type="password"
                        value={form.data.current_password}
                        onChange={(e) => form.setData('current_password', e.target.value)}
                        autoComplete="current-password"
                    />
                </Field>
                <Field label="New password" id="password" error={form.errors.password}>
                    <Input
                        ref={passwordInput}
                        id="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        autoComplete="new-password"
                    />
                </Field>
                <Field label="Confirm password" id="password_confirmation" error={form.errors.password_confirmation}>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                        autoComplete="new-password"
                    />
                </Field>
            </div>

            <div>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Update password'}
                </Button>
            </div>
        </form>
    );
}

function DeleteAccountSection() {
    const [open, setOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const form = useForm({ password: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.delete(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => form.reset(),
        });
    };

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-base font-semibold text-destructive">Danger zone</Label>
                <p className="text-sm text-muted-foreground mt-1">
                    Once your account is deleted, all of its resources and data will be permanently deleted.
                </p>
            </div>

            <Button variant="destructive" onClick={() => setOpen(true)}>
                Delete account
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete your account. Please enter your password to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-3">
                        <Field label="Password" id="delete_password" error={form.errors.password}>
                            <Input
                                ref={passwordInput}
                                id="delete_password"
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                autoComplete="current-password"
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" variant="destructive" disabled={form.processing}>
                                {form.processing ? 'Deleting…' : 'Delete account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
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
