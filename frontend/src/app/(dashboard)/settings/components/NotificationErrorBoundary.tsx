'use client';

import React from 'react';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface Props {
    children: React.ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for Notification Settings Tab.
 * Catches render errors and shows a friendly retry UI 
 * instead of crashing the entire Settings page.
 */
export class NotificationErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[NotificationErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                        <IconAlertTriangle className="h-7 w-7 text-red-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Lỗi tải cài đặt thông báo
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
                        {this.props.fallbackMessage || 'Đã xảy ra lỗi khi tải trang này. Vui lòng thử lại.'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        <IconRefresh className="h-4 w-4" />
                        Thử lại
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-4 p-3 text-xs text-left bg-gray-100 dark:bg-gray-800 rounded-lg max-w-lg overflow-auto text-red-600 dark:text-red-400">
                            {this.state.error.message}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
