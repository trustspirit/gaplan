import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import styles from './ErrorBoundary.module.scss';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (_jsxs("div", { className: styles.container, children: [_jsx("p", { children: "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }), _jsx("button", { className: styles.reloadBtn, onClick: () => window.location.reload(), children: "\uC0C8\uB85C\uACE0\uCE68" })] }));
        }
        return this.props.children;
    }
}
