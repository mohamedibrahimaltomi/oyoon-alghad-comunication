import React from 'react';

export default function StatCard({ title, value }) {
  return (
    <div className="card stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
