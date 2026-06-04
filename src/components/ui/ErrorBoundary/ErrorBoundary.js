import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import i18n from '@/i18n';
import styles from './ErrorBoundary.module.scss';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (_jsxs("div", { className: styles.container, children: [_jsx("p", { children: i18n.t('common.error') }), _jsx("button", { className: styles.reloadBtn, onClick: () => window.location.reload(), children: i18n.t('common.refresh') })] }));
        }
        return this.props.children;
    }
}
