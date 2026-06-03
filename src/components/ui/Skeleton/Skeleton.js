import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Skeleton.module.scss';
export function Skeleton({ width, height, className }) {
    return _jsx("div", { className: clsx(styles.skeleton, className), style: { width, height } });
}
