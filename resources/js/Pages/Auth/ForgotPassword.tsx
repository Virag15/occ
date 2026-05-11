import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot password" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Reset password</h1>
                <p className="text-xs text-muted-foreground">
                    Enter your email and we'll send a reset link.
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Sending…' : 'Send reset link'}
                </Button>
            </form>
        </GuestLayout>
    );
}
