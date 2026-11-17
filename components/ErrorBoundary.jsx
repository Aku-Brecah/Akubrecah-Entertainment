'use client';

// components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 border border-red-200 dark:border-red-900 rounded-xl bg-red-50 dark:bg-red-950/40">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            An unexpected display error occurred. Please try again or refresh the page.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;