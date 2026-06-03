import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (_jsxs("div", { style: { padding: '24px', textAlign: 'center', color: '#808081', fontFamily: 'sans-serif' }, children: [_jsx("p", { children: "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }), _jsx("button", { onClick: () => window.location.reload(), style: { marginTop: '12px', padding: '8px 16px', cursor: 'pointer' }, children: "\uC0C8\uB85C\uACE0\uCE68" })] }));
        }
        return this.props.children;
    }
}
