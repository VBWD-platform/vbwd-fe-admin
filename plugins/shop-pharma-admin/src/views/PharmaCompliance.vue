<template>
  <div
    class="pharma-compliance"
    data-testid="pharma-compliance"
  >
    <h1>{{ $t('pharma.compliance.title') || 'Pharmacy compliance' }}</h1>
    <p class="lead">
      {{ $t('pharma.compliance.lead')
        || 'The active region drives every compliance fact below. No jurisdiction is hardcoded — these values come from GET /pharma/region.' }}
    </p>

    <p
      v-if="!region"
      class="loading"
      data-testid="pharma-compliance-loading"
    >
      Loading region…
    </p>

    <template v-else>
      <div
        class="region-banner"
        data-testid="pharma-region-banner"
      >
        <img
          v-if="region.registered_pharmacy_logo_url"
          :src="region.registered_pharmacy_logo_url"
          class="region-logo"
          alt="Registered pharmacy logo"
          data-testid="pharma-region-logo"
        >
        <div>
          <h2 data-testid="pharma-region-name">
            {{ region.name }} ({{ region.country_code }})
          </h2>
          <span class="regime-badge">{{ region.regime }}</span>
        </div>
      </div>

      <p
        v-if="region.operator_verify"
        class="operator-verify"
        data-testid="pharma-operator-verify"
      >
        {{ $t('pharma.compliance.operatorVerify')
          || 'Operator-verify: all facts are starting data and must be verified per jurisdiction before launch. Not legal advice.' }}
      </p>

      <dl class="region-grid">
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.codeScheme') || 'National code scheme' }}</dt>
          <dd data-testid="pharma-code-scheme">
            {{ region.national_code_scheme }}
          </dd>
        </div>
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.currency') || 'Display currency' }}</dt>
          <dd>{{ region.display_currency }} ({{ region.locale }})</dd>
        </div>
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.defaultAge') || 'Default age restriction' }}</dt>
          <dd>{{ region.default_age_restriction_years }} {{ $t('pharma.compliance.years') || 'years' }}</dd>
        </div>
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.defaultQty') || 'Default max quantity / order' }}</dt>
          <dd>{{ region.default_max_quantity_per_order }}</dd>
        </div>
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.register') || 'National register' }}</dt>
          <dd>
            <a
              :href="region.national_register_url"
              target="_blank"
              rel="noopener"
              data-testid="pharma-register-link"
            >{{ region.national_register_url }}</a>
          </dd>
        </div>
        <div class="region-cell">
          <dt>{{ $t('pharma.compliance.pharmacovigilance') || 'Pharmacovigilance' }}</dt>
          <dd>
            <a
              :href="region.pharmacovigilance_url"
              target="_blank"
              rel="noopener"
              data-testid="pharma-pv-link"
            >{{ region.pharmacovigilance_url }}</a>
          </dd>
        </div>
        <div class="region-cell region-cell--wide">
          <dt>{{ $t('pharma.compliance.withdrawal') || 'Withdrawal-right notice' }}</dt>
          <dd data-testid="pharma-withdrawal-copy">
            {{ region.withdrawal_right_copy }}
          </dd>
        </div>
      </dl>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePharmaAdminStore } from '../stores/pharmaAdmin';

const store = usePharmaAdminStore();
const region = computed(() => store.region);

onMounted(() => {
  store.fetchRegion();
});
</script>

<style scoped>
.pharma-compliance { background: white; padding: 24px; border-radius: 8px; max-width: 820px; }
.lead { color: #6b7280; margin-bottom: 20px; }
.region-banner { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px; }
.region-logo { height: 48px; width: auto; object-fit: contain; }
.region-banner h2 { margin: 0; font-size: 18px; }
.regime-badge { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 10px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; }
.operator-verify { background: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
.region-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0; }
.region-cell { padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
.region-cell--wide { grid-column: 1 / -1; }
.region-cell dt { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
.region-cell dd { margin: 6px 0 0; font-size: 14px; word-break: break-word; }
.region-cell a { color: #2563eb; }
.loading { padding: 20px; text-align: center; }
</style>
