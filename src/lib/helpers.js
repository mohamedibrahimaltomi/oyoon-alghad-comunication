
export const ROLE_OPTIONS = [
  { value: 'general_manager', label: 'مدير عام' },
  { value: 'department_manager', label: 'مدير إدارة / رئيس قسم' },
  { value: 'employee', label: 'موظف' },
  { value: 'system_admin', label: 'مسؤول نظام' }
];

export const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'عاجل جدًا', colorClass: 'priority-critical' },
  { value: 'high', label: 'عاجل', colorClass: 'priority-high' },
  { value: 'medium', label: 'متوسط', colorClass: 'priority-medium' },
  { value: 'low', label: 'منخفض', colorClass: 'priority-low' }
];

export const TASK_STATUS_LABELS = {
  draft: 'مسودة',
  new: 'جديدة',
  received: 'مستلمة',
  assigned: 'موجهة',
  in_progress: 'قيد التنفيذ',
  under_review: 'قيد المراجعة',
  pending_approval: 'بانتظار اعتماد',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
  overdue: 'متأخرة',
  archived: 'مؤرشفة',
  pending: 'بانتظار',
  skipped: 'متخطاة'
};

export const defaultMessageTypes = [
  { value: 'inquiry', label: 'استفسار', is_active: true },
  { value: 'notice', label: 'إبلاغ', is_active: true },
  { value: 'alert', label: 'تنبيه', is_active: true },
  { value: 'follow_up', label: 'متابعة', is_active: true },
  { value: 'circular', label: 'تعميم', is_active: true },
  { value: 'document_request', label: 'طلب مستند', is_active: true }
];

export function formatDateTime(value) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ar-LY', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function roleLabel(roleKey) {
  return ROLE_OPTIONS.find((item) => item.value === roleKey)?.label || roleKey;
}

export function priorityLabel(priorityKey) {
  return PRIORITY_OPTIONS.find((item) => item.value === priorityKey)?.label || priorityKey;
}

export function priorityClass(priorityKey) {
  return PRIORITY_OPTIONS.find((item) => item.value === priorityKey)?.colorClass || 'priority-medium';
}

export function messageTypeLabel(typeKey, customTypes = defaultMessageTypes) {
  return customTypes.find((item) => item.value === typeKey)?.label || typeKey;
}

export function taskStatusLabel(statusKey) {
  return TASK_STATUS_LABELS[statusKey] || statusKey;
}

export function buildOrgTree(units) {
  const map = new Map();
  units.forEach((unit) => map.set(unit.id, { ...unit, children: [] }));
  const roots = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id).children.push(node);
    else roots.push(node);
  });
  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_ar.localeCompare(b.name_ar));
    nodes.forEach((child) => sortRecursive(child.children));
    return nodes;
  };
  return sortRecursive(roots);
}

export function flattenUnits(tree, depth = 0) {
  return tree.flatMap((node) => [
    { id: node.id, label: `${'— '.repeat(depth)}${node.name_ar}`, node },
    ...(node.children?.length ? flattenUnits(node.children, depth + 1) : [])
  ]);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function normalizeHierarchyType(type) {
  const value = `${type?.code || ''} ${type?.name_ar || ''}`.toLowerCase();
  if (value.includes('عليا') || value.includes('executive') || value.includes('general')) return 'top';
  if (value.includes('ادارة') || value.includes('إدارة') || value.includes('management')) return 'department';
  if (value.includes('فرعي')) return 'subsection';
  if (value.includes('قسم') || value.includes('section')) return 'section';
  if (value.includes('قطاع') || value.includes('sector')) return 'sector';
  if (value.includes('خط') || value.includes('line')) return 'line';
  return 'other';
}

export function allowedParentHierarchyKeys(childKey) {
  const rules = {
    top: [],
    department: ['top'],
    section: ['department'],
    subsection: ['section'],
    sector: ['section', 'subsection'],
    line: ['sector']
  };
  return rules[childKey] || ['top', 'department', 'section', 'subsection', 'sector', 'line'];
}

export function getAllowedParentUnits(orgUnits, orgUnitTypes, selectedTypeId) {
  if (!selectedTypeId) return [];
  const selectedType = orgUnitTypes.find((item) => item.id === selectedTypeId);
  const childKey = normalizeHierarchyType(selectedType);
  const allowed = allowedParentHierarchyKeys(childKey);
  if (!allowed.length) return [];
  return orgUnits.filter((unit) => {
    const unitType = orgUnitTypes.find((item) => item.id === unit.type_id);
    return allowed.includes(normalizeHierarchyType(unitType));
  });
}

export function getDescendantUnitIds(orgUnits, rootId) {
  const ids = new Set();
  const walk = (id) => {
    ids.add(id);
    orgUnits.filter((item) => item.parent_id === id).forEach((child) => walk(child.id));
  };
  if (rootId) walk(rootId);
  return [...ids];
}

export function getParentUnit(orgUnits, unitId) {
  const unit = orgUnits.find((item) => item.id === unitId);
  if (!unit?.parent_id) return null;
  return orgUnits.find((item) => item.id === unit.parent_id) || null;
}
