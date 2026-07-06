<template>
  <div class="geoblock-tab">
    <p
      v-if="errorMessage"
      class="toast toast--error"
      data-testid="geoblock-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="savedMessage"
      class="toast toast--ok"
      data-testid="geoblock-saved"
    >
      {{ savedMessage }}
    </p>

    <!-- Master switch -->
    <section class="geoblock-section">
      <label class="geoblock-check">
        <input
          v-model="form.is_enabled"
          type="checkbox"
          data-testid="geoblock-enabled"
        >
        <span>Block access from all other countries, not in the allowed list.</span>
      </label>
      <p class="geoblock-help">
        When enabled, visitors whose IP resolves to a country that is not in the
        allowed list are redirected to the locked page. The allowed list is the
        set of enabled countries.
        <router-link
          to="/admin/settings/tax-and-countries"
          data-testid="geoblock-allowed-link"
        >
          See allowed countries
        </router-link>
      </p>
      <p
        class="geoblock-count"
        data-testid="geoblock-allowed-count"
      >
        {{ allowedCount }} countries allowed
      </p>
    </section>

    <!-- Bypass via GET & cookie -->
    <section class="geoblock-section">
      <h3>Allow by GET &amp; Cookies</h3>
      <div class="geoblock-field">
        <label for="geoblock-bypass-query">Bypass query</label>
        <input
          id="geoblock-bypass-query"
          v-model.trim="form.bypass_query"
          type="text"
          class="geoblock-input"
          placeholder="allowme=yes"
          data-testid="geoblock-bypass-query"
        >
        <p class="geoblock-help">
          A visitor from a blocked country who requests any URL with this query
          gets a bypass cookie and full access. Leave empty to disable the bypass.
        </p>
      </div>
      <div class="geoblock-field">
        <label for="geoblock-cookie-ttl">Bypass cookie lifetime (days)</label>
        <input
          id="geoblock-cookie-ttl"
          v-model.number="form.bypass_cookie_ttl_days"
          type="number"
          min="1"
          class="geoblock-input geoblock-input--narrow"
          data-testid="geoblock-cookie-ttl"
        >
      </div>
    </section>

    <!-- Advanced -->
    <section class="geoblock-section">
      <h3>Advanced</h3>
      <div class="geoblock-field">
        <label for="geoblock-target-slug">Blocked target slug</label>
        <input
          id="geoblock-target-slug"
          v-model.trim="form.blocked_target_slug"
          type="text"
          class="geoblock-input"
          placeholder="/locked"
          data-testid="geoblock-target-slug"
        >
        <p class="geoblock-help">
          CMS page a blocked visitor is redirected to. Leave empty to respond 451.
        </p>
      </div>
      <label class="geoblock-check">
        <input
          v-model="form.block_unknown_country"
          type="checkbox"
          data-testid="geoblock-block-unknown"
        >
        <span>Block visitors whose country cannot be resolved (fail-closed).</span>
      </label>
    </section>

    <div class="geoblock-actions">
      <button
        class="create-btn"
        :disabled="saving"
        data-testid="geoblock-save"
        @click="handleSave"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useGeoBlockStore, type GeoBlockPayload } from '@/stores/geoBlock';

const store = useGeoBlockStore();

const form = reactive<GeoBlockPayload>({
  is_enabled: false,
  bypass_query: '',
  bypass_cookie_ttl_days: 30,
  blocked_target_slug: '/locked',
  block_unknown_country: false,
});

const saving = ref(false);
const errorMessage = ref('');
const savedMessage = ref('');

const allowedCount = computed(() => store.config.allowed_country_count);

function syncFromStore() {
  form.is_enabled = store.config.is_enabled;
  form.bypass_query = store.config.bypass_query;
  form.bypass_cookie_ttl_days = store.config.bypass_cookie_ttl_days;
  form.blocked_target_slug = store.config.blocked_target_slug;
  form.block_unknown_country = store.config.block_unknown_country;
}

watch(() => store.config, syncFromStore, { deep: true, immediate: true });

async function handleSave() {
  saving.value = true;
  errorMessage.value = '';
  savedMessage.value = '';
  try {
    await store.saveConfig({
      is_enabled: form.is_enabled,
      bypass_query: form.bypass_query,
      bypass_cookie_ttl_days: form.bypass_cookie_ttl_days,
      blocked_target_slug: form.blocked_target_slug,
      block_unknown_country: form.block_unknown_country,
    });
    savedMessage.value = 'Geo-block settings saved.';
    setTimeout(() => { savedMessage.value = ''; }, 4000);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to save geo-block config';
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  // Initial load; a failure is captured on store.error and leaves the
  // defaults in place (fail-open UX). fetchConfig never rejects.
  void store.fetchConfig();
});
</script>

<style scoped>
.geoblock-tab { max-width: 640px; }
.geoblock-section { margin-bottom: 28px; }
.geoblock-section h3 { margin: 0 0 12px; color: #2c3e50; font-size: 15px; }

.geoblock-check { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; color: #2c3e50; font-weight: 500; }
.geoblock-check input { margin-top: 3px; }

.geoblock-help { margin: 8px 0 0; color: #666; font-size: 13px; line-height: 1.5; }
.geoblock-count { margin: 10px 0 0; color: #1e40af; font-size: 13px; font-weight: 600; }

.geoblock-field { margin-top: 16px; }
.geoblock-field label { display: block; margin-bottom: 6px; color: #2c3e50; font-size: 13px; font-weight: 500; }

.geoblock-input { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box; }
.geoblock-input--narrow { max-width: 160px; }
.geoblock-input:focus { outline: none; border-color: #3498db; }

.geoblock-actions { margin-top: 24px; }
.create-btn { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; }
.create-btn:hover { background: #1e8449; }
.create-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.toast { padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.toast--ok { background: #d1fae5; color: #065f46; }
.toast--error { background: #fee2e2; color: #991b1b; }
</style>
