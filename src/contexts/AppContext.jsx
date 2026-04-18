import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildOrgTree, defaultMessageTypes, getDescendantUnitIds, getParentUnit } from '../lib/helpers';

const AppContext = createContext(null);

const defaultBranding = {
  company_name: 'عيون الغد',
  company_tagline: 'إدارة المهام والمراسلات',
  logo_data_url: '',
  retention_days: 7,
  enable_browser_notifications: true,
  max_backup_mb: 450,
  max_backup_files: 7
};

const createUserFunctionUrl = import.meta.env.VITE_CREATE_USER_FUNCTION_URL || '';

function playSoundByPriority(priority = 'medium') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const config = {
      critical: { frequency: 1040, duration: 0.25, repeat: 2 },
      high: { frequency: 880, duration: 0.18, repeat: 2 },
      medium: { frequency: 660, duration: 0.14, repeat: 1 },
      low: { frequency: 520, duration: 0.1, repeat: 1 }
    }[priority] || { frequency: 660, duration: 0.14, repeat: 1 };

    for (let i = 0; i < config.repeat; i += 1) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = config.frequency;
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * (config.duration + 0.06);
      oscillator.start(start);
      oscillator.stop(start + config.duration);
    }
  } catch {
    // تجاهل أخطاء الصوت في بعض المتصفحات
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgUnitTypes, setOrgUnitTypes] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState({});
  const [tasks, setTasks] = useState([]);
  const [threads, setThreads] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [branding, setBranding] = useState(defaultBranding);
  const [messageTypes, setMessageTypes] = useState(defaultMessageTypes);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prevNotifIds = useRef([]);

  const fetchSettings = useCallback(async () => {
    if (!supabase) return;
    const { data, error: settingsError } = await supabase
      .from('system_settings')
      .select('*');
    if (settingsError) throw settingsError;
    const nextBranding = { ...defaultBranding };
    const nextTemplates = {};
    let nextMessageTypes = [...defaultMessageTypes];
    data?.forEach((row) => {
      if (row.setting_key === 'company_branding') {
        Object.assign(nextBranding, row.setting_value || {});
      }
      if (row.setting_key === 'backup_retention_days') {
        nextBranding.retention_days = Number(row.setting_value || 7);
      }
      if (row.setting_key === 'enable_push_notifications') {
        nextBranding.enable_browser_notifications = row.setting_value === true || row.setting_value === 'true';
      }
      if (row.setting_key === 'backup_limits') {
        Object.assign(nextBranding, row.setting_value || {});
      }
      if (row.setting_key === 'message_types') {
        nextMessageTypes = Array.isArray(row.setting_value) && row.setting_value.length ? row.setting_value : nextMessageTypes;
      }
      if (row.setting_key?.startsWith('task_template_')) {
        nextTemplates[row.setting_key.replace('task_template_', '')] = Array.isArray(row.setting_value) ? row.setting_value : [];
      }
    });
    setBranding(nextBranding);
    setMessageTypes(nextMessageTypes);
    setTaskTemplates(nextTemplates);
  }, []);

  const fetchAll = useCallback(async (userId) => {
    if (!supabase || !userId) return;
    setLoading(true);
    setError('');
    try {
      const [
        profileRes,
        unitTypesRes,
        unitsRes,
        usersRes,
        taskTypesRes,
        tasksRes,
        stepsRes,
        threadsRes,
        messagesRes,
        notificationsRes
      ] = await Promise.all([
        supabase.from('app_users').select('*, org_unit:org_units!app_users_org_unit_id_fkey(*)').eq('id', userId).maybeSingle(),
        supabase.from('org_unit_types').select('*').order('created_at', { ascending: true }),
        supabase.from('org_units').select('*').order('sort_order', { ascending: true }),
        supabase.from('app_users').select('*, org_unit:org_units!app_users_org_unit_id_fkey(*)').order('created_at', { ascending: true }),
        supabase.from('task_types').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_steps').select('*, responsible_org_unit:org_units!task_steps_responsible_org_unit_id_fkey(id,name_ar), assigned_user:app_users!task_steps_assigned_user_id_fkey(id,full_name_ar)').order('step_order', { ascending: true }),
        supabase.from('message_threads').select('*').order('updated_at', { ascending: false }),
        supabase.from('thread_messages').select('*, sender_user:app_users!thread_messages_sender_user_id_fkey(id,full_name_ar), sender_org_unit:org_units!thread_messages_sender_org_unit_id_fkey(id,name_ar)').order('created_at', { ascending: true }),
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      ]);

      const errors = [profileRes, unitTypesRes, unitsRes, usersRes, taskTypesRes, tasksRes, stepsRes, threadsRes, messagesRes, notificationsRes]
        .map((res) => res.error)
        .filter(Boolean);
      if (errors.length) throw errors[0];

      const profile = profileRes.data ? {
        ...profileRes.data,
        name: profileRes.data.full_name_ar,
        role: profileRes.data.role_key,
        orgUnitName: profileRes.data.org_unit?.name_ar || '—',
        parentOrgUnitId: profileRes.data.org_unit?.parent_id || null
      } : {
        id: userId,
        name: session?.user?.email || 'مستخدم',
        role: 'employee',
        orgUnitName: '—'
      };
      setCurrentUser(profile);
      setOrgUnitTypes(unitTypesRes.data || []);
      setOrgUnits(unitsRes.data || []);
      setUsers((usersRes.data || []).map((item) => ({ ...item, name: item.full_name_ar })));
      setTaskTypes(taskTypesRes.data || []);

      const stepsByTask = new Map();
      (stepsRes.data || []).forEach((step) => {
        const list = stepsByTask.get(step.task_id) || [];
        list.push(step);
        stepsByTask.set(step.task_id, list);
      });

      setTasks((tasksRes.data || []).map((task) => ({
        ...task,
        steps: stepsByTask.get(task.id) || []
      })));

      const msgsByThread = new Map();
      (messagesRes.data || []).forEach((message) => {
        const list = msgsByThread.get(message.thread_id) || [];
        list.push(message);
        msgsByThread.set(message.thread_id, list);
      });

      setThreads((threadsRes.data || []).map((thread) => ({ ...thread, messages: msgsByThread.get(thread.id) || [] })));
      setNotifications(notificationsRes.data || []);
      await fetchSettings();
    } catch (err) {
      setError(err.message || 'تعذر تحميل بيانات النظام');
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, session?.user?.email]);

  useEffect(() => {
    if (!supabase) {
      setError('بيانات Supabase غير موجودة في ملف .env');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const nextSession = data.session;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        fetchAll(nextSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        fetchAll(nextSession.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    const notifChannel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async (payload) => {
        if (payload.new?.user_id === session?.user?.id || payload.old?.user_id === session?.user?.id) {
          await fetchAll(session?.user?.id);
        }
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(notifChannel);
    };
  }, [fetchAll, session?.user?.id]);

  useEffect(() => {
    if (!notifications.length) return;
    const currentIds = notifications.map((item) => item.id);
    const previousIds = prevNotifIds.current;
    const newItems = notifications.filter((item) => !previousIds.includes(item.id) && !item.is_read);
    if (newItems.length) {
      const first = newItems[0];
      const priority = tasks.find((task) => task.id === first.related_task_id)?.priority_key || 'medium';
      playSoundByPriority(priority);
      if (branding.enable_browser_notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(first.title_ar, { body: first.body_ar });
      }
    }
    prevNotifIds.current = currentIds;
  }, [branding.enable_browser_notifications, notifications, tasks]);

  const signIn = useCallback(async ({ username, password }) => {
    if (!supabase) return { error: new Error('Supabase غير مهيأ') };
    const loginId = (username || '').trim();
    if (!loginId) return { error: new Error('أدخل اسم المستخدم') };
    let email = loginId;
    if (!loginId.includes('@')) {
      const { data: userRow, error: userErr } = await supabase
        .from('app_users')
        .select('email, username')
        .eq('username', loginId)
        .maybeSingle();
      if (userErr) return { error: userErr };
      if (!userRow?.email) return { error: new Error('اسم المستخدم غير موجود') };
      email = userRow.email;
    }
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const createNotification = useCallback(async ({ userId, category = 'system_alert', title, body, relatedTaskId = null, relatedThreadId = null, priority = 'medium' }) => {
    if (!supabase || !userId) return;
    await supabase.from('notifications').insert({
      user_id: userId,
      category_key: category,
      title_ar: title,
      body_ar: body,
      related_task_id: relatedTaskId,
      related_thread_id: relatedThreadId
    });
    playSoundByPriority(priority);
    if (branding.enable_browser_notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, [branding.enable_browser_notifications]);

  const markNotificationRead = useCallback(async (id) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item));
  }, []);

  const saveOrgUnit = useCallback(async (payload) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    const savePayload = { ...payload, updated_at: new Date().toISOString() };
    const { data, error: saveError } = payload.id
      ? await supabase.from('org_units').update(savePayload).eq('id', payload.id).select().single()
      : await supabase.from('org_units').insert(savePayload).select().single();
    if (saveError) throw saveError;
    await fetchAll(session?.user?.id);
    await createNotification({
      userId: session?.user?.id,
      title: payload.id ? 'تم تعديل جهة إدارية' : 'تمت إضافة جهة إدارية',
      body: `الجهة: ${payload.name_ar}`
    });
    return data;
  }, [createNotification, fetchAll, session?.user?.id]);

  const saveOrgUnitType = useCallback(async (payload) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');

    const cleanPayload = {
      ...payload
    };

    const { data, error: saveError } = payload.id
      ? await supabase
        .from('org_unit_types')
        .update(cleanPayload)
        .eq('id', payload.id)
        .select()
        .single()
      : await supabase
        .from('org_unit_types')
        .insert(cleanPayload)
        .select()
        .single();

    if (saveError) throw saveError;

    setOrgUnitTypes((prev) => {
      if (payload.id) {
        return prev.map((item) => (item.id === payload.id ? data : item));
      }
      return [...prev, data];
    });

    return data;
  }, [supabase]);

  const saveMessageTypes = useCallback(async (nextTypes) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    const { error: saveError } = await supabase.from('system_settings').upsert({
      setting_key: 'message_types',
      setting_value: nextTypes,
      description_ar: 'أنواع المراسلات',
      updated_by: currentUser?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
    if (saveError) throw saveError;
    setMessageTypes(nextTypes);
  }, [currentUser]);

  const saveTaskType = useCallback(async (payload) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');

    const cleanPayload = {
      ...payload
    };

    const { data, error: saveError } = payload.id
      ? await supabase
        .from('task_types')
        .update(cleanPayload)
        .eq('id', payload.id)
        .select()
        .single()
      : await supabase
        .from('task_types')
        .insert(cleanPayload)
        .select()
        .single();

    if (saveError) throw saveError;

    setTaskTypes((prev) => {
      if (payload.id) {
        return prev.map((item) => (item.id === payload.id ? data : item));
      }
      return [...prev, data];
    });

    return data;
  }, [supabase]);


  const deleteOrgUnitType = useCallback(async (id) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    const { error: deleteError } = await supabase.from('org_unit_types').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setOrgUnitTypes((prev) => prev.filter((item) => item.id !== id));
    return true;
  }, [supabase]);

  const deleteTaskType = useCallback(async (id) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    const { error: deleteError } = await supabase.from('task_types').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setTaskTypes((prev) => prev.filter((item) => item.id !== id));
    return true;
  }, [supabase]);

  const saveTaskTemplate = useCallback(async (taskTypeId, steps) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    const { error: saveError } = await supabase.from('system_settings').upsert({
      setting_key: `task_template_${taskTypeId}`,
      setting_value: steps,
      description_ar: 'قالب مسار المهمة',
      updated_by: currentUser?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
    if (saveError) throw saveError;
    setTaskTemplates((prev) => ({ ...prev, [taskTypeId]: steps }));
  }, [currentUser]);

  const createUserFromApp = useCallback(async (payload) => {
    if (!createUserFunctionUrl) throw new Error('أضف رابط وظيفة إنشاء المستخدم في ملف .env داخل المتغير VITE_CREATE_USER_FUNCTION_URL');
    const response = await fetch(createUserFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر إنشاء المستخدم من داخل التطبيق');
    await fetchAll(session?.user?.id);
    return result;
  }, [fetchAll, session?.access_token, session?.user?.id]);

  const saveUserProfile = useCallback(async (payload) => {
    if (!supabase) throw new Error('Supabase غير مهيأ');
    if (!payload.id) {
      return createUserFromApp({
        password: payload.password,
        full_name: payload.full_name_ar,
        role_key: payload.role_key,
        org_unit_id: payload.org_unit_id,
        phone: payload.phone,
        username: payload.username,
        job_title_ar: payload.job_title_ar,
        is_active: payload.is_active
      });
    }
    const payloadToSave = { ...payload };
    delete payloadToSave.password;
    if (!payloadToSave.email) delete payloadToSave.email;
    const { data, error: saveError } = await supabase.from('app_users').update(payloadToSave).eq('id', payload.id).select().single();
    if (saveError) throw saveError;
    await fetchAll(session?.user?.id);
    await createNotification({
      userId: session?.user?.id,
      title: 'تم تعديل المستخدم',
      body: `المستخدم: ${payload.full_name_ar}`
    });
    return data;
  }, [createNotification, createUserFromApp, fetchAll, session?.user?.id]);

  const saveTask = useCallback(async ({ task, steps }) => {
    if (!supabase || !currentUser) throw new Error('لا يوجد مستخدم حالي');
    let taskId = task.id;
    if (task.id) {
      const { error: taskError } = await supabase.from('tasks').update(task).eq('id', task.id);
      if (taskError) throw taskError;
      await supabase.from('task_steps').delete().eq('task_id', task.id);
    } else {
      const { data: createdTask, error: taskError } = await supabase.from('tasks').insert(task).select().single();
      if (taskError) throw taskError;
      taskId = createdTask.id;
    }

    const preparedSteps = steps.map((step, index) => ({
      ...step,
      task_id: taskId,
      step_order: index + 1,
      status_key: index === 0 ? 'received' : 'pending',
      progress: index === 0 ? 10 : 0,
      received_at: index === 0 ? new Date().toISOString() : null
    }));
    const { error: stepsError } = await supabase.from('task_steps').insert(preparedSteps);
    if (stepsError) throw stepsError;

    await saveTaskTemplate(task.task_type_id, steps.map((step) => ({
      step_name_ar: step.step_name_ar,
      responsible_org_unit_id: step.responsible_org_unit_id,
      assigned_user_id: step.assigned_user_id || null,
      sla_hours: step.sla_hours,
      requires_proof: step.requires_proof,
      requires_approval: step.requires_approval
    })));

    const targetManagers = users.filter((user) => user.org_unit_id === steps[0]?.responsible_org_unit_id && user.role_key === 'department_manager');
    await Promise.all(targetManagers.map((manager) => createNotification({
      userId: manager.id,
      category: 'task_created',
      title: 'مهمة جديدة بانتظار قسمكم',
      body: task.title_ar,
      relatedTaskId: taskId,
      priority: task.priority_key
    })));
    await fetchAll(session?.user?.id);
  }, [createNotification, currentUser, fetchAll, saveTaskTemplate, session?.user?.id, supabase, users]);

  const advanceTaskStep = useCallback(async (task, stepId, updates = {}) => {
    if (!supabase || !currentUser) throw new Error('لا يوجد مستخدم حالي');
    const taskSteps = [...(task.steps || [])];
    const stepIndex = taskSteps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) throw new Error('المرحلة غير موجودة');
    const currentStep = taskSteps[stepIndex];
    const currentStatus = updates.status_key || 'completed';
    const stepPayload = {
      status_key: currentStatus,
      progress: currentStatus === 'completed' ? 100 : updates.progress ?? currentStep.progress,
      notes_ar: updates.notes_ar ?? currentStep.notes_ar,
      assigned_user_id: updates.assigned_user_id ?? currentStep.assigned_user_id,
      assigned_by: updates.assigned_user_id ? currentUser.id : currentStep.assigned_by,
      completed_at: currentStatus === 'completed' ? new Date().toISOString() : currentStep.completed_at,
      started_at: currentStatus === 'in_progress' && !currentStep.started_at ? new Date().toISOString() : currentStep.started_at
    };
    const { error: stepError } = await supabase.from('task_steps').update(stepPayload).eq('id', stepId);
    if (stepError) throw stepError;

    let taskUpdate = {};
    if (currentStatus === 'completed' && stepIndex < taskSteps.length - 1) {
      const nextStep = taskSteps[stepIndex + 1];
      await supabase.from('task_steps').update({ status_key: 'received', progress: 10, received_at: new Date().toISOString() }).eq('id', nextStep.id);
      taskUpdate = {
        status_key: 'in_progress',
        current_org_unit_id: nextStep.responsible_org_unit_id,
        current_assigned_user_id: nextStep.assigned_user_id || null,
        overall_progress: Math.round(((stepIndex + 1) / taskSteps.length) * 100)
      };
      const targetManagers = users.filter((user) => user.org_unit_id === nextStep.responsible_org_unit_id && user.role_key === 'department_manager');
      await Promise.all(targetManagers.map((manager) => createNotification({
        userId: manager.id,
        category: 'task_received',
        title: 'وصلت مرحلة جديدة إلى إدارتكم',
        body: task.title_ar,
        relatedTaskId: task.id,
        priority: task.priority_key
      })));
    } else if (currentStatus === 'completed') {
      taskUpdate = {
        status_key: 'completed',
        completed_at: new Date().toISOString(),
        overall_progress: 100
      };
      await createNotification({
        userId: task.created_by,
        category: 'task_completed',
        title: 'تم إكمال المهمة',
        body: task.title_ar,
        relatedTaskId: task.id,
        priority: task.priority_key
      });
    } else if (currentStatus === 'in_progress') {
      taskUpdate = { status_key: 'in_progress' };
    }

    if (Object.keys(taskUpdate).length) {
      await supabase.from('tasks').update(taskUpdate).eq('id', task.id);
    }

    await fetchAll(session?.user?.id);
  }, [createNotification, currentUser, fetchAll, orgUnits, session?.user?.id, users]);

  const createThread = useCallback(async ({ thread, firstMessage }) => {
    if (currentUser?.role_key === 'employee') {
      const parentUnit = getParentUnit(orgUnits, currentUser.org_unit_id);
      if (!parentUnit || thread.to_org_unit_id !== parentUnit.id) throw new Error('الموظف يرسل مراسلاته إلى مديره المباشر فقط');
    }
    if (!supabase || !currentUser) throw new Error('لا يوجد مستخدم حالي');
    const { data: createdThread, error: threadError } = await supabase.from('message_threads').insert(thread).select().single();
    if (threadError) throw threadError;
    const { error: messageError } = await supabase.from('thread_messages').insert({ ...firstMessage, thread_id: createdThread.id });
    if (messageError) throw messageError;

    const targetManagers = users.filter((user) => user.org_unit_id === thread.to_org_unit_id && user.role_key === 'department_manager');
    await Promise.all(targetManagers.map((manager) => createNotification({
      userId: manager.id,
      category: 'message_new',
      title: 'مراسلة جديدة',
      body: thread.subject_ar,
      relatedThreadId: createdThread.id,
      priority: thread.priority_key
    })));
    await fetchAll(session?.user?.id);
  }, [createNotification, currentUser, fetchAll, orgUnits, session?.user?.id, users]);

  const replyToThread = useCallback(async ({ threadId, body }) => {
    if (!supabase || !currentUser) throw new Error('لا يوجد مستخدم حالي');
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) throw new Error('المراسلة غير موجودة');
    const payload = {
      thread_id: threadId,
      sender_user_id: currentUser.id,
      sender_org_unit_id: currentUser.org_unit_id,
      body_ar: body
    };
    const { error: messageError } = await supabase.from('thread_messages').insert(payload);
    if (messageError) throw messageError;
    await supabase.from('message_threads').update({ status_key: 'replied', updated_at: new Date().toISOString() }).eq('id', threadId);
    const targetOrgUnit = thread.from_org_unit_id === currentUser.org_unit_id ? thread.to_org_unit_id : thread.from_org_unit_id;
    const targetManagers = users.filter((user) => user.org_unit_id === targetOrgUnit && user.role_key === 'department_manager');
    await Promise.all(targetManagers.map((manager) => createNotification({
      userId: manager.id,
      category: 'message_reply',
      title: 'تم الرد على مراسلة',
      body: thread.subject_ar,
      relatedThreadId: threadId,
      priority: thread.priority_key
    })));
    await fetchAll(session?.user?.id);
  }, [createNotification, currentUser, fetchAll, session?.user?.id, threads, users]);

  const saveBranding = useCallback(async (nextBranding) => {
    if (!supabase) throw new Error('تعذر الوصول إلى قاعدة البيانات');
    const actingUserId = currentUser?.id || session?.user?.id || null;
    if (!actingUserId) throw new Error('لا يوجد مستخدم حالي');
    const ops = [
      supabase.from('system_settings').upsert({
        setting_key: 'company_branding',
        setting_value: {
          company_name: nextBranding.company_name,
          company_tagline: nextBranding.company_tagline,
          logo_data_url: nextBranding.logo_data_url
        },
        description_ar: 'هوية الشركة',
        updated_by: actingUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' }),
      supabase.from('system_settings').upsert({
        setting_key: 'backup_retention_days',
        setting_value: nextBranding.retention_days,
        description_ar: 'مدة حفظ النسخ الاحتياطية',
        updated_by: actingUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' }),
      supabase.from('system_settings').upsert({
        setting_key: 'enable_push_notifications',
        setting_value: nextBranding.enable_browser_notifications,
        description_ar: 'تفعيل الإشعارات',
        updated_by: actingUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' }),
      supabase.from('system_settings').upsert({
        setting_key: 'backup_limits',
        setting_value: { max_backup_mb: nextBranding.max_backup_mb, max_backup_files: nextBranding.max_backup_files },
        description_ar: 'حدود النسخ الاحتياطي',
        updated_by: actingUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' })
    ];
    const results = await Promise.all(ops);
    const err = results.find((item) => item.error)?.error;
    if (err) throw err;
    setBranding(nextBranding);
    await createNotification({ userId: actingUserId, title: 'تم تحديث إعدادات الشركة', body: 'تم حفظ الشعار والإعدادات بنجاح' });
  }, [createNotification, currentUser?.id, session?.user?.id]);

  const requestBrowserNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.requestPermission();
  }, []);


  const descendantUnitIds = useMemo(() => getDescendantUnitIds(orgUnits, currentUser?.org_unit_id), [orgUnits, currentUser?.org_unit_id]);
  const directManager = useMemo(() => {
    if (!currentUser?.org_unit_id) return null;
    const parentUnit = getParentUnit(orgUnits, currentUser.org_unit_id);
    if (!parentUnit) return users.find((u) => u.org_unit_id === currentUser.org_unit_id && u.role_key === 'department_manager') || null;
    return users.find((u) => u.org_unit_id === parentUnit.id && u.role_key === 'department_manager') || null;
  }, [currentUser?.org_unit_id, orgUnits, users]);
  const visibleTasks = useMemo(() => {
    if (!currentUser) return tasks;
    if (['general_manager','system_admin'].includes(currentUser.role_key)) return tasks;
    if (currentUser.role_key === 'department_manager') {
      return tasks.filter((task) => descendantUnitIds.includes(task.created_from_org_unit_id) || descendantUnitIds.includes(task.current_org_unit_id));
    }
    return tasks.filter((task) => task.current_assigned_user_id === currentUser.id || task.created_by === currentUser.id || (task.steps || []).some((step) => step.assigned_user_id === currentUser.id));
  }, [currentUser, tasks, descendantUnitIds]);
  const visibleThreads = useMemo(() => {
    if (!currentUser) return threads;
    if (['general_manager','system_admin'].includes(currentUser.role_key)) return threads;
    if (currentUser.role_key === 'department_manager') {
      return threads.filter((thread) => descendantUnitIds.includes(thread.from_org_unit_id) || descendantUnitIds.includes(thread.to_org_unit_id));
    }
    return threads.filter((thread) => thread.created_by === currentUser.id || thread.from_org_unit_id === currentUser.org_unit_id || thread.to_org_unit_id === currentUser.org_unit_id);
  }, [currentUser, threads, descendantUnitIds]);
  const allowedMessageTargets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role_key === 'employee') {
      const parentUnit = getParentUnit(orgUnits, currentUser.org_unit_id);
      return parentUnit ? [parentUnit] : [];
    }
    if (currentUser.role_key === 'department_manager') {
      return orgUnits.filter((unit) => unit.id !== currentUser.org_unit_id && !descendantUnitIds.includes(unit.id));
    }
    return orgUnits.filter((unit) => unit.id !== currentUser.org_unit_id);
  }, [currentUser, orgUnits, descendantUnitIds]);
  const manualBackupExport = useCallback(async () => {
    const payload = {
      exported_at: new Date().toISOString(),
      org_units: orgUnits,
      users,
      tasks,
      threads,
      settings: branding
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const approxMb = blob.size / (1024 * 1024);
    if (approxMb > branding.max_backup_mb) {
      throw new Error(`حجم النسخة الحالية ${approxMb.toFixed(2)} MB ويتجاوز الحد المحدد ${branding.max_backup_mb} MB`);
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oyoun-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    await createNotification({ userId: currentUser?.id, title: 'تم إنشاء نسخة احتياطية', body: 'تم تنزيل نسخة احتياطية من المتصفح' });
  }, [branding, createNotification, currentUser?.id, orgUnits, tasks, threads, users]);

  const value = useMemo(() => ({
    session,
    currentUser,
    orgUnitTypes,
    orgUnits,
    orgTree: buildOrgTree(orgUnits),
    users,
    taskTypes,
    taskTemplates,
    tasks: visibleTasks,
    threads: visibleThreads,
    notifications,
    branding,
    messageTypes,
    loading,
    error,
    signIn,
    signOut,
    refresh: () => fetchAll(session?.user?.id),
    saveOrgUnit,
    saveOrgUnitType,
    deleteOrgUnitType,
    saveUserProfile,
    saveTaskType,
    deleteTaskType,
    saveTaskTemplate,
    saveMessageTypes,
    saveTask,
    advanceTaskStep,
    createThread,
    replyToThread,
    markNotificationRead,
    saveBranding,
    requestBrowserNotifications,
    manualBackupExport,
    createUserFromApp,
    directManager,
    allowedMessageTargets
  }), [advanceTaskStep, allowedMessageTargets, branding, createThread, currentUser, directManager, error, fetchAll, loading, manualBackupExport, markNotificationRead, messageTypes, notifications, orgUnitTypes, orgUnits, replyToThread, saveBranding, saveMessageTypes, saveOrgUnit, saveOrgUnitType, deleteOrgUnitType, saveTask, saveTaskTemplate, saveTaskType, deleteTaskType, saveUserProfile, session, signIn, signOut, taskTemplates, taskTypes, visibleTasks, visibleThreads, users, requestBrowserNotifications, createUserFromApp]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
