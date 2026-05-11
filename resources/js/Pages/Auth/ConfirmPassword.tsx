import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('password.confirm'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Confirm password" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Confirm password</h1>
                <p className="text-xs text-muted-foreground">
                    Please confirm your password before continuing to this secure area.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Confirming…' : 'Confirm'}
                </Button>
            </form>
        </GuestLayout>
    );
}
