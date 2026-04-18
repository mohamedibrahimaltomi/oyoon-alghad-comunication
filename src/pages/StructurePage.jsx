import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { getAllowedParentUnits, hierarchyLabel, normalizeHierarchyType, sortUnitsByHierarchy } from '../lib/helpers';

const emptyForm = {
  id: '', name_ar: '', type_id: '', parent_id: '', description_ar: '',
  receives_tasks: true, receives_messages: true, is_active: true, sort_order: 0
};

export default function StructurePage() {
  const { orgUnits, orgUnitTypes, orgTree, saveOrgUnit } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedType = useMemo(() => orgUnitTypes.find((type) => type.id === form.type_id), [orgUnitTypes, form.type_id]);
  const selectedHierarchy = useMemo(() => normalizeHierarchyType(selectedType), [selectedType]);
  const allowedParents = useMemo(() => sortUnitsByHierarchy(getAllowedParentUnits(orgUnits, orgUnitTypes, form.type_id), orgUnitTypes), [orgUnits, orgUnitTypes, form.type_id]);
  const levelLabel = useMemo(() => hierarchyLabel(selectedType, 'الجهة الإدارية'), [selectedType]);
  const parentLabel = useMemo(() => {
    const map = {
      top: 'لا يوجد مستوى أعلى لهذا النوع',
      department: 'اختر الإدارة العليا',
      section: 'اختر الإدارة التابعة',
      subsection: 'اختر القسم الأعلى',
      sector: 'اختر القسم أو القسم الفرعي الأعلى',
      line: 'اختر القطاع الأعلى',
      other: 'اختر الجهة الأعلى'
    };
    return map[selectedHierarchy] || map.other;
  }, [selectedHierarchy]);
  const orderedUnits = useMemo(() => sortUnitsByHierarchy(orgUnits, orgUnitTypes), [orgUnits, orgUnitTypes]);

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
        <Card title="إعداد التسلسل الإداري" subtitle="الإضافة هنا ذكية: عند اختيار المستوى سيعرض لك النظام الجهة الأعلى المناسبة فقط بدون خلط">
          <div className="alert">مثال: عند إضافة قسم سيظهر لك اختيار الإدارات فقط، وعند إضافة قسم فرعي سيظهر لك اختيار الأقسام فقط.</div><form className="form-grid" onSubmit={onSubmit}>
            <label>{`${levelLabel || 'الجهة الإدارية'}: الاسم`}<input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required /></label>
            <label>نوع المستوى الإداري
              <select value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value, parent_id: '' })} required>
                <option value="">اختر المستوى</option>
                {orgUnitTypes.map((type) => <option key={type.id} value={type.id}>{type.name_ar}</option>)}
              </select>
            </label>
            <label>{parentLabel}
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} disabled={!form.type_id || allowedParents.length === 0}>
                <option value="">{allowedParents.length ? parentLabel : 'لا يوجد اختيار أعلى لهذا المستوى'}</option>
                {allowedParents.map((unit) => <option key={unit.id} value={unit.id}>{unit.name_ar} — {hierarchyLabel(orgUnitTypes.find((type) => type.id === unit.type_id), 'جهة')}</option>)}
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
            {orderedUnits.map((unit) => (
              <div key={unit.id} className="list-row">
                <div>
                  <strong>{unit.name_ar}</strong>
                  <p>{hierarchyLabel(orgUnitTypes.find((type) => type.id === unit.type_id), 'مستوى غير محدد')} — الأعلى: {orgUnits.find((parent) => parent.id === unit.parent_id)?.name_ar || 'الإدارة العليا'}</p>
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
