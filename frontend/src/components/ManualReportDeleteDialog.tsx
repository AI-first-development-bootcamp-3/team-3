import danger from '../assets/manual-report/danger.svg'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

/** Figma alert 1:6792 — removing a project is destructive, so it asks first. */
function ManualReportDeleteDialog({ onCancel, onConfirm }: Props) {
  return (
    <div className="mr-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="mr-dialog-title">
      <div className="mr-dialog">
        <div className="mr-dialog__head">
          <span className="mr-dialog__icon">
            <img src={danger} alt="" width={24} height={24} />
          </span>
          <div>
            <h2 className="mr-dialog__title" id="mr-dialog-title">
              למחוק את פרויקט זה מהדיווחים?
            </h2>
            <p className="mr-dialog__body">
              הפעולה תסיר את כל השיוכים של הפרויקט הזה מדוחות השעות. האם אתה בטוח שתרצה להמשיך?
            </p>
          </div>
        </div>
        <div className="mr-dialog__actions">
          <button type="button" className="mr-dialog__cancel" onClick={onCancel}>
            מעדיף שלא למחוק
          </button>
          <button type="button" className="mr-dialog__confirm" onClick={onConfirm}>
            מחק את הפרויקט
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManualReportDeleteDialog
