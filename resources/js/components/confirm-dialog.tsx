import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * App-wide promise-based confirm, rendered with the shadcn AlertDialog so
 * we never use the native window.confirm(). Usage:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, description, destructive: true }))) return;
 */
export type ConfirmOptions = {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [opts, setOpts] = useState<ConfirmOptions>({});
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((options = {}) => {
        setOpts(options);
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const settle = (value: boolean) => {
        setOpen(false);
        resolver.current?.(value);
        resolver.current = null;
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AlertDialog open={open} onOpenChange={(next) => { if (!next) settle(false); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{opts.title ?? 'Are you sure?'}</AlertDialogTitle>
                        {opts.description && (
                            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => settle(false)}>
                            {opts.cancelText ?? 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => settle(true)}
                            className={cn(
                                opts.destructive
                                    && 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
                            )}
                        >
                            {opts.confirmText ?? 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}
