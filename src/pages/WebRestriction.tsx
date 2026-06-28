import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Globe,
  Info,
  Laptop,
  Layers,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  Lock,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';


import restrictionService, {
  getCurrentLoginId,
  RestrictionModule,
  RestrictionPackage,
  RestrictionPackageFile,
  PackageManagerPayload,
  RestrictionPolicyDetail,
  RestrictionPolicyRow,
  RestrictionStatusRow,
  RestrictionTarget,
  RestrictionTreeNode,
  WebGroup,
  WebGroupUrl,
  WhitelistSoftware,
} from '../services/restrictionService';

type SubTab = 'status' | 'settings' | 'policyStatus';
type NoticeTone = 'success' | 'warning' | 'error' | 'info';
type NoticeState = { id: number; text: string; tone: NoticeTone } | null;

type ModuleConfig = {
  id: RestrictionModule;
  label: string;
  helper: string;
  policyType: number;
  icon: LucideIcon;
  color: 'rose' | 'emerald' | 'blue';
  tabs: SubTab[];
};

type FormState = {
  policyId: number;
  inheritPolicy: boolean;
  exception: boolean;
  updateInterval: string;
  weeklyPolicy: boolean;
  useSchedule: boolean;
  schedule1: string;
  schedule2: string;
  schedule3: string;
  schedule4: string;
  appRestrictType: '1' | '2' | '3';
  versionCompare: boolean;
  appNoticeMessage: string;
  processRestrictType: '0' | '1' | '2' | '3';
  processNoticeMessage: string;
  fontRestrictType: '0' | '1' | '2' | '3';
  fontNoticeMessage: string;
  webRestrictType: '1' | '2';
  defaultUrl: string;
};

const modules: ModuleConfig[] = [
  {
    id: 'webRestriction',
    label: 'Web Restriction',
    helper: 'Website restriction policy',
    policyType: 1005,
    icon: Globe,
    color: 'blue',
    tabs: ['settings', 'policyStatus'],
  },
];

const tabLabels: Record<SubTab, string> = {
  status: 'Restriction Status',
  settings: 'Policy Settings',
  policyStatus: 'Policy Status',
};

const initialForm: FormState = {
  policyId: 0,
  inheritPolicy: false,
  exception: false,
  updateInterval: '120',
  weeklyPolicy: false,
  useSchedule: false,
  schedule1: '',
  schedule2: '',
  schedule3: '',
  schedule4: '',
  appRestrictType: '1',
  versionCompare: false,
  appNoticeMessage: '',
  processRestrictType: '0',
  processNoticeMessage: '',
  fontRestrictType: '0',
  fontNoticeMessage: '',
  webRestrictType: '1',
  defaultUrl: '127.0.0.1',
};

const dayOptions = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const APPWEB_TABLE_PAGE_SIZE = 10;
const APPWEB_SETTING_LIST_PAGE_SIZE = 8;

type AppTableColumn<RowType> = {
  key: keyof RowType | string;
  header: ReactNode;
  width?: number | string;
  align?: 'start' | 'center' | 'end';
  render?: (row: RowType, index: number) => ReactNode;
};

type AppTableProps<RowType extends { [key: string]: any }> = {
  className?: string;
  columns: AppTableColumn<RowType>[];
  rows: RowType[];
  rowKey?: keyof RowType | string | ((row: RowType, index: number) => string | number);
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  summary?: ReactNode;
};

type AppButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'light';
  loading?: boolean;
  leftIcon?: ReactNode;
};

type CompactPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

function CompactPagination({
  page,
  totalPages,
  totalCount,
  pageSize = APPWEB_SETTING_LIST_PAGE_SIZE,
  onPageChange,
}: CompactPaginationProps) {
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalCount, safePage * pageSize);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    if (totalPages <= 5) return true;
    return item === 1 || item === totalPages || Math.abs(item - safePage) <= 1;
  });

  return (
    <div>
      <span>{start}-{end} of {totalCount}</span>
      <div aria-label="Pagination controls">
        <button type="button" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)}>
          Prev
        </button>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          const needsGap = previous && item - previous > 1;
          return (
            <span key={item}>
              {needsGap && <span>...</span>}
              <button type="button" onClick={() => onPageChange(item)}>
                {item}
              </button>
            </span>
          );
        })}
        <button type="button" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function getPaginationState<T>(items: T[], page: number, pageSize = APPWEB_SETTING_LIST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return {
    totalPages,
    safePage,
    startIndex,
    pageItems: items.slice(startIndex, startIndex + pageSize),
  };
}

function getFastRowKey(row: Record<string, unknown>, index: number, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return `${key}-${value}`;
  }
  return `row-${index}`;
}

function AppButton({
  size = 'md',
  variant = 'primary',
  loading = false,
  leftIcon,
  className,
  children,
  disabled,
  ...props
}: AppButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const variantClass = variant === 'primary' ? 'primary-btn' : variant === 'secondary' ? 'soft-btn' : 'soft-btn';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={13} /> : leftIcon}
      {children}
    </button>
  );
}

function AppTable<RowType extends { [key: string]: any }>({
  className,
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'No records',
  emptyDescription = 'No data available.',
  summary,
}: AppTableProps<RowType>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / APPWEB_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * APPWEB_TABLE_PAGE_SIZE;
  const pagedRows = rows.slice(startIndex, startIndex + APPWEB_TABLE_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const resolveRowKey = (row: RowType, index: number) => {
    if (typeof rowKey === 'function') return rowKey(row, index);
    if (rowKey && row[rowKey as keyof RowType] !== undefined) return String(row[rowKey as keyof RowType]);
    return `${startIndex + index}`;
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    if (totalPages <= 7) return true;
    return item === 1 || item === totalPages || Math.abs(item - safePage) <= 1;
  });
  const pageStart = rows.length === 0 ? 0 : startIndex + 1;
  const pageEnd = Math.min(rows.length, startIndex + APPWEB_TABLE_PAGE_SIZE);

  return (
    <div>
      {summary && <div>{summary}</div>}
      <div>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <span>
                    <Loader2 size={16} /> Loading records...
                  </span>
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div>{emptyTitle}</div>
                  <div>{emptyDescription}</div>
                </td>
              </tr>
            ) : (
              pagedRows.map((row, rowIndex) => (
                <tr key={resolveRowKey(row, rowIndex)}>
                  {columns.map((column) => {
                    const value = column.render ? column.render(row, startIndex + rowIndex) : row[column.key as keyof RowType];
                    return (
                      <td
                        key={String(column.key)}
                      >
                        {value as ReactNode}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > APPWEB_TABLE_PAGE_SIZE && (
        <div>
          <span>{pageStart}-{pageEnd} of {rows.length}</span>
          <div aria-label="Table pagination controls">
            <button type="button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Prev
            </button>
            {pages.map((item, index) => {
              const previous = pages[index - 1];
              const needsGap = previous && item - previous > 1;
              return (
                <span key={item}>
                  {needsGap && <span>...</span>}
                  <button type="button" onClick={() => setPage(item)}>
                    {item}
                  </button>
                </span>
              );
            })}
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldClass = 'setting-input';
const labelClass = 'form-field-label';
const sectionTitleClass = 'section-tag';

const colorClasses = {
  rose: {
    icon: 'bg-rose-600 text-white shadow-rose-200',
    soft: 'border-rose-100 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
  emerald: {
    icon: 'bg-emerald-600 text-white shadow-emerald-200',
    soft: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  blue: {
    icon: 'bg-blue-600 text-white shadow-blue-200',
    soft: 'border-blue-100 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const getRowText = (row: Record<string, unknown>, keys: string[], fallback = '-'): string => {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    key.toLowerCase().replace(/[\s_\-().]/g, ''),
    value,
  ]);
  const normalizedRow = Object.fromEntries(normalizedEntries);

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_\-().]/g, '');
    const value = normalizedRow[normalizedKey];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }

  return fallback;
};

const getRestrictionDisplayLabel = (node: Pick<RestrictionTreeNode, 'type' | 'label'>, depth = 0) => {
  const label = String(node.label || '').trim();
  if (depth === 0 || node.type === 'org' || node.type === 'root') return 'All Branches';
  return label || 'Unnamed Scope';
};

const toTarget = (node: RestrictionTreeNode): RestrictionTarget | null => {
  if (node.type === 'org' || node.type === 'root') {
    return {
      id: node.id || 'organization',
      label: getRestrictionDisplayLabel(node, 0),
      type: 'root',
      target_type: 1,
      target_id: '-1',
      Object_Full_Name: 'Root Policy',
    };
  }

  if (!node.target_type || !node.target_id) return null;

  return {
    id: node.id,
    label: node.label,
    type: node.type,
    target_type: node.target_type,
    target_id: node.target_id,
    Object_Rel_Idn: node.Object_Rel_Idn,
    Object_Root_Idn: node.Object_Root_Idn,
    Object_DeviceID: node.Object_DeviceID,
    Object_Full_Name: node.Object_Full_Name,
  };
};

const findFirstTarget = (nodes: RestrictionTreeNode[]): RestrictionTarget | null => {
  for (const node of nodes) {
    const target = toTarget(node);
    if (target) return target;

    const childTarget = findFirstTarget(node.children || []);
    if (childTarget) return childTarget;
  }
  return null;
};

const filterRestrictionTree = (nodes: RestrictionTreeNode[], query: string): RestrictionTreeNode[] => {
  const search = query.trim().toLowerCase();
  if (!search) return nodes;

  return nodes
    .map((node) => {
      const children = filterRestrictionTree(node.children || [], search);
      const matches = [node.label, node.Object_Full_Name, node.Object_DeviceID, node.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));

      if (matches) return { ...node };
      return children.length ? { ...node, children } : null;
    })
    .filter((node): node is RestrictionTreeNode => Boolean(node));
};

const getSetting = (policy: RestrictionPolicyDetail | null, key: string, fallback = '') => {
  if (!policy) return fallback;
  const direct = policy.settings?.[key];
  if (direct !== undefined && direct !== null && String(direct) !== '') return String(direct);
  const item = policy.settingItems?.find((entry) => entry.policy_key === key);
  return item?.policy_value !== undefined ? String(item.policy_value) : fallback;
};

const getSettingValues = (policy: RestrictionPolicyDetail | null, key: string): string[] => {
  if (!policy?.settingItems) return [];
  return policy.settingItems
    .filter((entry) => entry.policy_key === key)
    .sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0))
    .map((entry) => String(entry.policy_value || ''))
    .filter(Boolean);
};

const splitDays = (value: string) => {
  if (!value) return [];
  const upper = value.toUpperCase();
  if (upper.includes(',')) return upper.split(',').map((day) => day.trim()).filter(Boolean);
  return dayOptions.filter((day) => upper.includes(day));
};

const pickRuntimeValue = (item: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!item) return undefined;

  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }

  const existingKey = Object.keys(item).find((itemKey) =>
    keys.some((key) => itemKey.toLowerCase() === key.toLowerCase()),
  );

  if (!existingKey) return undefined;
  const value = item[existingKey];
  return value !== undefined && value !== null && String(value).trim() !== '' ? value : undefined;
};

const normalizeSelectionKey = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value).trim().toLowerCase().replace(/\s+/g, ' ');

const getPackageId = (item: Partial<RestrictionPackage> | null | undefined): string => {
  const value = pickRuntimeValue(item as Record<string, unknown> | null | undefined, [
    'SW_Pkg_Idn',
    'SW_Pkg_IDN',
    'sw_pkg_idn',
    'SW_PKG_IDN',
    'PackageID',
    'packageId',
    'id',
  ]);

  return value === undefined || value === null ? '' : String(value);
};

const getPackageName = (item: Partial<RestrictionPackage> | null | undefined): string => {
  const value = pickRuntimeValue(item as Record<string, unknown> | null | undefined, [
    'SW_Pkg_Name',
    'SW_Pkg_NAME',
    'sw_pkg_name',
    'SW_PKG_NAME',
    'PackageName',
    'packageName',
    'Name',
    'name',
  ]);

  return value === undefined || value === null ? '' : String(value);
};

const getWhitelistId = (item: Partial<WhitelistSoftware> | null | undefined): string => {
  const value = pickRuntimeValue(item as Record<string, unknown> | null | undefined, [
    'WLSWIdn',
    'WLSWIDN',
    'wlSwIdn',
    'wlsw_idn',
    'id',
  ]);

  return value === undefined || value === null ? '' : String(value);
};

const getWhitelistName = (item: Partial<WhitelistSoftware> | null | undefined): string => {
  const value = pickRuntimeValue(item as Record<string, unknown> | null | undefined, [
    'Name',
    'name',
    'SW_Name',
    'softwareName',
  ]);

  return value === undefined || value === null ? '' : String(value);
};

const uniqueStrings = (values: Array<string | number | null | undefined>): string[] => [
  ...new Set(values.map((value) => (value === undefined || value === null ? '' : String(value))).filter(Boolean)),
];


function getRestrictionTreeCount(node: RestrictionTreeNode): number {
  const record = node as RestrictionTreeNode & Record<string, unknown>;
  const directCandidates = [record.badge, record.count, record.total, record.Total, record.deviceCount, record.DeviceCount, record.TotalDevices];

  for (const candidate of directCandidates) {
    const parsed = Number(String(candidate ?? '').replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  if (node.type === 'device') return 1;
  return (node.children || []).reduce((total, child) => total + getRestrictionTreeCount(child), 0);
}

function formatRestrictionTreeCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('en-MY').format(value);
}

const createFormFromPolicy = (
  module: RestrictionModule,
  policy: RestrictionPolicyDetail | null,
  selectedTarget: RestrictionTarget | null,
): FormState => {
  const schedules = module === 'webRestriction'
    ? getSettingValues(policy, 'WebRestrictSchedule')
    : getSettingValues(policy, 'SoftwareRestrictSchedule');
  const expectedSource = selectedTarget?.type === 'device' ? 'device' : selectedTarget?.type === 'root' ? 'root' : 'department';
  const inheritedFromParent = Boolean(policy?.source && policy.source !== 'none' && selectedTarget && policy.source !== expectedSource);

  return {
    policyId: Number(policy?.policy_id || 0),
    inheritPolicy: inheritedFromParent || getSetting(policy, 'parent_policy', '0') !== '0',
    exception: getSetting(policy, 'use_policy', '1') === '0',
    updateInterval: getSetting(policy, module === 'appWhitelist' ? 'update_log_interval' : 'update_policy_result_interval', '120'),
    weeklyPolicy: getSetting(policy, 'use_weekly_policy', '0') === '1',
    useSchedule: getSetting(policy, 'use_schedule', '0') === '1',
    schedule1: schedules[0] || '',
    schedule2: schedules[1] || '',
    schedule3: schedules[2] || '',
    schedule4: schedules[3] || '',
    appRestrictType: (getSetting(policy, 'SoftwareRestrictType', '1') as FormState['appRestrictType']) || '1',
    versionCompare: getSetting(policy, 'SoftwareRestrictCheckVerson', '0') === '1',
    appNoticeMessage: getSetting(policy, 'SoftwareRestrictMessage', ''),
    processRestrictType: (getSetting(policy, 'process_restrict_type', '0') as FormState['processRestrictType']) || '0',
    processNoticeMessage: getSetting(policy, 'process_restrict_message', ''),
    fontRestrictType: (getSetting(policy, 'font_restrict_type', '0') as FormState['fontRestrictType']) || '0',
    fontNoticeMessage: getSetting(policy, 'font_restrict_message', ''),
    webRestrictType: (getSetting(policy, 'WebRestrictType', '1') as FormState['webRestrictType']) || '1',
    defaultUrl: getSetting(policy, 'WebRestrictMessage', '127.0.0.1'),
  };
};

export default function WebRestriction() {
  const [activeModule, setActiveModule] = useState<RestrictionModule>('webRestriction');
  const [activeTab, setActiveTab] = useState<SubTab>('settings');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [treeNodes, setTreeNodes] = useState<RestrictionTreeNode[]>([]);
  const [targetTreeSearch, setTargetTreeSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<RestrictionTarget | null>(null);
  const [policyDetail, setPolicyDetail] = useState<RestrictionPolicyDetail | null>(null);
  const [policyRows, setPolicyRows] = useState<RestrictionPolicyRow[]>([]);
  const [statusRows, setStatusRows] = useState<RestrictionStatusRow[]>([]);
  const [packages, setPackages] = useState<RestrictionPackage[]>([]);
  const [whitelistSoftware, setWhitelistSoftware] = useState<WhitelistSoftware[]>([]);
  const [webGroups, setWebGroups] = useState<WebGroup[]>([]);
  const [webGroupUrls, setWebGroupUrls] = useState<WebGroupUrl[]>([]);
  const [selectedWebsiteGroupId, setSelectedWebsiteGroupId] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [selectedPackageRows, setSelectedPackageRows] = useState<RestrictionPackage[]>([]);
  const [selectedWhitelistIds, setSelectedWhitelistIds] = useState<string[]>([]);
  const [selectedWhitelistRows, setSelectedWhitelistRows] = useState<WhitelistSoftware[]>([]);
  const [webUrls, setWebUrls] = useState<string[]>([]);
  const [webPolicyPage, setWebPolicyPage] = useState(1);
  const [webGroupUrlPage, setWebGroupUrlPage] = useState(1);
  const [newUrl, setNewUrl] = useState('');
  const [showWebGroupManager, setShowWebGroupManager] = useState(false);
  const [webGroupName, setWebGroupName] = useState('');
  const [webGroupDescription, setWebGroupDescription] = useState('');
  const [webGroupDomainInput, setWebGroupDomainInput] = useState('');
  const [editingWebGroup, setEditingWebGroup] = useState<WebGroup | null>(null);
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [includeSub, setIncludeSub] = useState(true);
  const [showManageSoftware, setShowManageSoftware] = useState(false);
  const [manageSearchText, setManageSearchText] = useState('');
  const [manageFileTab, setManageFileTab] = useState<'process' | 'font'>('process');
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [packageManagerRows, setPackageManagerRows] = useState<RestrictionPackage[]>([]);
  const [selectedManagerPackage, setSelectedManagerPackage] = useState<RestrictionPackage | null>(null);
  const [packageManagerSearch, setPackageManagerSearch] = useState('');
  const [packageFileSearch, setPackageFileSearch] = useState('');
  const [packageInventoryFiles, setPackageInventoryFiles] = useState<RestrictionPackageFile[]>([]);
  const [packageForm, setPackageForm] = useState<PackageManagerPayload>({ SW_Pkg_Name: '', SW_Pkg_Company: '', License_Qnt: 0, Use_Statistices: 1, Cur_Count: 0, SW_Package_EtcInfo: '', SW_Catg: 0, Selected: 1 });
  const [packageManagerLoading, setPackageManagerLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const treeInitializedRef = useRef(false);

  const moduleConfig = modules.find((module) => module.id === activeModule) || modules[0];
  const filteredTreeNodes = useMemo(() => filterRestrictionTree(treeNodes, targetTreeSearch), [treeNodes, targetTreeSearch]);
  const tone = colorClasses[moduleConfig.color];
  // App Whitelist must stay editable even when the displayed effective policy is inherited.
  // Saving App Whitelist for a selected device/department should create/update a policy
  // on that selected target instead of keeping it locked to Root/parent policy.
  const isInherited = activeModule === 'appWhitelist' ? false : form.inheritPolicy;


  useEffect(() => {
    if (!message) return;

    const lower = message.toLowerCase();
    const tone: NoticeTone = lower.includes('failed') || lower.includes('error') || lower.includes('cannot')
      ? 'error'
      : lower.includes('required') || lower.includes('first') || lower.includes('select') || lower.includes('enter') || lower.includes('no ')
        ? 'warning'
        : lower.includes('loading') || lower.includes('requested')
          ? 'info'
          : 'success';

    setNotice({ id: Date.now(), text: message, tone });

    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), tone === 'error' ? 6500 : 4500);

    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, [message]);

  const dismissNotice = () => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice(null);
  };

  useEffect(() => {
    setWebPolicyPage(1);
  }, [webUrls.length, activeModule, activeTab]);

  useEffect(() => {
    setWebGroupUrlPage(1);
  }, [webGroupUrls.length, selectedWebsiteGroupId, activeModule, activeTab]);

  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active', 'ema-appwebrestriction-page-active');
    document.body.classList.add('ema-settings-page-active', 'ema-appwebrestriction-page-active');

    return () => {
      document.documentElement.classList.remove('ema-settings-page-active', 'ema-appwebrestriction-page-active');
      document.body.classList.remove('ema-settings-page-active', 'ema-appwebrestriction-page-active');
    };
  }, []);


  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      const data = await restrictionService.getTree();
      setTreeNodes(data);

      setExpandedGroups((previous) => {
        if (treeInitializedRef.current) return previous;

        const initialExpanded = new Set<string>();
        data.forEach((node) => {
          initialExpanded.add(node.id);
          (node.children || []).slice(0, 2).forEach((child) => initialExpanded.add(child.id));
        });
        treeInitializedRef.current = true;
        return initialExpanded;
      });

      setSelectedTarget((previous) => {
        if (previous) return previous;
        return findFirstTarget(data) || null;
      });
    } catch (error) {
      setMessage('Branch view is not available right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const [packageData, whitelistData, groupData] = await Promise.all([
        restrictionService.getPackages(),
        restrictionService.getWhitelistSoftware(),
        restrictionService.getWebGroups(),
      ]);
      setPackages(packageData);
      setWhitelistSoftware(whitelistData);
      setWebGroups(groupData);
      setSelectedWebsiteGroupId((previous) => previous || groupData[0]?.idx || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load restriction lookup data.');
    }
  }, []);

  const loadPolicyData = useCallback(async () => {
    const target: RestrictionTarget = selectedTarget || {
      id: 'root-policy',
      label: 'All Branches',
      type: 'root',
      target_type: 1,
      target_id: '-1',
      Object_Full_Name: 'Root Policy',
    };

    try {
      setLoading(true);
      const [detail, policies, status] = await Promise.all([
        restrictionService.getEffectivePolicy(activeModule, target),
        restrictionService.getPolicyList(activeModule, target),
        activeModule === 'webRestriction'
          ? Promise.resolve([])
          : restrictionService.getRestrictionStatus(activeModule, target, {
              startDate,
              endDate,
              includeSub: includeSub ? 1 : 0,
            }),
      ]);

      setPolicyDetail(detail);
      setPolicyRows(policies);
      setStatusRows(status);
      setForm(createFormFromPolicy(activeModule, detail, target));
      const policyPackages = detail.packages || [];
      const policyWhitelist = detail.whitelistSoftware || [];
      const policyPackageIds = detail.selectedPackageIds?.length
        ? detail.selectedPackageIds
        : policyPackages.map((item) => getPackageId(item));
      const policyWhitelistIds = detail.selectedWhitelistIds?.length
        ? detail.selectedWhitelistIds
        : policyWhitelist.map((item) => getWhitelistId(item));

      setSelectedDays(splitDays(getSetting(detail, 'work_weekly', '')));
      setSelectedPackageRows(policyPackages);
      setSelectedPackageIds(uniqueStrings(policyPackageIds));
      setSelectedWhitelistRows(policyWhitelist);
      setSelectedWhitelistIds(uniqueStrings(policyWhitelistIds));
      setWebUrls(detail.urls || getSettingValues(detail, 'WebRestrictUrl'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load restriction policy data.');
    } finally {
      setLoading(false);
    }
  }, [activeModule, selectedTarget, startDate, endDate, includeSub]);

  const normalizeWebDomain = (value: string) => {
    return value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[\s,]+/)[0]
      .split('/')[0]
      .toLowerCase();
  };

  const getWebGroupUrlValue = (item: unknown): string => {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';

    const record = item as Record<string, unknown>;
    return String(record.url ?? record.URL ?? record.Url ?? record.DomainName ?? record.domainName ?? record.WebUrl ?? record.webUrl ?? '').trim();
  };

  const normalizeWebGroupUrlRows = (rows: unknown, fallbackGroupId = selectedWebsiteGroupId || editingWebGroup?.idx || 0): WebGroupUrl[] => {
    const sourceRows = Array.isArray(rows)
      ? rows
      : Array.isArray((rows as { data?: unknown[] })?.data)
        ? (rows as { data: unknown[] }).data
        : [];

    return sourceRows
      .map((item, index) => {
        const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const url = getWebGroupUrlValue(item);
        if (!url) return null;

        return {
          ...(record as Partial<WebGroupUrl>),
          idx: Number(record.idx ?? record.IDX ?? record.groupId ?? record.GroupId ?? fallbackGroupId) || fallbackGroupId,
          seq: Number(record.seq ?? record.Seq ?? record.SEQ ?? record.sequence ?? record.Sequence ?? index + 1) || index + 1,
          url,
        } as WebGroupUrl;
      })
      .filter((item): item is WebGroupUrl => Boolean(item));
  };

  const mergeWebGroupUrlRows = (currentRows: WebGroupUrl[], nextRows: WebGroupUrl[], fallbackGroupId = selectedWebsiteGroupId || editingWebGroup?.idx || 0) => {
    const merged = new Map<string, WebGroupUrl>();

    normalizeWebGroupUrlRows(currentRows, fallbackGroupId).forEach((item) => {
      merged.set(normalizeWebDomain(item.url), item);
    });

    normalizeWebGroupUrlRows(nextRows, fallbackGroupId).forEach((item) => {
      merged.set(normalizeWebDomain(item.url), item);
    });

    return Array.from(merged.values()).sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  };

  const makeWebGroupUrlRow = (groupId: number, url: string): WebGroupUrl => ({
    idx: groupId,
    seq: Math.max(1, ...normalizeWebGroupUrlRows(webGroupUrls, groupId).map((item) => Number(item.seq || 0))) + 1,
    url,
  } as WebGroupUrl);

  const refreshWebGroupUrls = async (groupId: number) => {
    if (!groupId) {
      setWebGroupUrls([]);
      return [] as WebGroupUrl[];
    }

    const urls = normalizeWebGroupUrlRows(await restrictionService.getWebGroupUrls(groupId), groupId);
    setWebGroupUrls(urls);
    return urls;
  };

  const loadWebGroupUrls = useCallback(async () => {
    if (!selectedWebsiteGroupId) {
      setWebGroupUrls([]);
      return;
    }

    try {
      const urls = normalizeWebGroupUrlRows(await restrictionService.getWebGroupUrls(selectedWebsiteGroupId), selectedWebsiteGroupId);
      setWebGroupUrls(urls);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load website group URLs.');
    }
  }, [selectedWebsiteGroupId]);

  useEffect(() => {
    loadTree();
    loadLookups();
  }, [loadTree, loadLookups]);

  useEffect(() => {
    if (activeModule === 'webRestriction' && activeTab === 'status') setActiveTab('settings');
  }, [activeModule, activeTab]);

  useEffect(() => {
    loadPolicyData();
  }, [loadPolicyData]);

  useEffect(() => {
    loadWebGroupUrls();
  }, [loadWebGroupUrls]);

  const summaryCards = useMemo(() => {
    const appliedStatus = form.exception ? 'Disabled' : 'Enabled';
    const source = policyDetail?.source === 'none' ? 'No policy' : policyDetail?.source || 'No policy';

    if (activeModule === 'appBlacklist') {
      return [
        { label: 'Policy Type', value: '1006', helper: 'App blacklist', icon: ShieldAlert, tone: 'rose' },
        { label: 'Selected Packages', value: selectedPackageIds.length, helper: 'Blocked package list', icon: Package, tone: 'amber' },
        { label: 'Restriction', value: appRestrictionLabel(form.appRestrictType), helper: appliedStatus, icon: Ban, tone: 'slate' },
        { label: 'Policy Source', value: source, helper: policyDetail?.version || '-', icon: Layers, tone: 'blue' },
      ];
    }

    if (activeModule === 'appWhitelist') {
      return [
        { label: 'Policy Type', value: '1012', helper: 'Default permitted apps', icon: ShieldCheck, tone: 'emerald' },
        { label: 'Permit Software', value: selectedWhitelistIds.length, helper: 'Whitelist entries', icon: ListChecks, tone: 'emerald' },
        { label: 'Process Rule', value: whitelistProcessLabel(form.processRestrictType), helper: appliedStatus, icon: Lock, tone: 'slate' },
        { label: 'Policy Source', value: source, helper: policyDetail?.version || '-', icon: Layers, tone: 'blue' },
      ];
    }

    return [
      { label: 'Policy Type', value: '1005', helper: 'Web restriction', icon: Globe, tone: 'blue' },
      { label: 'Website URLs', value: webUrls.length, helper: 'Policy URL list', icon: LinkIcon, tone: 'blue' },
      { label: 'Restriction Type', value: form.webRestrictType === '1' ? 'Block list' : 'Allow only', helper: appliedStatus, icon: Ban, tone: 'slate' },
      { label: 'Policy Source', value: source, helper: policyDetail?.version || '-', icon: Layers, tone: 'blue' },
    ];
  }, [activeModule, form, policyDetail, selectedPackageIds.length, selectedWhitelistIds.length, webUrls.length]);

  const filteredPackages = useMemo(() => {
    const query = searchText.toLowerCase();
    return packages.filter((item) => {
      const text = `${item.SW_Pkg_Name || ''} ${item.FileName || ''} ${item.Manufacturer || ''}`.toLowerCase();
      return !query || text.includes(query);
    });
  }, [packages, searchText]);

  const filteredWhitelistSoftware = useMemo(() => {
    const query = searchText.toLowerCase();
    return whitelistSoftware.filter((item) => {
      const text = `${item.Name || ''} ${item.Vendor || ''} ${item.Type || ''}`.toLowerCase();
      return !query || text.includes(query);
    });
  }, [whitelistSoftware, searchText]);

  const selectedPackages = useMemo(() => {
    const rowById = new Map<string, RestrictionPackage>();

    selectedPackageRows.forEach((item) => {
      const id = getPackageId(item);
      if (id) rowById.set(id, item);
    });

    packages.forEach((item) => {
      const id = getPackageId(item);
      if (id && selectedPackageIds.includes(id) && !rowById.has(id)) rowById.set(id, item);
    });

    return selectedPackageIds
      .map((id) => rowById.get(id))
      .filter((item): item is RestrictionPackage => Boolean(item));
  }, [packages, selectedPackageIds, selectedPackageRows]);

  const selectedWhitelist = useMemo(() => {
    const rowById = new Map<string, WhitelistSoftware>();

    selectedWhitelistRows.forEach((item) => {
      const id = getWhitelistId(item);
      if (id) rowById.set(id, item);
    });

    whitelistSoftware.forEach((item) => {
      const id = getWhitelistId(item);
      if (id && selectedWhitelistIds.includes(id) && !rowById.has(id)) rowById.set(id, item);
    });

    return selectedWhitelistIds
      .map((id) => rowById.get(id))
      .filter((item): item is WhitelistSoftware => Boolean(item));
  }, [selectedWhitelistIds, selectedWhitelistRows, whitelistSoftware]);

  const availablePackages = useMemo(() => {
    const selectedIdSet = new Set(selectedPackageIds.map((id) => normalizeSelectionKey(id)).filter(Boolean));
    const selectedNameSet = new Set(
      selectedPackages
        .map((item) => normalizeSelectionKey(getPackageName(item)))
        .filter(Boolean),
    );

    return filteredPackages.filter((item) => {
      const packageId = normalizeSelectionKey(getPackageId(item));
      const packageName = normalizeSelectionKey(getPackageName(item));

      if (packageId && selectedIdSet.has(packageId)) return false;
      if (packageName && selectedNameSet.has(packageName)) return false;

      return true;
    });
  }, [filteredPackages, selectedPackageIds, selectedPackages]);

  const availableWhitelistSoftware = useMemo(() => {
    const selectedIdSet = new Set(selectedWhitelistIds.map((id) => normalizeSelectionKey(id)).filter(Boolean));
    const selectedNameSet = new Set(
      selectedWhitelist
        .map((item) => normalizeSelectionKey(getWhitelistName(item)))
        .filter(Boolean),
    );

    return filteredWhitelistSoftware.filter((item) => {
      const softwareId = normalizeSelectionKey(getWhitelistId(item));
      const softwareName = normalizeSelectionKey(getWhitelistName(item));

      if (softwareId && selectedIdSet.has(softwareId)) return false;
      if (softwareName && selectedNameSet.has(softwareName)) return false;

      return true;
    });
  }, [filteredWhitelistSoftware, selectedWhitelist, selectedWhitelistIds]);

  const filteredManageWhitelistSoftware = useMemo(() => {
    const query = manageSearchText.toLowerCase().trim();
    if (!query) return whitelistSoftware;

    return whitelistSoftware.filter((item) => {
      const text = `${getWhitelistName(item)} ${item.Vendor || ''} ${item.Type || ''} ${getWhitelistId(item)}`.toLowerCase();
      return text.includes(query);
    });
  }, [manageSearchText, whitelistSoftware]);


  const filteredPackageManagerRows = useMemo(() => {
    const query = packageManagerSearch.toLowerCase().trim();
    if (!query) return packageManagerRows;

    return packageManagerRows.filter((item) => {
      const text = `${getPackageName(item)} ${item.SW_Pkg_Company || ''} ${item.sample_file || ''} ${item.SW_Package_EtcInfo || ''}`.toLowerCase();
      return text.includes(query);
    });
  }, [packageManagerRows, packageManagerSearch]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleDay = (day: string) => {
    setSelectedDays((previous) =>
      previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day],
    );
  };

  const handleTargetClick = (node: RestrictionTreeNode) => {
    const target = toTarget(node);
    if (!target) return;
    setSelectedTarget(target);
    setMessage(null);
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const movePackage = (id: string, selected: boolean) => {
    const packageRow = packages.find((item) => getPackageId(item) === id) || selectedPackageRows.find((item) => getPackageId(item) === id);
    const packageName = packageRow ? getPackageName(packageRow) : 'Package';

    if (selected) {
      setSelectedPackageIds((previous) => previous.filter((item) => item !== id));
      setSelectedPackageRows((previous) => previous.filter((item) => getPackageId(item) !== id));
      setMessage(`${packageName} removed from selected package list.`);
      return;
    }

    setSelectedPackageIds((previous) => uniqueStrings([...previous, id]));
    if (packageRow) {
      setSelectedPackageRows((previous) => {
        if (previous.some((item) => getPackageId(item) === id)) return previous;
        return [...previous, packageRow];
      });
    }
    setMessage(`${packageName} added to selected package list.`);
  };

  const moveWhitelist = (id: string, selected: boolean) => {
    const whitelistRow = whitelistSoftware.find((item) => getWhitelistId(item) === id) || selectedWhitelistRows.find((item) => getWhitelistId(item) === id);
    const softwareName = whitelistRow ? getWhitelistName(whitelistRow) : 'Software';

    if (selected) {
      setSelectedWhitelistIds((previous) => previous.filter((item) => item !== id));
      setSelectedWhitelistRows((previous) => previous.filter((item) => getWhitelistId(item) !== id));
      setMessage(`${softwareName} removed from permitted software list.`);
      return;
    }

    setSelectedWhitelistIds((previous) => uniqueStrings([...previous, id]));
    if (whitelistRow) {
      setSelectedWhitelistRows((previous) => {
        if (previous.some((item) => getWhitelistId(item) === id)) return previous;
        return [...previous, whitelistRow];
      });
    }
    setMessage(`${softwareName} added to permitted software list.`);
  };

  const addPolicyUrl = () => {
    const url = newUrl.trim();
    if (!url) {
      setMessage('Enter a website URL or domain first.');
      return;
    }
    setWebUrls((previous) => [...new Set([...previous, url])]);
    setNewUrl('');
    setMessage(`${url} added to website list.`);
  };

  const addGroupUrlsToPolicy = () => {
    const urls = normalizeWebGroupUrlRows(webGroupUrls)
      .map((item) => normalizeWebDomain(item.url))
      .filter(Boolean);

    if (urls.length === 0) {
      setMessage('No URLs found in this website group. Add domains into the group first.');
      return false;
    }

    setWebUrls((previous) => [...new Set([...previous, ...urls])]);
    setMessage(`${urls.length} website${urls.length === 1 ? '' : 's'} from this group added to the policy website list.`);
    return true;
  };

  const openWebGroupManager = async () => {
    const groupId = selectedWebsiteGroupId || webGroups[0]?.idx || 0;
    setShowWebGroupManager(true);

    if (groupId) {
      const group = webGroups.find((item) => item.idx === groupId) || null;
      setSelectedWebsiteGroupId(groupId);
      setEditingWebGroup(group);
      setWebGroupName(group?.name || '');
      setWebGroupDescription(group?.description || '');
      setWebGroupUrls([]);
    } else {
      setEditingWebGroup(null);
      setWebGroupName('');
      setWebGroupDescription('');
      setWebGroupUrls([]);
    }

    setWebGroupDomainInput('');

    try {
      await loadLookups();
      if (groupId) await refreshWebGroupUrls(groupId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to open website group editor.');
    }
  };

  const selectWebGroupForEditing = async (group: WebGroup) => {
    setEditingWebGroup(group);
    setSelectedWebsiteGroupId(group.idx);
    setWebGroupName(group.name || '');
    setWebGroupDescription(group.description || '');
    setWebGroupDomainInput('');
    setWebGroupUrls([]);

    try {
      await refreshWebGroupUrls(group.idx);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load website group URLs.');
    }
  };

  const resetWebGroupEditor = () => {
    setEditingWebGroup(null);
    setSelectedWebsiteGroupId(null);
    setWebGroupUrls([]);
    setWebGroupName('');
    setWebGroupDescription('');
    setWebGroupDomainInput('');
  };

  const saveWebGroup = async () => {
    const name = webGroupName.trim();
    if (!name) {
      setMessage('Website group name is required.');
      return;
    }

    try {
      setLoading(true);
      const result = editingWebGroup
        ? await restrictionService.updateWebGroup(editingWebGroup.idx, name, webGroupDescription)
        : await restrictionService.createWebGroup(name, [], webGroupDescription);

      const saved = result.data;
      setMessage(editingWebGroup ? 'Website group updated.' : 'Website group created. Add domain names into the group next.');
      await loadLookups();
      if (saved?.idx) {
        setEditingWebGroup(saved);
        setSelectedWebsiteGroupId(saved.idx);
        setWebGroupName(saved.name || name);
        setWebGroupDescription(saved.description || webGroupDescription || '');
        await refreshWebGroupUrls(saved.idx);
      }
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to save website group.'));
    } finally {
      setLoading(false);
    }
  };

  const deleteWebGroup = async (group: WebGroup) => {
    if (!window.confirm(`Delete website group "${group.name}" and all URLs inside it?`)) return;

    try {
      setLoading(true);
      await restrictionService.deleteWebGroup(group.idx);
      setMessage('Website group deleted.');
      if (editingWebGroup?.idx === group.idx || selectedWebsiteGroupId === group.idx) {
        resetWebGroupEditor();
      }
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to delete website group.'));
    } finally {
      setLoading(false);
    }
  };

  const addUrlToWebGroup = async () => {
    const groupId = Number(editingWebGroup?.idx || selectedWebsiteGroupId || 0);
    const domain = normalizeWebDomain(webGroupDomainInput);
    if (!groupId) {
      setMessage('Create or select a website group first.');
      return;
    }
    if (!domain) {
      setMessage('Enter a domain name first. Do not include http:// or https://.');
      return;
    }

    const alreadyVisible = normalizeWebGroupUrlRows(webGroupUrls, groupId).some((item) => normalizeWebDomain(item.url) === domain);
    if (alreadyVisible) {
      setWebGroupDomainInput('');
      setMessage(`${domain} already exists in this website group.`);
      return;
    }

    try {
      setLoading(true);
      const response = await restrictionService.addWebGroupUrl(groupId, domain);
      const returnedRows = normalizeWebGroupUrlRows([(response as { data?: unknown })?.data || response], groupId);
      const nextRow = returnedRows[0] || makeWebGroupUrlRow(groupId, domain);

      setWebGroupUrls((previous) => mergeWebGroupUrlRows(previous, [nextRow], groupId));
      setWebGroupDomainInput('');
      setMessage(`${domain} added to website group.`);

      try {
        await refreshWebGroupUrls(groupId);
      } catch {
        // Keep the optimistic row visible if the follow-up refresh is unavailable.
      }
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string; data?: unknown } } })?.response?.data?.message;
      const existingRow = (error as { response?: { data?: { data?: unknown } } })?.response?.data?.data;

      if (String(apiMessage || '').toLowerCase().includes('already')) {
        const existingRows = normalizeWebGroupUrlRows([existingRow], groupId);
        setWebGroupUrls((previous) => mergeWebGroupUrlRows(previous, existingRows.length ? existingRows : [makeWebGroupUrlRow(groupId, domain)], groupId));
        setWebGroupDomainInput('');
        setMessage(`${domain} already exists in this website group.`);
        try {
          await refreshWebGroupUrls(groupId);
        } catch {
          // Keep the visible row.
        }
        return;
      }

      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to add domain to website group.'));
    } finally {
      setLoading(false);
    }
  };

  const deleteUrlFromWebGroup = async (item: WebGroupUrl) => {
    const groupId = Number(item.idx || editingWebGroup?.idx || selectedWebsiteGroupId || 0);
    const domain = normalizeWebDomain(item.url);

    try {
      setLoading(true);
      setWebGroupUrls((previous) => normalizeWebGroupUrlRows(previous, groupId).filter((row) => normalizeWebDomain(row.url) !== domain));
      await restrictionService.deleteWebGroupUrl(groupId, item.seq);
      setMessage('Domain removed from website group.');
      try {
        await refreshWebGroupUrls(groupId);
      } catch {
        // Keep optimistic removal if refresh is unavailable.
      }
      await loadLookups();
    } catch (error) {
      setWebGroupUrls((previous) => mergeWebGroupUrlRows(previous, [item], groupId));
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to remove domain from website group.'));
    } finally {
      setLoading(false);
    }
  };


  const resetPackageForm = () => {
    setSelectedManagerPackage(null);
    setPackageForm({
      SW_Pkg_Name: '',
      SW_Pkg_Company: '',
      License_Qnt: 0,
      Use_Statistices: 1,
      Cur_Count: 0,
      SW_Package_EtcInfo: '',
      SW_Catg: 0,
      Selected: 1,
    });
    setPackageInventoryFiles([]);
    setPackageFileSearch('');
  };

  const loadPackageManager = useCallback(async (search = packageManagerSearch) => {
    try {
      setPackageManagerLoading(true);
      const data = await restrictionService.getPackageManagerPackages(search, true);
      setPackageManagerRows(data);
      if (selectedManagerPackage) {
        const refreshed = data.find((item) => getPackageId(item) === getPackageId(selectedManagerPackage));
        if (refreshed) {
          const detail = await restrictionService.getPackageManagerPackage(getPackageId(refreshed));
          setSelectedManagerPackage(detail);
          setPackageForm({
            SW_Pkg_Name: detail.SW_Pkg_Name || '',
            SW_Pkg_Company: detail.SW_Pkg_Company || '',
            License_Qnt: Number(detail.License_Qnt || 0),
            Use_Statistices: Number(detail.Use_Statistices ?? 1),
            Cur_Count: Number(detail.Cur_Count || 0),
            SW_Package_EtcInfo: detail.SW_Package_EtcInfo || '',
            SW_Catg: Number(detail.SW_Catg || 0),
            Selected: Number(detail.Selected ?? 1),
          });
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load application packages.');
    } finally {
      setPackageManagerLoading(false);
    }
  }, [packageManagerSearch, selectedManagerPackage]);

  const openPackageManager = async () => {
    setShowPackageManager(true);
    setMessage(null);
    await loadPackageManager('');
  };

  const selectManagerPackage = async (item: RestrictionPackage) => {
    try {
      setPackageManagerLoading(true);
      const detail = await restrictionService.getPackageManagerPackage(getPackageId(item));
      setSelectedManagerPackage(detail);
      setPackageForm({
        SW_Pkg_Name: detail.SW_Pkg_Name || '',
        SW_Pkg_Company: detail.SW_Pkg_Company || '',
        License_Qnt: Number(detail.License_Qnt || 0),
        Use_Statistices: Number(detail.Use_Statistices ?? 1),
        Cur_Count: Number(detail.Cur_Count || 0),
        SW_Package_EtcInfo: detail.SW_Package_EtcInfo || '',
        SW_Catg: Number(detail.SW_Catg || 0),
        Selected: Number(detail.Selected ?? 1),
      });
      setPackageInventoryFiles([]);
      setPackageFileSearch('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to open package.');
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const saveManagerPackage = async () => {
    if (!packageForm.SW_Pkg_Name.trim()) {
      setMessage('Package name is required.');
      return;
    }

    try {
      setPackageManagerLoading(true);
      const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
      const result = packageId
        ? await restrictionService.updatePackageManagerPackage(packageId, packageForm)
        : await restrictionService.createPackageManagerPackage(packageForm);

      const detail = result.data;
      if (detail) {
        setSelectedManagerPackage(detail);
        setPackageForm({
          SW_Pkg_Name: detail.SW_Pkg_Name || packageForm.SW_Pkg_Name,
          SW_Pkg_Company: detail.SW_Pkg_Company || packageForm.SW_Pkg_Company || '',
          License_Qnt: Number(detail.License_Qnt ?? packageForm.License_Qnt ?? 0),
          Use_Statistices: Number(detail.Use_Statistices ?? packageForm.Use_Statistices ?? 1),
          Cur_Count: Number(detail.Cur_Count ?? packageForm.Cur_Count ?? 0),
          SW_Package_EtcInfo: detail.SW_Package_EtcInfo || packageForm.SW_Package_EtcInfo || '',
          SW_Catg: Number(detail.SW_Catg ?? packageForm.SW_Catg ?? 0),
          Selected: Number(detail.Selected ?? packageForm.Selected ?? 1),
        });
      }

      setMessage(packageId ? 'Package updated.' : 'Package created. You can now search Software Inventory EXE files and add them into this package.');
      await loadPackageManager(packageManagerSearch);
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to save package.'));
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const deleteManagerPackage = async (item: RestrictionPackage) => {
    const packageId = getPackageId(item);
    if (!packageId) return;

    if (!window.confirm(`Delete package "${getPackageName(item)}"? Packages used by policies will be blocked by the API.`)) return;

    try {
      setPackageManagerLoading(true);
      await restrictionService.deletePackageManagerPackage(packageId);
      setMessage('Package deleted.');
      if (selectedManagerPackage && getPackageId(selectedManagerPackage) === packageId) resetPackageForm();
      await loadPackageManager(packageManagerSearch);
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to delete package.'));
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const searchInventoryFilesForPackage = async () => {
    try {
      setPackageManagerLoading(true);
      const data = await restrictionService.searchPackageManagerFiles(packageFileSearch, 'EXE');
      setPackageInventoryFiles(data);
      setMessage(`Found ${data.length} EXE file${data.length === 1 ? '' : 's'} from Software Inventory.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to search software inventory files.');
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const addInventoryFileToPackage = async (file: RestrictionPackageFile) => {
    const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    if (!packageId) {
      setMessage('Save or select a package before adding files.');
      return;
    }

    try {
      setPackageManagerLoading(true);
      const result = await restrictionService.addPackageManagerFile(packageId, {
        FileName: file.FileName,
        FileVersion: file.FileVersion || '',
        FileVersionSub: '%',
        FileSize: file.FileSize || 0,
        bHide: 0,
      });
      if (result.data) setSelectedManagerPackage(result.data);
      setMessage('File added to package.');
      await loadPackageManager(packageManagerSearch);
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to add package file.'));
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const addManualFileToPackage = async () => {
    const fileName = packageFileSearch.trim();
    if (!fileName) {
      setMessage('Enter a file name first.');
      return;
    }
    await addInventoryFileToPackage({ FileName: fileName, FileVersion: '', FileVersionSub: '%', FileSize: 0 });
  };

  const deletePackageFile = async (file: RestrictionPackageFile) => {
    const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    if (!packageId || !file.ID) return;

    try {
      setPackageManagerLoading(true);
      const result = await restrictionService.deletePackageManagerFile(packageId, file.ID);
      if (result.data) setSelectedManagerPackage(result.data);
      setMessage('File removed from package.');
      await loadPackageManager(packageManagerSearch);
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to remove package file.'));
    } finally {
      setPackageManagerLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedTarget) {
      setMessage('Select a department, device, or root policy first.');
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const policyBelongsToSelectedTarget = Boolean(
        policyDetail?.source &&
        policyDetail.source !== 'none' &&
        ((selectedTarget.type === 'device' && policyDetail.source === 'device') ||
          (selectedTarget.type === 'department' && policyDetail.source === 'department') ||
          (selectedTarget.type === 'root' && policyDetail.source === 'root')) &&
        String(policyDetail.target_type || '') === String(selectedTarget.target_type) &&
        String(policyDetail.target_id || '') === String(selectedTarget.target_id),
      );

      const basePayload = {
        // If the form is displaying an inherited policy, do not send that inherited
        // policy_id back as the selected target's policy. The backend will create
        // or update the policy for selectedTarget only.
        policy_id: policyBelongsToSelectedTarget ? form.policyId : 0,
        target_type: selectedTarget.target_type,
        target_id: selectedTarget.target_id,
        use_parent_policy: activeModule === 'appWhitelist' ? '0' as const : (form.inheritPolicy ? '1' as const : '0' as const),
        use_policy: form.exception ? '0' as const : '1' as const,
        update_interval: form.updateInterval || '120',
        use_weekly_policy: form.weeklyPolicy ? '1' as const : '0' as const,
        day_select: selectedDays.join(','),
        use_schedule: form.useSchedule ? '1' as const : '0' as const,
        login_id: getCurrentLoginId(),
        console_ip: '',
      };

      if (activeModule === 'appBlacklist') {
        await restrictionService.savePolicy(activeModule, {
          ...basePayload,
          restrict_type: form.appRestrictType,
          restrict_message: form.appNoticeMessage,
          version_compare: form.versionCompare ? '1' : '0',
          softwareRestrictSchedule1: form.schedule1,
          softwareRestrictSchedule2: form.schedule2,
          softwareRestrictSchedule3: form.schedule3,
          softwareRestrictSchedule4: form.schedule4,
          package_list: selectedPackageIds,
        });
      } else if (activeModule === 'appWhitelist') {
        await restrictionService.savePolicy(activeModule, {
          ...basePayload,
          restrict_type: form.processRestrictType,
          restrict_message: form.processNoticeMessage,
          font_restrict_type: form.fontRestrictType,
          font_restrict_message: form.fontNoticeMessage,
          package_list: selectedWhitelistIds,
        });
      } else {
        await restrictionService.savePolicy(activeModule, {
          ...basePayload,
          web_restrict_type: form.webRestrictType,
          default_url: form.defaultUrl,
          RestrictSchedule1: form.schedule1,
          RestrictSchedule2: form.schedule2,
          RestrictSchedule3: form.schedule3,
          RestrictSchedule4: form.schedule4,
          web_list: webUrls,
        });
      }

      setMessage(`${moduleConfig.label} policy saved successfully.`);
      await loadPolicyData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save policy.');
    } finally {
      setSaving(false);
    }
  };

  const renderTree = (nodes: RestrictionTreeNode[], depth = 0) => (
    <div>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isOpen = expandedGroups.has(node.id);
        const target = toTarget(node);
        const isSelected = Boolean(target && selectedTarget?.id === target.id);
        const isRootNode = depth === 0 || node.type === 'org' || node.type === 'root';
        const isDevice = node.type === 'device';
        const displayLabel = getRestrictionDisplayLabel(node, depth);
        const Icon = isDevice ? Laptop : hasChildren && isOpen ? FolderOpen : Folder;
        const treeCount = getRestrictionTreeCount(node);
        const countLabel = formatRestrictionTreeCount(treeCount);
        const handleNodeAction = () => {
          if (hasChildren) toggleExpand(node.id);
          if (target) handleTargetClick(node);
        };

        return (
          <div key={node.id}>
            <div>
              <button
                type="button"
                aria-label={hasChildren ? (isOpen ? `Collapse ${displayLabel}` : `Expand ${displayLabel}`) : displayLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) toggleExpand(node.id);
                }}
              >
                {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span aria-hidden="true" />}
              </button>

              <button
                type="button"
                title={node.Object_Full_Name || displayLabel}
                onClick={handleNodeAction}
              >
                <span><Icon size={15} /></span>
                <span>{displayLabel}</span>
                {!isRootNode && countLabel ? <span>{countLabel}</span> : null}
              </button>

              <span />
            </div>

            {hasChildren && isOpen ? renderTree(node.children || [], depth + 1) : null}
          </div>
        );
      })}
    </div>
  );


  return (
    <main data-section="appwebrestriction">
      <style>{`


        /* Hardware sidebar fix: wider panel + keep Branch/Statistics switcher compact. */
        .hardware-module-root .settings-layout.hardware-settings-layout {
          grid-template-columns: minmax(300px, 322px) minmax(0, 1fr) !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel {
          min-width: 300px !important;
        }

        .hardware-module-root .settings-menu > .ema-module-sidebar-switcher {
          flex: 0 0 auto !important;
          margin: 0 !important;
        }

        .hardware-module-root .settings-menu > .ema-sidebar-content {
          flex: 1 1 auto !important;
          padding-top: 0.65rem !important;
        }

        .hardware-module-root .ema-sidebar-subpanel {
          justify-content: flex-start !important;
        }

        .hardware-module-root .ema-sidebar-tree {
          min-height: 0 !important;
        }


        /* Sidebar search fix: keep only one visible search container. */
        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-field.section-search {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          min-height: 42px !important;
          padding: 0.55rem 0.65rem !important;
          border: 1px solid rgba(148, 163, 184, 0.32) !important;
          border-radius: 14px !important;
          background: rgba(248, 250, 252, 0.92) !important;
          box-shadow: none !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-field.section-search svg {
          flex: 0 0 auto !important;
          color: #64748b !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-field.section-search input {
          flex: 1 1 auto !important;
          width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #0f172a !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-field.section-search input:focus,
        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-field.section-search input:focus-visible {
          border: 0 !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-search-clear {
          flex: 0 0 auto !important;
          width: 24px !important;
          height: 24px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: #64748b !important;
          box-shadow: none !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel .ema-sidebar-search-clear:hover {
          background: rgba(148, 163, 184, 0.16) !important;
          color: #0f172a !important;
        }



        /* Web Restriction table/list content fix: keep list content compact and clean. */
        .appwebrestriction-module .appweb-website-selector-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: start !important;
          gap: 1rem !important;
        }

        .appwebrestriction-module .appweb-website-card {
          height: auto !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .appwebrestriction-module .appweb-website-card .policy-top {
          flex: 0 0 auto !important;
          align-items: flex-start !important;
        }

        .appwebrestriction-module .appweb-url-add-row {
          align-items: stretch !important;
        }

        .appwebrestriction-module .appweb-url-add-row .setting-input {
          min-width: 0 !important;
          height: 38px !important;
        }

        .appwebrestriction-module .appweb-url-add-row .primary-btn,
        .appwebrestriction-module .appweb-url-add-row .soft-btn {
          height: 38px !important;
          flex: 0 0 auto !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel {
          width: 100% !important;
          min-height: 0 !important;
          height: auto !important;
          display: flex !important;
          flex-direction: column !important;
          border: 1px solid rgba(203, 213, 225, 0.82) !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-list-scroll {
          flex: 0 1 auto !important;
          min-height: 0 !important;
          max-height: 432px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-row {
          width: 100% !important;
          min-height: 54px !important;
          display: grid !important;
          align-items: center !important;
          gap: 0.75rem !important;
          margin: 0 !important;
          padding: 0.62rem 0.75rem !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95) !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-row:last-child {
          border-bottom: 0 !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-cell {
          min-width: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-name {
          display: flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          min-width: 0 !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-name strong {
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #0f2744 !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .user-mini-avatar {
          flex: 0 0 34px !important;
          width: 34px !important;
          height: 34px !important;
          border-radius: 12px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .icon-delete-btn {
          width: 32px !important;
          height: 32px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          border-radius: 12px !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-pagination {
          flex: 0 0 auto !important;
          margin: 0 !important;
          padding: 0.7rem 0.8rem !important;
          border-top: 1px solid rgba(226, 232, 240, 0.95) !important;
          border-radius: 0 !important;
          background: rgba(248, 250, 252, 0.94) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.5rem !important;
          flex-wrap: wrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-page-status {
          margin-right: auto !important;
        }



        /* Web Restriction final layout guard: KPI must stay one row and never overlap the main card. */
        .appwebrestriction-module .appweb-settings-content {
          min-width: 0 !important;
          align-content: start !important;
        }

        .appwebrestriction-module .settings-hero.ema-hero-kpi-right {
          display: grid !important;
          grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.22fr) !important;
          align-items: center !important;
          gap: 1rem !important;
          min-height: 126px !important;
          height: auto !important;
          overflow: visible !important;
          position: relative !important;
          z-index: 3 !important;
        }

        .appwebrestriction-module .settings-hero.ema-hero-kpi-right > div:first-child {
          min-width: 0 !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          align-items: stretch !important;
          gap: 0.65rem !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          flex-wrap: nowrap !important;
          overflow: visible !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box {
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          height: 80px !important;
          min-height: 80px !important;
          padding: 0.68rem 0.72rem !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box span,
        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box strong,
        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box small {
          display: block !important;
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box strong {
          font-size: clamp(1.03rem, 1.45vw, 1.42rem) !important;
          line-height: 1.1 !important;
        }

        .appwebrestriction-module .content-shell.appweb-main-card {
          position: relative !important;
          z-index: 1 !important;
          margin-top: 0 !important;
          clear: both !important;
        }

        /* Website List pagination guard: use page buttons only, no inner scrollbar. */
        .appwebrestriction-module .role-grid.appweb-website-selector-grid,
        .appwebrestriction-module .appweb-website-selector-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: start !important;
          gap: 1rem !important;
        }

        .appwebrestriction-module .appweb-website-card {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-list-scroll {
          max-height: none !important;
          overflow: visible !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-pagination {
          min-height: 52px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          flex-wrap: nowrap !important;
          gap: 0.45rem !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: none !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-pagination::-webkit-scrollbar {
          display: none !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-page-status {
          flex: 0 0 auto !important;
          margin-right: 0.75rem !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-pagination > span,
        .appwebrestriction-module .appweb-url-list-panel .uam-pagination .d-inline-flex,
        .appwebrestriction-module .appweb-url-list-panel .uam-page-icon {
          flex: 0 0 auto !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-page-icon {
          min-width: 34px !important;
          height: 34px !important;
          padding: 0 0.68rem !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .uam-page-current {
          min-width: 34px !important;
          height: 34px !important;
          border-radius: 999px !important;
        }




        /* Final guard: header must stay fixed-height even after Add Group URLs triggers a message. */
        .appwebrestriction-module .settings-hero.ema-hero-kpi-right {
          display: grid !important;
          grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.22fr) !important;
          align-items: center !important;
          gap: 1rem !important;
          min-height: 126px !important;
          max-height: 126px !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .settings-hero.ema-hero-kpi-right > div:first-child {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .settings-hero.ema-hero-kpi-right .settings-inline-alert {
          display: none !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          align-items: stretch !important;
          gap: 0.65rem !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair .score-box {
          min-width: 0 !important;
          height: 80px !important;
          min-height: 80px !important;
          max-height: 80px !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .appweb-main-card {
          position: relative !important;
          z-index: 1 !important;
          margin-top: 0 !important;
        }

        /* Final guard: URL pagination cannot overlap Previous / page number. */
        .appwebrestriction-module .appweb-url-list-panel .appweb-compact-pagination {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: max-content minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 0.75rem !important;
          padding: 0.72rem 0.85rem !important;
          overflow: hidden !important;
          flex-wrap: nowrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-page-range {
          margin: 0 !important;
          white-space: nowrap !important;
          min-width: max-content !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-page-controls {
          min-width: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 0.42rem !important;
          flex-wrap: nowrap !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-page-item {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.42rem !important;
          min-width: 0 !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-page-gap {
          margin: 0 !important;
          min-width: 18px !important;
          text-align: center !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-compact-pagination .uam-page-icon {
          position: static !important;
          transform: none !important;
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 34px !important;
          height: 34px !important;
          padding: 0 0.62rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .appwebrestriction-module .appweb-url-list-panel .appweb-compact-pagination .uam-page-current {
          width: 34px !important;
          min-width: 34px !important;
          padding: 0 !important;
          border-radius: 999px !important;
        }

        /* Policy Status / AppTable pagination fix: keep page range and controls on one clean row. */
        .appwebrestriction-module .pricing-table-card .appweb-table-pagination {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: max-content minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 0.75rem !important;
          margin: 0 !important;
          padding: 0.85rem 1rem !important;
          border-top: 1px solid rgba(226, 232, 240, 0.95) !important;
          border-radius: 0 0 18px 18px !important;
          background: rgba(248, 250, 252, 0.96) !important;
          overflow: hidden !important;
          flex-wrap: nowrap !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .appweb-page-range {
          margin: 0 !important;
          white-space: nowrap !important;
          min-width: max-content !important;
          font-weight: 800 !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .appweb-page-controls {
          min-width: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 0.45rem !important;
          flex-wrap: nowrap !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .appweb-page-item {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.45rem !important;
          min-width: 0 !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .appweb-page-gap {
          margin: 0 !important;
          min-width: 18px !important;
          text-align: center !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .uam-page-icon {
          position: static !important;
          transform: none !important;
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 34px !important;
          height: 34px !important;
          padding: 0 0.62rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .appwebrestriction-module .pricing-table-card .appweb-table-pagination .uam-page-current {
          width: 34px !important;
          min-width: 34px !important;
          padding: 0 !important;
          border-radius: 999px !important;
        }

        @media (max-width: 720px) {
          .appwebrestriction-module .pricing-table-card .appweb-table-pagination {
            grid-template-columns: 1fr !important;
          }

          .appwebrestriction-module .pricing-table-card .appweb-table-pagination .appweb-page-controls {
            justify-content: flex-start !important;
            overflow-x: auto !important;
            padding-bottom: 0.1rem !important;
          }
        }



        /* Website Group editor modal fix: make Edit Website Group button open a real modal without relying on Tailwind utility classes. */
        .appwebrestriction-module .appweb-webgroup-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1rem !important;
          background: rgba(15, 23, 42, 0.42) !important;
          backdrop-filter: blur(4px) !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal {
          width: min(1120px, calc(100vw - 32px)) !important;
          max-height: 92vh !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          border: 1px solid rgba(226, 232, 240, 0.95) !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28) !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-head {
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding: 1rem 1.15rem !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95) !important;
          background: rgba(248, 250, 252, 0.98) !important;
        }

        .appwebrestriction-module .appweb-modal-eyebrow {
          display: block !important;
          margin-bottom: 0.25rem !important;
          color: #2563eb !important;
          font-size: 0.64rem !important;
          font-weight: 900 !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-head h3 {
          margin: 0 !important;
          color: #0f2744 !important;
          font-size: 1rem !important;
          font-weight: 900 !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-head p,
        .appwebrestriction-module .appweb-webgroup-pane-head p,
        .appwebrestriction-module .appweb-webgroup-domain-head p {
          margin: 0.25rem 0 0 !important;
          color: #64748b !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
        }

        .appwebrestriction-module .appweb-modal-close {
          flex: 0 0 36px !important;
          width: 36px !important;
          height: 36px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #64748b !important;
          box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.8) !important;
        }

        .appwebrestriction-module .appweb-modal-close:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-body {
          min-height: 0 !important;
          flex: 1 1 auto !important;
          display: grid !important;
          grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.25fr) !important;
          overflow: hidden !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-pane {
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.8rem !important;
          padding: 1rem !important;
          border-right: 1px solid rgba(226, 232, 240, 0.95) !important;
          background: #f8fafc !important;
        }

        .appwebrestriction-module .appweb-webgroup-pane-head,
        .appwebrestriction-module .appweb-webgroup-domain-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-list {
          min-height: 0 !important;
          max-height: 66vh !important;
          overflow: auto !important;
          border: 1px solid rgba(203, 213, 225, 0.8) !important;
          border-radius: 16px !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item {
          width: 100% !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
          padding: 0.78rem 0.85rem !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9) !important;
          background: #ffffff !important;
          text-align: left !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item:last-child {
          border-bottom: 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item:hover,
        .appwebrestriction-module .appweb-webgroup-list-item.is-selected {
          background: #eff6ff !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item span {
          min-width: 0 !important;
          display: grid !important;
          gap: 0.2rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item strong,
        .appwebrestriction-module .appweb-webgroup-list-item small {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item strong {
          color: #0f2744 !important;
          font-size: 0.78rem !important;
          font-weight: 900 !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item small {
          color: #64748b !important;
          font-size: 0.68rem !important;
          font-weight: 700 !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item em,
        .appwebrestriction-module .appweb-webgroup-domain-head em {
          flex: 0 0 auto !important;
          border-radius: 999px !important;
          background: #eef2ff !important;
          color: #2563eb !important;
          padding: 0.18rem 0.48rem !important;
          font-size: 0.62rem !important;
          font-style: normal !important;
          font-weight: 900 !important;
        }

        .appwebrestriction-module .appweb-webgroup-editor-pane {
          min-height: 0 !important;
          overflow: auto !important;
          padding: 1rem !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-form-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 0.85rem !important;
          margin-bottom: 0.9rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-actions,
        .appwebrestriction-module .appweb-webgroup-domain-add,
        .appwebrestriction-module .appweb-webgroup-footer-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 0.6rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-actions {
          margin-bottom: 0.9rem !important;
        }

        .appwebrestriction-module .appweb-modal-primary-btn,
        .appwebrestriction-module .appweb-modal-danger-btn,
        .appwebrestriction-module .appweb-modal-dark-btn,
        .appwebrestriction-module .appweb-modal-light-btn {
          min-height: 36px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.42rem !important;
          border: 0 !important;
          border-radius: 12px !important;
          padding: 0.42rem 0.85rem !important;
          font-size: 0.68rem !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-modal-primary-btn {
          background: #2563eb !important;
          color: #ffffff !important;
        }

        .appwebrestriction-module .appweb-modal-danger-btn {
          background: #fff1f2 !important;
          color: #e11d48 !important;
          box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.35) !important;
        }

        .appwebrestriction-module .appweb-modal-dark-btn {
          background: #0f172a !important;
          color: #ffffff !important;
        }

        .appwebrestriction-module .appweb-modal-light-btn {
          background: #ffffff !important;
          color: #475569 !important;
          box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.85) !important;
        }

        .appwebrestriction-module .appweb-modal-primary-btn:disabled,
        .appwebrestriction-module .appweb-modal-danger-btn:disabled,
        .appwebrestriction-module .appweb-modal-dark-btn:disabled,
        .appwebrestriction-module .appweb-modal-light-btn:disabled {
          cursor: not-allowed !important;
          opacity: 0.55 !important;
        }

        .appwebrestriction-module .appweb-webgroup-alert {
          margin-bottom: 0.9rem !important;
          border: 1px solid rgba(251, 191, 36, 0.5) !important;
          border-radius: 14px !important;
          background: #fffbeb !important;
          color: #92400e !important;
          padding: 0.7rem 0.85rem !important;
          font-size: 0.74rem !important;
          font-weight: 800 !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-card {
          border: 1px solid rgba(203, 213, 225, 0.82) !important;
          border-radius: 18px !important;
          padding: 0.95rem !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-add {
          margin: 0.8rem 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-add input {
          flex: 1 1 260px !important;
          min-width: 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-list {
          max-height: 290px !important;
          overflow: auto !important;
          border: 1px solid rgba(203, 213, 225, 0.82) !important;
          border-radius: 14px !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
          padding: 0.58rem 0.7rem !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9) !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row:last-child {
          border-bottom: 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row > div {
          min-width: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.48rem !important;
          color: #334155 !important;
          font-size: 0.76rem !important;
          font-weight: 800 !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row span {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .appwebrestriction-module .appweb-modal-icon-danger {
          flex: 0 0 30px !important;
          width: 30px !important;
          height: 30px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 10px !important;
          background: #fff1f2 !important;
          color: #e11d48 !important;
        }

        .appwebrestriction-module .appweb-modal-empty {
          padding: 1.35rem !important;
          color: #94a3b8 !important;
          font-size: 0.76rem !important;
          font-weight: 800 !important;
          text-align: center !important;
        }

        /* Website Group modal polish: compact, balanced and cleaner editor layout. */
        .appwebrestriction-module .appweb-webgroup-modal-backdrop {
          padding: clamp(1rem, 2vw, 1.75rem) !important;
          background: rgba(15, 23, 42, 0.52) !important;
          backdrop-filter: blur(7px) saturate(115%) !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal {
          width: min(1040px, calc(100vw - 48px)) !important;
          max-height: min(88vh, 720px) !important;
          border-radius: 22px !important;
          border-color: rgba(203, 213, 225, 0.86) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.34) !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-head {
          padding: 1rem 1.1rem !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.09), transparent 26rem),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-head h3 {
          font-size: 1.05rem !important;
          letter-spacing: -0.02em !important;
        }

        .appwebrestriction-module .appweb-webgroup-modal-body {
          grid-template-columns: minmax(280px, 330px) minmax(0, 1fr) !important;
          min-height: 440px !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-pane {
          padding: 1rem !important;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f6fc 100%) !important;
        }

        .appwebrestriction-module .appweb-webgroup-pane-head {
          align-items: center !important;
          padding-bottom: 0.35rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-list {
          max-height: none !important;
          flex: 1 1 auto !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          overflow: auto !important;
          display: grid !important;
          align-content: start !important;
          gap: 0.65rem !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item {
          border: 1px solid rgba(203, 213, 225, 0.78) !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 255, 0.92) !important;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035) !important;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item:hover {
          transform: translateY(-1px) !important;
          border-color: rgba(37, 99, 235, 0.34) !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-list-item.is-selected {
          border-color: rgba(37, 99, 235, 0.4) !important;
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%) !important;
          box-shadow: inset 3px 0 0 #2563eb, 0 10px 24px rgba(37, 99, 235, 0.08) !important;
        }

        .appwebrestriction-module .appweb-webgroup-editor-pane {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.9rem !important;
          padding: 1rem 1.1rem !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-form-grid {
          margin-bottom: 0 !important;
          padding: 0.85rem !important;
          border: 1px solid rgba(226, 232, 240, 0.95) !important;
          border-radius: 17px !important;
          background: #f8fafc !important;
        }

        .appwebrestriction-module .appweb-webgroup-form-grid .form-field {
          margin: 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-form-grid .setting-input,
        .appwebrestriction-module .appweb-webgroup-domain-add .setting-input {
          height: 40px !important;
          border-radius: 13px !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-actions {
          margin: -0.2rem 0 0 !important;
          justify-content: flex-start !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-card {
          flex: 1 1 auto !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
          border-radius: 18px !important;
          background:
            linear-gradient(180deg, #ffffff 0%, #fbfdff 100%) !important;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04) !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-head {
          align-items: center !important;
          padding-bottom: 0.65rem !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9) !important;
        }

        .appwebrestriction-module .appweb-webgroup-domain-add {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          margin: 0.85rem 0 !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-list {
          flex: 1 1 auto !important;
          min-height: 92px !important;
          max-height: 230px !important;
          border-radius: 15px !important;
          background: #f8fafc !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row {
          min-height: 46px !important;
          margin: 0 !important;
          background: #ffffff !important;
        }

        .appwebrestriction-module .appweb-webgroup-url-row > div svg {
          flex: 0 0 auto !important;
          width: 28px !important;
          height: 28px !important;
          padding: 6px !important;
          border-radius: 10px !important;
          background: #eff6ff !important;
          color: #2563eb !important;
        }

        .appwebrestriction-module .appweb-webgroup-footer-actions {
          justify-content: flex-end !important;
          margin-top: 0.85rem !important;
          padding-top: 0.85rem !important;
          border-top: 1px solid rgba(226, 232, 240, 0.9) !important;
        }

        .appwebrestriction-module .appweb-modal-dark-btn {
          background: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22) !important;
        }

        .appwebrestriction-module .appweb-modal-primary-btn:hover,
        .appwebrestriction-module .appweb-modal-dark-btn:hover {
          background: #1d4ed8 !important;
        }

        .appwebrestriction-module .appweb-modal-danger-btn:hover,
        .appwebrestriction-module .appweb-modal-icon-danger:hover {
          background: #ffe4e6 !important;
        }

        @media (max-width: 760px) {
          .appwebrestriction-module .appweb-webgroup-modal {
            width: calc(100vw - 24px) !important;
            max-height: 92vh !important;
          }

          .appwebrestriction-module .appweb-webgroup-modal-body {
            min-height: 0 !important;
          }

          .appwebrestriction-module .appweb-webgroup-domain-add {
            grid-template-columns: 1fr !important;
          }

          .appwebrestriction-module .appweb-webgroup-footer-actions .appweb-modal-dark-btn {
            width: 100% !important;
          }
        }

        @media (max-width: 1200px) {
          .appwebrestriction-module .role-grid.appweb-website-selector-grid,
          .appwebrestriction-module .appweb-website-selector-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 1180px) {
          .appwebrestriction-module .settings-hero.ema-hero-kpi-right {
            grid-template-columns: 1fr !important;
            min-height: 0 !important;
          }

          .appwebrestriction-module .settings-hero .settings-score.ema-kpi-right-pair {
            grid-template-columns: repeat(4, minmax(118px, 1fr)) !important;
          }
        }

        @media (max-width: 1100px) {
          .hardware-module-root .settings-layout.hardware-settings-layout {
            grid-template-columns: 1fr !important;
          }

          .hardware-module-root .settings-menu.hardware-left-panel {
            min-width: 0 !important;
          }
        }



        @media (max-width: 980px) {
          .appwebrestriction-module .appweb-webgroup-modal-body {
            grid-template-columns: 1fr !important;
          }

          .appwebrestriction-module .appweb-webgroup-list-pane {
            border-right: 0 !important;
            border-bottom: 1px solid rgba(226, 232, 240, 0.95) !important;
          }

          .appwebrestriction-module .appweb-webgroup-form-grid {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>
      {notice && (
        <div>
          <div>
            <span><Info size={17} /></span>
            <div>
              <strong>
                {notice.tone === 'error' ? 'Action failed' : notice.tone === 'warning' ? 'Action needed' : notice.tone === 'info' ? 'Status update' : 'Action completed'}
              </strong>
              <span>{notice.text}</span>
            </div>
            <button type="button" onClick={dismissNotice} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <div>
        <aside>
          <div>
            <span>WEB RESTRICTION</span>
            <strong>Web Control</strong>
            <small>Device scope and website restriction policies.</small>
          </div>

          <nav
            role="tablist"
            aria-label="Restriction module navigation"
          >
            {modules.map((item) => {
              const Icon = item.icon;
              const selected = item.id === activeModule;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={`${item.label} - ${item.helper}`}
                  onClick={() => {
                    setActiveModule(item.id);
                    setActiveTab(item.tabs[0]);
                    setSearchText('');
                    setMessage(null);
                  }}
                >
                  <span><Icon size={16} /></span>
                  <span><strong>{item.label}</strong><small>{item.helper}</small></span>
                </button>
              );
            })}
          </nav>

          <div>
            <div>
              <div>
                <Search size={15} />
                <input
                  id="restrictionSidebarSearch"
                  value={targetTreeSearch}
                  onChange={(event) => setTargetTreeSearch(event.target.value)}
                  placeholder="Search branch / device..."
                />
                {targetTreeSearch && <button type="button" onClick={() => setTargetTreeSearch('')}><X size={14} /></button>}
              </div>

              <div role="tree" aria-label="Web restriction branch tree">
                {loading && treeNodes.length === 0 ? (
                  <div><Loader2 size={14} /> Loading branch scope...</div>
                ) : filteredTreeNodes.length > 0 ? (
                  renderTree(filteredTreeNodes)
                ) : (
                  <div>No branch or device found.</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div>
            <div>
              <div>
                <span>Policy Management</span>
                <ChevronRight size={12} />
                <span>{moduleConfig.label}</span>
              </div>
              <h2>Web Restriction</h2>
              <p>
                Selected target: {selectedTarget?.label || 'None'}
                {selectedTarget?.Object_Full_Name ? ` (${selectedTarget.Object_Full_Name})` : ''}
              </p>
              {/* Header stays static; messages continue through the toast layer. */}
            </div>

            <div>
              {summaryCards.map((card) => (
                <button key={card.label} type="button">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.helper}</small>
                </button>
              ))}
            </div>
          </div>



          <div>
            <div>
              <div>
                {moduleConfig.tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={clsx('soft-btn', activeTab === tab && 'is-active')}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>

              {(activeModule === 'appBlacklist' || activeModule === 'appWhitelist') && (
                <div>
                  <button
                    type="button"
                    onClick={openPackageManager}
                  >
                    <Package size={13} /> Package Manager
                  </button>
                </div>
              )}
            </div>

            <div>
              {activeTab === 'status' && activeModule !== 'webRestriction' && renderRestrictionStatus()}
              {activeTab === 'settings' && renderPolicySettings()}
              {activeTab === 'policyStatus' && renderPolicyStatus()}
            </div>
          </div>
        </section>
      </div>

      {showManageSoftware && renderManageSoftwareModal()}
      {showPackageManager && renderPackageManagerModal()}
      {showWebGroupManager && renderWebGroupManagerModal()}
    </main>
  );

  function renderRestrictionStatus() {
    const rows = Array.isArray(statusRows) ? statusRows : [];
    const appBlacklistMode = activeModule === 'appBlacklist';
    const statusTitle = appBlacklistMode ? 'App Restriction Status' : 'App Whitelist Restriction Status';
    const emptyMessage = selectedTarget
      ? 'No restriction status data found for this target and selected duration.'
      : 'No target selected yet. Showing root policy scope when available.';

    type StatusTableRow = RestrictionStatusRow & Record<string, any>;

    const appColumns: AppTableColumn<StatusTableRow>[] = [
      {
        key: 'SW_Pkg_Name',
        header: 'Application Package Name',
        render: (row) => getRowText(row, ['SW_Pkg_Name', 'SW_PKG_NAME', 'packageName', 'Application Package Name']),
      },
      {
        key: 'evt_cnt',
        header: 'Attempts',
        align: 'end',
        width: 120,
        render: (row) => getRowText(row, ['evt_cnt', 'EVT_CNT', 'attempts', 'Number of Attempts']),
      },
      {
        key: 'user_cnt',
        header: 'Affected Devices',
        align: 'end',
        width: 150,
        render: (row) => getRowText(row, ['user_cnt', 'USER_CNT', 'deviceCount', 'Affected Devices']),
      },
    ];

    const whitelistColumns: AppTableColumn<StatusTableRow>[] = [
      {
        key: 'EVT_TYPE',
        header: 'Type',
        width: 120,
        render: (row) => getRowText(row, ['EVT_TYPE', 'evt_type', 'Type']),
      },
      {
        key: 'FILENAME',
        header: 'File Name',
        render: (row) => getRowText(row, ['FILENAME', 'filename', 'File Name']),
      },
      {
        key: 'EVT_CNT',
        header: 'Attempts',
        align: 'end',
        width: 120,
        render: (row) => getRowText(row, ['EVT_CNT', 'evt_cnt', 'attempts', 'Number of Attempts']),
      },
      {
        key: 'USER_CNT',
        header: 'Affected Devices',
        align: 'end',
        width: 150,
        render: (row) => getRowText(row, ['USER_CNT', 'user_cnt', 'deviceCount', 'Affected Devices']),
      },
    ];

    return (
      <div>
        <div>
          <div>
            <div>
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="setting-input" />
            </div>
            <div>
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="setting-input" />
            </div>
            <div>
              <label>
                <input type="checkbox" checked={includeSub} onChange={(event) => setIncludeSub(event.target.checked)} />
                <span>Include Sub-Dept</span>
              </label>
            </div>
            <div>
              <AppButton size="sm" variant="primary" onClick={loadPolicyData} loading={loading} leftIcon={<RefreshCw size={13} />}>
                Refresh
              </AppButton>
            </div>
          </div>
        </div>

        <AppTable<StatusTableRow>
          className="appweb-large-data-card appweb-status-table"
          columns={appBlacklistMode ? appColumns : whitelistColumns}
          rows={rows as StatusTableRow[]}
          rowKey={(row, index) => getFastRowKey(row, index, ['SW_Pkg_Name', 'SW_PKG_NAME', 'FILENAME', 'EVT_TYPE', 'evt_cnt', 'EVT_CNT'])}
          loading={loading}
          emptyTitle="No status records"
          emptyDescription={emptyMessage}
          summary={(
            <>
              <div>
                <strong>{statusTitle}</strong>
                <span>{selectedTarget?.label || 'All Branches'} · {startDate} until {endDate}</span>
              </div>
              <span>
                {loading ? 'Loading...' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
              </span>
            </>
          )}
        />
      </div>
    );
  }

  function renderPolicyActionButtons() {
    return (
      <div>
        <AppButton
          size="sm"
          variant="secondary"
          onClick={loadPolicyData}
          leftIcon={<RotateCcw size={14} />}
        >
          Restore Policy
        </AppButton>
        <AppButton
          size="sm"
          variant="primary"
          onClick={handleSavePolicy}
          disabled={!selectedTarget || saving}
          loading={saving}
          leftIcon={<Save size={14} />}
        >
          Save Policy
        </AppButton>
      </div>
    );
  }

  function renderBasicSettingsSection(layout: 'default' | 'whitelist' = 'default') {
    return (
      <section>
        <div>
          <div>
            <h4>Basic Setting</h4>
            <p>Policy assignment, update interval and inheritance control.</p>
          </div>
          <span>
            {policyDetail?.source || 'none'} policy
          </span>
        </div>

        <div>
          <div>
            <label>Policy ID</label>
            <input value={form.policyId || 'New Policy'} disabled />
          </div>
          <div>
            <label>Result Update Interval (min.)</label>
            <input value={form.updateInterval} onChange={(event) => updateForm('updateInterval', event.target.value)} disabled={isInherited} className={fieldClass} />
          </div>
          <div>
            <label>
              <input type="checkbox" checked={form.inheritPolicy} disabled={selectedTarget?.type === 'root'} onChange={(event) => updateForm('inheritPolicy', event.target.checked)} />
              <span>Inherit Policy</span>
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" checked={form.exception} disabled={isInherited} onChange={(event) => updateForm('exception', event.target.checked)} />
              <span>Do not apply restriction / Exception</span>
            </label>
          </div>
        </div>

        {isInherited && (
          <div>
            This target is currently using an inherited policy{policyDetail?.sourceLabel ? ` from ${policyDetail.sourceLabel}` : ''}. Uncheck Inherit Policy to create or update a custom policy for the selected target.
          </div>
        )}
      </section>
    );
  }

  function renderPolicySettings() {
    const settingsIntro = {
      appBlacklist: 'Configure application blocking method, weekly schedule and package selection for the selected target.',
      appWhitelist: 'Configure permitted software behaviour, process control, font control and software selection for the selected target.',
      webRestriction: 'Configure website restriction behaviour, schedule and website list for the selected target.',
    }[activeModule];

    if (activeModule === 'appWhitelist') {
      return (
        <div>
          <div>
            <strong>{moduleConfig.label} Policy Settings</strong>
            <span>{settingsIntro}</span>
          </div>

          <div>
            {renderBasicSettingsSection('whitelist')}
            {renderWhitelistRestrictionSettings()}
          </div>

          {renderWhitelistSelector()}
          {renderPolicyActionButtons()}
        </div>
      );
    }

    return (
      <div>
        <div>
          <strong>{moduleConfig.label} Policy Settings</strong>
          <span>{settingsIntro}</span>
        </div>

        <div>
          {renderBasicSettingsSection()}
          {activeModule === 'appBlacklist' && renderAppRestrictionSettings()}
          {activeModule === 'webRestriction' && renderWebRestrictionSettings()}
        </div>

        {(activeModule === 'appBlacklist' || activeModule === 'webRestriction') && renderWeeklyAndSchedule()}
        {activeModule === 'appBlacklist' && renderPackageSelector()}
        {activeModule === 'webRestriction' && renderWebsiteSelector()}

        {renderPolicyActionButtons()}
      </div>
    );
  }

  function renderAppRestrictionSettings() {
    const options: Array<[FormState['appRestrictType'], string, string]> = [
      ['1', 'Restrict', 'Block the selected package list.'],
      ['2', 'Warning Message + Restrict', 'Warn users and block the app.'],
      ['3', 'Warning Message', 'Show warning without blocking.'],
    ];

    return (
      <section>
        <div>
          <div>
            <h4>Restriction Method</h4>
            <p>Choose how the app restriction policy responds when a selected package is detected.</p>
          </div>
          <span>{appRestrictionLabel(form.appRestrictType)}</span>
        </div>

        <div>
          {options.map(([value, label, helper]) => (
            <div key={value}>
              <label>
                <input type="radio" name="appRestrictType" checked={form.appRestrictType === value} disabled={isInherited} onChange={() => updateForm('appRestrictType', value)} />
                <span>
                  <strong>{label}</strong>
                  <small>{helper}</small>
                </span>
              </label>
            </div>
          ))}
        </div>

        <div>
          <label>Warning Message</label>
          <textarea value={form.appNoticeMessage} onChange={(event) => updateForm('appNoticeMessage', event.target.value)} disabled={isInherited} className="setting-textarea" placeholder="Message shown to the user when this policy triggers." />
        </div>

        <label>
          <input type="checkbox" checked={form.versionCompare} disabled={isInherited} onChange={(event) => updateForm('versionCompare', event.target.checked)} />
          <span>Version comparison</span>
        </label>
      </section>
    );
  }

  function renderWhitelistRestrictionSettings() {
    const processOptions: Array<[FormState['processRestrictType'], string]> = [
      ['0', 'None'],
      ['1', 'Warning Message'],
      ['2', 'Restriction'],
      ['3', 'Warning Message + Restriction'],
    ];

    const fontOptions: Array<[FormState['fontRestrictType'], string]> = [
      ['0', 'None'],
      ['1', 'Warning Message'],
      ['2', 'Delete Font File'],
      ['3', 'Warning Message + Delete Font File'],
    ];

    return (
      <>
        <section>
          <div>
            <div>
              <h4>Restriction of Process</h4>
              <p>Control process behaviour for software outside the permitted list.</p>
            </div>
            <span>{whitelistProcessLabel(form.processRestrictType)}</span>
          </div>

          <div>
            {processOptions.map(([value, label]) => (
              <div key={value}>
                <label>
                  <input type="radio" name="processRestrictType" checked={form.processRestrictType === value} disabled={isInherited} onChange={() => updateForm('processRestrictType', value)} />
                  <span>{label}</span>
                </label>
              </div>
            ))}
          </div>

          <div>
            <div>
              <label>Notice Message (max 249 characters)</label>
              <span>{form.processNoticeMessage.length}/249</span>
            </div>
            <textarea maxLength={249} value={form.processNoticeMessage} onChange={(event) => updateForm('processNoticeMessage', event.target.value)} disabled={isInherited} className="setting-textarea" placeholder="Message shown when the process policy triggers." />
          </div>
        </section>

        <section>
          <div>
            <div>
              <h4>Restriction of Font</h4>
              <p>Control font file handling for software outside the permitted list.</p>
            </div>
            <span>{whitelistFontLabel(form.fontRestrictType)}</span>
          </div>

          <div>
            {fontOptions.map(([value, label]) => (
              <div key={value}>
                <label>
                  <input type="radio" name="fontRestrictType" checked={form.fontRestrictType === value} disabled={isInherited} onChange={() => updateForm('fontRestrictType', value)} />
                  <span>{label}</span>
                </label>
              </div>
            ))}
          </div>

          <div>
            <div>
              <label>Notice Message (max 249 characters)</label>
              <span>{form.fontNoticeMessage.length}/249</span>
            </div>
            <textarea maxLength={249} value={form.fontNoticeMessage} onChange={(event) => updateForm('fontNoticeMessage', event.target.value)} disabled={isInherited} className="setting-textarea" placeholder="Message shown when the font policy triggers." />
          </div>
        </section>
      </>
    );
  }

  function renderWebRestrictionSettings() {
    const options: Array<[FormState['webRestrictType'], string, string]> = [
      ['1', 'Block Website List', 'Deny access to websites in the list.'],
      ['2', 'Only Allow Website List', 'Allow only websites in the list.'],
    ];

    return (
      <section>
        <div>
          <div>
            <h4>Restriction Type</h4>
            <p>Choose whether the website list is treated as a block list or an allow list.</p>
          </div>
          <span>{webRestrictionLabel(form.webRestrictType)}</span>
        </div>

        <div>
          {options.map(([value, label, helper]) => (
            <div key={value}>
              <label>
                <input type="radio" name="webRestrictType" checked={form.webRestrictType === value} disabled={isInherited} onChange={() => updateForm('webRestrictType', value)} />
                <span>
                  <strong>{label}</strong>
                  <small>{helper}</small>
                </span>
              </label>
            </div>
          ))}
        </div>

        <div>
          <label>Move to default URL</label>
          <input value={form.defaultUrl} onChange={(event) => updateForm('defaultUrl', event.target.value)} disabled={isInherited} className={fieldClass} placeholder="127.0.0.1" />
        </div>
      </section>
    );
  }

  function renderWeeklyAndSchedule() {
    return (
      <section>
        <div>
          <div>
            <div>
              <h4>Weekly Policy</h4>
              <p>Select the days where this policy should be active.</p>
            </div>
            <label>
              <input type="checkbox" checked={form.weeklyPolicy} disabled={isInherited} onChange={(event) => updateForm('weeklyPolicy', event.target.checked)} />
              <span>Enable</span>
            </label>
          </div>

          <div>
            {dayOptions.map((day) => (
              <div key={day}>
                <button
                  type="button"
                  disabled={!form.weeklyPolicy || isInherited}
                  onClick={() => toggleDay(day)}
                  className={clsx('w-100', selectedDays.includes(day) ? 'primary-btn' : 'soft-btn')}
                >
                  {day}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div>
            <div>
              <h4>Restricted Time</h4>
              <p>Run the policy all day or only during selected time ranges.</p>
            </div>
            <div>
              <button type="button" disabled={isInherited} onClick={() => updateForm('useSchedule', false)} className={clsx(!form.useSchedule ? 'primary-btn' : 'soft-btn')}>All Day</button>
              <button type="button" disabled={isInherited} onClick={() => updateForm('useSchedule', true)} className={clsx(form.useSchedule ? 'primary-btn' : 'soft-btn')}>Schedule</button>
            </div>
          </div>

          <div>
            {(['schedule1', 'schedule2', 'schedule3', 'schedule4'] as const).map((key, index) => (
              <div key={key}>
                <label>Schedule {index + 1} (HH:mm-HH:mm)</label>
                <input value={form[key]} onChange={(event) => updateForm(key, event.target.value)} placeholder="09:00-18:00" disabled={!form.useSchedule || isInherited} className={fieldClass} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderPackageSelector() {
    return (
      <DualListSection
        title="Package Selection"
        leftTitle="Selected Package List"
        rightTitle="Package List"
        searchText={searchText}
        setSearchText={setSearchText}
        disabled={isInherited}
        leftItems={selectedPackages.map((item) => ({ id: getPackageId(item), title: getPackageName(item) || `Package ${getPackageId(item)}`, meta: item.FileName || item.Manufacturer || '-' }))}
        rightItems={availablePackages.map((item) => ({ id: getPackageId(item), title: getPackageName(item) || `Package ${getPackageId(item)}`, meta: item.FileName || item.Manufacturer || '-' }))}
        onMoveLeft={(id) => movePackage(id, false)}
        onMoveRight={(id) => movePackage(id, true)}
      />
    );
  }

  function renderWhitelistSelector() {
    return (
      <DualListSection
        title="Permit Software List"
        leftTitle="Permit Software List"
        rightTitle="All Software List"
        searchText={searchText}
        setSearchText={setSearchText}
        disabled={isInherited}
        leftItems={selectedWhitelist.map((item) => ({ id: getWhitelistId(item), title: getWhitelistName(item) || `Software ${getWhitelistId(item)}`, meta: item.Type || item.Vendor || '-' }))}
        rightItems={availableWhitelistSoftware.map((item) => ({ id: getWhitelistId(item), title: getWhitelistName(item) || `Software ${getWhitelistId(item)}`, meta: item.Type || item.Vendor || '-' }))}
        onMoveLeft={(id) => moveWhitelist(id, false)}
        onMoveRight={(id) => moveWhitelist(id, true)}
      />
    );
  }

  function renderWebsiteSelector() {
    const policyUrlPagination = getPaginationState<string>(webUrls, webPolicyPage);
    const groupUrlPagination = getPaginationState<WebGroupUrl>(webGroupUrls, webGroupUrlPage);

    return (
      <section>
        <div>
          <div>
            <div>
              <h4>Website List</h4>
              <p>Add website domains for the selected web restriction policy.</p>
            </div>
            <span>{webUrls.length} URL{webUrls.length === 1 ? '' : 's'}</span>
          </div>

          <div>
            <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addPolicyUrl()} placeholder="example.com" disabled={isInherited} className={fieldClass} />
            <AppButton size="sm" variant="primary" onClick={addPolicyUrl} disabled={isInherited} leftIcon={<Plus size={13} />}>
              Add
            </AppButton>
          </div>

          <div>
            <div>
              {webUrls.length === 0 ? (
                <div>No URLs added to this policy.</div>
              ) : policyUrlPagination.pageItems.map((url) => (
                <div key={url} style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                  <div>
                    <span><LinkIcon size={13} /></span>
                    <strong>{url}</strong>
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={isInherited}
                      onClick={() => {
                        setWebUrls((previous) => previous.filter((item) => item !== url));
                        setMessage(`${url} removed from website list.`);
                      }}
                      className="icon-delete-btn"
                      aria-label={`Remove ${url}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <CompactPagination
              page={policyUrlPagination.safePage}
              totalPages={policyUrlPagination.totalPages}
              totalCount={webUrls.length}
              onPageChange={setWebPolicyPage}
            />
          </div>
        </div>

        <div>
          <div>
            <div>
              <h4>Website Group</h4>
              <p>Select a saved website group and add its URLs into this policy.</p>
            </div>
            <span>{webGroupUrls.length} URL{webGroupUrls.length === 1 ? '' : 's'}</span>
          </div>

          <div>
            <AppButton
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void openWebGroupManager();
              }}
              leftIcon={<Globe size={13} />}
            >
              Edit Website Group
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={addGroupUrlsToPolicy} disabled={isInherited || webGroupUrls.length === 0} leftIcon={<ArrowLeft size={13} />}>
              Add Group URLs
            </AppButton>
          </div>

          <div>
            <label>Website Group</label>
            <select value={selectedWebsiteGroupId || ''} onChange={(event) => setSelectedWebsiteGroupId(Number(event.target.value) || null)} className={fieldClass}>
              <option value="">Select group</option>
              {webGroups.map((group) => (
                <option key={group.idx} value={group.idx}>{group.name} ({group.url_count || 0})</option>
              ))}
            </select>
          </div>

          <div>
            <div>
              {webGroupUrls.length === 0 ? (
                <div>No URLs found in selected website group.</div>
              ) : groupUrlPagination.pageItems.map((item) => (
                <div key={`${item.idx}-${item.seq}`} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                  <div>
                    <span><Globe size={13} /></span>
                    <strong>{item.url}</strong>
                  </div>
                </div>
              ))}
            </div>
            <CompactPagination
              page={groupUrlPagination.safePage}
              totalPages={groupUrlPagination.totalPages}
              totalCount={webGroupUrls.length}
              onPageChange={setWebGroupUrlPage}
            />
          </div>
        </div>
      </section>
    );
  }

  function renderPolicyStatus() {
    const rows = Array.isArray(policyRows) ? policyRows : [];
    type PolicyTableRow = RestrictionPolicyRow & Record<string, any>;

    const columns: AppTableColumn<PolicyTableRow>[] = [
      {
        key: 'target_name',
        header: 'Target',
        render: (row) => row.target_name || row.target_id || '-',
      },
      {
        key: 'object_full_name',
        header: 'Department',
        render: (row) => row.object_full_name || '-',
      },
      {
        key: 'use_policy',
        header: 'Applied',
        width: 110,
        align: 'center',
        render: (row) => (
          <span>
            {row.use_policy || 'O'}
          </span>
        ),
      },
      {
        key: 'Version',
        header: 'Policy Version',
        width: 170,
        render: (row) => <code>{row.Version || row.version || '-'}</code>,
      },
    ];

    return (
      <div>
        <div role="alert">
          This policy list shows policy information for clients or departments that do not inherit their parent policies.
        </div>

        <AppTable<PolicyTableRow>
          className="appweb-large-data-card appweb-policy-status-table"
          columns={columns}
          rows={rows as PolicyTableRow[]}
          rowKey={(row, index) => getFastRowKey(row, index, ['policy_id', 'target_id', 'Version', 'version'])}
          loading={loading}
          emptyTitle="No custom policy status"
          emptyDescription="No custom policy status found for this scope."
          summary={(
            <>
              <div>
                <strong>Policy Status List</strong>
                <span>{moduleConfig.label} · {selectedTarget?.label || 'All Branches'}</span>
              </div>
              <span>
                {loading ? 'Loading...' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
              </span>
            </>
          )}
        />
      </div>
    );
  }

  function renderWebGroupManagerModal() {
    const activeGroupId = Number(editingWebGroup?.idx || selectedWebsiteGroupId || 0);
    const modalGroupUrlRows = normalizeWebGroupUrlRows(webGroupUrls, activeGroupId);
    const canEditUrls = Boolean(activeGroupId);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="webgroup-modal-title"
        onClick={() => setShowWebGroupManager(false)}
      >
        <section onClick={(event) => event.stopPropagation()}>
          <header>
            <div>
              <span>Website Restriction</span>
              <h3 id="webgroup-modal-title">Edit Website Group</h3>
              <p>Create or update website groups, then add selected group URLs into the policy list.</p>
            </div>
            <button type="button" onClick={() => setShowWebGroupManager(false)} className="appweb-modal-close" aria-label="Close website group editor">
              <X size={18} />
            </button>
          </header>

          <div>
            <aside>
              <div>
                <div>
                  <span>Website Group</span>
                  <p>Reusable URL categories stored for web restriction policy.</p>
                </div>
                <button type="button" onClick={resetWebGroupEditor}>
                  New
                </button>
              </div>

              <div>
                {webGroups.length === 0 ? (
                  <div>No website group yet. Click New, enter a group name, then save.</div>
                ) : webGroups.map((group) => {
                  const selected = activeGroupId === group.idx;
                  return (
                    <button
                      key={group.idx}
                      type="button"
                      onClick={() => selectWebGroupForEditing(group)}
                      className={clsx('appweb-webgroup-list-item', selected && 'is-selected')}
                    >
                      <span>
                        <strong>{group.name}</strong>
                        <small>{group.description || 'Website restriction group'}</small>
                      </span>
                      <em>{group.url_count || 0} URLs</em>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main>
              <div>
                <label>
                  <span>Group Name</span>
                  <input value={webGroupName} onChange={(event) => setWebGroupName(event.target.value)} className={fieldClass} placeholder="Example: Social Networking" />
                </label>
                <label>
                  <span>Description</span>
                  <input value={webGroupDescription} onChange={(event) => setWebGroupDescription(event.target.value)} className={fieldClass} placeholder="Optional note" />
                </label>
              </div>

              <div>
                <button type="button" onClick={saveWebGroup} disabled={loading}>
                  {loading ? <Loader2 size={14} /> : <Save size={14} />} {editingWebGroup ? 'Save Group' : 'Create Group'}
                </button>
                {editingWebGroup && (
                  <button type="button" onClick={() => deleteWebGroup(editingWebGroup)} disabled={loading} className="appweb-modal-danger-btn">
                    <Trash2 size={14} /> Delete Group
                  </button>
                )}
              </div>

              {showWebGroupManager && message && (
                <div>
                  {message}
                </div>
              )}

              {!canEditUrls && (
                <div>
                  Create or select a website group first. After that, add domain names into the group.
                </div>
              )}

              <section>
                <div>
                  <div>
                    <span>Domain names in this group</span>
                    <p>Enter domain names only. Do not include http:// or https://.</p>
                  </div>
                  <em>{modalGroupUrlRows.length} URLs</em>
                </div>

                <div>
                  <input
                    value={webGroupDomainInput}
                    onChange={(event) => setWebGroupDomainInput(event.target.value)}
                    onKeyDown={(event) => canEditUrls && event.key === 'Enter' && addUrlToWebGroup()}
                    disabled={!canEditUrls || loading}
                    placeholder={canEditUrls ? 'example.com' : 'Create or select a group first'}
                    className={fieldClass}
                  />
                  <button type="button" onClick={addUrlToWebGroup} disabled={!canEditUrls || loading}>
                    <Plus size={13} /> Add
                  </button>
                </div>

                <div>
                  {modalGroupUrlRows.length === 0 ? (
                    <div>No domain names in this group.</div>
                  ) : modalGroupUrlRows.map((item) => (
                    <div key={`${item.idx}-${item.seq}`}>
                      <div>
                        <Globe size={13} />
                        <span>{item.url}</span>
                      </div>
                      <button type="button" onClick={() => deleteUrlFromWebGroup(item)} disabled={loading} className="appweb-modal-icon-danger" aria-label={`Remove ${item.url}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (addGroupUrlsToPolicy()) setShowWebGroupManager(false);
                    }}
                    disabled={isInherited || modalGroupUrlRows.length === 0}
                    className="appweb-modal-dark-btn"
                  >
                    <ArrowLeft size={14} /> Add this group to policy website list
                  </button>
                </div>
              </section>
            </main>
          </div>
        </section>
      </div>
    );
  }

  function renderPackageManagerModal() {
    const files = selectedManagerPackage?.files || [];
    const selectedPackageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    const isPackageSaved = Boolean(selectedPackageId);

    return (
      <div>
        <div>
          <div>
            <div>
              <p>Application Package Editor</p>
              <h3>Package Manager</h3>
              <p>Step 1: create or select a package. Step 2: search Software Inventory EXE records and add them into that package.</p>
            </div>
            <button type="button" onClick={() => setShowPackageManager(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div>
            <aside>
              <div>
                <div>
                  <Search size={14} />
                  <input value={packageManagerSearch} onChange={(event) => setPackageManagerSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadPackageManager(packageManagerSearch)} placeholder="Search package or file" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] font-bold outline-none focus:border-blue-400" />
                </div>
                <button type="button" onClick={() => loadPackageManager(packageManagerSearch)} className="h-9 rounded-xl bg-slate-900 px-3 text-[10px] font-black text-white">
                  Search
                </button>
                <button type="button" onClick={resetPackageForm}>
                  New
                </button>
              </div>

              <div>
                {filteredPackageManagerRows.length === 0 ? (
                  <div>No packages found.</div>
                ) : filteredPackageManagerRows.map((item) => {
                  const id = getPackageId(item);
                  const selected = selectedPackageId === id;
                  return (
                    <button key={id} type="button" onClick={() => selectManagerPackage(item)} className={clsx('block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-blue-50', selected && 'bg-blue-50')}>
                      <div>
                        <div>
                          <p>{getPackageName(item)}</p>
                          <p>{item.SW_Pkg_Company || item.sample_file || '-'}</p>
                        </div>
                        <div>
                          <span>{item.file_count || 0} files</span>
                          <span>
                            {item.used_policy_count || 0} policies
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main>
              <div>
                <div>
                  <label>Package Name</label>
                  <input value={packageForm.SW_Pkg_Name} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Pkg_Name: event.target.value }))} className={fieldClass} placeholder="Example: Google Chrome" />
                </div>
                <div>
                  <label>Company / Vendor</label>
                  <input value={packageForm.SW_Pkg_Company || ''} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Pkg_Company: event.target.value }))} className={fieldClass} placeholder="Example: Google LLC" />
                </div>
                <div>
                  <label>Category ID</label>
                  <input type="number" value={packageForm.SW_Catg || 0} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Catg: Number(event.target.value || 0) }))} className={fieldClass} />
                </div>
                <div>
                  <label>Active</label>
                  <select value={String(packageForm.Selected ?? 1)} onChange={(event) => setPackageForm((prev) => ({ ...prev, Selected: Number(event.target.value) }))} className={fieldClass}>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div>
                  <label>Etc Info / Description</label>
                  <input value={packageForm.SW_Package_EtcInfo || ''} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Package_EtcInfo: event.target.value }))} className={fieldClass} placeholder="Usually first executable name or package note" />
                </div>
              </div>

              <div>
                <button type="button" onClick={saveManagerPackage} disabled={packageManagerLoading}>
                  {packageManagerLoading ? <Loader2 size={14} /> : <Save size={14} />} {selectedManagerPackage ? 'Save Package' : 'Create Package'}
                </button>
                {selectedManagerPackage && (
                  <button type="button" onClick={() => deleteManagerPackage(selectedManagerPackage)} disabled={packageManagerLoading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[10px] font-black text-rose-700 disabled:opacity-50">
                    <Trash2 size={14} /> Delete Package
                  </button>
                )}
              </div>

              {!isPackageSaved && (
                <div>
                  Create the package first. After the package is saved and has a Package ID, the Software Inventory EXE search and Add buttons will be enabled.
                </div>
              )}

              <section>
                <div>
                  <div>
                    <h4>Files inside package</h4>
                    <p>Files are copied from collected Software Inventory EXE data into TSSI_PACKAGE_FILES.</p>
                  </div>
                  <span>{files.length} files</span>
                </div>

                <div>
                  <input value={packageFileSearch} onChange={(event) => setPackageFileSearch(event.target.value)} onKeyDown={(event) => isPackageSaved && event.key === 'Enter' && searchInventoryFilesForPackage()} disabled={!isPackageSaved} placeholder={isPackageSaved ? 'Search inventory file name, e.g. chrome' : 'Create the package first before searching EXE files'} className={fieldClass} />
                  <button type="button" onClick={searchInventoryFilesForPackage} disabled={!isPackageSaved || packageManagerLoading}>Search Inventory</button>
                  <button type="button" onClick={addManualFileToPackage} disabled={!isPackageSaved || packageManagerLoading}>Manual Add</button>
                </div>

                {isPackageSaved && packageInventoryFiles.length > 0 && (
                  <div>
                    {packageInventoryFiles.map((file, index) => (
                      <div key={`${file.SW_Idn || file.FileName}-${index}`}>
                        <div>
                          <p>{file.FileName}</p>
                          <p>Version: {file.FileVersion || '-'} {file.OriginalFileName ? ` / ${file.OriginalFileName}` : ''}</p>
                        </div>
                        <button type="button" onClick={() => addInventoryFileToPackage(file)} disabled={!isPackageSaved || packageManagerLoading} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white disabled:bg-slate-300">Add</button>
                      </div>
                    ))}
                  </div>
                )}

                {isPackageSaved && packageInventoryFiles.length === 0 && packageFileSearch.trim() && (
                  <div>
                    No search result is shown yet. Click Search Inventory to find collected EXE records from Software Inventory.
                  </div>
                )}

                <div>
                  <table>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Version</th>
                        <th>Size</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr><td colSpan={4}>No files in this package.</td></tr>
                      ) : files.map((file) => (
                        <tr key={file.ID || file.FileName}>
                          <td>{file.FileName}</td>
                          <td>{file.FileVersion || '-'}</td>
                          <td>{file.FileSize || 0}</td>
                          <td>
                            <button type="button" onClick={() => deletePackageFile(file)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    );
  }

  function renderManageSoftwareModal() {
    return (
      <div>
        <div>
          <div>
            <div>
              <h3>Manage Software List</h3>
              <p>Default permitted software and registered process/font file rules.</p>
            </div>
            <button type="button" onClick={() => setShowManageSoftware(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div>
            <div>
              <Info size={16} />
              <span>After changing the Use Restriction, use the information update button to refresh permitted software data before saving the related policy.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                loadLookups();
                setMessage('Whitelist restriction information refresh requested.');
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              <RefreshCw size={14} /> Use Restriction Information Update
            </button>
          </div>

          <div>
            <section>
              <div>
                <h4>Software</h4>
                <div>
                  <button type="button" title="Save">
                    <Save size={13} />
                  </button>
                  <button type="button" title="Add">
                    <Plus size={13} />
                  </button>
                  <button type="button" title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <label>S/W Name</label>
              <div>
                <Search size={13} />
                <input
                  value={manageSearchText}
                  onChange={(event) => setManageSearchText(event.target.value)}
                  placeholder="Search software name"
                  className="h-6 min-w-0 flex-1 bg-transparent text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                {filteredManageWhitelistSoftware.length === 0 ? (
                  <div>No whitelist software found.</div>
                ) : filteredManageWhitelistSoftware.map((item, index) => (
                  <div key={`${getWhitelistId(item)}-${index}`}>
                    <span>{index + 1}</span>
                    <ShieldCheck size={13} />
                    <div>
                      <p>{getWhitelistName(item) || `Software ${getWhitelistId(item)}`}</p>
                      <p>ID: {getWhitelistId(item) || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div>
                <div>
                  <h4>Register File <span>(Permitted to run or use this registered file)</span></h4>
                  <div>
                    <button type="button" title="Edit">
                      <ListChecks size={13} />
                    </button>
                    <button type="button" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div>
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Process / Font Name</th>
                        <th>File Size (Compare)</th>
                        <th>File Version (Compare)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWhitelist.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No registered permitted software selected in current policy.</td>
                        </tr>
                      ) : selectedWhitelist.map((item) => (
                        <tr key={`registered-${getWhitelistId(item)}`}>
                          <td>{item.Type || 'Process'}</td>
                          <td>{getWhitelistName(item) || '-'}</td>
                          <td>-</td>
                          <td>-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div>
                  <h4>Register File <span>(Hash rule)</span></h4>
                  <div>
                    <button type="button" title="Add hash">
                      <Plus size={13} />
                    </button>
                    <button type="button" title="Remove hash">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div>
                  <table>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Hash (MD5)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWhitelist.length === 0 ? (
                        <tr>
                          <td colSpan={2}>No hash rules found.</td>
                        </tr>
                      ) : selectedWhitelist.map((item) => (
                        <tr key={`hash-${getWhitelistId(item)}`}>
                          <td>{getWhitelistName(item) || '-'}</td>
                          <td>-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h4>File information collected <span>(List of files registered in collector)</span></h4>
              <div>
                <label>File Name :</label>
                <div>
                  <input
                    value={manageSearchText}
                    onChange={(event) => setManageSearchText(event.target.value)}
                    placeholder="Find collected file"
                    className="h-6 w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button type="button">Find</button>
                <button type="button">
                  <ArrowLeft size={13} /> Add to allowed file list
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setManageFileTab('process')}
                  className={clsx('h-8 rounded-lg px-3 text-[10px] font-black', manageFileTab === 'process' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500')}
                >
                  Process
                </button>
                <button
                  type="button"
                  onClick={() => setManageFileTab('font')}
                  className={clsx('h-8 rounded-lg px-3 text-[10px] font-black', manageFileTab === 'font' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500')}
                >
                  Font
                </button>
              </div>

              <div>
                <table>
                  <thead>
                    <tr>
                      <th>{manageFileTab === 'process' ? 'Process Name' : 'Font Name'}</th>
                      <th>Original File Name</th>
                      <th>File Size</th>
                      <th>File Version</th>
                      <th>Company</th>
                      <th>S/W Type</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManageWhitelistSoftware.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No collected file information found.</td>
                      </tr>
                    ) : filteredManageWhitelistSoftware.map((item) => (
                      <tr key={`collected-${getWhitelistId(item)}`}>
                        <td>{getWhitelistName(item) || '-'}</td>
                        <td>{getWhitelistName(item) || '-'}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>{item.Vendor || '-'}</td>
                        <td>{item.Type || '-'}</td>
                        <td>-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }
}

type DualListItem = { id: string; title: string; meta?: string };

type DualListSectionProps = {
  title: string;
  leftTitle: string;
  rightTitle: string;
  leftItems: DualListItem[];
  rightItems: DualListItem[];
  searchText: string;
  setSearchText: (value: string) => void;
  disabled?: boolean;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
};

function DualListSection({
  title,
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
  searchText,
  setSearchText,
  disabled,
  onMoveLeft,
  onMoveRight,
}: DualListSectionProps) {
  return (
    <section>
      <div>
        <div>
          <h4>{title}</h4>
          <p>Move items between the available list and the policy selection list.</p>
        </div>
        <label style={{ maxWidth: '22rem' }}>
          <Search size={14} />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search software or package" />
        </label>
      </div>

      <div>
        <div>
          <ListPanel title={leftTitle} items={leftItems} emptyText="No selected items." actionIcon={ArrowRight} disabled={disabled} onAction={onMoveRight} />
        </div>
        <div>
          <div>
            <ArrowLeft size={18} />
            <ArrowRight size={18} />
          </div>
        </div>
        <div>
          <ListPanel title={rightTitle} items={rightItems} emptyText="No available items." actionIcon={ArrowLeft} disabled={disabled} onAction={onMoveLeft} />
        </div>
      </div>
    </section>
  );
}

type ListPanelProps = {
  title: string;
  items: DualListItem[];
  emptyText: string;
  actionIcon: LucideIcon;
  disabled?: boolean;
  onAction: (id: string) => void;
};

function ListPanel({ title, items, emptyText, actionIcon: ActionIcon, disabled, onAction }: ListPanelProps) {
  const [page, setPage] = useState(1);
  const itemSignature = `${items.length}:${items[0]?.id || ''}:${items[items.length - 1]?.id || ''}`;
  const pagination = getPaginationState<DualListItem>(items, page);

  useEffect(() => {
    setPage(1);
  }, [itemSignature, title]);

  return (
    <div>
      <div style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
        <div>{title}</div>
        <div>
          <span>{items.length}</span>
        </div>
      </div>
      <div>
        {items.length === 0 ? (
          <div>{emptyText}</div>
        ) : pagination.pageItems.map((item) => (
          <div key={item.id} style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <div>
              <span><Package size={13} /></span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.meta || '-'}</small>
              </span>
            </div>
            <div>
              <button type="button" disabled={disabled} onClick={() => onAction(item.id)} className="icon-action-btn edit" aria-label={`Move ${item.title}`}>
                <ActionIcon size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <CompactPagination
        page={pagination.safePage}
        totalPages={pagination.totalPages}
        totalCount={items.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function appRestrictionLabel(value: string) {
  if (value === '2') return 'Warn + restrict';
  if (value === '3') return 'Warning only';
  return 'Restrict';
}

function whitelistProcessLabel(value: string) {
  if (value === '1') return 'Warning';
  if (value === '2') return 'Restriction';
  if (value === '3') return 'Warn + restrict';
  return 'None';
}

function whitelistFontLabel(value: string) {
  if (value === '1') return 'Warning';
  if (value === '2') return 'Delete font file';
  if (value === '3') return 'Warn + delete';
  return 'None';
}

function webRestrictionLabel(value: string) {
  if (value === '2') return 'Allow list only';
  return 'Block list';
}
