import { fmtDate } from '../utils/dateUtils.js';

export default function CoadminAlert({ type, mencDates, menbDates, gapDays, mencDate, menbDate, onSetCoadminDates }) {
  if (!type) return null;

  let className = 'coadmin-alert';
  let content = null;

  if (type === 'prompt') {
    className += ' close-dates';
    content = (
      <>
        <strong>💡 Co-administration tip:</strong> Both MenACWY and MenB doses are indicated.
        These vaccines can be given together on the same visit — plan dates for both to see if they can be consolidated.
      </>
    );
  } else if (type === 'same-day') {
    className += ' same-day';
    content = (
      <>
        <strong>✓ Same-day co-administration planned.</strong> MenACWY and MenB are scheduled on
        the same visit — this is appropriate and reduces patient visits. Both vaccines can be given
        simultaneously at separate injection sites.
      </>
    );
  } else if (type === 'close-dates') {
    className += ' close-dates';
    const mDate = fmtDate(new Date(mencDate + 'T12:00:00'));
    const bDate = fmtDate(new Date(menbDate + 'T12:00:00'));
    const earlierDate = mencDate <= menbDate ? mencDate : menbDate;
    const earlierFmt = fmtDate(new Date(earlierDate + 'T12:00:00'));
    content = (
      <>
        <strong>💡 Co-administration opportunity:</strong> MenACWY ({mDate}) and MenB ({bDate})
        are planned {Math.round(gapDays)} day{Math.round(gapDays) === 1 ? '' : 's'} apart.
        These can be given together at the same visit — no minimum interval between them.
        <br />
        <span
          className="coadmin-action"
          onClick={() => onSetCoadminDates && onSetCoadminDates(earlierDate)}
        >
          → Move Dose 1 of both to {earlierFmt} — subsequent doses will recalculate
        </span>
      </>
    );
  } else if (type === 'far-apart') {
    className += ' far-apart';
    content = (
      <>
        <strong>ℹ️ Scheduling note:</strong> MenACWY and MenB are planned {Math.round(gapDays)} days apart.
        There is no minimum interval between them — if convenient, they can be given on the same
        visit to reduce patient travel. Consider whether any visits can be consolidated.
      </>
    );
  }

  return (
    <div className={className} style={{ display: 'block' }}>
      {content}
    </div>
  );
}
