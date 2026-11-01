import { useEffect, useState } from 'react';

export function useDebouncedText(value: string) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), 300);
        return () => clearTimeout(timer);
    }, [value]);
    return debounced;
}
