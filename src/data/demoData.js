export const currentUser = {
  id: 'u1',
  name: 'محمد إبراهيم التومي',
  role: 'مدير عام',
  orgUnit: 'الإدارة العامة'
};

export const kpis = [
  { title: 'المهام الجديدة', value: 18 },
  { title: 'المهام المتأخرة', value: 4 },
  { title: 'قيد التنفيذ', value: 27 },
  { title: 'المراسلات الجديدة', value: 9 }
];

export const tasks = [
  {
    id: 'T-1001',
    title: 'تجهيز طلبية خط الجميل',
    priority: 'عاجل',
    status: 'قيد التنفيذ',
    progress: 68,
    requester: 'المبيعات',
    currentUnit: 'المخازن',
    assignee: 'هشام اللافي',
    due: '2026-04-18 12:00',
    timeline: [
      { step: 'المبيعات', status: 'مكتمل', note: 'تم اعتماد الطلبية' },
      { step: 'إدخال البيانات', status: 'مكتمل', note: 'تم إدخال الأصناف' },
      { step: 'المخازن', status: 'قيد التنفيذ', note: 'جارٍ التجهيز' },
      { step: 'الحركة', status: 'بانتظار' }
    ]
  },
  {
    id: 'T-1002',
    title: 'مراجعة طلب صرف داخلي',
    priority: 'متوسط',
    status: 'بانتظار اعتماد',
    progress: 85,
    requester: 'الشؤون الإدارية',
    currentUnit: 'الحسابات',
    assignee: 'محمد موسى التومي',
    due: '2026-04-18 16:00',
    timeline: [
      { step: 'الشؤون الإدارية', status: 'مكتمل' },
      { step: 'الحسابات', status: 'بانتظار اعتماد', note: 'قيد المراجعة النهائية' }
    ]
  },
  {
    id: 'T-1003',
    title: 'مهمة جرد يومي للمخزن',
    priority: 'عادي',
    status: 'جديدة',
    progress: 0,
    requester: 'الإدارة العامة',
    currentUnit: 'المخازن',
    assignee: 'موظف الوردية الصباحية',
    due: '2026-04-17 20:00',
    timeline: [
      { step: 'المخازن', status: 'بانتظار' }
    ]
  }
];

export const threads = [
  {
    id: 'M-201',
    subject: 'استفسار عن جاهزية طلبية صرمان',
    from: 'المبيعات',
    to: 'المخازن',
    status: 'تم الرد',
    lastMessage: 'تم تجهيز 70% من الطلبية وسيكتمل خلال ساعة.',
    updatedAt: '2026-04-17 10:20'
  },
  {
    id: 'M-202',
    subject: 'تعميم بخصوص دوام السبت',
    from: 'الشؤون الإدارية',
    to: 'جميع الأقسام',
    status: 'جديدة',
    lastMessage: 'يرجى الالتزام بمواعيد الحضور الجديدة ابتداءً من الأسبوع القادم.',
    updatedAt: '2026-04-17 09:15'
  }
];

export const orgTree = [
  {
    id: 'o1',
    name: 'الإدارة العامة',
    children: [
      {
        id: 'o2',
        name: 'المبيعات',
        children: [
          {
            id: 'o3',
            name: 'خطوط المباشر',
            children: [
              {
                id: 'o4',
                name: 'قطاع غرب',
                children: [
                  { id: 'o5', name: 'خط الجميل' },
                  { id: 'o6', name: 'خط رقدالين' },
                  { id: 'o7', name: 'خط العجيلات' }
                ]
              }
            ]
          }
        ]
      },
      { id: 'o8', name: 'المخازن' },
      { id: 'o9', name: 'الحركة' },
      { id: 'o10', name: 'الحسابات' }
    ]
  }
];

export const users = [
  { id: 'u1', name: 'محمد إبراهيم التومي', role: 'مدير عام', unit: 'الإدارة العامة', status: 'نشط' },
  { id: 'u2', name: 'هيثم التومي', role: 'رئيس قسم', unit: 'المبيعات', status: 'نشط' },
  { id: 'u3', name: 'هشام اللافي', role: 'موظف', unit: 'المخازن', status: 'نشط' },
  { id: 'u4', name: 'محمد موسى التومي', role: 'موظف', unit: 'الحسابات', status: 'نشط' }
];

export const backups = [
  { id: 'b1', name: 'backup-2026-04-17-0100.json', createdAt: '2026-04-17 01:00', size: '2.1 MB', status: 'مكتمل' },
  { id: 'b2', name: 'backup-2026-04-16-0100.json', createdAt: '2026-04-16 01:00', size: '2.0 MB', status: 'مكتمل' }
];
