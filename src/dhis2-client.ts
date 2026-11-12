import { toSafeHttpError, SafeError } from './security/safe-errors.js';
import type { AggValue, SharingObject } from './ops/gateway.js';
import type { TaskNotification } from './jobs.js';
import { DhisVersion, effectiveRelease, meFields, parseVersion, trackerList, trackerOrgUnitParams, trackerProgramRequired, TrackerEntity } from './versions.js';
import type { DHIS2Auth } from './security/credentials.js';
import axios, { AxiosInstance } from 'axios';

export interface DHIS2Config {
  baseUrl: string;
  username: string;
  password: string;
}

export interface SystemInfo {
  version: string;
  revision: string;
  buildTime: string;
  serverDate: string;
  instanceName: string;
}

export interface DataElement {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  valueType: 'NUMBER' | 'INTEGER' | 'POSITIVE_INT' | 'NEGATIVE_INT' | 'ZERO_OR_POSITIVE_INT' | 'TEXT' | 'LONG_TEXT' | 'LETTER' | 'PHONE_NUMBER' | 'EMAIL' | 'BOOLEAN' | 'TRUE_ONLY' | 'DATE' | 'DATETIME' | 'TIME' | 'URL' | 'FILE_RESOURCE' | 'IMAGE' | 'COORDINATE' | 'ORGANISATION_UNIT' | 'REFERENCE' | 'AGE' | 'USERNAME' | 'TRACKER_ASSOCIATE';
  domainType: 'AGGREGATE' | 'TRACKER';
  aggregationType: 'SUM' | 'AVERAGE' | 'AVERAGE_SUM_ORG_UNIT' | 'COUNT' | 'STDDEV' | 'VARIANCE' | 'MIN' | 'MAX' | 'NONE' | 'CUSTOM' | 'DEFAULT';
  categoryCombo?: CategoryCombo;
  zeroIsSignificant?: boolean;
  url?: string;
  description?: string;
}

export interface OrganisationUnit {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  level: number;
  path: string;
}

export interface Category {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  dataDimension: boolean;
  dataDimensionType: 'DISAGGREGATION' | 'ATTRIBUTE';
  categoryOptions: CategoryOption[];
}

export interface CategoryOption {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  startDate?: string;
  endDate?: string;
}

export interface CategoryCombo {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  dataDimensionType: 'DISAGGREGATION' | 'ATTRIBUTE';
  categories: Category[];
  categoryOptionCombos?: CategoryOptionCombo[];
}

export interface CategoryOptionCombo {
  id: string;
  name: string;
  displayName: string;
  code?: string;
  categoryOptions: CategoryOption[];
  categoryCombo: CategoryCombo;
}

export interface DataSet {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  periodType: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'SixMonthly' | 'Yearly' | 'FinancialApril' | 'FinancialJuly' | 'FinancialOct';
  categoryCombo?: CategoryCombo;
  dataSetElements: DataSetElement[];
  organisationUnits: OrganisationUnit[];
  sections?: Section[];
  compulsoryDataElementOperands?: DataElementOperand[];
  expiryDays?: number;
  timelyDays?: number;
  openFuturePeriods?: number;
  dataEntryForm?: DataEntryForm;
}

export interface DataSetElement {
  dataElement: DataElement;
  categoryCombo?: CategoryCombo;
}

export interface Section {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  dataElements: DataElement[];
  categoryCombo?: CategoryCombo;
  greyedFields?: DataElementOperand[];
}

export interface DataElementOperand {
  dataElement: DataElement;
  categoryOptionCombo?: CategoryOptionCombo;
}

export interface DataEntryForm {
  id: string;
  name: string;
  htmlCode: string;
  format: number;
  style: 'COMFORTABLE' | 'NORMAL' | 'COMPACT' | 'NONE';
}

export interface OrganisationUnitGroup {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  organisationUnits: OrganisationUnit[];
  symbol?: string;
}

export interface OrganisationUnitGroupSet {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  compulsory: boolean;
  dataDimension: boolean;
  organisationUnitGroups: OrganisationUnitGroup[];
}

export interface DataValue {
  dataElement: string;
  period: string;
  orgUnit: string;
  categoryOptionCombo?: string;
  attributeOptionCombo?: string;
  value: string;
  storedBy?: string;
  created?: string;
  lastUpdated?: string;
  comment?: string;
  followup?: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  instruction?: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  operator: 'equal_to' | 'not_equal_to' | 'greater_than' | 'greater_than_or_equal_to' | 'less_than' | 'less_than_or_equal_to' | 'compulsory_pair' | 'exclusive_pair';
  leftSide: Expression;
  rightSide: Expression;
  periodType: string;
  organisationUnitLevels: number[];
}

export interface Expression {
  expression: string;
  description?: string;
  missingValueStrategy: 'SKIP_IF_ANY_VALUE_MISSING' | 'SKIP_IF_ALL_VALUES_MISSING' | 'NEVER_SKIP';
}

export interface ValidationResult {
  validationRule: ValidationRule;
  period: string;
  organisationUnit: OrganisationUnit;
  dayInPeriod: number;
  leftSideValue: number;
  rightSideValue: number;
}

export interface Program {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  version?: number;
  programType: 'WITH_REGISTRATION' | 'WITHOUT_REGISTRATION';
  trackedEntityType?: TrackedEntityType;
  programStages: ProgramStage[];
  programRules?: ProgramRule[];
  programIndicators?: ProgramIndicator[];
  organisationUnits: OrganisationUnit[];
  categoryCombo?: CategoryCombo;
  useFirstStageDuringRegistration?: boolean;
  displayFrontPageList?: boolean;
  onlyEnrollOnce?: boolean;
  selectEnrollmentDatesInFuture?: boolean;
  selectIncidentDatesInFuture?: boolean;
  incidentDateLabel?: string;
  enrollmentDateLabel?: string;
}

export interface TrackedEntityType {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  trackedEntityTypeAttributes: TrackedEntityTypeAttribute[];
  allowAuditLog?: boolean;
  minAttributesRequiredToSearch?: number;
  maxTeiCountToReturn?: number;
}

export interface TrackedEntityTypeAttribute {
  id: string;
  trackedEntityAttribute: TrackedEntityAttribute;
  displayInList: boolean;
  mandatory: boolean;
  searchable: boolean;
  sortOrder: number;
}

export interface TrackedEntityAttribute {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  valueType: string;
  unique: boolean;
  inherit: boolean;
  optionSet?: OptionSet;
  pattern?: string;
  confidential?: boolean;
}

export interface OptionSet {
  id: string;
  name: string;
  displayName: string;
  code?: string;
  options: Option[];
  valueType: string;
}

export interface Option {
  id: string;
  name: string;
  displayName: string;
  code: string;
  sortOrder: number;
}

export interface ProgramStage {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  program: Program;
  sortOrder: number;
  repeatable: boolean;
  minDaysFromStart: number;
  generatedByEnrollmentDate: boolean;
  blockEntryForm: boolean;
  reportDateToUse: string;
  programStageDataElements: ProgramStageDataElement[];
  programStageSections?: ProgramStageSection[];
  validationStrategy: 'ON_COMPLETE' | 'ON_UPDATE_AND_INSERT';
  executionDateLabel?: string;
  dueDateLabel?: string;
  allowGenerateNextVisit: boolean;
  openAfterEnrollment: boolean;
  remindCompleted: boolean;
}

export interface ProgramStageDataElement {
  id: string;
  dataElement: DataElement;
  programStage: ProgramStage;
  compulsory: boolean;
  allowProvidedElsewhere: boolean;
  sortOrder: number;
  displayInReports: boolean;
  allowFutureDate: boolean;
  skipSynchronization: boolean;
}

export interface ProgramStageSection {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  programStage: ProgramStage;
  dataElements: DataElement[];
  programIndicators?: ProgramIndicator[];
}

export interface ProgramRule {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  program: Program;
  programStage?: ProgramStage;
  condition: string;
  priority?: number;
  programRuleActions: ProgramRuleAction[];
}

export interface ProgramRuleAction {
  id: string;
  programRuleActionType: 'DISPLAYTEXT' | 'DISPLAYKEYVALUEPAIR' | 'HIDEFIELD' | 'HIDESECTION' | 'HIDEPROGRAM' | 'ASSIGN' | 'SHOWWARNING' | 'SHOWERROR' | 'WARNINGONFIELDINTERACTION' | 'ERRORONFIELDINTERACTION' | 'CREATEEVENT' | 'SETMANDATORYFIELD' | 'SENDMESSAGE' | 'SCHEDULEMESSAGE';
  dataElement?: DataElement;
  trackedEntityAttribute?: TrackedEntityAttribute;
  programStageSection?: ProgramStageSection;
  programStage?: ProgramStage;
  data?: string;
  content?: string;
  location?: string;
}

export interface ProgramRuleVariable {
  id: string;
  name: string;
  displayName: string;
  program: Program;
  programStage?: ProgramStage;
  dataElement?: DataElement;
  trackedEntityAttribute?: TrackedEntityAttribute;
  sourceType: 'DATAELEMENT_NEWEST_EVENT_PROGRAM_STAGE' | 'DATAELEMENT_NEWEST_EVENT_PROGRAM' | 'DATAELEMENT_CURRENT_EVENT' | 'DATAELEMENT_PREVIOUS_EVENT' | 'CALCULATED_VALUE' | 'TEI_ATTRIBUTE';
}

export interface ProgramIndicator {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  program: Program;
  expression: string;
  filter?: string;
  aggregationType: string;
  analyticsType: 'EVENT' | 'ENROLLMENT';
  displayInForm: boolean;
}

export interface TrackedEntityInstance {
  id: string;
  trackedEntityType: string;
  orgUnit: string;
  attributes: TrackedEntityAttributeValue[];
  enrollments?: Enrollment[];
  relationships?: Relationship[];
  inactive: boolean;
  deleted: boolean;
  potentialDuplicate: boolean;
  created: string;
  lastUpdated: string;
}

export interface TrackedEntityAttributeValue {
  attribute: string;
  value: string;
  displayValue?: string;
  created?: string;
  lastUpdated?: string;
  storedBy?: string;
}

export interface Enrollment {
  id: string;
  trackedEntityInstance: string;
  program: string;
  orgUnit: string;
  enrollmentDate: string;
  incidentDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  events?: Event[];
  attributes?: TrackedEntityAttributeValue[];
  notes?: Note[];
  followup: boolean;
  deleted: boolean;
  created: string;
  lastUpdated: string;
}

export interface Event {
  id: string;
  enrollment?: string;
  program: string;
  programStage: string;
  orgUnit: string;
  trackedEntityInstance?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'VISITED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED';
  eventDate?: string;
  dueDate?: string;
  coordinate?: Coordinate;
  dataValues: DataValue[];
  notes?: Note[];
  followup: boolean;
  deleted: boolean;
  created: string;
  lastUpdated: string;
}

export interface Note {
  id: string;
  noteText: string;
  storedDate: string;
  storedBy: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Relationship {
  id: string;
  relationshipType: RelationshipType;
  from: RelationshipItem;
  to: RelationshipItem;
  created: string;
  lastUpdated: string;
}

export interface RelationshipType {
  id: string;
  name: string;
  displayName: string;
  fromToName: string;
  toFromName: string;
  bidirectional: boolean;
}

export interface RelationshipItem {
  trackedEntityInstance?: TrackedEntityInstance;
  enrollment?: Enrollment;
  event?: Event;
}

export interface Dashboard {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  dashboardItems: DashboardItem[];
  created: string;
  lastUpdated: string;
  user: User;
  publicAccess: string;
  externalAccess: boolean;
  userAccesses: UserAccess[];
  userGroupAccesses: UserGroupAccess[];
}

export interface DashboardItem {
  id: string;
  type: 'VISUALIZATION' | 'MAP' | 'CHART' | 'REPORT_TABLE' | 'EVENT_CHART' | 'EVENT_REPORT' | 'TEXT' | 'MESSAGES' | 'RESOURCES' | 'REPORTS' | 'USERS' | 'REPORT_TABLES' | 'CHARTS' | 'MAPS';
  x: number;
  y: number;
  width: number;
  height: number;
  visualization?: Visualization;
  map?: Map;
  reportTable?: ReportTable;
  chart?: Chart;
  text?: string;
}

export interface Visualization {
  id: string;
  name: string;
  displayName: string;
  type: 'COLUMN' | 'STACKED_COLUMN' | 'BAR' | 'STACKED_BAR' | 'LINE' | 'AREA' | 'STACKED_AREA' | 'PIE' | 'RADAR' | 'GAUGE' | 'YEAR_OVER_YEAR_LINE' | 'YEAR_OVER_YEAR_COLUMN' | 'SINGLE_VALUE' | 'PIVOT_TABLE' | 'SCATTER' | 'BUBBLE';
  dataDimensionItems: DataDimensionItem[];
  columns: DimensionItem[];
  rows: DimensionItem[];
  filters: DimensionItem[];
  organisationUnits: OrganisationUnit[];
  periods: Period[];
  created: string;
  lastUpdated: string;
}

export interface DataDimensionItem {
  id: string;
  dataDimensionItemType: 'DATA_ELEMENT' | 'DATA_ELEMENT_OPERAND' | 'INDICATOR' | 'REPORTING_RATE' | 'PROGRAM_DATA_ELEMENT' | 'PROGRAM_ATTRIBUTE' | 'PROGRAM_INDICATOR';
  dataElement?: DataElement;
  indicator?: Indicator;
  programDataElement?: ProgramDataElement;
  programAttribute?: ProgramAttribute;
  programIndicator?: ProgramIndicator;
}

export interface DimensionItem {
  id: string;
  name: string;
  dimensionType: string;
  items?: DimensionItem[];
}

export interface Period {
  id: string;
  name: string;
  displayName: string;
  periodType: string;
  startDate: string;
  endDate: string;
}

export interface Indicator {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code?: string;
  description?: string;
  numerator: string;
  denominator: string;
  indicatorType: IndicatorType;
  decimals?: number;
  annualized: boolean;
}

export interface IndicatorType {
  id: string;
  name: string;
  displayName: string;
  factor: number;
  number: boolean;
}

export interface Map {
  id: string;
  name: string;
  displayName: string;
  mapViews: MapView[];
}

export interface MapView {
  id: string;
  name: string;
  layer: string;
  organisationUnitGroupSet?: OrganisationUnitGroupSet;
  organisationUnits: OrganisationUnit[];
  periods: Period[];
}

export interface ReportTable {
  id: string;
  name: string;
  displayName: string;
  columns: DimensionItem[];
  rows: DimensionItem[];
  filters: DimensionItem[];
}

export interface Chart {
  id: string;
  name: string;
  displayName: string;
  type: string;
  series: DimensionItem[];
  category: DimensionItem[];
  filter: DimensionItem[];
}

export interface Report {
  id: string;
  name: string;
  displayName: string;
  type: 'JASPER_REPORT_TABLE' | 'JASPER_JDBC';
  designContent: string;
  cacheStrategy: 'NO_CACHE' | 'CACHE_1_HOUR' | 'CACHE_6AM_TOMORROW' | 'CACHE_TWO_WEEKS';
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
  organisationUnits: OrganisationUnit[];
  userCredentials: UserCredentials;
}

export interface UserCredentials {
  id: string;
  username: string;
  disabled: boolean;
  twoFA: boolean;
  externalAuth: boolean;
  userRoles: UserRole[];
}

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  authorities: string[];
}

export interface UserAccess {
  id: string;
  displayName: string;
  access: string;
}

export interface UserGroupAccess {
  id: string;
  displayName: string;
  access: string;
}

export interface ProgramDataElement {
  id: string;
  dataElement: DataElement;
  program: Program;
}

export interface ProgramAttribute {
  id: string;
  trackedEntityAttribute: TrackedEntityAttribute;
  program: Program;
}

export interface AnalyticsQuery {
  dimension?: string;
  filter?: string;
  startDate?: string;
  endDate?: string;
  aggregationType?: string;
  measureCriteria?: string;
  preAggregationMeasureCriteria?: string;
  skipMeta?: boolean;
  skipData?: boolean;
  skipRounding?: boolean;
  hierarchyMeta?: boolean;
  ignoreLimit?: boolean;
  tableLayout?: boolean;
  columns?: string;
  rows?: string;
  includeNumDen?: boolean;
}

/**
 * DataStore namespace/key components are interpolated into URL paths. Restrict them
 * to a conservative character set so they cannot add path segments, traverse or
 * smuggle query strings (mission RT-06).
 */
export function assertDataStoreSegment(value: unknown, label: string): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value) || value.includes('..')) {
    throw new Error(`Invalid DataStore ${label}: use 1-100 letters, digits, '_', '.', '-' (no '..', '/', '?', '%').`);
  }
}

export class DHIS2Client {
  private client: AxiosInstance;
  private baseUrl: string;

  /**
   * @param auth Either a DHIS2Auth from an operator-defined connection profile, or
   *             (legacy) a username followed by `password`.
   */
  readonly readOnly: boolean;
  /** Server version, read at connect (detectVersion); decides request and response shapes. */
  version: DhisVersion | null = null;
  get release(): number { return effectiveRelease(this.version); }

  async detectVersion(): Promise<DhisVersion | null> {
    const r = await this.client.get('/system/info', { params: { fields: 'version,revision,buildTime' }, validateStatus: (st: number) => st === 200 || st === 404 });
    this.version = r.status === 200 ? parseVersion((r.data as any)?.version) : null;
    return this.version;
  }

  constructor(baseUrl: string, auth: DHIS2Auth | string, password?: string, options: { readOnly?: boolean } = {}) {
    this.readOnly = options.readOnly === true;
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
      throw new Error('DHIS2 instance URL must use HTTPS, without embedded credentials, query parameters, or fragments');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');

    const resolved: DHIS2Auth = typeof auth === 'string'
      ? { type: 'basic', username: auth, password: password ?? '' }
      : auth;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (resolved.type === 'token') headers['Authorization'] = `ApiToken ${resolved.token}`;

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      ...(resolved.type === 'basic' ? { auth: { username: resolved.username, password: resolved.password } } : {}),
      headers,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 32 * 1024 * 1024,
    });

    // Never let raw HTTP-client errors (request config incl. Authorization header,
    // response bodies) propagate past the transport boundary (mission RT-09).
    // Optional chaining keeps unit tests with a bare axios mock working.
    this.client?.interceptors?.response?.use(
      (response) => response,
      (error) => Promise.reject(toSafeHttpError(error)),
    );

    // Production connections: the transport itself refuses anything but reads,
    // whatever tool or code path asks (defence in depth below the policy layer).
    if (this.readOnly) {
      this.client?.interceptors?.request?.use((config) => {
        const method = String(config.method ?? 'get').toLowerCase();
        if (method !== 'get' && method !== 'head') {
          return Promise.reject(new SafeError('read_only', `Refused: this is a read-only (production) connection; ${method.toUpperCase()} requests are never sent.`));
        }
        return config;
      });
    }
  }

  /**
   * Full-owner before-image of one metadata object, or null when absent (404).
   * objectType must come from the plan allowlist; id must be a DHIS2 UID.
   */
  async getOwnerObject(objectType: string, id: string): Promise<Record<string, unknown> | null> {
    if (!/^[A-Za-z]{2,40}$/.test(objectType) || !/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) {
      throw new Error('Invalid object type or id.');
    }
    const response = await this.client.get(`/${objectType}/${id}`, {
      params: { fields: ':owner' },
      validateStatus: (s: number) => s === 200 || s === 404,
    });
    return response.status === 404 ? null : (response.data as Record<string, unknown>);
  }

  /** True if any identifiable object has this UID (used to check package references). */
  async identifiableObjectExists(id: string): Promise<boolean> {
    if (!/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) return false;
    const response = await this.client.get(`/identifiableObjects/${id}`, {
      params: { fields: 'id' }, validateStatus: (s: number) => s === 200 || s === 404,
    });
    return response.status === 200;
  }

  /** Writable/required properties, enums and length limits of one metadata type (from /schemas). */
  async getTypeSchema(objectType: string): Promise<Record<string, unknown> | null> {
    if (!/^[A-Za-z]{2,40}$/.test(objectType)) throw new Error('Invalid object type.');
    const response = await this.client.get('/schemas', {
      params: { fields: 'name,plural,klass,displayName,properties[name,fieldName,propertyType,klass,required,writable,owner,length,min,max,unique,constants,itemPropertyType,collection]' },
    });
    const list = Array.isArray((response.data as any)?.schemas) ? (response.data as any).schemas : [];
    return list.find((s: any) => s.plural === objectType || s.name === objectType) ?? null;
  }

  /** Candidate objects for reuse: token search over name/code/shortName, minimal fields. */
  async findReusable(objectType: string, query: string, extraFields: string[] = []): Promise<Array<Record<string, unknown>>> {
    if (!/^[A-Za-z]{2,40}$/.test(objectType)) throw new Error('Invalid object type.');
    const safeFields = extraFields.filter(f => /^[A-Za-z]{1,40}(\[[A-Za-z,]{1,80}\])?$/.test(f));
    const response = await this.client.get(`/${objectType}`, {
      params: { filter: `identifiable:token:${query}`, fields: ['id', 'name', 'code', 'shortName', ...safeFields].join(','), pageSize: 25, page: 1 },
    });
    const list = (response.data as any)?.[objectType];
    return Array.isArray(list) ? list : [];
  }

  /** DHIS2 expression check (POST, but changes nothing). kind selects the endpoint. */
  async describeExpression(kind: 'programIndicatorExpression' | 'programIndicatorFilter' | 'indicator' | 'validationRule', expression: string): Promise<{ status: string; message: string; description?: string }> {
    const path = { programIndicatorExpression: '/programIndicators/expression/description', programIndicatorFilter: '/programIndicators/filter/description',
      indicator: '/indicators/expression/description', validationRule: '/validationRules/expression/description' }[kind];
    const response = await this.client.post(path, expression, { headers: { 'Content-Type': 'text/plain' }, validateStatus: (s: number) => s < 500 });
    const d = response.data as any;
    return { status: String(d?.status ?? (response.status === 200 ? 'OK' : 'ERROR')), message: String(d?.message ?? ''), ...(d?.description ? { description: String(d.description) } : {}) };
  }

  /** Object plus its metadata dependencies (DHIS2 /{type}/{id}/metadata), sharing stripped; null if absent. */
  async getDependencyExport(objectType: string, id: string): Promise<Record<string, unknown> | null> {
    if (!/^[A-Za-z]{2,40}$/.test(objectType) || !/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) throw new Error('Invalid object type or id.');
    const response = await this.client.get(`/${objectType}/${id}/metadata`, {
      params: { skipSharing: true, download: false },
      validateStatus: (s: number) => s === 200 || s === 404,
      timeout: 120000,
    });
    return response.status === 404 ? null : (response.data as Record<string, unknown>);
  }

  /** Ids of objects whose code or name equals `value` (identity-collision check). */
  async findIdsByField(objectType: string, field: 'code' | 'name', value: string): Promise<string[]> {
    if (!/^[A-Za-z]{2,40}$/.test(objectType)) throw new Error('Invalid object type.');
    const response = await this.client.get(`/${objectType}`, {
      params: { filter: `${field}:eq:${value}`, fields: 'id', paging: false },
      validateStatus: (s: number) => s === 200 || s === 404,
    });
    const list = (response.data as any)?.[objectType];
    return Array.isArray(list) ? list.map((o: any) => String(o.id)) : [];
  }

  /**
   * Atomic metadata import. 4xx responses resolve (so the import report can be
   * parsed); 5xx/network errors reject as sanitised errors.
   */
  async postMetadata(payload: Record<string, unknown[]>, mode: 'VALIDATE' | 'COMMIT'): Promise<{ httpStatus: number; report: any }> {
    const response = await this.client.post('/metadata', payload, {
      params: {
        importMode: mode, importStrategy: 'CREATE_AND_UPDATE', atomicMode: 'ALL',
        identifier: 'UID', importReportMode: 'ERRORS', mergeMode: 'REPLACE',
      },
      validateStatus: (s: number) => s < 500,
      timeout: 120000,
    });
    const data = response.data as any;
    // DHIS2 2.41 wraps the import report in `response`.
    return { httpStatus: response.status, report: data?.response ?? data };
  }

  // ---- approved operations: data, sharing, jobs (see src/operations.ts) -------------------

  async getDefaultCategoryOptionCombo(): Promise<string> {
    const r = await this.client.get('/categoryOptionCombos', { params: { filter: 'name:eq:default', fields: 'id', paging: false } });
    const id = (r.data as any)?.categoryOptionCombos?.[0]?.id;
    if (typeof id !== 'string') throw new Error('The default category option combination was not found.');
    return id;
  }

  /** Current aggregate values for every combination (chunked: 50 data elements × 50 org units × 50 periods per request). */
  async getCurrentDataValues(q: { dataElements: string[]; periods: string[]; orgUnits: string[] }): Promise<AggValue[]> {
    const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
    const out: AggValue[] = [];
    for (const des of chunk(q.dataElements, 50)) for (const ous of chunk(q.orgUnits, 50)) for (const pes of chunk(q.periods, 50)) {
      const r = await this.client.get('/dataValueSets', {
        params: { dataElement: des, orgUnit: ous, period: pes },
        paramsSerializer: { indexes: null }, timeout: 120000,
      });
      for (const v of (r.data as any)?.dataValues ?? []) {
        out.push({ dataElement: v.dataElement, period: v.period, orgUnit: v.orgUnit, categoryOptionCombo: v.categoryOptionCombo,
          attributeOptionCombo: v.attributeOptionCombo, value: String(v.value ?? ''), ...(v.comment ? { comment: String(v.comment) } : {}) });
      }
    }
    return out;
  }

  async postDataValues(payload: { dataValues: AggValue[] }, dryRun: boolean): Promise<{ httpStatus: number; summary: any }> {
    const r = await this.client.post('/dataValueSets', payload, {
      params: { dryRun, importStrategy: 'CREATE_AND_UPDATE', async: false },
      validateStatus: (s: number) => s < 500, timeout: 300000,
    });
    const d = r.data as any;
    return { httpStatus: r.status, summary: d?.response ?? d };
  }

  async postTracker(payload: Record<string, unknown>, mode: 'VALIDATE' | 'COMMIT'): Promise<{ httpStatus: number; report: any }> {
    const r = await this.client.post('/tracker', payload, {
      params: { importMode: mode, atomicMode: 'ALL', importStrategy: 'CREATE_AND_UPDATE', async: false, reportMode: 'ERRORS' },
      validateStatus: (s: number) => s < 500, timeout: 300000,
    });
    const d = r.data as any;
    return { httpStatus: r.status, report: d?.validationReport || d?.stats ? d : (d?.response ?? d) };
  }

  async getTrackerRecord(kind: 'event' | 'enrollment' | 'trackedEntity', uid: string): Promise<Record<string, any> | null> {
    if (!/^[A-Za-z][A-Za-z0-9]{10}$/.test(uid)) throw new Error('Invalid id.');
    const spec = {
      event: ['events', 'event,program,programStage,orgUnit,occurredAt,status,enrollment,dataValues[dataElement,value]'],
      enrollment: ['enrollments', 'enrollment,program,orgUnit,enrolledAt,occurredAt,trackedEntity,status'],
      trackedEntity: ['trackedEntities', 'trackedEntity,trackedEntityType,orgUnit,attributes[attribute,value]'],
    }[kind] as [string, string];
    const r = await this.client.get(`/tracker/${spec[0]}/${uid}`, { params: { fields: spec[1] }, validateStatus: (s: number) => s === 200 || s === 404 });
    return r.status === 404 ? null : (r.data as Record<string, any>);
  }

  private async pagedTracker(path: string, params: Record<string, unknown>, key: string, max: number): Promise<{ records: Array<Record<string, any>>; complete: boolean }> {
    const records: Array<Record<string, any>> = [];
    const pageSize = 1000;
    for (let page = 1; records.length < max; page++) {
      const r = await this.client.get(path, { params: { ...params, page, pageSize }, timeout: 120000 });
      const list = trackerList(r.data, key as TrackerEntity);
      records.push(...list);
      if (list.length < pageSize) return { records, complete: true };
    }
    return { records: records.slice(0, max), complete: false };
  }

  findEvents(q: { program: string; orgUnit: string; occurredAfter: string; occurredBefore: string }, max: number) {
    return this.pagedTracker('/tracker/events', { program: q.program, occurredAfter: q.occurredAfter, occurredBefore: q.occurredBefore,
      ...trackerOrgUnitParams(this.release, 'events', q.orgUnit, 'SELECTED'),
      fields: 'event,program,programStage,orgUnit,occurredAt,dataValues[dataElement,value]' }, 'events', max);
  }

  findTrackedEntities(q: { trackedEntityType: string; orgUnit: string }, max: number) {
    return this.pagedTracker('/tracker/trackedEntities', { trackedEntityType: q.trackedEntityType,
      ...trackerOrgUnitParams(this.release, 'trackedEntities', q.orgUnit, 'SELECTED'),
      fields: 'trackedEntity,trackedEntityType,orgUnit,attributes[attribute,value]' }, 'trackedEntities', max);
  }

  /**
   * One page of tracker records (/api/tracker, every supported version), with the
   * parameter names and list key of the connected version.
   */
  async queryTracker(entity: TrackerEntity, q: {
    program?: string; programStage?: string; trackedEntityType?: string; orgUnit?: string; orgUnitMode?: string;
    status?: string; occurredAfter?: string; occurredBefore?: string; updatedAfter?: string; filter?: string; page?: number; pageSize?: number;
  }): Promise<{ records: Array<Record<string, any>>; page: number; pageSize: number }> {
    if (trackerProgramRequired(this.release, entity) && !q.program) throw new Error(`On this DHIS2 version, listing ${entity} needs a program.`);
    if (entity === 'trackedEntities' && !q.program && !q.trackedEntityType) throw new Error('Give a program or a trackedEntityType.');
    const uid = /^[A-Za-z][A-Za-z0-9]{10}$/;
    for (const k of ['program', 'programStage', 'trackedEntityType', 'orgUnit'] as const) if (q[k] !== undefined && !uid.test(q[k]!)) throw new Error(`${k} must be an 11-character id.`);
    const page = Math.max(1, Math.floor(q.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(q.pageSize ?? 50)));
    const fields = { events: 'event,program,programStage,orgUnit,occurredAt,status,enrollment,dataValues[dataElement,value]',
      enrollments: 'enrollment,program,orgUnit,enrolledAt,occurredAt,status,trackedEntity',
      trackedEntities: 'trackedEntity,trackedEntityType,orgUnit,attributes[attribute,value]' }[entity];
    const params: Record<string, unknown> = { fields, page, pageSize,
      ...trackerOrgUnitParams(this.release, entity, q.orgUnit, q.orgUnitMode ?? (q.orgUnit ? 'SELECTED' : 'ACCESSIBLE')) };
    for (const k of ['program', 'programStage', 'trackedEntityType', 'status', 'occurredAfter', 'occurredBefore', 'updatedAfter', 'filter'] as const) {
      if (q[k] !== undefined) params[k] = q[k];
    }
    const r = await this.client.get(`/tracker/${entity}`, { params, timeout: 120000 });
    return { records: trackerList(r.data, entity), page, pageSize };
  }

  async getSharing(type: string, id: string): Promise<SharingObject | null> {
    if (!/^[A-Za-z]{2,40}$/.test(type) || !/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) throw new Error('Invalid type or id.');
    const r = await this.client.get('/sharing', { params: { type, id }, validateStatus: (s: number) => s === 200 || s === 404 });
    if (r.status === 404) return null;
    const o = (r.data as any)?.object ?? {};
    return { publicAccess: String(o.publicAccess ?? '--------'), ...(typeof o.externalAccess === 'boolean' ? { externalAccess: o.externalAccess } : {}),
      userGroupAccesses: (o.userGroupAccesses ?? []).map((g: any) => ({ id: g.id, access: g.access })),
      userAccesses: (o.userAccesses ?? []).map((u: any) => ({ id: u.id, access: u.access })),
      ...(o.name ? { name: String(o.name) } : {}) };
  }

  async postSharing(type: string, id: string, object: SharingObject): Promise<{ httpStatus: number; message: string }> {
    if (!/^[A-Za-z]{2,40}$/.test(type) || !/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) throw new Error('Invalid type or id.');
    const r = await this.client.post('/sharing', { object }, { params: { type, id }, validateStatus: (s: number) => s < 500 });
    return { httpStatus: r.status, message: String((r.data as any)?.message ?? '') };
  }

  async getPrincipalName(kind: 'userGroups' | 'users', id: string): Promise<string | null> {
    if (!/^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) return null;
    const r = await this.client.get(`/${kind}/${id}`, { params: { fields: 'id,displayName' }, validateStatus: (s: number) => s === 200 || s === 404 });
    return r.status === 404 ? null : String((r.data as any)?.displayName ?? id);
  }

  async getRunningAnalytics(): Promise<Record<string, TaskNotification[]>> {
    const r = await this.client.get('/system/tasks/ANALYTICS_TABLE', { validateStatus: (s: number) => s === 200 || s === 404 });
    return r.status === 404 || !r.data || typeof r.data !== 'object' ? {} : (r.data as Record<string, TaskNotification[]>);
  }

  async startAnalytics(params: Record<string, string | number | boolean>): Promise<string> {
    const r = await this.client.post('/resourceTables/analytics', null, { params });
    return String((r.data as any)?.response?.id ?? '');
  }

  async getAnalyticsNotifications(jobId: string): Promise<TaskNotification[]> {
    if (!/^[A-Za-z][A-Za-z0-9]{10}$/.test(jobId)) throw new Error('Invalid job id.');
    const r = await this.client.get(`/system/tasks/ANALYTICS_TABLE/${jobId}`, { validateStatus: (s: number) => s === 200 || s === 404 });
    return r.status === 404 || !Array.isArray(r.data) ? [] : (r.data as TaskNotification[]);
  }

  get baseURL(): string {
    return this.baseUrl;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/me');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Failed to connect to DHIS2: ${error}`);
    }
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/me', {
      params: {
        fields: meFields(this.release)
      }
    });
    return response.data;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await this.client.get('/system/info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system info: ${error}`);
    }
  }

  async getDataElements(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ dataElements: DataElement[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,valueType,domainType',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/dataElements', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get data elements: ${error}`);
    }
  }

  async getOrganisationUnits(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ organisationUnits: OrganisationUnit[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,level,path',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/organisationUnits', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get organisation units: ${error}`);
    }
  }

  async getAnalytics(query: AnalyticsQuery): Promise<any> {
    try {
      const params: Record<string, string> = {};
      
      if (query.dimension) params.dimension = query.dimension;
      if (query.filter) params.filter = query.filter;
      if (query.startDate) params.startDate = query.startDate;
      if (query.endDate) params.endDate = query.endDate;

      const response = await this.client.get('/analytics', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  async createDataElement(dataElement: Partial<DataElement>): Promise<any> {
    try {
      const response = await this.client.post('/dataElements', dataElement);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create data element: ${error}`);
    }
  }

  async getDataSets(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ dataSets: DataSet[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,description,periodType,categoryCombo[id,name],dataSetElements[dataElement[id,name,valueType]],organisationUnits[id,name],sections[id,name,sortOrder],expiryDays,timelyDays,openFuturePeriods',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/dataSets', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get data sets: ${error}`);
    }
  }

  async getCategories(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ categories: Category[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,dataDimension,dataDimensionType,categoryOptions[id,name,displayName,code]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/categories', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get categories: ${error}`);
    }
  }

  async getCategoryOptions(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ categoryOptions: CategoryOption[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,startDate,endDate',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/categoryOptions', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get category options: ${error}`);
    }
  }

  async getCategoryCombos(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ categoryCombos: CategoryCombo[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,dataDimensionType,categories[id,name],categoryOptionCombos[id,name,displayName]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/categoryCombos', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get category combos: ${error}`);
    }
  }

  async getCategoryOptionCombos(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ categoryOptionCombos: CategoryOptionCombo[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,code,categoryOptions[id,name],categoryCombo[id,name]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/categoryOptionCombos', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get category option combos: ${error}`);
    }
  }

  async getOrganisationUnitGroups(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ organisationUnitGroups: OrganisationUnitGroup[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,symbol,organisationUnits[id,name]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/organisationUnitGroups', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get organisation unit groups: ${error}`);
    }
  }

  async getValidationRules(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ validationRules: ValidationRule[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,description,instruction,importance,operator,leftSide[expression,description],rightSide[expression,description],periodType',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/validationRules', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get validation rules: ${error}`);
    }
  }

  async getDataValues(params: {
    dataSet?: string;
    dataElement?: string[];
    period?: string[];
    startDate?: string;
    endDate?: string;
    orgUnit?: string[];
    children?: boolean;
    categoryOptionCombo?: string[];
    attributeOptionCombo?: string[];
    includeDeleted?: boolean;
    lastUpdated?: string;
    lastUpdatedDuration?: string;
    limit?: number;
  }): Promise<{ dataValues: DataValue[] }> {
    try {
      const queryParams: Record<string, string | number | boolean> = {};
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            queryParams[key] = value.join(',');
          } else {
            queryParams[key] = value;
          }
        }
      });

      const response = await this.client.get('/dataValues', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get data values: ${error}`);
    }
  }

  async getPrograms(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ programs: Program[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,description,programType,trackedEntityType[id,name],programStages[id,name,sortOrder],organisationUnits[id,name]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/programs', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get programs: ${error}`);
    }
  }

  async getTrackedEntityTypes(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ trackedEntityTypes: TrackedEntityType[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,description,trackedEntityTypeAttributes[id,trackedEntityAttribute[id,name,valueType,unique],displayInList,mandatory,searchable,sortOrder]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/trackedEntityTypes', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tracked entity types: ${error}`);
    }
  }

  async getTrackedEntityAttributes(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ trackedEntityAttributes: TrackedEntityAttribute[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,description,valueType,unique,inherit,pattern,confidential,optionSet[id,name,options[id,name,code]]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/trackedEntityAttributes', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tracked entity attributes: ${error}`);
    }
  }

  async getProgramStages(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ programStages: ProgramStage[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,shortName,code,description,program[id,name],sortOrder,repeatable,minDaysFromStart,programStageDataElements[id,dataElement[id,name],compulsory,sortOrder]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/programStages', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get program stages: ${error}`);
    }
  }

  async getProgramRules(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ programRules: ProgramRule[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,description,program[id,name],programStage[id,name],condition,priority,programRuleActions[id,programRuleActionType,dataElement[id,name],data,content]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/programRules', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get program rules: ${error}`);
    }
  }

  async getEventAnalytics(params: {
    program: string;
    stage?: string;
    startDate: string;
    endDate: string;
    orgUnit: string;
    dimension?: string[];
    filter?: string[];
    value?: string;
    outputType?: 'EVENT' | 'ENROLLMENT' | 'TRACKED_ENTITY_INSTANCE';
    coordinatesOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      const queryParams: Record<string, string | number | boolean> = {
        program: params.program,
        startDate: params.startDate,
        endDate: params.endDate,
        orgUnit: params.orgUnit,
        outputType: params.outputType || 'EVENT',
      };

      if (params.stage) queryParams.stage = params.stage;
      if (params.dimension) queryParams.dimension = params.dimension.join(',');
      if (params.filter) queryParams.filter = params.filter.join(',');
      if (params.value) queryParams.value = params.value;
      if (params.coordinatesOnly) queryParams.coordinatesOnly = params.coordinatesOnly;
      if (params.page) queryParams.page = params.page;
      if (params.pageSize) queryParams.pageSize = params.pageSize;

      const response = await this.client.get('/analytics/events/query', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get event analytics: ${error}`);
    }
  }

  async getEnrollmentAnalytics(params: {
    program: string;
    startDate: string;
    endDate: string;
    orgUnit: string;
    dimension?: string[];
    filter?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      const queryParams: Record<string, string | number | boolean> = {
        program: params.program,
        startDate: params.startDate,
        endDate: params.endDate,
        orgUnit: params.orgUnit,
      };

      if (params.dimension) queryParams.dimension = params.dimension.join(',');
      if (params.filter) queryParams.filter = params.filter.join(',');
      if (params.page) queryParams.page = params.page;
      if (params.pageSize) queryParams.pageSize = params.pageSize;

      const response = await this.client.get('/analytics/enrollments/query', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get enrollment analytics: ${error}`);
    }
  }

  async getDataStatistics(): Promise<any> {
    try {
      const response = await this.client.get('/dataStatistics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get data statistics: ${error}`);
    }
  }

  async getDashboards(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ dashboards: Dashboard[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,dashboardItems[id,type,visualization[id,name],map[id,name],reportTable[id,name],chart[id,name]]',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/dashboards', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get dashboards: ${error}`);
    }
  }

  async getVisualizations(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ visualizations: Visualization[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,type,dataDimensionItems,columns,rows,filters,organisationUnits,periods',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/visualizations', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get visualizations: ${error}`);
    }
  }

  async getReports(params?: {
    fields?: string;
    filter?: string;
    paging?: boolean;
    pageSize?: number;
  }): Promise<{ reports: Report[] }> {
    try {
      const queryParams = {
        fields: params?.fields || 'id,name,displayName,type,designContent',
        filter: params?.filter,
        paging: params?.paging ?? false,
        pageSize: params?.pageSize || 50,
      };

      const response = await this.client.get('/reports', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get reports: ${error}`);
    }
  }

  async generateReport(reportId: string, params?: {
    organisationUnit?: string;
    period?: string;
    date?: string;
  }): Promise<any> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.organisationUnit) queryParams.organisationUnit = params.organisationUnit;
      if (params?.period) queryParams.period = params.period;
      if (params?.date) queryParams.date = params.date;

      const response = await this.client.get(`/reports/${reportId}/data.pdf`, {
        params: queryParams,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate report: ${error}`);
    }
  }

  // DataStore operations for Web App Platform integration
  async manageDataStoreKey(params: {
    operation: 'create' | 'read' | 'update' | 'delete' | 'list';
    namespace: string;
    key?: string;
    value?: any;
    encrypt?: boolean;
  }): Promise<any> {
    try {
      const { operation, namespace, key, value, encrypt } = params;
      assertDataStoreSegment(namespace, 'namespace');
      if (key !== undefined) assertDataStoreSegment(key, 'key');
      // The former "encrypt" option was Base64 encoding with an __encrypted__ marker,
      // which provides no secrecy (mission RT-02). Reject it rather than mislead.
      if (encrypt) {
        throw new Error('The DataStore "encrypt" option is not supported: it was Base64 encoding, not encryption.');
      }

      switch (operation) {
        case 'list':
          const response = await this.client.get(`/dataStore/${namespace}`);
          return response.data;

        case 'read':
          if (!key) throw new Error('Key is required for read operation');
          const readResponse = await this.client.get(`/dataStore/${namespace}/${key}`);
          return readResponse.data;

        case 'create':
        case 'update':
          if (!key || value === undefined) {
            throw new Error('Key and value are required for create/update operations');
          }
          
          const data = value;
          const method = operation === 'create' ? 'post' : 'put';
          const writeResponse = await this.client[method](`/dataStore/${namespace}/${key}`, data);
          return writeResponse.data;

        case 'delete':
          if (!key) throw new Error('Key is required for delete operation');
          await this.client.delete(`/dataStore/${namespace}/${key}`);
          return { status: 'deleted', namespace, key };

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Failed to manage DataStore key: ${error}`);
    }
  }

}