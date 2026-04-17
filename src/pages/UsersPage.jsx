import React, { useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { ROLE_OPTIONS, roleLabel } from '../lib/helpers';

const emptyForm = { id: '', full_name_ar: '', username: '', email: '', phone: '', password: '', role_key: 'employee', org_unit_id: '', job_title_ar: '', is_active: true };

export default function UsersPage() {
  const { users, orgUnits, saveUserProfile } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const onEdit = (user) => {
    setForm({
      id: user.id,
      full_name_ar: user.full_name_ar,
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role_key: user.role_key,
      org_unit_id: user.org_unit_id || '',
      job_title_ar: user.job_title_ar || '',
      is_active: user.is_active
    });
    setMessage('يمكنك تعديل بيانات المستخدم الحالي ثم حفظها.');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await saveUserProfile(form);
      setMessage(form.id ? 'تم حفظ المستخدم بنجاح.' : 'تم إنشاء المستخدم من داخل التطبيق بنجاح.');
      if (!form.id) setForm(emptyForm);
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ المستخدم.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="grid-2 responsive-stack">
        <Card title="إدارة المستخدمين" subtitle="إضافة مستخدم جديد أو تعديل المستخدمين الحاليين من داخل النظام">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>الاسم الكامل<input value={form.full_name_ar} onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })} required /></label>
            <label>اسم المستخدم<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
            <label>البريد الإلكتروني<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!form.id} /></label>
            <label>رقم الهاتف<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            {!form.id ? <label>كلمة المرور<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!form.id} /></label> : null}
            <label>الدور
              <select value={form.role_key} onChange={(e) => setForm({ ...form, role_key: e.target.value })}>
                {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>الجهة الإدارية التابعة
              <select value={form.org_unit_id} onChange={(e) => setForm({ ...form, org_unit_id: e.target.value })}>
                <option value="">اختر الإدارة أو القسم</option>
                {orgUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name_ar}</option>)}
              </select>
            </label>
            <label>المسمى الوظيفي<input value={form.job_title_ar} onChange={(e) => setForm({ ...form, job_title_ar: e.target.value })} /></label>
            <label className="inline-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> المستخدم نشط</label>
            {message ? <div className="alert">{message}</div> : null}
            <div className="button-row">
              <button className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : form.id ? 'حفظ المستخدم' : 'إنشاء المستخدم'}</button>
              <button type="button" className="secondary-btn" onClick={() => { setForm(emptyForm); setMessage(''); }}>تفريغ النموذج</button>
            </div>
          </form>
        </Card>

        <Card title="المستخدمون الحاليون" subtitle={`إجمالي المستخدمين: ${users.length}`}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>الجهة</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name_ar}</td>
                    <td>{roleLabel(user.role_key)}</td>
                    <td>{user.org_unit?.name_ar || '—'}</td>
                    <td>{user.is_active ? 'نشط' : 'موقوف'}</td>
                    <td><button className="secondary-btn" onClick={() => onEdit(user)}>تعديل</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
