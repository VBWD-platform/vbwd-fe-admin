<template>
  <div class="ghrm-widgets">
    <h1 class="ghrm-widgets__title">
      GHRM — Breadcrumb Widgets
    </h1>

    <div
      v-if="loading"
      class="ghrm-widgets__loading"
    >
      Loading widget configs…
    </div>

    <div
      v-else-if="loadError"
      class="ghrm-widgets__error"
      data-testid="load-error"
    >
      {{ loadError }}
    </div>

    <template v-else>
      <div
        v-for="widget in widgets"
        :key="widget.id"
        class="ghrm-widgets__card"
        :data-testid="`widget-card-${widget.id}`"
      >
        <div class="ghrm-widgets__card-header">
          <h2 class="ghrm-widgets__card-title">
            {{ widgetLabel(widget.id) }}
          </h2>
          <p class="ghrm-widgets__card-desc">
            {{ widgetDesc(widget.id) }}
          </p>
        </div>

        <GhrmBreadcrumbWidgetConfig
          :widget-id="widget.id"
          :initial-config="widget"
          @saved="onSaved(widget.id, $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ghrmWidgetApi, type GhrmBreadcrumbConfig } from '../api/ghrmWidgetApi';
import GhrmBreadcrumbWidgetConfig from '../components/GhrmBreadcrumbWidgetConfig.vue';

const loading = ref(true);
const loadError = ref('');
const widgets = ref<GhrmBreadcrumbConfig[]>([]);

const WIDGET_META: Record<string, { label: string; desc: string }> = {
  catalogue: {
    label: 'Catalogue Breadcrumb',
    desc: 'Shown at the top of category list and category index pages.',
  },
  detail: {
    label: 'Package Detail Breadcrumb',
    desc: 'Shown at the top of the software package detail page.',
  },
};

function widgetLabel(id: string): string {
  return WIDGET_META[id]?.label ?? id;
}

function widgetDesc(id: string): string {
  return WIDGET_META[id]?.desc ?? '';
}

function onSaved(id: string, updated: GhrmBreadcrumbConfig) {
  const idx = widgets.value.findIndex((w) => w.id === id);
  if (idx !== -1) widgets.value[idx] = updated;
}

onMounted(async () => {
  try {
    const data = await ghrmWidgetApi.getWidgets();
    widgets.value = data.widgets;
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load widget configs';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.ghrm-widgets { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
.ghrm-widgets__title { font-size: 1.5rem; color: #2c3e50; margin: 0 0 28px; }
.ghrm-widgets__loading,
.ghrm-widgets__error { padding: 40px 0; text-align: center; color: #6b7280; }
.ghrm-widgets__error { color: #dc2626; }
.ghrm-widgets__card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 28px;
}
.ghrm-widgets__card-header { margin-bottom: 20px; }
.ghrm-widgets__card-title { font-size: 1.1rem; color: #2c3e50; margin: 0 0 4px; }
.ghrm-widgets__card-desc { font-size: 13px; color: #6b7280; margin: 0; }
</style>
