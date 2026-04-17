import React from 'react';

export default function TaskStepPill({ step }) {
  return (
    <div className={`step-pill status-${mapStatus(step.status)}`}>
      <div>
        <strong>{step.step}</strong>
        <span>{step.status}</span>
      </div>
      {step.note && <p>{step.note}</p>}
    </div>
  );
}

function mapStatus(status) {
  switch (status) {
    case 'مكتملة':
    case 'مكتمل':
      return 'done';
    case 'قيد التنفيذ':
      return 'working';
    case 'بانتظار':
    case 'جديدة':
      return 'pending';
    case 'بانتظار اعتماد':
    case 'قيد المراجعة':
      return 'review';
    default:
      return 'pending';
  }
}
