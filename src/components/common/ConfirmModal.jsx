import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@iadefysolutions/design-system';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmar ação',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning' // 'warning', 'danger', 'success'
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertCircle size={48} style={{ color: 'var(--color-danger)' }} />;
            case 'success':
                return <CheckCircle size={48} style={{ color: 'var(--color-success)' }} />;
            default:
                return <AlertCircle size={48} style={{ color: 'var(--color-warning)' }} />;
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.iconContainer}>
                    {getIcon()}
                </div>

                <h3 className={styles.title}>{title}</h3>

                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.actions}>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className={styles.cancelBtn}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        className={styles.confirmBtn}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

