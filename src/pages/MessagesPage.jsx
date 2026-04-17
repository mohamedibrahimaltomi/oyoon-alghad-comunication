import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { defaultMessageTypes, PRIORITY_OPTIONS, formatDateTime, messageTypeLabel, priorityClass, priorityLabel } from '../lib/helpers';

export default function MessagesPage() {
  const { threads, orgUnits, currentUser, createThread, replyToThread, messageTypes } = useApp();
  const [form, setForm] = useState({ subject_ar: '', message_type_key: 'inquiry', to_org_unit_id: '', priority_key: 'medium', body_ar: '', related_task_id: '' });
  const [replyBodies, setReplyBodies] = useState({});
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const threadOptions = messageTypes?.length ? messageTypes.filter((item) => item.is_active !== false) : defaultMessageTypes;
  const selectedThread = useMemo(() => threads.find((item) => item.id === selectedThreadId) || threads[0] || null, [selectedThreadId, threads]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await createThread({
        thread: {
          subject_ar: form.subject_ar,
          message_type_key: form.message_type_key,
          created_by: currentUser.id,
          from_org_unit_id: currentUser.org_unit_id,
          to_org_unit_id: form.to_org_unit_id,
          related_task_id: form.related_task_id || null,
          priority_key: form.priority_key,
          status_key: 'new'
        },
        firstMessage: {
          sender_user_id: currentUser.id,
          sender_org_unit_id: currentUser.org_unit_id,
          body_ar: form.body_ar
        }
      });
      setForm({ subject_ar: '', message_type_key: threadOptions[0]?.value || 'inquiry', to_org_unit_id: '', priority_key: 'medium', body_ar: '', related_task_id: '' });
      setMessage('تم إرسال المراسلة بنجاح.');
    } catch (err) {
      setMessage(err.message || 'تعذر إرسال المراسلة.');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (threadId) => {
    const body = replyBodies[threadId] || '';
    if (!body.trim()) return;
    try {
      await replyToThread({ threadId, body });
      setReplyBodies((prev) => ({ ...prev, [threadId]: '' }));
    } catch (err) {
      setMessage(err.message || 'تعذر إرسال الرد.');
    }
  };

  return (
    <div className="page-stack">
      <Card title="إنشاء مراسلة جديدة" subtitle="مراسلات داخلية داخل مربع محادثة يشبه الدردشة">
        <form className="form-grid cols-4 responsive-forms" onSubmit={onSubmit}>
          <label>العنوان<input value={form.subject_ar} onChange={(e) => setForm({ ...form, subject_ar: e.target.value })} required /></label>
          <label>نوع المراسلة
            <select value={form.message_type_key} onChange={(e) => setForm({ ...form, message_type_key: e.target.value })}>
              {threadOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>القسم المستلم
            <select value={form.to_org_unit_id} onChange={(e) => setForm({ ...form, to_org_unit_id: e.target.value })} required>
              <option value="">اختر القسم</option>
              {orgUnits.filter((unit) => unit.id !== currentUser?.org_unit_id).map((unit) => <option key={unit.id} value={unit.id}>{unit.name_ar}</option>)}
            </select>
          </label>
          <label>الأولوية
            <select value={form.priority_key} onChange={(e) => setForm({ ...form, priority_key: e.target.value })}>
              {PRIORITY_OPTIONS.filter((item) => item.value !== 'critical').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="span-4">نص الرسالة<textarea rows="3" value={form.body_ar} onChange={(e) => setForm({ ...form, body_ar: e.target.value })} required /></label>
          {message ? <div className="alert span-4">{message}</div> : null}
          <div className="span-4"><button className="primary-btn" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال المراسلة'}</button></div>
        </form>
      </Card>

      <div className="messages-layout">
        <Card title="المحادثات" subtitle="اختر المراسلة لفتحها داخل مربع المحادثة">
          <div className="chat-list">
            {threads.map((thread) => (
              <button key={thread.id} className={`chat-item ${selectedThread?.id === thread.id ? 'active' : ''}`} onClick={() => setSelectedThreadId(thread.id)}>
                <div>
                  <strong>{thread.subject_ar}</strong>
                  <p>{messageTypeLabel(thread.message_type_key, threadOptions)} — {priorityLabel(thread.priority_key)}</p>
                </div>
                <small>{formatDateTime(thread.updated_at)}</small>
              </button>
            ))}
          </div>
        </Card>

        <Card title={selectedThread?.subject_ar || 'تفاصيل المحادثة'} subtitle={selectedThread ? `${messageTypeLabel(selectedThread.message_type_key, threadOptions)} — ${priorityLabel(selectedThread.priority_key)}` : 'اختر محادثة من القائمة'}>
          {selectedThread ? (
            <div className="chat-thread-wrap">
              <div className="thread-meta-row">
                <span className={`priority-tag ${priorityClass(selectedThread.priority_key)}`}>{priorityLabel(selectedThread.priority_key)}</span>
                <span className="badge neutral">{selectedThread.status_key}</span>
              </div>
              <div className="chat-thread">
                {(selectedThread.messages || []).map((msg) => {
                  const mine = msg.sender_user_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                      <strong>{msg.sender_user?.full_name_ar || 'مستخدم'} — {msg.sender_org_unit?.name_ar || 'قسم'}</strong>
                      <p>{msg.body_ar}</p>
                      <small className="muted">{formatDateTime(msg.created_at)}</small>
                    </div>
                  );
                })}
              </div>
              <div className="reply-row">
                <textarea rows="2" value={replyBodies[selectedThread.id] || ''} onChange={(e) => setReplyBodies((prev) => ({ ...prev, [selectedThread.id]: e.target.value }))} placeholder="اكتب ردك هنا" />
                <button className="primary-btn" onClick={() => sendReply(selectedThread.id)}>إرسال رد</button>
              </div>
            </div>
          ) : <p className="muted">لا توجد مراسلات بعد.</p>}
        </Card>
      </div>
    </div>
  );
}
