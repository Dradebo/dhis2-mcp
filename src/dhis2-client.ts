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

export class DHIS2Client {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      auth: {
        username,
        password,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/me');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Failed to connect to DHIS2: ${error}`);
    }
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

  async updateDataElement(id: string, dataElement: Partial<DataElement>): Promise<any> {
    try {
      const response = await this.client.put(`/dataElements/${id}`, dataElement);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update data element: ${error}`);
    }
  }

  async deleteDataElement(id: string): Promise<any> {
    try {
      const response = await this.client.delete(`/dataElements/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete data element: ${error}`);
    }
  }

  async createDataValue(dataValue: Partial<DataValue>): Promise<any> {
    try {
      const response = await this.client.post('/dataValues', dataValue);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create data value: ${error}`);
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

  async createDataSet(dataSet: Partial<DataSet>): Promise<any> {
    try {
      const response = await this.client.post('/dataSets', dataSet);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create data set: ${error}`);
    }
  }

  async updateDataSet(id: string, dataSet: Partial<DataSet>): Promise<any> {
    try {
      const response = await this.client.put(`/dataSets/${id}`, dataSet);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update data set: ${error}`);
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

  async createCategory(category: Partial<Category>): Promise<any> {
    try {
      const response = await this.client.post('/categories', category);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create category: ${error}`);
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

  async createCategoryOption(categoryOption: Partial<CategoryOption>): Promise<any> {
    try {
      const response = await this.client.post('/categoryOptions', categoryOption);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create category option: ${error}`);
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

  async createCategoryCombo(categoryCombo: Partial<CategoryCombo>): Promise<any> {
    try {
      const response = await this.client.post('/categoryCombos', categoryCombo);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create category combo: ${error}`);
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

  async createOrganisationUnitGroup(orgUnitGroup: Partial<OrganisationUnitGroup>): Promise<any> {
    try {
      const response = await this.client.post('/organisationUnitGroups', orgUnitGroup);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create organisation unit group: ${error}`);
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

  async createValidationRule(validationRule: Partial<ValidationRule>): Promise<any> {
    try {
      const response = await this.client.post('/validationRules', validationRule);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create validation rule: ${error}`);
    }
  }

  async runValidation(params: {
    startDate: string;
    endDate: string;
    organisationUnits: string[];
    validationRuleGroups?: string[];
    sendNotifications?: boolean;
  }): Promise<{ validationResults: ValidationResult[] }> {
    try {
      const response = await this.client.post('/validation', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to run validation: ${error}`);
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

  async bulkImportDataValues(dataValues: DataValue[]): Promise<any> {
    try {
      const payload = {
        dataValues,
      };

      const response = await this.client.post('/dataValues', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to bulk import data values: ${error}`);
    }
  }

  async deleteDataValue(params: {
    dataElement: string;
    period: string;
    orgUnit: string;
    categoryOptionCombo?: string;
    attributeOptionCombo?: string;
  }): Promise<any> {
    try {
      const response = await this.client.delete('/dataValues', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete data value: ${error}`);
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

  async createProgram(program: Partial<Program>): Promise<any> {
    try {
      const response = await this.client.post('/programs', program);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create program: ${error}`);
    }
  }

  async updateProgram(id: string, program: Partial<Program>): Promise<any> {
    try {
      const response = await this.client.put(`/programs/${id}`, program);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update program: ${error}`);
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

  async createTrackedEntityType(trackedEntityType: Partial<TrackedEntityType>): Promise<any> {
    try {
      const response = await this.client.post('/trackedEntityTypes', trackedEntityType);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create tracked entity type: ${error}`);
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

  async createTrackedEntityAttribute(attribute: Partial<TrackedEntityAttribute>): Promise<any> {
    try {
      const response = await this.client.post('/trackedEntityAttributes', attribute);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create tracked entity attribute: ${error}`);
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

  async createProgramStage(programStage: Partial<ProgramStage>): Promise<any> {
    try {
      const response = await this.client.post('/programStages', programStage);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create program stage: ${error}`);
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

  async createProgramRule(programRule: Partial<ProgramRule>): Promise<any> {
    try {
      const response = await this.client.post('/programRules', programRule);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create program rule: ${error}`);
    }
  }

  async getTrackedEntityInstances(params: {
    trackedEntityType?: string;
    program?: string;
    orgUnit?: string;
    orgUnitMode?: 'SELECTED' | 'CHILDREN' | 'DESCENDANTS' | 'ACCESSIBLE';
    query?: string;
    attribute?: string[];
    filter?: string[];
    ou?: string[];
    ouMode?: string;
    programStartDate?: string;
    programEndDate?: string;
    programStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    followUp?: boolean;
    eventStartDate?: string;
    eventEndDate?: string;
    eventStatus?: 'ACTIVE' | 'COMPLETED' | 'VISITED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED';
    includeDeleted?: boolean;
    includeAllAttributes?: boolean;
    fields?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ trackedEntityInstances: TrackedEntityInstance[] }> {
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

      if (!queryParams.fields) {
        queryParams.fields = 'id,trackedEntityType,orgUnit,attributes[attribute,value,displayValue],enrollments[id,program,enrollmentDate,status,events[id,programStage,eventDate,status,dataValues[dataElement,value]]]';
      }

      const response = await this.client.get('/trackedEntityInstances', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tracked entity instances: ${error}`);
    }
  }

  async createTrackedEntityInstance(tei: Partial<TrackedEntityInstance>): Promise<any> {
    try {
      const response = await this.client.post('/trackedEntityInstances', tei);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create tracked entity instance: ${error}`);
    }
  }

  async updateTrackedEntityInstance(id: string, tei: Partial<TrackedEntityInstance>): Promise<any> {
    try {
      const response = await this.client.put(`/trackedEntityInstances/${id}`, tei);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update tracked entity instance: ${error}`);
    }
  }

  async getEnrollments(params: {
    program?: string;
    trackedEntityInstance?: string;
    orgUnit?: string;
    orgUnitMode?: 'SELECTED' | 'CHILDREN' | 'DESCENDANTS' | 'ACCESSIBLE';
    programStartDate?: string;
    programEndDate?: string;
    programStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    followUp?: boolean;
    includeDeleted?: boolean;
    fields?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ enrollments: Enrollment[] }> {
    try {
      const queryParams: Record<string, string | number | boolean> = {};
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams[key] = value;
        }
      });

      if (!queryParams.fields) {
        queryParams.fields = 'id,trackedEntityInstance,program,orgUnit,enrollmentDate,incidentDate,status,followup,events[id,programStage,eventDate,status,dataValues[dataElement,value]]';
      }

      const response = await this.client.get('/enrollments', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get enrollments: ${error}`);
    }
  }

  async createEnrollment(enrollment: Partial<Enrollment>): Promise<any> {
    try {
      const response = await this.client.post('/enrollments', enrollment);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create enrollment: ${error}`);
    }
  }

  async updateEnrollment(id: string, enrollment: Partial<Enrollment>): Promise<any> {
    try {
      const response = await this.client.put(`/enrollments/${id}`, enrollment);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update enrollment: ${error}`);
    }
  }

  async getEvents(params: {
    program?: string;
    programStage?: string;
    enrollment?: string;
    trackedEntityInstance?: string;
    orgUnit?: string;
    orgUnitMode?: 'SELECTED' | 'CHILDREN' | 'DESCENDANTS' | 'ACCESSIBLE';
    startDate?: string;
    endDate?: string;
    status?: 'ACTIVE' | 'COMPLETED' | 'VISITED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED';
    followUp?: boolean;
    includeDeleted?: boolean;
    fields?: string;
    page?: number;
    pageSize?: number;
    order?: string;
  }): Promise<{ events: Event[] }> {
    try {
      const queryParams: Record<string, string | number | boolean> = {};
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams[key] = value;
        }
      });

      if (!queryParams.fields) {
        queryParams.fields = 'id,enrollment,program,programStage,orgUnit,trackedEntityInstance,status,eventDate,dueDate,coordinate,dataValues[dataElement,value],created,lastUpdated';
      }

      const response = await this.client.get('/events', { params: queryParams });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  async createEvent(event: Partial<Event>): Promise<any> {
    try {
      const response = await this.client.post('/events', event);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  async updateEvent(id: string, event: Partial<Event>): Promise<any> {
    try {
      const response = await this.client.put(`/events/${id}`, event);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  async bulkImportEvents(events: Event[]): Promise<any> {
    try {
      const payload = {
        events,
      };

      const response = await this.client.post('/events', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to bulk import events: ${error}`);
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

  async createDashboard(dashboard: Partial<Dashboard>): Promise<any> {
    try {
      const response = await this.client.post('/dashboards', dashboard);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create dashboard: ${error}`);
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

  async createVisualization(visualization: Partial<Visualization>): Promise<any> {
    try {
      const response = await this.client.post('/visualizations', visualization);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create visualization: ${error}`);
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
  async createDataStoreNamespace(namespace: string, options?: {
    description?: string;
    sharing?: any;
    initialKeys?: Array<{ key: string; value: any }>;
  }): Promise<any> {
    try {
      // Create namespace metadata (if supported)
      if (options?.description || options?.sharing) {
        const namespaceConfig = {
          description: options.description,
          sharing: options.sharing
        };
        
        try {
          await this.client.put(`/dataStore/${namespace}/__metadata__`, namespaceConfig);
        } catch (error) {
          // Metadata creation is optional, continue with key creation
          console.warn('Could not create namespace metadata:', error);
        }
      }

      // Create initial keys if provided
      if (options?.initialKeys) {
        const results = [];
        for (const { key, value } of options.initialKeys) {
          try {
            const response = await this.client.post(`/dataStore/${namespace}/${key}`, value);
            results.push({ key, status: 'created', data: response.data });
          } catch (error) {
            results.push({ key, status: 'error', error: error });
          }
        }
        return { namespace, results };
      }

      return { namespace, status: 'created' };
    } catch (error) {
      throw new Error(`Failed to create DataStore namespace: ${error}`);
    }
  }

  async manageDataStoreKey(params: {
    operation: 'create' | 'read' | 'update' | 'delete' | 'list';
    namespace: string;
    key?: string;
    value?: any;
    encrypt?: boolean;
  }): Promise<any> {
    try {
      const { operation, namespace, key, value, encrypt } = params;

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
          
          const data = encrypt ? this.encryptValue(value) : value;
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

  private encryptValue(value: any): any {
    // Simple base64 encoding for demonstration
    // In production, use proper encryption
    const jsonString = JSON.stringify(value);
    return {
      __encrypted__: true,
      data: Buffer.from(jsonString).toString('base64')
    };
  }
}