import * as React from 'react';

export type Falsy = null | undefined | false | 0 | '';

interface State<T> {
    loading?: boolean;
    error?: any;
    data?: T | Falsy;
    deps: React.DependencyList;
}

/**
 * Hook to call an asynchronous function from a component, with built-in cancellation.
 * @param fn {signal => Promise<T>} Optional. If provided, the state will be set
 * to `loading: true` and the async function will be called after render. Otherwise,
 * the state will be set to `loading: false`.
 * @param deps {any[]} A list of dependencies. If changed, will revert back to initial
 * state and re-execute `fn` if provided.
 * @returns An array containing the loading state, error, and the promise response.
 */
export function useAsync<T>(
    fn: Falsy | ((signal?: AbortSignal) => Promise<T>),
    deps: React.DependencyList
): [boolean | undefined, any, T | Falsy] {
    const initialState: State<T> = { loading: !!fn, deps };
    const [state, setState] = React.useState(initialState);
    React.useEffect(() => {
        if (fn) {
            return handlePromise(fn, deps, setState);
        }

        // don't use exhaustive dependencies for this effect: we should
        // only trigger the promise when the user-supplied `deps` change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    const { loading, error, data } = areDepsEqual(deps, state.deps) ? state : initialState;
    return [loading, error, data];
}

/**
 * Hook to handle state for async actions that should be performed when a callback
 * is executed (e.g., on button click, make an API call).
 * @param fn A callback function that accepts an AbortSignal and one or more arguments, and returns a Promise.
 * @param deps {any[]} A list of dependencies. If changed, will revert back to initial state.
 * @returns An array containing the callback, loading state, error, and the promise response.
 * The loading state will be initially set to `false`; it will be changed to
 * `true` when the callback function is executed.
 */
export function useAsyncCallback<T, A extends any[]>(
    fn: ((signal?: AbortSignal, ...args: A) => Promise<T>),
    deps: React.DependencyList
): [(...args: A) => Promise<T>, boolean | undefined, any, T | Falsy] {
    const initialState: State<T> = { deps };
    const [state, setState] = React.useState(initialState);
    const abortRef = React.useRef<AbortController>();
    const callback = React.useCallback(async (...args: A) => {
        setState({ loading: true, deps });

        abortRef.current?.abort(); // cancel any pending requests
        const controller = abortRef.current = new AbortController();
        const { signal } = controller;
        try {
            const data = await fn(signal, ...args);
            if (!signal.aborted) {
                setState({ data, deps });
            }

            return data;
        } catch (error) {
            if (!signal.aborted) {
                setState({ error, deps });
            }

            throw error;
        } finally {
            // Fire abort signal to exit out of other promises using the signal
            controller.abort();
        }

        // don't use exhaustive dependencies for this effect: we should
        // only trigger the promise when the user-supplied `deps` change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    // abort pending requests on component unmount or dependency changes:
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => () => abortRef.current?.abort(), deps);

    const { loading, error, data } = areDepsEqual(deps, state.deps) ? state : initialState;
    return [callback, loading, error, data];
}

function areDepsEqual(a: React.DependencyList, b: React.DependencyList) {
    return a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}

function handlePromise<T, A extends any[]>(
    fn: (signal?: AbortSignal, ...args: A) => Promise<T>,
    deps: React.DependencyList,
    setState: (state: State<T>) => void,
    ...args: A
) {
    const controller = new AbortController();
    const signal = controller.signal;
    fn(signal, ...args).then(data => {
        if (!signal.aborted) {
            setState({ data, deps });
        }
    }, error => {
        if (!signal.aborted) {
            setState({ error, deps });

            // Fire abort signal to exit out of other promises using the signal
            controller.abort();
        }
    });

    // trigger the abort signal on cleanup:
    return () => controller.abort();
}
