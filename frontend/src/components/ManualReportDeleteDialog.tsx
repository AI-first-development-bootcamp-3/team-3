import danger from '../assets/manual-report/danger.svg'

interface Props {
  title?: string
  body?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

const PROJECT_COPY = {
  title: 'למחוק את פרויקט זה מהדיווחים?',
  body: 'הפעולה תסיר את כל השיוכים של הפרויקט הזה מדוחות השעות. האם אתה בטוח שתרצה להמשיך?',
  confirmLabel: 'מחק את הפרויקט',
}

/** Figma alert 1:6792 — removing a project or a saved day asks first. */
function ManualReportDeleteDialog({
  title = PROJECT_COPY.title,
  body = PROJECT_COPY.body,
  confirmLabel = PROJECT_COPY.confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="mr-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="mr-dialog-title">
      <div className="mr-dialog">
        <div className="mr-dialog__head">
          <span className="mr-dialog__icon">
            <img src={danger} alt="" width={24} height={24} />
          </span>
          <div>
            <h2 className="mr-dialog__title" id="mr-dialog-title">
              {title}
            </h2>
            <p className="mr-dialog__body">{body}</p>
          </div>
        </div>
        <div className="mr-dialog__actions">
          <button type="button" className="mr-dialog__cancel" onClick={onCancel}>
            מעדיף שלא למחוק
          </button>
          <button type="button" className="mr-dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManualReportDeleteDialog
