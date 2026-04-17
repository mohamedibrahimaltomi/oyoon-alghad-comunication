import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { ADMIN_LEVEL_ORDER, allowedParentTypeNames, sortAdminTypes, parentFieldLabel } from '../lib/helpers';

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
  const { orgUnits, orgUnitTypes, saveOrgUnit } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const sortedTypes = useMemo(() => sortAdminTypes(orgUnitTypes), [orgUnitTypes]);
  const selectedType = useMemo(() => sortedTypes.find((type) => type.id === form.type_id), [sortedTypes, form.type_id]);
  const parentLabel = useMemo(() => parentFieldLabel(selectedType?.name_ar), [selectedType]);
  const allowedParents = useMemo(() => {
    const allowedTypeNames = allowedParentTypeNames(selectedType?.name_ar);
    if (!selectedType) return [];
    if (!allowedTypeNames.length) return [];
    return orgUnits.filter((unit) => {
      const unitType = orgUnitTypes.find((type) => type.id === unit.type_id);
      return unitType && allowedTypeNames.includes(unitType.name_ar);
    }).sort((a, b) => {
      const ta = orgUnitTypes.find((type) => type.id === a.type_id)?.name_ar || '';
      const tb = orgUnitTypes.find((type) => type.id === b.type_id)?.name_ar || '';
      return ADMIN_LEVEL_ORDER.indexOf(ta) - ADMIN_LEVEL_ORDER.indexOf(tb) || a.name_ar.localeCompare(b.name_ar, 'ar');
    });
  }, [form.type_id, orgUnitTypes, orgUnits, selectedType]);

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
    setMessage('يمكنك تعديل هذا المستوى الإداري ثم حفظه.');
  };

  const onTypeChange = (nextTypeId) => {
    setForm((prev) => ({ ...prev, type_id: nextTypeId, parent_id: '' }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await saveOrgUnit(form);
      setMessage('تم حفظ المستوى الإداري بنجاح.');
      setForm(emptyForm);
    } catch (err) {
      setMessage(err.message || 'تعذر حفظ المستوى الإداري.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="grid-2 responsive-stack">
        <Card title="إعداد الهيكل الإداري" subtitle="مثال: عند إضافة قسم سيعرض لك الإدارات فقط، وعند إضافة قسم فرعي سيعرض الأقسام فقط">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>{selectedType?.name_ar ? `اسم ${selectedType.name_ar}` : 'اسم الجهة'}
              <input placeholder={selectedType?.name_ar ? `مثال: ${selectedType.name_ar} جديد` : 'اكتب الاسم هنا'} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
            </label>
            <label>المستوى الإداري
              <select value={form.type_id} onChange={(e) => onTypeChange(e.target.value)} required>
                <option value="">اختر المستوى الإداري</option>
                {sortedTypes.map((type) => <option key={type.id} value={type.id}>{type.name_ar}</option>)}
              </select>
            </label>
            <label>{parentLabel}
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} disabled={!selectedType || !allowedParents.length}>
                <option value="">{!selectedType ? 'اختر المستوى أولًا' : !allowedParents.length ? 'لا يحتاج ربطًا بمستوى أعلى' : `اختر ${parentLabel}`}</option>
                {allowedParents.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name_ar}</option>
                ))}
              </select>
            </label>
            <label>الترتيب
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </label>
            <label>وصف مختصر
              <textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows="3" />
            </label>
            <div className="check-row">
              <label><input type="checkbox" checked={form.receives_tasks} onChange={(e) => setForm({ ...form, receives_tasks: e.target.checked })} /> يستقبل مهام</label>
              <label><input type="checkbox" checked={form.receives_messages} onChange={(e) => setForm({ ...form, receives_messages: e.target.checked })} /> يستقبل مراسلات</label>
              <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> نشط</label>
            </div>
            {message ? <div className="alert">{message}</div> : null}
            <div className="button-row">
              <button className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
              <button type="button" className="secondary-btn" onClick={() => { setForm(emptyForm); setMessage(''); }}>جديد</button>
            </div>
          </form>
        </Card>

        <Card title="المستويات الحالية" subtitle={`إجمالي العناصر الإدارية: ${orgUnits.length}`}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المستوى</th>
                  <th>يتبع إلى</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {orgUnits
                  .slice()
                  .sort((a, b) => {
                    const ta = orgUnitTypes.find((type) => type.id === a.type_id)?.name_ar || '';
                    const tb = orgUnitTypes.find((type) => type.id === b.type_id)?.name_ar || '';
                    return ADMIN_LEVEL_ORDER.indexOf(ta) - ADMIN_LEVEL_ORDER.indexOf(tb) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_ar.localeCompare(b.name_ar, 'ar');
                  })
                  .map((unit) => (
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
