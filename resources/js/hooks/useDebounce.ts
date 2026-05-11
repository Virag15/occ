import { useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay = 300) {
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    return useCallback((...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay]);
}
