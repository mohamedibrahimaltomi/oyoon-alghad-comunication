import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { flattenUnits, getAllowedParentUnits } from '../lib/helpers';

const emptyForm = {
  id: '', name_ar: '', type_id: '', parent_id: '', description_ar: '',
  receives_tasks: true, receives_messages: true, is_active: true, sort_order: 0
};

export default function StructurePage() {
  const { orgUnits, orgUnitTypes, orgTree, saveOrgUnit } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const allowedParents = useMemo(() => getAllowedParentUnits(orgUnits, orgUnitTypes, form.type_id), [orgUnits, orgUnitTypes, form.type_id]);
  const options = useMemo(() => flattenUnits(allowedParents.map((unit) => ({...unit, children: []}))), [allowedParents]);

  const onEdit = (unit) => {
    setForm({
      id: unit.id, name_ar: unit.name_ar, type_id: unit.type_id || '', parent_id: unit.parent_id || '',
      description_ar: unit.description_ar || '', receives_tasks: unit.receives_tasks,
      receives_messages: unit.receives_messages, is_active: unit.is_active, sort_order: unit.sort_order || 0
    });
    setMessage('يمكنك تعديل الجهة الإدارية الحالية ثم حفظها.');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      await saveOrgUnit(form);
      setMessage('تم حفظ الجهة الإدارية بنجاح.');
      setForm(emptyForm);
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ الجهة الإدارية.');
    } finally { setBusy(false); }
  };

  return (
    <div className="page-stack">
      <div className="grid-2 responsive-stack">
        <Card title="إعداد التسلسل الإداري" subtitle="الإدارة تضاف تحت الإدارة العليا، والقسم تحت الإدارة، والقسم الفرعي تحت القسم وهكذا">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>اسم الإدارة / القسم<input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required /></label>
            <label>المستوى الإداري
              <select value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value, parent_id: '' })} required>
                <option value="">اختر المستوى</option>
                {orgUnitTypes.map((type) => <option key={type.id} value={type.id}>{type.name_ar}</option>)}
              </select>
            </label>
            <label>الجهة الأعلى منه
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} disabled={!form.type_id || allowedParents.length === 0}>
                <option value="">{allowedParents.length ? 'اختر الجهة الأعلى' : 'لا يوجد اختيار أعلى لهذا المستوى'}</option>
                {allowedParents.map((unit) => <option key={unit.id} value={unit.id}>{unit.name_ar}</option>)}
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

        <Card title="الهيكل الحالي" subtitle="عرض الجهات الإدارية الحالية">
          <div className="list-stack">
            {orgUnits.map((unit) => (
              <div key={unit.id} className="list-row">
                <div>
                  <strong>{unit.name_ar}</strong>
                  <p>{orgUnitTypes.find((type) => type.id === unit.type_id)?.name_ar || 'مستوى غير محدد'} — الأعلى: {orgUnits.find((parent) => parent.id === unit.parent_id)?.name_ar || 'الإدارة العليا'}</p>
                </div>
                <button className="secondary-btn" onClick={() => onEdit(unit)}>تعديل</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
