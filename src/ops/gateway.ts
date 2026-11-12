/** What the operation kinds need from DHIS2 (implemented by DHIS2Client; faked in tests). */
export interface AggValue {
  dataElement: string; period: string; orgUnit: string;
  categoryOptionCombo: string; attributeOptionCombo: string;
  value: string; comment?: string;
}

export interface DataGateway {
  getDefaultCategoryOptionCombo(): Promise<string>;
  /** Current values for every combination of the given data elements, periods and org units. */
  getCurrentDataValues(q: { dataElements: string[]; periods: string[]; orgUnits: string[] }): Promise<AggValue[]>;
  postDataValues(payload: { dataValues: AggValue[] }, dryRun: boolean): Promise<{ httpStatus: number; summary: any }>;
  postTracker(payload: Record<string, unknown>, mode: 'VALIDATE' | 'COMMIT'): Promise<{ httpStatus: number; report: any }>;
  getTrackerRecord(kind: 'event' | 'enrollment' | 'trackedEntity', uid: string): Promise<Record<string, any> | null>;
  /** Existing events of one program in one org unit within a date range (for the duplicate guard). */
  findEvents(q: { program: string; orgUnit: string; occurredAfter: string; occurredBefore: string }, max: number): Promise<{ records: Array<Record<string, any>>; complete: boolean }>;
  /** Existing tracked entities of one type in one org unit (for the duplicate guard). */
  findTrackedEntities(q: { trackedEntityType: string; orgUnit: string }, max: number): Promise<{ records: Array<Record<string, any>>; complete: boolean }>;
}

export interface SharingObject {
  publicAccess: string;
  externalAccess?: boolean;
  userGroupAccesses: Array<{ id: string; access: string; name?: string }>;
  userAccesses: Array<{ id: string; access: string; name?: string }>;
  name?: string;
}

export interface SharingGateway {
  getSharing(type: string, id: string): Promise<SharingObject | null>;
  postSharing(type: string, id: string, object: SharingObject): Promise<{ httpStatus: number; message: string }>;
  getPrincipalName(kind: 'userGroups' | 'users', id: string): Promise<string | null>;
}

export type OpsGateway = DataGateway & SharingGateway;
