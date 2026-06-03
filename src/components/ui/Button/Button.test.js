import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
describe('Button', () => {
    it('renders children', () => {
        render(_jsx(Button, { children: "\uD655\uC778" }));
        expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
    });
    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        render(_jsx(Button, { onClick: onClick, children: "\uD655\uC778" }));
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
    it('is disabled when loading', () => {
        render(_jsx(Button, { loading: true, children: "\uD655\uC778" }));
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
