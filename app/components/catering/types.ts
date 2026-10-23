export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface Location {
  venue: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  instructions: string | null;
}
export interface Contact {
  name: string;
  phone: string;
  email?: string | null;
  function?: string | null;
}
export interface Venue {
  uuid: string;
  name: string;
  location: Location;
  contacts?: Contact[];
  notes?: string | null;
  serviceMode: string;
  active: boolean;
  version: number;
}
export interface CatalogItem {
  uuid: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string | null;
  active: boolean;
  version: number;
}
export interface EmployeeOption {
  uuid: string;
  name: string;
  internalCode?: string;
}
export interface MenuItem {
  clientId?: string;
  name: string;
  portions: number;
  section?: string | null;
  portionSize?: string | null;
  servingStyle?: string | null;
  diets: string[];
  allergens: string[];
  notes?: string | null;
}
export interface EventItem {
  uuid: string;
  number: string;
  title: string;
  date: string;
  timezone: string;
  status: string;
  guestCount: number | null;
  version: number;
  startsAt: string | null;
  endsAt: string | null;
}
export interface EventDetails extends EventItem {
  description: string | null;
  readyAt: string | null;
  location: Location;
  coordinatorUuid: string | null;
  customerName: string | null;
  contacts: Contact[];
  menu: MenuItem[];
  staff: {
    uuid: string;
    employeeUuid: string;
    employeeName: string;
    functions: string[];
    startsAt: string;
    endsAt: string;
    notes: string | null;
  }[];
  equipment: {
    uuid: string;
    equipmentUuid: string;
    name: string;
    code: string;
    unit: string;
    quantity: number;
    notes: string | null;
  }[];
  attachments: {
    uuid: string;
    name: string;
    mimeType: string;
    size: number;
    description: string | null;
  }[];
}
export interface PreparationLine {
  uuid: string;
  kind: string;
  itemUuid: string;
  name: string;
  code: string;
  unit: string;
  requiredQuantity: string;
  preparedQuantity: string;
  loadedQuantity: string;
  missingToPrepare: string;
  missingToLoad: string;
  extraPrepared: string;
  extraLoaded: string;
  responsibleUuid: string | null;
  responsibleName: string | null;
  sourceLocation: string | null;
  instructions: string | null;
}
export interface Preparation {
  uuid: string;
  eventUuid: string;
  version: number;
  status: string;
  responsibleUuid: string | null;
  responsibleName: string | null;
  deadlineAt: string | null;
  notes: string | null;
  lines: PreparationLine[];
  summary: { hasShortages: boolean; hasSurplus: boolean };
  acceptedShortagesReason: string | null;
}
export interface KitchenLine {
  uuid?: string;
  name: string;
  requiredPortions: number;
  portionSize: string | null;
  diets: string[];
  allergens: string[];
  packing: string | null;
  notes: string | null;
  responsibleUuid: string | null;
  responsibleName?: string | null;
  preparedPortions?: number;
  handedOverPortions?: number;
  missingPreparedPortions?: number;
  missingHandedOverPortions?: number;
}
export interface KitchenPlan {
  serviceMode: string;
  productionDate: string;
  dueAt: string | null;
  responsibleUuid: string | null;
  notes: string | null;
  lines: KitchenLine[];
}
export interface ProductionSource {
  eventUuid: string;
  title: string;
  number: string;
  date: string;
  guestCount: number | null;
  timezone: string;
  readyAt: string | null;
  eventVersion: number;
  eventStatus: string;
  menu: MenuItem[];
}
export interface KitchenOrder extends KitchenPlan {
  uuid: string;
  eventUuid: string;
  number: string;
  status: string;
  version: number;
  revision: number;
  source: ProductionSource;
  currentSource: ProductionSource;
  sourceChanged: boolean;
  productionBlocked: boolean;
  pendingRevision: { number: number; reason: string; plan: KitchenPlan } | null;
  revisionDiff: {
    added: KitchenLine[];
    removed: KitchenLine[];
    changed: {
      uuid: string;
      before: KitchenLine;
      after: KitchenLine;
      portionsDelta: number;
    }[];
  } | null;
}
export interface TemplateLine {
  kind: string;
  itemUuid: string;
  name?: string;
  unit?: string;
  rule: {
    mode: string;
    quantity: string | number;
    perGuests: number | null;
    reservePercent: number;
  };
  sourceLocation?: string | null;
  instructions?: string | null;
}
export interface Template {
  uuid: string;
  name: string;
  description: string | null;
  version: number;
  active: boolean;
  lines: TemplateLine[];
}
export interface AuditEntry {
  uuid: string;
  action: string;
  actorUuid: string;
  createdAt: string;
  details: unknown;
  orderVersion?: number;
  revision?: number;
}
