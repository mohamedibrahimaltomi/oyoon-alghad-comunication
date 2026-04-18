import React, { useMemo } from 'react';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, taskStatusLabel, roleLabel } from '../lib/helpers';

export default function DashboardPage() {
  const { tasks, threads, notifications, orgUnits, users, currentUser, directManager } = useApp();

  const stats = useMemo(() => ([
    { title: 'المهام الحالية', value: tasks.filter((item) => item.status_key !== 'completed').length },
    { title: 'المهام المتأخرة', value: tasks.filter((item) => item.status_key === 'overdue').length },
    { title: 'المراسلات المفتوحة', value: threads.filter((item) => item.status_key !== 'archived').length },
    { title: 'الإشعارات', value: notifications.filter((item) => !item.is_read).length }
  ]), [tasks, threads, notifications]);

  const recentTasks = tasks.slice(0, 5);
  const latestNotifications = notifications.slice(0, 5);
  const role = currentUser?.role_key;
  const dashboardTitle = role === 'employee' ? 'لوحة الموظف' : role === 'department_manager' ? 'لوحة رئيس الإدارة' : 'لوحة المدير العام';

  return (
    <div className="page-stack">
      <Card title={dashboardTitle} subtitle={`تم تخصيص هذه الشاشة حسب الدور الحالي: ${roleLabel(role)}`} />
      <div className="stats-grid">{stats.map((item) => <StatCard key={item.title} title={item.title} value={item.value} />)}</div>

      {role === 'employee' ? (
        <div className="grid-2 responsive-stack">
          <Card title="بياناتي" subtitle="معلوماتي الأساسية داخل النظام">
            <div className="list-stack">
              <div className="list-row"><div><strong>المدير المباشر</strong><p>{directManager?.full_name_ar || 'غير محدد'}</p></div></div>
              <div className="list-row"><div><strong>الجهة التابعة</strong><p>{currentUser?.orgUnitName || '—'}</p></div></div>
              <div className="list-row"><div><strong>مهامي الحالية</strong></div><span className="badge neutral">{tasks.filter((t) => t.status_key !== 'completed').length}</span></div>
              <div className="list-row"><div><strong>مهامي المتأخرة</strong></div><span className="badge">{tasks.filter((t) => t.status_key === 'overdue').length}</span></div>
            </div>
          </Card>
          <Card title="إشعاراتي" subtitle="آخر ما وصل إليك">
            <div className="list-stack">
              {latestNotifications.length ? latestNotifications.map((item) => <div key={item.id} className="list-row vertical"><div><strong>{item.title_ar}</strong><p>{item.body_ar}</p></div><small className="muted">{formatDateTime(item.created_at)}</small></div>) : <p className="muted">لا توجد إشعارات حديثة.</p>}
            </div>
          </Card>
        </div>
      ) : role === 'department_manager' ? (
        <div className="grid-2 responsive-stack">
          <Card title="ملخص الإدارة" subtitle={`مرحبًا ${currentUser?.name || ''}`}>
            <div className="list-stack">
              <div className="list-row"><div><strong>المهام الواردة إلى الإدارة</strong></div><span className="badge neutral">{tasks.filter((t) => t.current_org_unit_id === currentUser?.org_unit_id).length}</span></div>
              <div className="list-row"><div><strong>المهام الخارجة من الإدارة</strong></div><span className="badge neutral">{tasks.filter((t) => t.created_from_org_unit_id === currentUser?.org_unit_id).length}</span></div>
              <div className="list-row"><div><strong>الموظفون التابعون</strong></div><span className="badge neutral">{users.filter((u) => u.org_unit_id === currentUser?.org_unit_id && u.role_key === 'employee').length}</span></div>
            </div>
          </Card>
          <Card title="أحدث الإشعارات" subtitle="آخر ما وصل إلى إدارتك">
            <div className="list-stack">{latestNotifications.length ? latestNotifications.map((item) => <div key={item.id} className="list-row vertical"><div><strong>{item.title_ar}</strong><p>{item.body_ar}</p></div><small className="muted">{formatDateTime(item.created_at)}</small></div>) : <p className="muted">لا توجد إشعارات حديثة.</p>}</div>
          </Card>
        </div>
      ) : (
        <div className="grid-2 responsive-stack">
          <Card title="ملخص الشركة" subtitle={`مرحبًا ${currentUser?.name || ''}`}>
            <div className="list-stack">
              <div className="list-row"><div><strong>عدد الجهات الإدارية</strong></div><span className="badge neutral">{orgUnits.length}</span></div>
              <div className="list-row"><div><strong>عدد المستخدمين</strong></div><span className="badge neutral">{users.length}</span></div>
              <div className="list-row"><div><strong>المهام المكتملة</strong></div><span className="badge">{tasks.filter((item) => item.status_key === 'completed').length}</span></div>
            </div>
          </Card>
          <Card title="أحدث الإشعارات" subtitle="آخر ما وصل إلى حسابك">
            <div className="list-stack">{latestNotifications.length ? latestNotifications.map((item) => <div key={item.id} className="list-row vertical"><div><strong>{item.title_ar}</strong><p>{item.body_ar}</p></div><small className="muted">{formatDateTime(item.created_at)}</small></div>) : <p className="muted">لا توجد إشعارات حديثة.</p>}</div>
          </Card>
        </div>
      )}

      <Card title="آخر المهام" subtitle="المهام الأحدث في نطاق صلاحيتك">
        <div className="table-wrap">
          <table>
            <thead><tr><th>الرقم</th><th>العنوان</th><th>الحالة</th><th>التقدم</th><th>تاريخ الإنشاء</th></tr></thead>
            <tbody>
              {recentTasks.map((task) => <tr key={task.id}><td>{task.task_no}</td><td>{task.title_ar}</td><td>{taskStatusLabel(task.status_key)}</td><td>{task.overall_progress}%</td><td>{formatDateTime(task.created_at)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
