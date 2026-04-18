import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import TaskStepPill from '../components/TaskStepPill';
import { useApp } from '../contexts/AppContext';
import { PRIORITY_OPTIONS, formatDateTime, priorityClass, priorityLabel, taskStatusLabel } from '../lib/helpers';

const emptyStep = { step_name_ar: '', responsible_org_unit_id: '', assigned_user_id: '', sla_hours: 2, requires_proof: false, requires_approval: false };

export default function TasksPage() {
  const { tasks, taskTypes, taskTemplates, orgUnits, users, currentUser, saveTask, advanceTaskStep } = useApp();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title_ar: '',
    description_ar: '',
    task_type_id: '',
    priority_key: 'medium',
    due_at: '',
    requires_proof: false,
    requires_approval: false,
    steps: [emptyStep]
  });

  useEffect(() => {
    if (!form.task_type_id) return;
    const template = taskTemplates[form.task_type_id];
    if (template?.length) {
      setForm((prev) => ({
        ...prev,
        steps: template.map((step) => ({ ...emptyStep, ...step }))
      }));
      setMessage('تم اقتراح المراحل تلقائيًا حسب نوع المهمة المختار.');
      return;
    }
    const latestTask = tasks.find((task) => task.task_type_id === form.task_type_id && task.steps?.length);
    if (latestTask?.steps?.length) {
      setForm((prev) => ({
        ...prev,
        steps: latestTask.steps.map((step) => ({
          ...emptyStep,
          step_name_ar: step.step_name_ar,
          responsible_org_unit_id: step.responsible_org_unit_id,
          assigned_user_id: step.assigned_user_id || '',
          sla_hours: step.sla_hours ?? null,
          requires_proof: !!step.requires_proof,
          requires_approval: !!step.requires_approval
        }))
      }));
      setMessage('تم اقتراح المراحل تلقائيًا من آخر مهمة مشابهة لهذا النوع.');
    }
  }, [form.task_type_id, taskTemplates, tasks]);

  const onStepChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step)
    }));
  };

  const addStep = () => setForm((prev) => ({ ...prev, steps: [...prev.steps, { ...emptyStep }] }));
  const removeStep = (index) => setForm((prev) => ({ ...prev, steps: prev.steps.filter((_, stepIndex) => stepIndex !== index) }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const taskType = taskTypes.find((item) => item.id === form.task_type_id);
      const taskPayload = {
        title_ar: form.title_ar,
        description_ar: form.description_ar,
        task_type_id: form.task_type_id,
        created_by: currentUser.id,
        created_from_org_unit_id: currentUser.org_unit_id,
        current_org_unit_id: form.steps[0]?.responsible_org_unit_id || currentUser.org_unit_id,
        current_assigned_user_id: form.steps[0]?.assigned_user_id || null,
        status_key: 'new',
        priority_key: form.priority_key,
        overall_progress: 0,
        sla_hours: taskType?.default_sla_hours ?? null,
        due_at: form.due_at || null,
        requires_proof: form.requires_proof,
        requires_approval: form.requires_approval
      };
      await saveTask({ task: taskPayload, steps: form.steps.map((step) => ({ ...step })) });
      setMessage('تم إنشاء المهمة وحفظ مسارها بنجاح.');
      setForm({ title_ar: '', description_ar: '', task_type_id: '', priority_key: 'medium', due_at: '', requires_proof: false, requires_approval: false, steps: [{ ...emptyStep }] });
    } catch (err) {
      setMessage(err.message || 'تعذر إنشاء المهمة.');
    } finally {
      setBusy(false);
    }
  };

  const groupedUsers = useMemo(() => users.filter((user) => user.is_active), [users]);

  return (
    <div className="page-stack">
      <Card title="إنشاء مهمة جديدة" subtitle="مهمة متعددة المراحل بين الإدارات والموظفين مع اقتراح ذكي للمسار">
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="form-grid cols-4 responsive-forms">
            <label>عنوان المهمة<input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} required /></label>
            <label>نوع المهمة
              <select value={form.task_type_id} onChange={(e) => setForm({ ...form, task_type_id: e.target.value })} required>
                <option value="">اختر النوع</option>
                {taskTypes.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}
              </select>
            </label>
            <label>الأولوية
              <select value={form.priority_key} onChange={(e) => setForm({ ...form, priority_key: e.target.value })}>
                {PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>الموعد النهائي<input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></label>
            <label className="span-4">وصف المهمة<textarea rows="3" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} /></label>
          </div>
          <div className="check-row">
            <label><input type="checkbox" checked={form.requires_proof} onChange={(e) => setForm({ ...form, requires_proof: e.target.checked })} /> تتطلب إثبات تنفيذ</label>
            <label><input type="checkbox" checked={form.requires_approval} onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })} /> تتطلب اعتماد</label>
          </div>
          <div className="steps-editor">
            <div className="section-header compact">
              <h3>مراحل المهمة</h3>
              <button type="button" className="secondary-btn" onClick={addStep}>إضافة مرحلة</button>
            </div>
            {form.steps.map((step, index) => (
              <div className="step-editor card" key={index}>
                <div className="section-header compact">
                  <strong>المرحلة {index + 1}</strong>
                  {form.steps.length > 1 ? <button type="button" className="secondary-btn" onClick={() => removeStep(index)}>حذف</button> : null}
                </div>
                <div className="form-grid cols-4 responsive-forms">
                  <label>اسم المرحلة<input value={step.step_name_ar} onChange={(e) => onStepChange(index, 'step_name_ar', e.target.value)} required /></label>
                  <label>الجهة المسؤولة
                    <select value={step.responsible_org_unit_id} onChange={(e) => onStepChange(index, 'responsible_org_unit_id', e.target.value)} required>
                      <option value="">اختر الجهة</option>
                      {orgUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name_ar}</option>)}
                    </select>
                  </label>
                  <label>الموظف المسؤول
                    <select value={step.assigned_user_id} onChange={(e) => onStepChange(index, 'assigned_user_id', e.target.value)}>
                      <option value="">اختر الموظف</option>
                      {groupedUsers.filter((user) => !step.responsible_org_unit_id || user.org_unit_id === step.responsible_org_unit_id).map((user) => <option key={user.id} value={user.id}>{user.full_name_ar}</option>)}
                    </select>
                  </label>
                  <label>زمن التنفيذ بالساعات (اختياري)<input type="number" min="1" placeholder="بدون وقت" value={step.sla_hours ?? ''} onChange={(e) => onStepChange(index, 'sla_hours', e.target.value === '' ? null : Number(e.target.value))} /></label>
                </div>
              </div>
            ))}
          </div>
          {message ? <div className="alert">{message}</div> : null}
          <button className="primary-btn" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'إنشاء المهمة'}</button>
        </form>
      </Card>

      <Card title="المهام الحالية" subtitle="تتبع جميع المراحل لكل مهمة مع تمييز بصري حسب الأولوية">
        <div className="list-stack">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card card ${priorityClass(task.priority_key)}`}>
              <div className="section-header compact">
                <div>
                  <h3>{task.title_ar}</h3>
                  <p>{taskStatusLabel(task.status_key)} — <span className={`priority-tag ${priorityClass(task.priority_key)}`}>{priorityLabel(task.priority_key)}</span> — الموعد {formatDateTime(task.due_at)}</p>
                </div>
                <div className="meta-row">
                  <span className="badge neutral">#{task.task_no}</span>
                  <span className="badge">{task.overall_progress}%</span>
                </div>
              </div>
              <div className="steps-grid">
                {(task.steps || []).map((step) => (
                  <div key={step.id}>
                    <TaskStepPill step={{ step: step.step_name_ar, status: taskStatusLabel(step.status_key), note: step.responsible_org_unit?.name_ar || step.notes_ar }} />
                    <div className="step-actions">
                      {step.status_key !== 'completed' ? <button className="secondary-btn" onClick={() => advanceTaskStep(task, step.id, { status_key: 'in_progress', progress: 50 })}>بدء</button> : null}
                      {step.status_key !== 'completed' ? <button className="primary-btn small" onClick={() => advanceTaskStep(task, step.id, { status_key: 'completed' })}>إنهاء المرحلة</button> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
