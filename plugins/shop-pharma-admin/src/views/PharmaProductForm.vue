<template>
  <div
    class="pharma-form"
    data-testid="pharma-product-form"
  >
    <div class="page-header">
      <router-link
        to="/admin/pharma/products"
        class="btn btn--secondary btn--sm"
        data-testid="pharma-back-btn"
      >
        ← {{ $t('pharma.form.back') || 'Back to catalogue' }}
      </router-link>
      <h1>
        {{ isEdit
          ? ($t('pharma.form.editTitle') || 'Edit medicine / device')
          : ($t('pharma.form.newTitle') || 'New medicine / device') }}
      </h1>
    </div>

    <p
      v-if="store.loading"
      class="loading"
      data-testid="pharma-form-loading"
    >
      Loading…
    </p>

    <form
      v-else
      class="form-body"
      @submit.prevent="save"
    >
      <!-- Classification — drives the visible field subset + required markers -->
      <section class="card">
        <h2>{{ $t('pharma.form.classification') || 'Classification' }}</h2>
        <label class="field">
          <span class="field-label">
            {{ $t('pharma.form.productClass') || 'Product class' }}
            <em class="req">*</em>
          </span>
          <select
            v-model="form.product_class"
            class="field-input"
            data-testid="pharma-product-class"
          >
            <option
              v-for="klass in productClasses"
              :key="klass"
              :value="klass"
            >
              {{ classLabel(klass) }}
            </option>
          </select>
        </label>
        <p
          v-if="isPrescriptionRequired(form.product_class)"
          class="gating-notice"
          data-testid="pharma-rx-notice"
        >
          {{ $t('pharma.form.rxBlocked')
            || 'Prescription required — this class is blocked from direct online purchase.' }}
        </p>
      </section>

      <!-- Commerce — always required -->
      <section class="card">
        <h2>{{ $t('pharma.form.commerce') || 'Commerce' }}</h2>
        <label class="field">
          <span class="field-label">{{ $t('pharma.form.name') || 'Name' }}<em class="req">*</em></span>
          <input
            v-model="form.name"
            class="field-input"
            data-testid="pharma-name"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ $t('pharma.form.slug') || 'Slug' }}<em class="req">*</em></span>
          <input
            v-model="form.slug"
            class="field-input"
            data-testid="pharma-slug"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ $t('pharma.form.taxClass') || 'Tax class' }}</span>
          <input
            v-model="form.tax_class"
            class="field-input"
            data-testid="pharma-tax-class"
          >
        </label>
        <label class="field field--checkbox">
          <input
            v-model="form.is_active"
            type="checkbox"
            data-testid="pharma-is-active"
          >
          <span>{{ $t('pharma.form.active') || 'Active' }}</span>
        </label>
      </section>

      <!-- Regulated fields — visible subset per class, required markers mirror backend -->
      <section class="card">
        <h2>{{ $t('pharma.form.regulated') || 'Regulated fields' }}</h2>
        <p class="card-hint">
          {{ $t('pharma.form.regulatedHint')
            || 'Fields shown depend on the class. Required markers mirror the backend; the save is authoritative.' }}
        </p>

        <div
          v-for="field in visibleFields"
          :key="field"
          class="field"
          :data-testid="`pharma-field-${field}`"
        >
          <label class="field-label">
            {{ fieldLabel(field) }}
            <em
              v-if="isRequired(field)"
              class="req"
              :data-testid="`pharma-required-${field}`"
            >*</em>
          </label>

          <input
            v-if="control(field) === 'tags'"
            :value="(profile[field] as string[]).join(', ')"
            class="field-input"
            :placeholder="$t('pharma.form.commaSeparated') || 'Comma-separated'"
            :data-testid="`pharma-input-${field}`"
            @input="setTags(field, ($event.target as HTMLInputElement).value)"
          >
          <input
            v-else-if="control(field) === 'number'"
            v-model.number="profile[field]"
            type="number"
            class="field-input"
            :data-testid="`pharma-input-${field}`"
          >
          <label
            v-else-if="control(field) === 'bool'"
            class="field--checkbox"
          >
            <input
              v-model="profile[field]"
              type="checkbox"
              :data-testid="`pharma-input-${field}`"
            >
            <span>{{ $t('pharma.form.yes') || 'Yes' }}</span>
          </label>
          <input
            v-else
            v-model="profile[field]"
            class="field-input"
            :data-testid="`pharma-input-${field}`"
          >
        </div>
      </section>

      <!-- Pack variants — via the shop variant authoring API -->
      <PharmaVariantEditor
        :product-id="productId || null"
        :code-scheme="store.region?.national_code_scheme"
      />

      <!-- Backend rejection (authoritative RequiredFieldsByClass 400) -->
      <p
        v-if="store.lastRejection"
        class="save-rejection"
        data-testid="pharma-save-rejection"
      >
        {{ store.lastRejection.message }}
      </p>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn--primary"
          :disabled="saving"
          data-testid="pharma-save-btn"
        >
          {{ saving ? '…' : ($t('pharma.form.save') || 'Save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { usePharmaAdminStore } from '../stores/pharmaAdmin';
import PharmaVariantEditor from '../components/PharmaVariantEditor.vue';
import {
  PRODUCT_CLASSES,
  PRODUCT_CLASS_META,
  PHARMA_FIELD_CONTROL,
  visibleFieldsForClass,
  fieldRelevance,
  isPrescriptionRequired,
  type ProductClass,
  type PharmaFieldKey,
  type PharmaFieldControl,
} from '../pharmaFields';

const store = usePharmaAdminStore();
const route = useRoute();
const router = useRouter();
const { t, te } = useI18n();

/** Human field labels — i18n key with an English fallback. */
const FIELD_LABEL_FALLBACK: Record<PharmaFieldKey, string> = {
  active_substances: 'Active substances',
  strength: 'Strength',
  pharmaceutical_form: 'Pharmaceutical form',
  atc_code: 'ATC code',
  marketing_authorisation_holder: 'Marketing authorisation holder',
  device_marking: 'Device marking (CE / UKCA + class)',
  leaflet_url: 'Leaflet / IFU URL',
  smpc_url: 'SmPC URL',
  storage_conditions: 'Storage conditions',
  warnings: 'Warnings',
  age_restriction_years: 'Age restriction (years)',
  max_quantity_per_order: 'Max quantity per order',
  professional_only: 'Professional / B2B only',
  withdrawal_right_exempt: 'Withdrawal-right exempt',
};

const productClasses = PRODUCT_CLASSES;
const productId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => Boolean(productId.value));
const saving = ref(false);

const form = reactive({
  name: '',
  slug: '',
  tax_class: 'standard',
  is_active: true,
  product_class: 'OTC' as ProductClass,
});

type ProfileForm = {
  active_substances: string[];
  strength: string;
  pharmaceutical_form: string;
  atc_code: string;
  marketing_authorisation_holder: string;
  device_marking: string;
  leaflet_url: string;
  smpc_url: string;
  storage_conditions: string;
  warnings: string;
  age_restriction_years: number | null;
  max_quantity_per_order: number | null;
  professional_only: boolean;
  withdrawal_right_exempt: boolean;
};

const profile = reactive<ProfileForm>({
  active_substances: [],
  strength: '',
  pharmaceutical_form: '',
  atc_code: '',
  marketing_authorisation_holder: '',
  device_marking: '',
  leaflet_url: '',
  smpc_url: '',
  storage_conditions: '',
  warnings: '',
  age_restriction_years: null,
  max_quantity_per_order: null,
  professional_only: false,
  withdrawal_right_exempt: false,
});

const visibleFields = computed(() => visibleFieldsForClass(form.product_class));

function classLabel(klass: ProductClass): string {
  return PRODUCT_CLASS_META[klass].label;
}

function control(field: PharmaFieldKey): PharmaFieldControl {
  return PHARMA_FIELD_CONTROL[field];
}

function isRequired(field: PharmaFieldKey): boolean {
  return fieldRelevance(field, form.product_class) === 'required';
}

function fieldLabel(field: PharmaFieldKey): string {
  const key = `pharma.field.${field}`;
  return te(key) ? t(key) : FIELD_LABEL_FALLBACK[field];
}

function setTags(field: PharmaFieldKey, value: string): void {
  (profile[field] as unknown) = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Assemble the API payload (commerce fields + nested pharma_profile). */
function buildPayload(): Record<string, unknown> {
  return {
    name: form.name,
    slug: form.slug,
    tax_class: form.tax_class,
    is_active: form.is_active,
    pharma_profile: {
      product_class: form.product_class,
      active_substances: profile.active_substances,
      strength: profile.strength || null,
      pharmaceutical_form: profile.pharmaceutical_form || null,
      atc_code: profile.atc_code || null,
      marketing_authorisation_holder: profile.marketing_authorisation_holder || null,
      device_marking: profile.device_marking || null,
      leaflet_url: profile.leaflet_url || null,
      smpc_url: profile.smpc_url || null,
      storage_conditions: profile.storage_conditions || null,
      warnings: profile.warnings || null,
      age_restriction_years: profile.age_restriction_years,
      max_quantity_per_order: profile.max_quantity_per_order,
      professional_only: profile.professional_only,
      withdrawal_right_exempt: profile.withdrawal_right_exempt,
    },
  };
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    const payload = buildPayload();
    if (productId.value) {
      await store.updateProduct(productId.value, payload);
    } else {
      const created = await store.createProduct(payload);
      router.push(`/admin/pharma/products/${created.id}/edit`);
    }
  } catch {
    // store.lastRejection / store.error carry the backend message (surfaced above)
  } finally {
    saving.value = false;
  }
}

function hydrate(): void {
  const product = store.selectedProduct;
  if (!product) return;
  form.name = product.name;
  form.slug = product.slug;
  form.tax_class = product.tax_class || 'standard';
  form.is_active = product.is_active;
  const loaded = product.pharma_profile;
  form.product_class = (loaded?.product_class as ProductClass) || 'OTC';
  profile.active_substances = loaded?.active_substances ?? [];
  profile.strength = loaded?.strength ?? '';
  profile.pharmaceutical_form = loaded?.pharmaceutical_form ?? '';
  profile.atc_code = loaded?.atc_code ?? '';
  profile.marketing_authorisation_holder = loaded?.marketing_authorisation_holder ?? '';
  profile.device_marking = loaded?.device_marking ?? '';
  profile.leaflet_url = loaded?.leaflet_url ?? '';
  profile.smpc_url = loaded?.smpc_url ?? '';
  profile.storage_conditions = loaded?.storage_conditions ?? '';
  profile.warnings = loaded?.warnings ?? '';
  profile.age_restriction_years = loaded?.age_restriction_years ?? null;
  profile.max_quantity_per_order = loaded?.max_quantity_per_order ?? null;
  profile.professional_only = loaded?.professional_only ?? false;
  profile.withdrawal_right_exempt = loaded?.withdrawal_right_exempt ?? false;
}

watch(() => store.selectedProduct, hydrate);

onMounted(async () => {
  store.fetchRegion();
  if (productId.value) {
    await store.fetchProduct(productId.value);
    hydrate();
  }
});
</script>

<style scoped>
.pharma-form { max-width: 760px; }
.page-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.card h2 { margin-top: 0; font-size: 16px; }
.card-hint { color: #6b7280; font-size: 13px; margin: -4px 0 14px; }
.field { display: block; margin-bottom: 14px; }
.field-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.field-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.field--checkbox { display: flex; align-items: center; gap: 8px; }
.req { color: #dc2626; font-style: normal; margin-left: 2px; }
.gating-notice { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin: 8px 0 0; }
.save-rejection { background: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 14px; }
.form-actions { display: flex; gap: 10px; margin-top: 8px; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--secondary { background: #6b7280; color: white; }
.btn--sm { padding: 6px 12px; font-size: 13px; align-self: flex-start; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.loading { padding: 20px; text-align: center; }
</style>
