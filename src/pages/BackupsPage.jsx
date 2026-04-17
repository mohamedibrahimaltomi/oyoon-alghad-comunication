import React, { useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';

export default function BackupsPage() {
  const { manualBackupExport, branding } = useApp();
  const [message, setMessage] = useState('');

  const onManualBackup = async () => {
    await manualBackupExport();
    setMessage('تم تنزيل نسخة احتياطية بصيغة JSON من المتصفح.');
  };

  return (
    <div className="page-stack">
      <Card title="النسخ الاحتياطية" subtitle="تصدير يدوي وإعداد الاحتفاظ بالنسخ">
        <div className="list-stack">
          <div className="list-row vertical">
            <div>
              <strong>مدة الاحتفاظ الحالية</strong>
              <p>{branding.retention_days} أيام — حذف النسخ الأقدم يتم من الوظيفة السحابية المرفقة داخل مجلد supabase/functions.</p>
            </div>
          </div>
          <div className="list-row vertical">
            <div>
              <strong>نسخة احتياطية يدوية</strong>
              <p>تجمع الوحدات والمستخدمين والمهام والمراسلات والإعدادات وتحفظها على جهازك.</p>
            </div>
            <button className="primary-btn" onClick={onManualBackup}>تنزيل نسخة احتياطية الآن</button>
          </div>
          {message ? <div className="alert">{message}</div> : null}
        </div>
      </Card>
    </div>
  );
}
