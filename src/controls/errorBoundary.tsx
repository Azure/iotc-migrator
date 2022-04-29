import * as React from 'react';

import Modal from './modal';

interface ErrorBoundaryProperties {
    children?: React.ReactNode;

    /** 
     * A custom render function to display the service error.
     * If not specified, defaults to `ErrorView`.
     */
    render?: (err: any) => React.ReactNode;

    /**
     * Callback to do something when the error is caught.
     */
    onDidCatch?: (err: any) => void;
}

interface State {
    error?: any;
    location?: string; // location href where the error occurs
}

/**
 * Used to catch errors in a child component tree, log them, and display a fallback UI.
 * https://reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProperties, State> {
    constructor(props: ErrorBoundaryProperties) {
        super(props);
        this.state = { error: undefined };
    }

    static getDerivedStateFromError(error: Error) {
        return { error, location: getLocation() };
    }

    componentDidCatch(error: Error) {
        this.props.onDidCatch?.(error);
    }

    render() {
        const { error, location } = this.state;

        if (error && getLocation() === location) {
            const { render } = this.props;
            return render ? render(error) : <Modal error={error} />;
        }

        return this.props.children;
    }
}

function getLocation() {
    return typeof window !== 'undefined' ? window.location.href : '';
}

