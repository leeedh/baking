'use client';

import Button from './Button';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 파괴적 동작이면 확인 버튼을 danger 톤으로 바꾼다. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 네이티브 confirm() 대체 — 브랜드 톤과 포커스 관리를 갖춘 확인 다이얼로그. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      className="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="sr-only">{description ?? title}</p>
    </Modal>
  );
}
