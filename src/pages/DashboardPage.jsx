import React, { useMemo } from 'react';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, taskStatusLabel } from '../lib/helpers';

export default function DashboardPage() {
  const { tasks, threads, notifications, orgUnits, users, currentUser } = useApp();

  const stats = useMemo(() => ([
    { title: 'المهام الجديدة', value: tasks.filter((item) => item.status_key === 'new').length },
    { title: 'المهام المتأخرة', value: tasks.filter((item) => item.status_key === 'overdue').length },
    { title: 'المراسلات المفتوحة', value: threads.filter((item) => item.status_key !== 'archived').length },
    { title: 'المستخدمون النشطون', value: users.filter((item) => item.is_active).length }
  ]), [tasks, threads, users]);

  const recentTasks = tasks.slice(0, 5);
  const latestNotifications = notifications.slice(0, 5);

  return (
    <div className="page-stack">
      <div className="stats-grid">
        {stats.map((item) => <StatCard key={item.title} title={item.title} value={item.value} />)}
      </div>

      <div className="grid-2">
        <Card title="ملخص التشغيل" subtitle={`مرحبًا ${currentUser?.name || ''}`}>
          <div className="list-stack">
            <div className="list-row"><div><strong>عدد الوحدات التنظيمية</strong><p>هيكل هرمي متعدد المستويات</p></div><span className="badge neutral">{orgUnits.length}</span></div>
            <div className="list-row"><div><strong>عدد المستخدمين</strong><p>يشمل المدير العام ورؤساء الأقسام والموظفين</p></div><span className="badge neutral">{users.length}</span></div>
            <div className="list-row"><div><strong>المهام المكتملة</strong><p>عدد المهام التي تم إنهاؤها بالكامل</p></div><span className="badge">{tasks.filter((item) => item.status_key === 'completed').length}</span></div>
          </div>
        </Card>

        <Card title="أحدث الإشعارات" subtitle="آخر ما وصل إلى حسابك">
          <div className="list-stack">
            {latestNotifications.length ? latestNotifications.map((item) => (
              <div key={item.id} className="list-row vertical">
                <div>
                  <strong>{item.title_ar}</strong>
                  <p>{item.body_ar}</p>
                </div>
                <small className="muted">{formatDateTime(item.created_at)}</small>
              </div>
            )) : <p className="muted">لا توجد إشعارات حديثة.</p>}
          </div>
        </Card>
      </div>

      <Card title="آخر المهام" subtitle="المهام الأحدث في النظام">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>العنوان</th>
                <th>الحالة</th>
                <th>التقدم</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.task_no}</td>
                  <td>{task.title_ar}</td>
                  <td>{taskStatusLabel(task.status_key)}</td>
                  <td>{task.overall_progress}%</td>
                  <td>{formatDateTime(task.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
