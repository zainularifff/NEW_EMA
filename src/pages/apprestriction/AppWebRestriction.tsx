import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
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
import '../../styles/theme.css';
import '../../styles/ema-font-system.css';
import '../../styles/typography.css';
import '../../styles/app-global.css';
import '../../styles/settings-layout.css';
import '../../styles/ema-layout.css';
import '../../styles/panel.css';
import '../../styles/button.css';
import '../../styles/form.css';
import '../../styles/filter.css';
import '../../styles/table.css';
import '../../styles/pagination.css';
import '../../styles/kpi.css';
import '../../styles/modal.css';
import '../../styles/toast.css';
import '../../styles/settings-widgets.css';
import '../../styles/resource-planning.css';
import '../../styles/2fa.css';

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
} from '../../services/restrictionService';

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
    id: 'appBlacklist',
    label: 'App Restriction',
    helper: 'S/W restriction blacklist',
    policyType: 1006,
    icon: ShieldAlert,
    color: 'rose',
    tabs: ['status', 'settings', 'policyStatus'],
  },
  {
    id: 'appWhitelist',
    label: 'App Whitelist',
    helper: 'Default permitted software',
    policyType: 1012,
    icon: ShieldCheck,
    color: 'emerald',
    tabs: ['status', 'settings', 'policyStatus'],
  },
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
    <div className="uam-pagination global-style">
      <span className="uam-page-status">{start}-{end} of {totalCount}</span>
      <button type="button" className="uam-page-icon" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)}>
        Previous
      </button>
      {pages.map((item, index) => {
        const previous = pages[index - 1];
        const needsGap = previous && item - previous > 1;
        return (
          <span key={item} className="d-inline-flex align-items-center gap-1">
            {needsGap && <span className="uam-page-status">...</span>}
            <button type="button" className={clsx('uam-page-icon', item === safePage && 'uam-page-current')} onClick={() => onPageChange(item)}>
              {item}
            </button>
          </span>
        );
      })}
      <button type="button" className="uam-page-icon" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)}>
        Next
      </button>
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
      className={clsx(variantClass, sizeClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : leftIcon}
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

  return (
    <div className={clsx('pricing-table-card', className)}>
      {summary && <div className="content-head">{summary}</div>}
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={clsx(column.align === 'end' && 'text-end', column.align === 'center' && 'text-center')}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-5 text-center">
                  <span className="d-inline-flex align-items-center gap-2 text-muted fw-bold small">
                    <Loader2 size={16} className="animate-spin" /> Loading records...
                  </span>
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-5 text-center">
                  <div className="fw-black text-slate-700">{emptyTitle}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{emptyDescription}</div>
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
                        className={clsx(column.align === 'end' && 'text-end', column.align === 'center' && 'text-center')}
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
        <div className="uam-pagination global-style">
          <button type="button" className="uam-page-icon" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          {pages.map((item, index) => {
            const previous = pages[index - 1];
            const needsGap = previous && item - previous > 1;
            return (
              <span key={item} className="d-inline-flex align-items-center gap-1">
                {needsGap && <span className="uam-page-status">...</span>}
                <button type="button" className={clsx('uam-page-icon', item === safePage && 'uam-page-current')} onClick={() => setPage(item)}>
                  {item}
                </button>
              </span>
            );
          })}
          <button type="button" className="uam-page-icon" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Next
          </button>
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

const toTarget = (node: RestrictionTreeNode): RestrictionTarget | null => {
  if (node.type === 'org') return null;

  if (node.type === 'root') {
    return {
      id: node.id,
      label: node.label,
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
    if (target?.type === 'device') return target;
    const childTarget = findFirstTarget(node.children || []);
    if (childTarget) return childTarget;
    if (target) return target;
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

export default function AppWebRestriction() {
  const [activeModule, setActiveModule] = useState<RestrictionModule>('appBlacklist');
  const [activeTab, setActiveTab] = useState<SubTab>('status');
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
      setMessage('Organization view is not available right now.');
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
      label: 'Organization',
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

  const loadWebGroupUrls = useCallback(async () => {
    if (!selectedWebsiteGroupId) {
      setWebGroupUrls([]);
      return;
    }

    try {
      const urls = await restrictionService.getWebGroupUrls(selectedWebsiteGroupId);
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
    if (webGroupUrls.length === 0) {
      setMessage('No URLs found in this website group. Add domains into the group first.');
      return;
    }
    const urls = webGroupUrls.map((item) => item.url);
    setWebUrls((previous) => [...new Set([...previous, ...urls])]);
    setMessage(`${urls.length} website${urls.length === 1 ? '' : 's'} from this group added to the policy website list.`);
  };

  const normalizeWebDomain = (value: string) => {
    return value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[\s,]+/)[0]
      .split('/')[0]
      .toLowerCase();
  };

  const openWebGroupManager = async () => {
    setShowWebGroupManager(true);
    if (selectedWebsiteGroupId) {
      const group = webGroups.find((item) => item.idx === selectedWebsiteGroupId) || null;
      setEditingWebGroup(group);
      setWebGroupName(group?.name || '');
      setWebGroupDescription(group?.description || '');
    } else {
      setEditingWebGroup(null);
      setWebGroupName('');
      setWebGroupDescription('');
    }
    setWebGroupDomainInput('');
    await loadLookups();
    await loadWebGroupUrls();
  };

  const selectWebGroupForEditing = async (group: WebGroup) => {
    setEditingWebGroup(group);
    setSelectedWebsiteGroupId(group.idx);
    setWebGroupName(group.name || '');
    setWebGroupDescription(group.description || '');
    setWebGroupDomainInput('');

    try {
      const urls = await restrictionService.getWebGroupUrls(group.idx);
      setWebGroupUrls(urls);
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
        const urls = await restrictionService.getWebGroupUrls(saved.idx);
        setWebGroupUrls(urls);
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
    const groupId = editingWebGroup?.idx || selectedWebsiteGroupId;
    const domain = normalizeWebDomain(webGroupDomainInput);
    if (!groupId) {
      setMessage('Create or select a website group first.');
      return;
    }
    if (!domain) {
      setMessage('Enter a domain name first. Do not include http:// or https://.');
      return;
    }

    try {
      setLoading(true);
      await restrictionService.addWebGroupUrl(groupId, domain);
      setWebGroupDomainInput('');
      setMessage('Domain added to website group.');
      const urls = await restrictionService.getWebGroupUrls(groupId);
      setWebGroupUrls(urls);
      await loadLookups();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message;
      setMessage(apiMessage || (error instanceof Error ? error.message : 'Failed to add domain to website group.'));
    } finally {
      setLoading(false);
    }
  };

  const deleteUrlFromWebGroup = async (item: WebGroupUrl) => {
    try {
      setLoading(true);
      await restrictionService.deleteWebGroupUrl(item.idx, item.seq);
      setMessage('Domain removed from website group.');
      const urls = await restrictionService.getWebGroupUrls(item.idx);
      setWebGroupUrls(urls);
      await loadLookups();
    } catch (error) {
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
    <div className={depth > 0 ? 'ema-sidebar-tree-children is-nested' : 'ema-sidebar-tree-level'}>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isOpen = expandedGroups.has(node.id);
        const target = toTarget(node);
        const isSelected = target && selectedTarget?.id === target.id;
        const Icon = node.type === 'org' ? Server : node.type === 'root' ? Layers : node.type === 'department' ? (isOpen ? FolderOpen : Folder) : Laptop;
        const handleNodeAction = () => {
          if (hasChildren) toggleExpand(node.id);
          if (target) handleTargetClick(node);
        };

        return (
          <div key={node.id} className="ema-sidebar-tree-branch">
            <div className={clsx('ema-sidebar-tree-node', `depth-${Math.min(depth, 8)}`, isSelected && 'is-selected', hasChildren && 'is-expandable')}>
              <button
                type="button"
                className="ema-sidebar-tree-toggle"
                aria-label={hasChildren ? (isOpen ? 'Collapse' : 'Expand') : 'Open'}
                onClick={() => {
                  if (hasChildren) toggleExpand(node.id);
                }}
              >
                {hasChildren ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span />}
              </button>

              <button
                type="button"
                className="ema-sidebar-tree-main"
                title={node.label}
                onClick={handleNodeAction}
              >
                <span className="ema-sidebar-tree-icon"><Icon size={14} /></span>
                <span className="ema-sidebar-tree-label">{node.label}</span>
              </button>

              {node.badge ? <span className="ema-sidebar-tree-count">{node.badge}</span> : null}
            </div>

            {hasChildren && isOpen ? renderTree(node.children || [], depth + 1) : null}
          </div>
        );
      })}
    </div>
  );


  return (
    <main className="settings-module-root ema-module-root ema-settings-pro appwebrestriction-module appweb-scroll-module" data-section="appwebrestriction">
      {notice && (
        <div className="settings-toast-layer">
          <div className={clsx('settings-toast', `settings-toast-${notice.tone}`)}>
            <span className="settings-toast-icon"><Info size={17} /></span>
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
      <div className="settings-layout">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>WEB RESTRICTION</span>
            <strong>Policy Scope</strong>
            <small>Browse organization, devices and policy groups.</small>
          </div>

          <div className="ema-sidebar-content">
            <div className="ema-sidebar-subpanel">
              <label className="section-search ema-sidebar-field" htmlFor="restrictionSidebarSearch">
                <Search size={15} />
                <input
                  id="restrictionSidebarSearch"
                  value={targetTreeSearch}
                  onChange={(event) => setTargetTreeSearch(event.target.value)}
                  placeholder="Search organization..."
                />
                {targetTreeSearch && <button type="button" className="ema-sidebar-search-clear" onClick={() => setTargetTreeSearch('')}><X size={14} /></button>}
              </label>

              <div className="ema-sidebar-tree" role="tree" aria-label="App and web restriction organization tree">
                <div className="ema-sidebar-section-title">
                  <Building2 size={14} />
                  <span>Organization</span>
                </div>
                {loading && treeNodes.length === 0 ? (
                  <div className="ema-sidebar-empty">Preparing organization view...</div>
                ) : filteredTreeNodes.length > 0 ? renderTree(filteredTreeNodes) : (
                  <div className="ema-sidebar-empty">{targetTreeSearch ? "No matching organization found." : "No organization entries found."}</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="settings-content">
          <div className="settings-hero ema-hero-kpi-right ema-panel-surface">
            <div>
              <div className="eyebrow d-inline-flex align-items-center gap-1 mb-2">
                <span>Policy Management</span>
                <ChevronRight size={12} />
                <span>{moduleConfig.label}</span>
              </div>
              <h2>App / Web Restriction</h2>
              <p>
                Selected target: {selectedTarget?.label || 'None'}
                {selectedTarget?.Object_Full_Name ? ` (${selectedTarget.Object_Full_Name})` : ''}
              </p>
              {message && (
                <div className="settings-inline-alert d-inline-flex gap-2 align-items-start mt-2">
                  <Info size={14} className="mt-0.5 shrink-0" /> {message}
                </div>
              )}
            </div>

            <div className="settings-score ema-kpi-right-pair">
              {summaryCards.map((card) => (
                <button key={card.label} className="score-box text-start" type="button">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.helper}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-score appweb-module-switcher">
            {modules.map((item) => {
              const Icon = item.icon;
              const selected = item.id === activeModule;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    setActiveTab(item.tabs[0]);
                    setSearchText('');
                    setMessage(null);
                  }}
                  className={clsx('setting-btn', selected && 'active')}
                >
                  <span className="setting-icon">
                    <Icon size={17} />
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.helper} / policy {item.policyType}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="content-shell ema-panel-surface appweb-main-card">
            <div className="content-head">
              <div className="content-actions">
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openPackageManager}
                    className="app-btn btn btn-sm btn-primary"
                  >
                    <Package size={13} /> Package Manager
                  </button>
                </div>
              )}
            </div>

            <div className="content-body appweb-main-body">
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
      <div className="d-grid gap-3">
        <div className="content-toolbar users-toolbar">
          <div className="row g-2 align-items-end w-100 m-0">
            <div className="col-12 col-sm-auto">
              <label className="form-field-label">Start Date</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="setting-input" />
            </div>
            <div className="col-12 col-sm-auto">
              <label className="form-field-label">End Date</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="setting-input" />
            </div>
            <div className="col-12 col-sm-auto">
              <label className="inline-check mb-0">
                <input className="form-check-input" type="checkbox" checked={includeSub} onChange={(event) => setIncludeSub(event.target.checked)} />
                <span className="form-check-label">Include Sub-Dept</span>
              </label>
            </div>
            <div className="col-12 col-sm-auto">
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
                <strong className="ema-title">{statusTitle}</strong>
                <span>{selectedTarget?.label || 'Organization'} · {startDate} until {endDate}</span>
              </div>
              <span className="badge rounded-pill text-bg-light border">
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
      <div className="content-actions justify-content-end border-top pt-3">
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
      <section className={clsx('policy-card h-100', layout === 'whitelist' && 'h-100')}>
        <div className="policy-top">
          <div>
            <h4>Basic Setting</h4>
            <p>Policy assignment, update interval and inheritance control.</p>
          </div>
          <span className={clsx('user-pill info text-capitalize', tone.soft)}>
            {policyDetail?.source || 'none'} policy
          </span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className={labelClass}>Policy ID</label>
            <input value={form.policyId || 'New Policy'} disabled className={fieldClass} />
          </div>
          <div className="col-12 col-md-6">
            <label className={labelClass}>Result Update Interval (min.)</label>
            <input value={form.updateInterval} onChange={(event) => updateForm('updateInterval', event.target.value)} disabled={isInherited} className={fieldClass} />
          </div>
          <div className="col-12 col-md-6">
            <label className="inline-check mb-0 h-100">
              <input className="form-check-input" type="checkbox" checked={form.inheritPolicy} disabled={selectedTarget?.type === 'root'} onChange={(event) => updateForm('inheritPolicy', event.target.checked)} />
              <span>Inherit Policy</span>
            </label>
          </div>
          <div className="col-12 col-md-6">
            <label className="inline-check mb-0 h-100">
              <input className="form-check-input" type="checkbox" checked={form.exception} disabled={isInherited} onChange={(event) => updateForm('exception', event.target.checked)} />
              <span>Do not apply restriction / Exception</span>
            </label>
          </div>
        </div>

        {isInherited && (
          <div className="settings-inline-alert mt-3">
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
        <div className="d-grid gap-3">
          <div className="settings-helper-card">
            <strong>{moduleConfig.label} Policy Settings</strong>
            <span>{settingsIntro}</span>
          </div>

          <div className="role-grid">
            {renderBasicSettingsSection('whitelist')}
            {renderWhitelistRestrictionSettings()}
          </div>

          {renderWhitelistSelector()}
          {renderPolicyActionButtons()}
        </div>
      );
    }

    return (
      <div className="d-grid gap-3">
        <div className="settings-helper-card">
          <strong>{moduleConfig.label} Policy Settings</strong>
          <span>{settingsIntro}</span>
        </div>

        <div className="role-grid">
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
      <section className="policy-card h-100">
        <div className="policy-top">
          <div>
            <h4>Restriction Method</h4>
            <p>Choose how the app restriction policy responds when a selected package is detected.</p>
          </div>
          <span className="user-pill info">{appRestrictionLabel(form.appRestrictType)}</span>
        </div>

        <div className="row g-2">
          {options.map(([value, label, helper]) => (
            <div key={value} className="col-12 col-xl-4">
              <label className={clsx('inline-check mb-0 h-100', form.appRestrictType === value && 'border-primary bg-primary-subtle text-primary')}>
                <input className="form-check-input" type="radio" name="appRestrictType" checked={form.appRestrictType === value} disabled={isInherited} onChange={() => updateForm('appRestrictType', value)} />
                <span>
                  <strong className="d-block">{label}</strong>
                  <small className="d-block text-muted fw-bold">{helper}</small>
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <label className={labelClass}>Warning Message</label>
          <textarea value={form.appNoticeMessage} onChange={(event) => updateForm('appNoticeMessage', event.target.value)} disabled={isInherited} className="setting-textarea" placeholder="Message shown to the user when this policy triggers." />
        </div>

        <label className="inline-check mt-3 mb-0">
          <input className="form-check-input" type="checkbox" checked={form.versionCompare} disabled={isInherited} onChange={(event) => updateForm('versionCompare', event.target.checked)} />
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
        <section className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Restriction of Process</h4>
              <p>Control process behaviour for software outside the permitted list.</p>
            </div>
            <span className="user-pill info">{whitelistProcessLabel(form.processRestrictType)}</span>
          </div>

          <div className="row g-2">
            {processOptions.map(([value, label]) => (
              <div key={value} className="col-12 col-sm-6">
                <label className={clsx('inline-check mb-0 h-100', form.processRestrictType === value && 'border-primary bg-primary-subtle text-primary')}>
                  <input className="form-check-input" type="radio" name="processRestrictType" checked={form.processRestrictType === value} disabled={isInherited} onChange={() => updateForm('processRestrictType', value)} />
                  <span>{label}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <label className={labelClass}>Notice Message (max 249 characters)</label>
              <span className="user-pill muted-cell">{form.processNoticeMessage.length}/249</span>
            </div>
            <textarea maxLength={249} value={form.processNoticeMessage} onChange={(event) => updateForm('processNoticeMessage', event.target.value)} disabled={isInherited} className="setting-textarea" placeholder="Message shown when the process policy triggers." />
          </div>
        </section>

        <section className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Restriction of Font</h4>
              <p>Control font file handling for software outside the permitted list.</p>
            </div>
            <span className="user-pill info">{whitelistFontLabel(form.fontRestrictType)}</span>
          </div>

          <div className="row g-2">
            {fontOptions.map(([value, label]) => (
              <div key={value} className="col-12 col-sm-6">
                <label className={clsx('inline-check mb-0 h-100', form.fontRestrictType === value && 'border-primary bg-primary-subtle text-primary')}>
                  <input className="form-check-input" type="radio" name="fontRestrictType" checked={form.fontRestrictType === value} disabled={isInherited} onChange={() => updateForm('fontRestrictType', value)} />
                  <span>{label}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <label className={labelClass}>Notice Message (max 249 characters)</label>
              <span className="user-pill muted-cell">{form.fontNoticeMessage.length}/249</span>
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
      <section className="policy-card h-100">
        <div className="policy-top">
          <div>
            <h4>Restriction Type</h4>
            <p>Choose whether the website list is treated as a block list or an allow list.</p>
          </div>
          <span className="user-pill info">{webRestrictionLabel(form.webRestrictType)}</span>
        </div>

        <div className="row g-2">
          {options.map(([value, label, helper]) => (
            <div key={value} className="col-12 col-md-6">
              <label className={clsx('inline-check mb-0 h-100', form.webRestrictType === value && 'border-primary bg-primary-subtle text-primary')}>
                <input className="form-check-input" type="radio" name="webRestrictType" checked={form.webRestrictType === value} disabled={isInherited} onChange={() => updateForm('webRestrictType', value)} />
                <span>
                  <strong className="d-block">{label}</strong>
                  <small className="d-block text-muted fw-bold">{helper}</small>
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <label className={labelClass}>Move to default URL</label>
          <input value={form.defaultUrl} onChange={(event) => updateForm('defaultUrl', event.target.value)} disabled={isInherited} className={fieldClass} placeholder="127.0.0.1" />
        </div>
      </section>
    );
  }

  function renderWeeklyAndSchedule() {
    return (
      <section className="role-grid">
        <div className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Weekly Policy</h4>
              <p>Select the days where this policy should be active.</p>
            </div>
            <label className="inline-check mb-0">
              <input className="form-check-input" type="checkbox" checked={form.weeklyPolicy} disabled={isInherited} onChange={(event) => updateForm('weeklyPolicy', event.target.checked)} />
              <span>Enable</span>
            </label>
          </div>

          <div className="row g-2 row-cols-2 row-cols-sm-4 row-cols-lg-7">
            {dayOptions.map((day) => (
              <div key={day} className="col">
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

        <div className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Restricted Time</h4>
              <p>Run the policy all day or only during selected time ranges.</p>
            </div>
            <div className="content-actions">
              <button type="button" disabled={isInherited} onClick={() => updateForm('useSchedule', false)} className={clsx(!form.useSchedule ? 'primary-btn' : 'soft-btn')}>All Day</button>
              <button type="button" disabled={isInherited} onClick={() => updateForm('useSchedule', true)} className={clsx(form.useSchedule ? 'primary-btn' : 'soft-btn')}>Schedule</button>
            </div>
          </div>

          <div className="row g-3">
            {(['schedule1', 'schedule2', 'schedule3', 'schedule4'] as const).map((key, index) => (
              <div key={key} className="col-12 col-md-6">
                <label className={labelClass}>Schedule {index + 1} (HH:mm-HH:mm)</label>
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
      <section className="role-grid">
        <div className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Website List</h4>
              <p>Add website domains for the selected web restriction policy.</p>
            </div>
            <span className="user-pill info">{webUrls.length} URL{webUrls.length === 1 ? '' : 's'}</span>
          </div>

          <div className="d-flex gap-2 mb-3">
            <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addPolicyUrl()} placeholder="example.com" disabled={isInherited} className={fieldClass} />
            <AppButton size="sm" variant="primary" onClick={addPolicyUrl} disabled={isInherited} leftIcon={<Plus size={13} />}>
              Add
            </AppButton>
          </div>

          <div className="appweb-list-panel rounded-2xl border border-slate-200 overflow-hidden">
            <div className="appweb-list-scroll p-0">
              {webUrls.length === 0 ? (
                <div className="p-4 text-center text-muted fw-bold small">No URLs added to this policy.</div>
              ) : policyUrlPagination.pageItems.map((url) => (
                <div key={url} className="user-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                  <div className="user-cell user-name">
                    <span className="user-mini-avatar"><LinkIcon size={13} /></span>
                    <strong>{url}</strong>
                  </div>
                  <div className="user-cell text-end">
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

        <div className="policy-card h-100">
          <div className="policy-top">
            <div>
              <h4>Website Group</h4>
              <p>Select a saved website group and add its URLs into this policy.</p>
            </div>
            <span className="user-pill info">{webGroupUrls.length} URL{webGroupUrls.length === 1 ? '' : 's'}</span>
          </div>

          <div className="content-actions justify-content-start mb-3">
            <AppButton size="sm" variant="secondary" onClick={openWebGroupManager} leftIcon={<Globe size={13} />}>
              Edit Website Group
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={addGroupUrlsToPolicy} disabled={isInherited || webGroupUrls.length === 0} leftIcon={<ArrowLeft size={13} />}>
              Add Group URLs
            </AppButton>
          </div>

          <div className="mb-3">
            <label className={labelClass}>Website Group</label>
            <select value={selectedWebsiteGroupId || ''} onChange={(event) => setSelectedWebsiteGroupId(Number(event.target.value) || null)} className={fieldClass}>
              <option value="">Select group</option>
              {webGroups.map((group) => (
                <option key={group.idx} value={group.idx}>{group.name} ({group.url_count || 0})</option>
              ))}
            </select>
          </div>

          <div className="appweb-list-panel rounded-2xl border border-slate-200 overflow-hidden">
            <div className="appweb-list-scroll p-0">
              {webGroupUrls.length === 0 ? (
                <div className="p-4 text-center text-muted fw-bold small">No URLs found in selected website group.</div>
              ) : groupUrlPagination.pageItems.map((item) => (
                <div key={`${item.idx}-${item.seq}`} className="user-row" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                  <div className="user-cell user-name">
                    <span className="user-mini-avatar"><Globe size={13} /></span>
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
          <span className={clsx('badge rounded-pill', row.use_policy === 'X' || row.use_policy === '0' ? 'text-bg-secondary' : 'text-bg-success')}>
            {row.use_policy || 'O'}
          </span>
        ),
      },
      {
        key: 'Version',
        header: 'Policy Version',
        width: 170,
        render: (row) => <code className="user-pill info">{row.Version || row.version || '-'}</code>,
      },
    ];

    return (
      <div className="d-grid gap-3">
        <div className="alert alert-primary settings-helper-card mb-3" role="alert">
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
                <strong className="ema-title">Policy Status List</strong>
                <span>{moduleConfig.label} · {selectedTarget?.label || 'Organization'}</span>
              </div>
              <span className="badge rounded-pill text-bg-light border">
                {loading ? 'Loading...' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
              </span>
            </>
          )}
        />
      </div>
    );
  }

  function renderWebGroupManagerModal() {
    const activeGroupId = editingWebGroup?.idx || selectedWebsiteGroupId || 0;
    const canEditUrls = Boolean(activeGroupId);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Website Restriction</p>
              <h3 className="text-base font-black text-slate-900">Edit Website Group</h3>
              <p className="text-[11px] font-bold text-slate-500">Create a website category, enter domain names without http:// or https://, then add the group URLs into the policy list.</p>
            </div>
            <button type="button" onClick={() => setShowWebGroupManager(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[0.9fr_1.25fr]">
            <aside className="min-h-0 border-r border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h4 className={sectionTitleClass}>Website Group</h4>
                  <p className="text-[10px] font-bold text-slate-400">Reusable URL categories stored in TSWB_URL_GROUP.</p>
                </div>
                <button type="button" onClick={resetWebGroupEditor} className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600">
                  New
                </button>
              </div>

              <div className="max-h-[66vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
                {webGroups.length === 0 ? (
                  <div className="p-8 text-center text-[11px] font-bold text-slate-400">No website group yet. Click New, enter a group name, then Save Group.</div>
                ) : webGroups.map((group) => {
                  const selected = activeGroupId === group.idx;
                  return (
                    <button key={group.idx} type="button" onClick={() => selectWebGroupForEditing(group)} className={clsx('block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-blue-50', selected && 'bg-blue-50')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-slate-800">{group.name}</p>
                          <p className="truncate text-[10px] font-bold text-slate-400">{group.description || 'Website restriction group'}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">{group.url_count || 0} URLs</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="min-h-0 overflow-auto p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Group Name</label>
                  <input value={webGroupName} onChange={(event) => setWebGroupName(event.target.value)} className={fieldClass} placeholder="Example: Social Networking" />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <input value={webGroupDescription} onChange={(event) => setWebGroupDescription(event.target.value)} className={fieldClass} placeholder="Optional note" />
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={saveWebGroup} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black text-white disabled:bg-slate-300">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editingWebGroup ? 'Save Group' : 'Create Group'}
                </button>
                {editingWebGroup && (
                  <button type="button" onClick={() => deleteWebGroup(editingWebGroup)} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[10px] font-black text-rose-700 disabled:opacity-50">
                    <Trash2 size={14} /> Delete Group
                  </button>
                )}
              </div>

              {!canEditUrls && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800">
                  Create or select a website group first. After that, add domain names into the group.
                </div>
              )}

              <section className={clsx('rounded-2xl border p-4', canEditUrls ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70')}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className={sectionTitleClass}>Domain names in this group</h4>
                    <p className="text-[10px] font-bold text-slate-400">Enter domain names only. Do not include http:// or https://.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{webGroupUrls.length} URLs</span>
                </div>

                <div className="mb-3 flex gap-2">
                  <input value={webGroupDomainInput} onChange={(event) => setWebGroupDomainInput(event.target.value)} onKeyDown={(event) => canEditUrls && event.key === 'Enter' && addUrlToWebGroup()} disabled={!canEditUrls || loading} placeholder={canEditUrls ? 'example.com' : 'Create or select a group first'} className={fieldClass} />
                  <button type="button" onClick={addUrlToWebGroup} disabled={!canEditUrls || loading} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white disabled:bg-slate-300">
                    <Plus size={13} /> Add
                  </button>
                </div>

                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">
                  {webGroupUrls.length === 0 ? (
                    <div className="p-8 text-center text-[11px] font-bold text-slate-400">No domain names in this group.</div>
                  ) : webGroupUrls.map((item) => (
                    <div key={`${item.idx}-${item.seq}`} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-700">
                        <Globe size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">{item.url}</span>
                      </div>
                      <button type="button" onClick={() => deleteUrlFromWebGroup(item)} disabled={loading} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => { addGroupUrlsToPolicy(); setShowWebGroupManager(false); }} disabled={isInherited || webGroupUrls.length === 0} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[10px] font-black text-white disabled:bg-slate-300">
                    <ArrowLeft size={14} /> Add this group to policy website list
                  </button>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    );
  }

  function renderPackageManagerModal() {
    const files = selectedManagerPackage?.files || [];
    const selectedPackageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    const isPackageSaved = Boolean(selectedPackageId);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Application Package Editor</p>
              <h3 className="text-base font-black text-slate-900">Package Manager</h3>
              <p className="text-[11px] font-bold text-slate-500">Step 1: create or select a package. Step 2: search Software Inventory EXE records and add them into that package.</p>
            </div>
            <button type="button" onClick={() => setShowPackageManager(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[0.95fr_1.35fr]">
            <aside className="min-h-0 border-r border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={packageManagerSearch} onChange={(event) => setPackageManagerSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadPackageManager(packageManagerSearch)} placeholder="Search package or file" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] font-bold outline-none focus:border-blue-400" />
                </div>
                <button type="button" onClick={() => loadPackageManager(packageManagerSearch)} className="h-9 rounded-xl bg-slate-900 px-3 text-[10px] font-black text-white">
                  Search
                </button>
                <button type="button" onClick={resetPackageForm} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600">
                  New
                </button>
              </div>

              <div className="max-h-[66vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
                {filteredPackageManagerRows.length === 0 ? (
                  <div className="p-8 text-center text-[11px] font-bold text-slate-400">No packages found.</div>
                ) : filteredPackageManagerRows.map((item) => {
                  const id = getPackageId(item);
                  const selected = selectedPackageId === id;
                  return (
                    <button key={id} type="button" onClick={() => selectManagerPackage(item)} className={clsx('block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-blue-50', selected && 'bg-blue-50')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-slate-800">{getPackageName(item)}</p>
                          <p className="truncate text-[10px] font-bold text-slate-400">{item.SW_Pkg_Company || item.sample_file || '-'}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">{item.file_count || 0} files</span>
                          <span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-black', Number(item.used_policy_count || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                            {item.used_policy_count || 0} policies
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="min-h-0 overflow-auto p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Package Name</label>
                  <input value={packageForm.SW_Pkg_Name} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Pkg_Name: event.target.value }))} className={fieldClass} placeholder="Example: Google Chrome" />
                </div>
                <div>
                  <label className={labelClass}>Company / Vendor</label>
                  <input value={packageForm.SW_Pkg_Company || ''} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Pkg_Company: event.target.value }))} className={fieldClass} placeholder="Example: Google LLC" />
                </div>
                <div>
                  <label className={labelClass}>Category ID</label>
                  <input type="number" value={packageForm.SW_Catg || 0} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Catg: Number(event.target.value || 0) }))} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Active</label>
                  <select value={String(packageForm.Selected ?? 1)} onChange={(event) => setPackageForm((prev) => ({ ...prev, Selected: Number(event.target.value) }))} className={fieldClass}>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Etc Info / Description</label>
                  <input value={packageForm.SW_Package_EtcInfo || ''} onChange={(event) => setPackageForm((prev) => ({ ...prev, SW_Package_EtcInfo: event.target.value }))} className={fieldClass} placeholder="Usually first executable name or package note" />
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={saveManagerPackage} disabled={packageManagerLoading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black text-white disabled:bg-slate-300">
                  {packageManagerLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {selectedManagerPackage ? 'Save Package' : 'Create Package'}
                </button>
                {selectedManagerPackage && (
                  <button type="button" onClick={() => deleteManagerPackage(selectedManagerPackage)} disabled={packageManagerLoading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[10px] font-black text-rose-700 disabled:opacity-50">
                    <Trash2 size={14} /> Delete Package
                  </button>
                )}
              </div>

              {!isPackageSaved && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800">
                  Create the package first. After the package is saved and has a Package ID, the Software Inventory EXE search and Add buttons will be enabled.
                </div>
              )}

              <section className={clsx('rounded-2xl border p-4', isPackageSaved ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70')}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className={sectionTitleClass}>Files inside package</h4>
                    <p className="text-[10px] font-bold text-slate-400">Files are copied from collected Software Inventory EXE data into TSSI_PACKAGE_FILES.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{files.length} files</span>
                </div>

                <div className="mb-3 flex gap-2">
                  <input value={packageFileSearch} onChange={(event) => setPackageFileSearch(event.target.value)} onKeyDown={(event) => isPackageSaved && event.key === 'Enter' && searchInventoryFilesForPackage()} disabled={!isPackageSaved} placeholder={isPackageSaved ? 'Search inventory file name, e.g. chrome' : 'Create the package first before searching EXE files'} className={fieldClass} />
                  <button type="button" onClick={searchInventoryFilesForPackage} disabled={!isPackageSaved || packageManagerLoading} className="h-8 rounded-lg bg-slate-900 px-3 text-[10px] font-black text-white disabled:bg-slate-300">Search Inventory</button>
                  <button type="button" onClick={addManualFileToPackage} disabled={!isPackageSaved || packageManagerLoading} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600 disabled:opacity-40">Manual Add</button>
                </div>

                {isPackageSaved && packageInventoryFiles.length > 0 && (
                  <div className="mb-4 max-h-44 overflow-auto rounded-xl border border-blue-100 bg-blue-50/40">
                    {packageInventoryFiles.map((file, index) => (
                      <div key={`${file.SW_Idn || file.FileName}-${index}`} className="flex items-center justify-between gap-2 border-b border-blue-100 px-3 py-2 last:border-b-0">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-slate-700">{file.FileName}</p>
                          <p className="truncate text-[10px] font-bold text-slate-400">Version: {file.FileVersion || '-'} {file.OriginalFileName ? ` / ${file.OriginalFileName}` : ''}</p>
                        </div>
                        <button type="button" onClick={() => addInventoryFileToPackage(file)} disabled={!isPackageSaved || packageManagerLoading} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white disabled:bg-slate-300">Add</button>
                      </div>
                    ))}
                  </div>
                )}

                {isPackageSaved && packageInventoryFiles.length === 0 && packageFileSearch.trim() && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500">
                    No search result is shown yet. Click Search Inventory to find collected EXE records from Software Inventory.
                  </div>
                )}

                <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-3 py-2">File Name</th>
                        <th className="px-3 py-2">Version</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-8 text-center font-bold text-slate-400">No files in this package.</td></tr>
                      ) : files.map((file) => (
                        <tr key={file.ID || file.FileName} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-black text-slate-700">{file.FileName}</td>
                          <td className="px-3 py-2 text-slate-500">{file.FileVersion || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{file.FileSize || 0}</td>
                          <td className="px-3 py-2 text-right">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Manage Software List</h3>
              <p className="text-[11px] font-bold text-slate-500">Default permitted software and registered process/font file rules.</p>
            </div>
            <button type="button" onClick={() => setShowManageSoftware(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700">
              <Info size={16} className="shrink-0" />
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

          <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 xl:grid-cols-[0.72fr_1.3fr_1.25fr]">
            <section className="flex min-h-[560px] flex-col rounded-2xl border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className={sectionTitleClass}>Software</h4>
                <div className="flex items-center gap-1">
                  <button type="button" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" title="Save">
                    <Save size={13} />
                  </button>
                  <button type="button" className="rounded-lg border border-emerald-100 bg-emerald-50 p-1.5 text-emerald-600" title="Add">
                    <Plus size={13} />
                  </button>
                  <button type="button" className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600" title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <label className={labelClass}>S/W Name</label>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search size={13} className="text-slate-400" />
                <input
                  value={manageSearchText}
                  onChange={(event) => setManageSearchText(event.target.value)}
                  placeholder="Search software name"
                  className="h-6 min-w-0 flex-1 bg-transparent text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                {filteredManageWhitelistSoftware.length === 0 ? (
                  <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center text-[11px] font-bold text-slate-400">No whitelist software found.</div>
                ) : filteredManageWhitelistSoftware.map((item, index) => (
                  <div key={`${getWhitelistId(item)}-${index}`} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-slate-500">{index + 1}</span>
                    <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black text-slate-800">{getWhitelistName(item) || `Software ${getWhitelistId(item)}`}</p>
                      <p className="truncate text-[10px] font-bold text-slate-400">ID: {getWhitelistId(item) || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid min-h-[560px] grid-rows-[1fr_0.42fr] gap-4">
              <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className={sectionTitleClass}>Register File <span className="normal-case tracking-normal text-slate-400">(Permitted to run or use this registered file)</span></h4>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" title="Edit">
                      <ListChecks size={13} />
                    </button>
                    <button type="button" className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Process / Font Name</th>
                        <th className="px-3 py-2">File Size (Compare)</th>
                        <th className="px-3 py-2">File Version (Compare)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWhitelist.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-10 text-center text-[11px] font-bold text-slate-400">No registered permitted software selected in current policy.</td>
                        </tr>
                      ) : selectedWhitelist.map((item) => (
                        <tr key={`registered-${getWhitelistId(item)}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-500">{item.Type || 'Process'}</td>
                          <td className="px-3 py-2 font-black text-slate-700">{getWhitelistName(item) || '-'}</td>
                          <td className="px-3 py-2 font-bold text-slate-500">-</td>
                          <td className="px-3 py-2 font-bold text-slate-500">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className={sectionTitleClass}>Register File <span className="normal-case tracking-normal text-slate-400">(Hash rule)</span></h4>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-lg border border-emerald-100 bg-emerald-50 p-1.5 text-emerald-600" title="Add hash">
                      <Plus size={13} />
                    </button>
                    <button type="button" className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600" title="Remove hash">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-3 py-2">File Name</th>
                        <th className="px-3 py-2">Hash (MD5)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWhitelist.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-8 text-center text-[11px] font-bold text-slate-400">No hash rules found.</td>
                        </tr>
                      ) : selectedWhitelist.map((item) => (
                        <tr key={`hash-${getWhitelistId(item)}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-700">{getWhitelistName(item) || '-'}</td>
                          <td className="px-3 py-2 font-mono text-[10px] font-bold text-slate-500">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="flex min-h-[560px] flex-col rounded-2xl border border-slate-200 p-3">
              <h4 className={sectionTitleClass}>File information collected <span className="normal-case tracking-normal text-slate-400">(List of files registered in collector)</span></h4>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-black text-slate-500">File Name :</label>
                <div className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <input
                    value={manageSearchText}
                    onChange={(event) => setManageSearchText(event.target.value)}
                    placeholder="Find collected file"
                    className="h-6 w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button type="button" className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600 shadow-sm">Find</button>
                <button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 text-[10px] font-black text-blue-700">
                  <ArrowLeft size={13} /> Add to allowed file list
                </button>
              </div>

              <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1 self-start">
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

              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-[760px] w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-3 py-2">{manageFileTab === 'process' ? 'Process Name' : 'Font Name'}</th>
                      <th className="px-3 py-2">Original File Name</th>
                      <th className="px-3 py-2">File Size</th>
                      <th className="px-3 py-2">File Version</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">S/W Type</th>
                      <th className="px-3 py-2">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredManageWhitelistSoftware.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-[11px] font-bold text-slate-400">No collected file information found.</td>
                      </tr>
                    ) : filteredManageWhitelistSoftware.map((item) => (
                      <tr key={`collected-${getWhitelistId(item)}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-black text-slate-700">{getWhitelistName(item) || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-500">{getWhitelistName(item) || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-500">-</td>
                        <td className="px-3 py-2 font-bold text-slate-500">-</td>
                        <td className="px-3 py-2 font-bold text-slate-500">{item.Vendor || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-500">{item.Type || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-500">-</td>
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
    <section className="policy-card">
      <div className="policy-top">
        <div>
          <h4>{title}</h4>
          <p>Move items between the available list and the policy selection list.</p>
        </div>
        <label className="section-search mb-0" style={{ maxWidth: '22rem' }}>
          <Search size={14} />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search software or package" />
        </label>
      </div>

      <div className="row g-3 align-items-stretch">
        <div className="col-12 col-lg-5">
          <ListPanel title={leftTitle} items={leftItems} emptyText="No selected items." actionIcon={ArrowRight} disabled={disabled} onAction={onMoveRight} />
        </div>
        <div className="col-12 col-lg-2 d-flex align-items-center justify-content-center">
          <div className="d-flex flex-lg-column gap-2 text-muted">
            <ArrowLeft size={18} />
            <ArrowRight size={18} />
          </div>
        </div>
        <div className="col-12 col-lg-5">
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
    <div className="appweb-list-panel rounded-2xl border border-slate-200 overflow-hidden h-100">
      <div className="user-row head" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
        <div className="user-cell">{title}</div>
        <div className="user-cell text-end">
          <span className="row-index-pill">{items.length}</span>
        </div>
      </div>
      <div className="appweb-list-scroll p-0">
        {items.length === 0 ? (
          <div className="p-4 text-center text-muted fw-bold small">{emptyText}</div>
        ) : pagination.pageItems.map((item) => (
          <div key={item.id} className="user-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <div className="user-cell user-name">
              <span className="user-mini-avatar"><Package size={13} /></span>
              <span className="min-w-0">
                <strong>{item.title}</strong>
                <small>{item.meta || '-'}</small>
              </span>
            </div>
            <div className="user-cell text-end">
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
