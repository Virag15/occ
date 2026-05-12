import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
    // The inline script in app.blade.php already applied the right class before
    // hydration — we just mirror that into React state and provide a setter.
    const [theme, setThemeState] = useState<Theme>(() => readTheme());

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        try { window.localStorage.setItem('theme', theme); } catch { /* private mode */ }
    }, [theme]);

    return {
        theme,
        setTheme: setThemeState,
        toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    };
}
