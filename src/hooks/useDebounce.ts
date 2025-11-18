import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * useDebounce - Debounces a value by delaying its update
 *
 * This hook delays updating the debounced value until after the specified delay
 * has elapsed since the last time the input value changed.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   if (debouncedQuery) {
 *     fetchSearchResults(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 *
 * return (
 *   <input
 *     value={searchQuery}
 *     onChange={(e) => setSearchQuery(e.target.value)}
 *   />
 * );
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    // or if the component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounces a callback function
 *
 * Returns a memoized callback that will only execute after the specified delay
 * has elapsed since the last time it was called.
 *
 * @param callback - The callback function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @param deps - Dependency array for the callback (like useCallback)
 * @returns Debounced callback function
 *
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback(
 *   (query: string) => {
 *     console.log('Searching for:', query);
 *     fetchResults(query);
 *   },
 *   500,
 *   []
 * );
 *
 * return (
 *   <input
 *     onChange={(e) => handleSearch(e.target.value)}
 *   />
 * );
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, ...deps] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return debouncedCallback;
}

/**
 * useThrottle - Throttles a value by limiting update frequency
 *
 * Unlike debounce, throttle ensures the value is updated at most once
 * per specified interval, even if the input changes rapidly.
 *
 * @param value - The value to throttle
 * @param interval - Minimum interval between updates in milliseconds (default: 300ms)
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * const [scrollY, setScrollY] = useState(0);
 * const throttledScrollY = useThrottle(scrollY, 100);
 *
 * useEffect(() => {
 *   const handleScroll = () => setScrollY(window.scrollY);
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, []);
 *
 * // throttledScrollY will update at most every 100ms
 * ```
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= interval) {
      // Enough time has passed, update immediately
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      // Not enough time has passed, schedule update
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, interval - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useDebounceState - Combines useState with debouncing
 *
 * Returns both immediate and debounced values, plus a setter function.
 * Useful when you need access to both the current and debounced values.
 *
 * @param initialValue - Initial value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Tuple of [immediateValue, debouncedValue, setValue]
 *
 * @example
 * ```tsx
 * const [query, debouncedQuery, setQuery] = useDebounceState('', 500);
 *
 * // query updates immediately
 * // debouncedQuery updates after 500ms of no changes
 *
 * return (
 *   <div>
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *     />
 *     <p>Current: {query}</p>
 *     <p>Searching for: {debouncedQuery}</p>
 *   </div>
 * );
 * ```
 */
export function useDebounceState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue];
}

/**
 * useDebouncedEffect - Runs an effect with debounced dependencies
 *
 * The effect will only run after the dependencies have stopped changing
 * for the specified delay.
 *
 * @param effect - Effect callback
 * @param deps - Dependencies array
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 *
 * useDebouncedEffect(
 *   () => {
 *     if (searchQuery) {
 *       fetchSearchResults(searchQuery);
 *     }
 *   },
 *   [searchQuery],
 *   500
 * );
 * ```
 */
export function useDebouncedEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList,
  delay: number = 300
): void {
  useEffect(() => {
    const handler = setTimeout(() => {
      effect();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
