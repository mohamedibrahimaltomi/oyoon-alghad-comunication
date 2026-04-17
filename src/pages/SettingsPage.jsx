import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { fileToDataUrl, defaultMessageTypes } from '../lib/helpers';

export default function SettingsPage() {
  const { branding, saveBranding, requestBrowserNotifications, messageTypes, saveMessageTypes, orgUnitTypes, saveOrgUnitType, taskTypes, saveTaskType } = useApp();
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

  const activeMessageTypes = useMemo(() => localMessageTypes.filter((item) => item.is_active !== false), [localMessageTypes]);

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

      await saveMessageTypes(localMessageTypes);
      await Promise.all(localOrgTypes.map((item) => saveOrgUnitType(item)));
      await Promise.all(localTaskTypes.map((item) => saveTaskType(item)));

      setMessage('تم حفظ أنواع المراسلات والمستويات الإدارية وأنواع المهام بنجاح.');
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
            <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
            <button type="button" className="secondary-btn" onClick={onEnableBrowserNotifications}>طلب إذن الإشعارات</button>
          </div>
        </form>
      </Card>

      <div className="grid-2 responsive-stack">
        <Card title="أنواع المراسلات" subtitle={`الأنواع النشطة الحالية: ${activeMessageTypes.length}`}>
          <div className="settings-grid">
            {localMessageTypes.map((item, index) => (
              <div key={`${item.value}-${index}`} className="setting-item">
                <label>الاسم الظاهر<input value={item.label} onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row))} /></label>
                <label>القيمة الداخلية<input value={item.value} onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, value: e.target.value } : row))} /></label>
                <label className="inline-check"><input type="checkbox" checked={item.is_active !== false} onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, is_active: e.target.checked } : row))} /> نشط</label>
              </div>
            ))}
          </div>
          <div className="button-row top-gap"><button className="secondary-btn" onClick={() => setLocalMessageTypes((prev) => [...prev, { value: `custom_${Date.now()}`, label: 'نوع جديد', is_active: true }])}>إضافة نوع مراسلة</button></div>
        </Card>

        <Card title="المستويات الإدارية" subtitle="إدارة أنواع الإدارات والأقسام والخطوط من الإعدادات">
          <div className="settings-grid">
            {localOrgTypes.map((item, index) => (
              <div key={item.id || index} className="setting-item">
                <label>الاسم<input value={item.name_ar || ''} onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))} /></label>
                <label>الرمز<input value={item.code || ''} onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, code: e.target.value } : row))} /></label>
                <label className="inline-check"><input type="checkbox" checked={item.is_active !== false} onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, is_active: e.target.checked } : row))} /> نشط</label>
              </div>
            ))}
          </div>
          <div className="button-row top-gap"><button className="secondary-btn" onClick={() => setLocalOrgTypes((prev) => [...prev, { code: `level_${Date.now()}`, name_ar: 'مستوى جديد', is_active: true }])}>إضافة مستوى إداري</button></div>
        </Card>
      </div>

      <Card title="أنواع المهام" subtitle="أضف الأنواع التي يحتاجها النظام، وسيتذكر آخر مسار استخدمته لكل نوع">
        <div className="settings-grid">
          {localTaskTypes.map((item, index) => (
            <div key={item.id || index} className="setting-item">
              <label>اسم النوع<input value={item.name_ar || ''} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))} /></label>
              <label>الرمز<input value={item.code || ''} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, code: e.target.value } : row))} /></label>
              <label>المدة الافتراضية بالساعات (اختياري)<input type="number" min="1" placeholder="بدون وقت افتراضي" value={item.default_sla_hours ?? ''} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, default_sla_hours: e.target.value === '' ? null : Number(e.target.value) } : row))} /></label>
            </div>
          ))}
        </div>
        <div className="button-row top-gap">
          <button className="secondary-btn" onClick={() => setLocalTaskTypes((prev) => [...prev, { code: `task_${Date.now()}`, name_ar: 'نوع مهمة جديد', default_sla_hours: null, is_active: true }])}>إضافة نوع مهمة</button>
          <button className="primary-btn" onClick={saveReferenceData} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ القيم المرجعية'}</button>
        </div>
      </Card>
    </div>
  );
}
