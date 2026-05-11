import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verify email" />

            <div className="mb-5 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight">Verify email</h1>
                <p className="text-xs text-muted-foreground">
                    Thanks for signing up. Please click the link in the email we just sent you to verify your account.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    A new verification link has been sent to the email address you provided during registration.
                </div>
            )}

            <form onSubmit={submit} className="flex items-center justify-between">
                <Button type="submit" disabled={processing} size="sm">
                    {processing ? 'Sending…' : 'Resend email'}
                </Button>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Log out
                </Link>
            </form>
        </GuestLayout>
    );
}
