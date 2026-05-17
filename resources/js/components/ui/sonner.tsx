import { Toaster as Sonner } from 'sonner';
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from '@/lib/icons';

/**
 * App-wide toaster. `richColors` gives the standard vivid semantic
 * palette — success = green, error = red, warning = yellow/amber,
 * info = blue — which is what we want everywhere. Use:
 *   toast.success(...)  → green
 *   toast.error(...)    → red
 *   toast.warning(...)  → yellow
 *   toast.info(...)     → blue
 * Plain toast() stays neutral.
 */
const Toaster = ({ ...props }: React.ComponentProps<typeof Sonner>) => {
    return (
        <Sonner
            theme="light"
            richColors
            closeButton
            position="top-right"
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            {...props}
        />
    );
};

export { Toaster };
