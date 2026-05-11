import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login({
    status,
}: {
    status?: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
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
        <>
            <Head title="Sign in" />

            <div className="relative grid min-h-svh lg:grid-cols-2">
                {/* Left branded panel */}
                <div className="relative hidden flex-col p-10 text-primary lg:flex dark:border-r">
                    <div className="absolute inset-0 bg-primary/5" />
                    <div className="relative z-20 flex items-center gap-2">
                        <span className="text-lg font-bold tracking-tight">OCC</span>
                        <span className="text-xs text-muted-foreground">GC Communication</span>
                    </div>
                    <div className="relative z-20 mt-auto">
                        <blockquote className="leading-normal text-balance text-foreground">
                            &ldquo;Switchgear distribution operations — orders, dispatches, transporters, returns, and Tally-synced customers. Built for the warehouse and the back office at GC Communication.&rdquo;
                        </blockquote>
                        <p className="mt-2 text-xs text-muted-foreground">— Nashik · Maharashtra</p>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]">
                        <div className="flex flex-col gap-2 text-center">
                            <span className="text-lg font-bold lg:hidden">OCC · GC Communication</span>
                            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                            <p className="text-sm text-muted-foreground">
                                Enter your credentials to access OCC
                            </p>
                        </div>

                        {status && (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4" noValidate>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="you@gccommunication.in"
                                    autoComplete="email"
                                    autoFocus
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(v: boolean) => setData('remember', !!v)}
                                />
                                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                                    Remember me
                                </Label>
                            </div>

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Signing in…
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
