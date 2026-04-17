import React from 'react';

export default function Card({ title, subtitle, actions, children }) {
  return (
    <section className="card section-card">
      {(title || actions) && (
        <div className="section-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
