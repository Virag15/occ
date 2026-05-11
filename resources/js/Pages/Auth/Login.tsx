import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
                <p className="text-xs text-muted-foreground">Enter your credentials to access OCC.</p>
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
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                            >
                                Forgot?
                            </Link>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked: boolean) => setData('remember', checked === true)}
                    />
                    <Label htmlFor="remember" className="text-xs font-normal text-muted-foreground cursor-pointer">
                        Remember me on this device
                    </Label>
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Signing in…' : 'Sign in'}
                </Button>
            </form>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Don't have an account?{' '}
                <Link href={route('register')} className="font-medium text-foreground hover:underline">
                    Request access
                </Link>
            </p>
        </GuestLayout>
    );
}
