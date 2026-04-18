import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { fileToDataUrl, defaultMessageTypes } from '../lib/helpers';

export default function SettingsPage() {
  const {
    branding,
    saveBranding,
    requestBrowserNotifications,
    messageTypes,
    saveMessageTypes,
    orgUnitTypes,
    saveOrgUnitType,
    deleteOrgUnitType,
    taskTypes,
    saveTaskType,
    deleteTaskType
  } = useApp();

  const [form, setForm] = useState(branding);
  const [localMessageTypes, setLocalMessageTypes] = useState(messageTypes || defaultMessageTypes);
  const [localOrgTypes, setLocalOrgTypes] = useState(orgUnitTypes || []);
  const [localTaskTypes, setLocalTaskTypes] = useState(taskTypes || []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(branding), [branding]);
  useEffect(() => setLocalMessageTypes(messageTypes || defaultMessageTypes), [messageTypes]);
  useEffect(() => setLocalOrgTypes(orgUnitTypes || []), [orgUnitTypes]);
  useEffect(() => setLocalTaskTypes(taskTypes || []), [taskTypes]);

  const activeMessageTypes = useMemo(
    () => localMessageTypes.filter((item) => item.is_active !== false),
    [localMessageTypes]
  );

  const summaryCounts = useMemo(() => ({
    messages: localMessageTypes.filter((item) => item.label?.trim()).length,
    levels: localOrgTypes.filter((item) => item.name_ar?.trim()).length,
    tasks: localTaskTypes.filter((item) => item.name_ar?.trim()).length
  }), [localMessageTypes, localOrgTypes, localTaskTypes]);

  const onLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, logo_data_url: dataUrl }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await saveBranding(form);
      setMessage('تم حفظ إعدادات الهوية والإشعارات والنسخ الاحتياطية بنجاح.');
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ الإعدادات.');
    } finally {
      setBusy(false);
    }
  };

  const onEnableBrowserNotifications = async () => {
    const status = await requestBrowserNotifications();
    if (status === 'granted') {
      setMessage('تم السماح بإشعارات المتصفح بنجاح.');
    } else if (status === 'unsupported') {
      setMessage('هذا المتصفح لا يدعم إشعارات الويب أو يحتاج نسخة HTTPS / إضافة للشاشة الرئيسية على الهاتف.');
    } else {
      setMessage('لم يتم منح الإذن لإشعارات المتصفح. على iPhone أضف النظام إلى الشاشة الرئيسية أولًا.');
    }
  };

  const saveReferenceData = async () => {
    try {
      setBusy(true);
      setMessage('');

      await saveMessageTypes(
        localMessageTypes
          .filter((item) => item.label?.trim())
          .map((item) => ({
            value: item.value || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            label: item.label.trim(),
            is_active: item.is_active !== false
          }))
      );

      const currentOrgIds = new Set((orgUnitTypes || []).map((item) => item.id).filter(Boolean));
      const nextOrgIds = new Set(localOrgTypes.map((item) => item.id).filter(Boolean));
      const deletedOrgIds = [...currentOrgIds].filter((id) => !nextOrgIds.has(id));
      for (const id of deletedOrgIds) {
        await deleteOrgUnitType(id);
      }
      for (const item of localOrgTypes.filter((row) => row.name_ar?.trim())) {
        await saveOrgUnitType({
          id: item.id,
          code: item.code || `level_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name_ar: item.name_ar.trim(),
          is_active: true
        });
      }

      const currentTaskIds = new Set((taskTypes || []).map((item) => item.id).filter(Boolean));
      const nextTaskIds = new Set(localTaskTypes.map((item) => item.id).filter(Boolean));
      const deletedTaskIds = [...currentTaskIds].filter((id) => !nextTaskIds.has(id));
      for (const id of deletedTaskIds) {
        await deleteTaskType(id);
      }
      for (const item of localTaskTypes.filter((row) => row.name_ar?.trim())) {
        await saveTaskType({
          id: item.id,
          code: item.code || `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name_ar: item.name_ar.trim(),
          default_sla_hours: item.default_sla_hours ?? null,
          is_active: true
        });
      }

      setMessage('تم حفظ الإعدادات المرجعية بنجاح.');
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ البيانات المرجعية.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <Card title="إعدادات الشركة" subtitle="تغيير الشعار والاسم والإشعارات والنسخ الاحتياطية من داخل النظام">
        <form className="form-grid cols-4 responsive-forms" onSubmit={onSubmit}>
          <label>اسم الشركة<input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
          <label>الوصف المختصر<input value={form.company_tagline} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} /></label>
          <label>مدة الاحتفاظ بالنسخ (أيام)<input type="number" min="1" value={form.retention_days} onChange={(e) => setForm({ ...form, retention_days: Number(e.target.value) })} /></label>
          <label>الحد الأقصى لحجم النسخ (MB)<input type="number" min="50" value={form.max_backup_mb} onChange={(e) => setForm({ ...form, max_backup_mb: Number(e.target.value) })} /></label>
          <label>أقصى عدد للنسخ<input type="number" min="1" value={form.max_backup_files} onChange={(e) => setForm({ ...form, max_backup_files: Number(e.target.value) })} /></label>
          <label className="inline-check"><input type="checkbox" checked={form.enable_browser_notifications} onChange={(e) => setForm({ ...form, enable_browser_notifications: e.target.checked })} /> تفعيل إشعارات المتصفح</label>
          <label className="span-2">شعار الشركة<input type="file" accept="image/*" onChange={onLogoChange} /></label>
          {form.logo_data_url ? <div className="logo-preview-wrap span-4"><img src={form.logo_data_url} alt="logo" className="logo-preview" /></div> : null}
          {message ? <div className="alert span-4">{message}</div> : null}
          <div className="button-row span-4">
            <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ إعدادات الشركة'}</button>
            <button type="button" className="secondary-btn" onClick={onEnableBrowserNotifications}>طلب إذن الإشعارات</button>
          </div>
        </form>
      </Card>


      <div className="settings-summary-grid">
        <div className="settings-summary-card card"><strong>{summaryCounts.messages}</strong><span>نوع مراسلة جاهز</span></div>
        <div className="settings-summary-card card"><strong>{summaryCounts.levels}</strong><span>مستوى إداري</span></div>
        <div className="settings-summary-card card"><strong>{summaryCounts.tasks}</strong><span>نوع مهمة</span></div>
      </div>

      <div className="settings-section-title">إدارة القوائم المرجعية</div>
      <div className="settings-section-subtitle">اختر الاسم المناسب فقط، ويمكنك التعديل مباشرة ثم الحفظ من نفس الصفحة.</div>

      <div className="grid-2 responsive-stack">
        <Card title="أنواع المراسلات" subtitle="للإضافة أو التعديل أو الإزالة المؤقتة من نفس الشاشة">
          <div className="simple-settings-list">
            {localMessageTypes.map((item, index) => (
              <div key={`${item.value || 'new'}-${index}`} className="simple-settings-row">
                <input
                  className="simple-input"
                  value={item.label || ''}
                  placeholder="اسم نوع المراسلة"
                  onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row))}
                />
                <button
                  type="button"
                  className="secondary-btn danger-btn"
                  onClick={() => setLocalMessageTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                >
                  حذف من القائمة
                </button>
              </div>
            ))}
          </div>
          <div className="button-row top-gap">
            <button className="secondary-btn" onClick={() => setLocalMessageTypes((prev) => [...prev, { value: `custom_${Date.now()}`, label: 'نوع مراسلة جديد', is_active: true }])}>إضافة نوع مراسلة</button>
          </div>
        </Card>

        <Card title="المستويات الإدارية" subtitle="رتّب المسميات الإدارية التي يعتمد عليها النظام في الهيكل والصلاحيات">
          <div className="simple-settings-list">
            {localOrgTypes.map((item, index) => (
              <div key={item.id || index} className="simple-settings-row">
                <input
                  className="simple-input"
                  value={item.name_ar || ''}
                  placeholder="اسم المستوى الإداري"
                  onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))}
                />
                <button
                  type="button"
                  className="secondary-btn danger-btn"
                  onClick={() => setLocalOrgTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          <div className="button-row top-gap">
            <button className="secondary-btn" onClick={() => setLocalOrgTypes((prev) => [...prev, { code: `level_${Date.now()}`, name_ar: 'مستوى جديد', is_active: true }])}>إضافة مستوى إداري</button>
          </div>
        </Card>
      </div>

      <Card title="أنواع المهام" subtitle="أنواع المهام الأساسية مع وقت افتراضي اختياري واقتراح مراحل لاحقًا">
        <div className="simple-settings-list">
          {localTaskTypes.map((item, index) => (
            <div key={item.id || index} className="simple-task-row">
              <input
                className="simple-input"
                value={item.name_ar || ''}
                placeholder="اسم نوع المهمة"
                onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))}
              />
              <input
                className="simple-input small"
                type="number"
                min="1"
                placeholder="المدة بالساعات (اختياري)"
                value={item.default_sla_hours ?? ''}
                onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, default_sla_hours: e.target.value === '' ? null : Number(e.target.value) } : row))}
              />
              <button
                type="button"
                className="secondary-btn danger-btn"
                onClick={() => setLocalTaskTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
        <div className="button-row top-gap">
          <button className="secondary-btn" onClick={() => setLocalTaskTypes((prev) => [...prev, { code: `task_${Date.now()}`, name_ar: 'نوع مهمة جديد', default_sla_hours: null, is_active: true }])}>إضافة نوع مهمة</button>
          <button className="primary-btn" onClick={saveReferenceData} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الأنواع والمستويات'}</button>
        </div>
      </Card>
    </div>
  );
}
