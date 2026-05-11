import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset password" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Set new password</h1>
                <p className="text-xs text-muted-foreground">Choose a new password for your account.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        readOnly
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation">Confirm new password</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                    />
                    {errors.password_confirmation && <p className="text-xs text-destructive">{errors.password_confirmation}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Saving…' : 'Reset password'}
                </Button>
            </form>
        </GuestLayout>
    );
}
