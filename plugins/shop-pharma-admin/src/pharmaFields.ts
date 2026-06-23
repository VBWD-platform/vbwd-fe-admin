/**
 * Pharma classification + class-conditional field policy (fe-admin mirror).
 *
 * This mirrors the backend `RequiredFieldsByClass` policy from S101.1
 * (s101-1-backend-shop-pharma.md "Required vs optional fields by product_class").
 * The fe markers are cosmetic — the BACKEND save is authoritative and returns
 * `400 {error, missing:[...]}` when a required field is absent. This module exists
 * only to drive the editor's visible-field subset and the required asterisks.
 *
 * Legend per field per class: 'required' | 'optional' | 'na' (not applicable).
 */

export type ProductClass =
  | 'RX'
  | 'OTC'
  | 'MEDICAL_DEVICE'
  | 'FMCG_PERSONAL'
  | 'FMCG_HOSPITAL';

export const PRODUCT_CLASSES: ProductClass[] = [
  'RX',
  'OTC',
  'MEDICAL_DEVICE',
  'FMCG_PERSONAL',
  'FMCG_HOSPITAL',
];

/** Human label + the storefront category slug each class segments into. */
export const PRODUCT_CLASS_META: Record<
  ProductClass,
  { label: string; categorySlug: string }
> = {
  RX: { label: 'Prescription medicine (Rx)', categorySlug: 'prescription-medicines' },
  OTC: { label: 'Over-the-counter medicine', categorySlug: 'otc-medicines' },
  MEDICAL_DEVICE: { label: 'Medical device', categorySlug: 'medical-devices' },
  FMCG_PERSONAL: { label: 'Personal-care product', categorySlug: 'personal-care' },
  FMCG_HOSPITAL: { label: 'Clinical consumable', categorySlug: 'clinical-consumables' },
};

export type FieldRelevance = 'required' | 'optional' | 'na';

/** The regulated profile field keys (the S77 custom-field set). */
export type PharmaFieldKey =
  | 'active_substances'
  | 'strength'
  | 'pharmaceutical_form'
  | 'atc_code'
  | 'marketing_authorisation_holder'
  | 'device_marking'
  | 'leaflet_url'
  | 'smpc_url'
  | 'storage_conditions'
  | 'warnings'
  | 'age_restriction_years'
  | 'max_quantity_per_order'
  | 'professional_only'
  | 'withdrawal_right_exempt';

/**
 * The required-vs-optional-by-class matrix (mirror of the S101.1 table).
 * A key absent from a class map is treated as 'na'.
 */
const MATRIX: Record<PharmaFieldKey, Partial<Record<ProductClass, FieldRelevance>>> = {
  active_substances: { RX: 'required', OTC: 'required', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  strength: { RX: 'required', OTC: 'required', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  pharmaceutical_form: { RX: 'required', OTC: 'required', FMCG_PERSONAL: 'optional' },
  atc_code: { RX: 'optional', OTC: 'optional' },
  marketing_authorisation_holder: { RX: 'required', OTC: 'optional' },
  device_marking: { MEDICAL_DEVICE: 'required', FMCG_HOSPITAL: 'optional' },
  leaflet_url: { RX: 'required', OTC: 'required', MEDICAL_DEVICE: 'required', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  smpc_url: { RX: 'optional', OTC: 'optional' },
  storage_conditions: { RX: 'optional', OTC: 'optional', MEDICAL_DEVICE: 'optional', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  warnings: { RX: 'optional', OTC: 'optional', MEDICAL_DEVICE: 'optional', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  age_restriction_years: { RX: 'optional', OTC: 'optional', MEDICAL_DEVICE: 'optional', FMCG_PERSONAL: 'optional' },
  max_quantity_per_order: { RX: 'optional', OTC: 'optional', MEDICAL_DEVICE: 'optional', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
  professional_only: { MEDICAL_DEVICE: 'optional', FMCG_HOSPITAL: 'optional' },
  withdrawal_right_exempt: { RX: 'optional', OTC: 'optional', MEDICAL_DEVICE: 'optional', FMCG_PERSONAL: 'optional', FMCG_HOSPITAL: 'optional' },
};

/** Ordered field list for stable form rendering. */
export const PHARMA_FIELD_ORDER: PharmaFieldKey[] = [
  'active_substances',
  'strength',
  'pharmaceutical_form',
  'atc_code',
  'marketing_authorisation_holder',
  'device_marking',
  'leaflet_url',
  'smpc_url',
  'storage_conditions',
  'warnings',
  'age_restriction_years',
  'max_quantity_per_order',
  'professional_only',
  'withdrawal_right_exempt',
];

/** The input control a field uses in the editor. */
export type PharmaFieldControl = 'tags' | 'text' | 'number' | 'bool';

export const PHARMA_FIELD_CONTROL: Record<PharmaFieldKey, PharmaFieldControl> = {
  active_substances: 'tags',
  strength: 'text',
  pharmaceutical_form: 'text',
  atc_code: 'text',
  marketing_authorisation_holder: 'text',
  device_marking: 'text',
  leaflet_url: 'text',
  smpc_url: 'text',
  storage_conditions: 'text',
  warnings: 'text',
  age_restriction_years: 'number',
  max_quantity_per_order: 'number',
  professional_only: 'bool',
  withdrawal_right_exempt: 'bool',
};

/** Relevance of a single field for a class ('na' when absent from the matrix). */
export function fieldRelevance(field: PharmaFieldKey, productClass: ProductClass): FieldRelevance {
  return MATRIX[field][productClass] ?? 'na';
}

/** The ordered subset of fields VISIBLE for a class (relevance !== 'na'). */
export function visibleFieldsForClass(productClass: ProductClass): PharmaFieldKey[] {
  return PHARMA_FIELD_ORDER.filter((field) => fieldRelevance(field, productClass) !== 'na');
}

/** The fields REQUIRED for a class (relevance === 'required'). */
export function requiredFieldsForClass(productClass: ProductClass): PharmaFieldKey[] {
  return PHARMA_FIELD_ORDER.filter((field) => fieldRelevance(field, productClass) === 'required');
}

/** True when a medicine class blocks direct online purchase (Rx, D2). */
export function isPrescriptionRequired(productClass: ProductClass): boolean {
  return productClass === 'RX';
}
