export interface OrderLineForm {
  key: string;
  itemId: string;
  itemCode: string;
  tradeName: string;
  description: string;
  qty: number;
  unitRate: number;
  discountPct: number;
  taxCode: string;
  warehouse: string;
  inStock: number;
  packedQty: number;
  wsMrp: number;
  rtMrp: number;
}

export interface OrderHeaderForm {
  location: string;
  salesType: string;
  partnerId: string;
  contactPerson: string;
  gstNo: string;
  territory: string;
  transporter: string;
  orderNo: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  postingDate: string;
  validUntil: string;
  documentDate: string;
  salesRefNo: string;
  warehouseCode: string;
  destination: string;
  hForm: boolean;
  isImport: boolean;
  salesEmployee: string;
  ownerCode: string;
  ownerName: string;
  remarks: string;
  headerDiscountPct: number;
  rounding: number;
  gstRatePct: number;
}

export interface OrderFormState {
  header: OrderHeaderForm;
  lines: OrderLineForm[];
  activeTab: 'contents' | 'logistics' | 'attachments';
}

export function emptyLine(key: string): OrderLineForm {
  return {
    key,
    itemId: '',
    itemCode: '',
    tradeName: '',
    description: '',
    qty: 1,
    unitRate: 0,
    discountPct: 0,
    taxCode: 'GST5%',
    warehouse: 'DHB1 WH',
    inStock: 0,
    packedQty: 0,
    wsMrp: 0,
    rtMrp: 0,
  };
}

export function defaultHeader(): OrderHeaderForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    location: 'TAMIL NADU',
    salesType: 'Whole Sales',
    partnerId: '',
    contactPerson: '',
    gstNo: '',
    territory: '',
    transporter: '',
    orderNo: 'Auto',
    status: 'draft',
    postingDate: today,
    validUntil: today,
    documentDate: today,
    salesRefNo: '',
    warehouseCode: 'DHB1 WH',
    destination: '',
    hForm: false,
    isImport: false,
    salesEmployee: '',
    ownerCode: '',
    ownerName: '',
    remarks: '',
    headerDiscountPct: 0,
    rounding: 0,
    gstRatePct: 5,
  };
}

export interface OrderMetadata {
  location?: string;
  salesType?: string;
  contactPerson?: string;
  gstNo?: string;
  territory?: string;
  transporter?: string;
  postingDate?: string;
  validUntil?: string;
  documentDate?: string;
  salesRefNo?: string;
  warehouseCode?: string;
  destination?: string;
  hForm?: boolean;
  isImport?: boolean;
  salesEmployee?: string;
  ownerCode?: string;
  ownerName?: string;
  remarks?: string;
  headerDiscountPct?: number;
  headerDiscountAmount?: number;
  rounding?: number;
}

export interface LineMetadata {
  taxCode?: string;
  warehouse?: string;
  inStock?: number;
  packedQty?: number;
  wsMrp?: number;
  rtMrp?: number;
  discountPct?: number;
}
