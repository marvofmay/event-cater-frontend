export default function CompactDialogs() {
    return <style>{`
        .MuiDialog-root .MuiDialogTitle-root {
            padding: 12px 20px;
            font-size: 1.1rem;
            line-height: 1.4;
        }
        .MuiDialog-root .MuiDialogContent-root { padding: 12px 20px; }
        .MuiDialog-root .MuiDialogActions-root { padding: 10px 20px; }
        .MuiDialog-root .MuiFormControl-root { margin-top: 8px; margin-bottom: 4px; }
        .MuiDialog-root .MuiInputBase-root, .MuiDialog-root .MuiInputLabel-root {
            font-size: 0.875rem;
        }
        .MuiDialog-root input.MuiOutlinedInput-input { padding: 10px 12px; }
        .MuiDialog-root .MuiSelect-select.MuiOutlinedInput-input { padding: 10px 32px 10px 12px; }
        .MuiDialog-root .MuiInputLabel-outlined:not(.MuiInputLabel-shrink) {
            transform: translate(14px, 11px) scale(1);
        }
        .MuiDialog-root .MuiAutocomplete-root .MuiOutlinedInput-root { padding: 4px; }
        .MuiDialog-root .MuiAutocomplete-root input.MuiOutlinedInput-input { padding: 6px 8px; }
        .MuiDialog-root .MuiFormHelperText-root { margin-top: 3px; line-height: 1.3; }
        .MuiDialog-root .MuiFormControlLabel-root .MuiTypography-root { font-size: 0.875rem; }
    `}</style>;
}
