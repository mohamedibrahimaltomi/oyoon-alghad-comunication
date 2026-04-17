import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { fileToDataUrl, defaultMessageTypes, sortAdminTypes } from '../lib/helpers';

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
  useEffect(() => setLocalOrgTypes(sortAdminTypes(orgUnitTypes || [])), [orgUnitTypes]);
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
      setMessage('تم حفظ إعدادات الشركة بنجاح.');
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ الإعدادات.');
    } finally {
      setBusy(false);
    }
  };

  const onEnableBrowserNotifications = async () => {
    const status = await requestBrowserNotifications();
    if (status === 'granted') {
      setMessage('تم السماح بإشعارات المتصفح.');
    } else if (status === 'unsupported') {
      setMessage('هذا المتصفح لا يدعم إشعارات الويب أو يحتاج نسخة HTTPS / إضافة للشاشة الرئيسية على الهاتف.');
    } else {
      setMessage('لم يتم منح الإذن. على iPhone أضف النظام إلى الشاشة الرئيسية أولًا.');
    }
  };

  const saveReferenceData = async () => {
    try {
      setBusy(true);
      const cleanedMessageTypes = localMessageTypes.map((item, index) => ({
        value: item.value || `type_${Date.now()}_${index}`,
        label: item.label?.trim() || 'نوع جديد',
        is_active: item.is_active !== false
      }));
      await saveMessageTypes(cleanedMessageTypes);
      for (const item of localOrgTypes) {
        // eslint-disable-next-line no-await-in-loop
        await saveOrgUnitType({
          ...item,
          code: item.code || `level_${Date.now()}`,
          name_ar: item.name_ar?.trim() || 'مستوى جديد'
        });
      }
      for (const item of localTaskTypes) {
        // eslint-disable-next-line no-await-in-loop
        await saveTaskType({
          ...item,
          code: item.code || `task_${Date.now()}`,
          name_ar: item.name_ar?.trim() || 'نوع مهمة جديد',
          default_sla_hours: item.has_duration ? Number(item.default_sla_hours || 1) : null
        });
      }
      setMessage('تم حفظ أنواع المراسلات والمستويات الإدارية وأنواع المهام بنجاح.');
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ البيانات المرجعية.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <Card title="إعدادات الشركة" subtitle="الشعار، الإشعارات، والنسخ الاحتياطية">
        <form className="form-grid cols-4 responsive-forms" onSubmit={onSubmit}>
          <label>اسم الشركة<input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
          <label>وصف مختصر<input value={form.company_tagline} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} /></label>
          <label>الاحتفاظ بالنسخ (أيام)<input type="number" min="1" value={form.retention_days} onChange={(e) => setForm({ ...form, retention_days: Number(e.target.value) })} /></label>
          <label>الحد الأقصى للحجم (MB)<input type="number" min="50" value={form.max_backup_mb} onChange={(e) => setForm({ ...form, max_backup_mb: Number(e.target.value) })} /></label>
          <label>أقصى عدد نسخ<input type="number" min="1" value={form.max_backup_files} onChange={(e) => setForm({ ...form, max_backup_files: Number(e.target.value) })} /></label>
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
        <Card title="أنواع المراسلات" subtitle={`الأنواع النشطة: ${activeMessageTypes.length}`}>
          <div className="alert warning">اجعل الإدخال بسيطًا: اكتب الاسم فقط، ثم فعّل أو عطّل النوع عند الحاجة. لا تحتاج إلى أكواد أو حقول تقنية.</div>
        <div className="settings-grid">
            {localMessageTypes.map((item, index) => (
              <div key={`${item.value}-${index}`} className="setting-item simple-setting-item">
                <label>اسم النوع
                  <input value={item.label} onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row))} />
                </label>
                <label className="inline-check"><input type="checkbox" checked={item.is_active !== false} onChange={(e) => setLocalMessageTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, is_active: e.target.checked } : row))} /> مفعل</label>
                <button type="button" className="secondary-btn small" onClick={() => setLocalMessageTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}>حذف</button>
              </div>
            ))}
          </div>
          <div className="button-row top-gap"><button className="secondary-btn" onClick={() => setLocalMessageTypes((prev) => [...prev, { value: '', label: 'نوع جديد', is_active: true }])}>إضافة نوع مراسلة</button></div>
        </Card>

        <Card title="المستويات الإدارية" subtitle="أضف المستويات التي سيستخدمها النظام بهذا الترتيب: الإدارة العليا ثم إدارة ثم قسم ثم قسم فرعي ثم قطاع ثم خط">
          <div className="settings-grid">
            {localOrgTypes.map((item, index) => (
              <div key={item.id || index} className="setting-item simple-setting-item">
                <label>اسم المستوى
                  <input value={item.name_ar || ''} onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))} />
                </label>
                <label className="inline-check"><input type="checkbox" checked={item.is_active !== false} onChange={(e) => setLocalOrgTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, is_active: e.target.checked } : row))} /> مفعل</label>
                <button type="button" className="secondary-btn small" onClick={() => setLocalOrgTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}>حذف</button>
              </div>
            ))}
          </div>
          <div className="button-row top-gap"><button className="secondary-btn" onClick={() => setLocalOrgTypes((prev) => [...prev, { code: '', name_ar: 'مستوى جديد', is_active: true }])}>إضافة مستوى</button></div>
        </Card>
      </div>

      <Card title="أنواع المهام" subtitle="يمكنك كتابة اسم النوع فقط، ثم اختيار ما إذا كان له وقت افتراضي أم لا">
        <div className="settings-grid">
          {localTaskTypes.map((item, index) => {
            const hasDuration = item.has_duration ?? (item.default_sla_hours !== null && item.default_sla_hours !== undefined);
            return (
              <div key={item.id || index} className="setting-item simple-setting-item">
                <label>اسم نوع المهمة
                  <input value={item.name_ar || ''} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name_ar: e.target.value } : row))} />
                </label>
                <label className="inline-check"><input type="checkbox" checked={hasDuration} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, has_duration: e.target.checked, default_sla_hours: e.target.checked ? (row.default_sla_hours || 1) : null } : row))} /> لهذا النوع وقت افتراضي</label>
                {hasDuration ? (
                  <label>الوقت الافتراضي بالساعات
                    <input type="number" min="1" value={item.default_sla_hours || 1} onChange={(e) => setLocalTaskTypes((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, default_sla_hours: Number(e.target.value), has_duration: true } : row))} />
                  </label>
                ) : <p className="muted">بدون وقت افتراضي</p>}
                <button type="button" className="secondary-btn small" onClick={() => setLocalTaskTypes((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}>حذف</button>
              </div>
            );
          })}
        </div>
        <div className="button-row top-gap">
          <button className="secondary-btn" onClick={() => setLocalTaskTypes((prev) => [...prev, { code: '', name_ar: 'نوع مهمة جديد', default_sla_hours: null, has_duration: false, is_active: true }])}>إضافة نوع مهمة</button>
          <button className="primary-btn" onClick={saveReferenceData} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الأنواع والإعدادات المرجعية'}</button>
        </div>
      </Card>
    </div>
  );
}
