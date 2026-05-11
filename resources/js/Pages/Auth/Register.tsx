import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Create account</h1>
                <p className="text-xs text-muted-foreground">Request access to OCC.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation">Confirm password</Label>
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
                    {processing ? 'Creating…' : 'Create account'}
                </Button>
            </form>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Already have an account?{' '}
                <Link href={route('login')} className="font-medium text-foreground hover:underline">
                    Sign in
                </Link>
            </p>
        </GuestLayout>
    );
}
