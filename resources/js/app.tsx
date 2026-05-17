import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { startAutoFlush } from '@/lib/offline/queue';

const appName = import.meta.env.VITE_APP_NAME || 'OCC';

// Replay any mutations queued while offline as soon as we have the
// network back / the tab regains focus (M7-C).
startAutoFlush();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <TooltipProvider>
                <ConfirmProvider>
                    <App {...props} />
                </ConfirmProvider>
            </TooltipProvider>,
        );
    },
    progress: {
        color: '#1447E6',
    },
});
