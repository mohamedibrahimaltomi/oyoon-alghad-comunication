import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { flattenUnits } from '../lib/helpers';

const emptyForm = {
  id: '',
  name_ar: '',
  type_id: '',
  parent_id: '',
  description_ar: '',
  receives_tasks: true,
  receives_messages: true,
  is_active: true,
  sort_order: 0
};

export default function StructurePage() {
  const { orgUnits, orgUnitTypes, orgTree, saveOrgUnit } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => flattenUnits(orgTree), [orgTree]);

  const onEdit = (unit) => {
    setForm({
      id: unit.id,
      name_ar: unit.name_ar,
      type_id: unit.type_id || '',
      parent_id: unit.parent_id || '',
      description_ar: unit.description_ar || '',
      receives_tasks: unit.receives_tasks,
      receives_messages: unit.receives_messages,
      is_active: unit.is_active,
      sort_order: unit.sort_order || 0
    });
    setMessage('يمكنك تعديل الجهة الإدارية الحالية ثم حفظها.');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await saveOrgUnit(form);
      setMessage('تم حفظ الجهة الإدارية بنجاح.');
      setForm(emptyForm);
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ الجهة الإدارية.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="grid-2 responsive-stack">
        <Card title="إعداد التسلسل الإداري" subtitle="حدد الإدارة أو القسم وحدد الجهة الأعلى منه ليفهم النظام التبعية داخليًا">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>اسم الإدارة / القسم<input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required /></label>
            <label>المستوى الإداري
              <select value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} required>
                <option value="">اختر المستوى</option>
                {orgUnitTypes.map((type) => <option key={type.id} value={type.id}>{type.name_ar}</option>)}
              </select>
            </label>
            <label>يتبع إلى
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                <option value="">مستوى أعلى / مستقل</option>
                {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>الترتيب<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></label>
            <label>وصف مختصر<textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows="3" /></label>
            <div className="check-row">
              <label><input type="checkbox" checked={form.receives_tasks} onChange={(e) => setForm({ ...form, receives_tasks: e.target.checked })} /> يستقبل مهام</label>
              <label><input type="checkbox" checked={form.receives_messages} onChange={(e) => setForm({ ...form, receives_messages: e.target.checked })} /> يستقبل مراسلات</label>
              <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> نشط</label>
            </div>
            {message ? <div className="alert">{message}</div> : null}
            <div className="button-row">
              <button className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الجهة الإدارية'}</button>
              <button type="button" className="secondary-btn" onClick={() => { setForm(emptyForm); setMessage(''); }}>تفريغ النموذج</button>
            </div>
          </form>
        </Card>

        <Card title="الترتيب الإداري الحالي" subtitle={`عدد الجهات الحالية: ${orgUnits.length}`}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الجهة</th>
                  <th>المستوى</th>
                  <th>يتبع إلى</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {orgUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.name_ar}</td>
                    <td>{orgUnitTypes.find((type) => type.id === unit.type_id)?.name_ar || '—'}</td>
                    <td>{orgUnits.find((parent) => parent.id === unit.parent_id)?.name_ar || '—'}</td>
                    <td>{unit.is_active ? 'نشط' : 'موقوف'}</td>
                    <td><button className="secondary-btn" onClick={() => onEdit(unit)}>تعديل</button></td>
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
