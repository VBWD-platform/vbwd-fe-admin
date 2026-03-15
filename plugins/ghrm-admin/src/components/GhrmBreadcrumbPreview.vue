<template>
  <div class="ghrm-breadcrumb-preview">
    <component :is="'style'">
      {{ config.css }}
    </component>

    <p class="ghrm-breadcrumb-preview__label">
      Catalogue page:
    </p>
    <nav class="ghrm-breadcrumb">
      <a
        class="ghrm-breadcrumb__link"
        href="#"
      >{{ truncate(config.root_name || 'Home') }}</a>
      <span
        v-if="config.show_category !== false"
        class="ghrm-breadcrumb__separator"
      >{{ config.separator || '/' }}</span>
      <span
        v-if="config.show_category !== false"
        class="ghrm-breadcrumb__current"
      >{{ truncate('Backend') }}</span>
    </nav>

    <p class="ghrm-breadcrumb-preview__label ghrm-breadcrumb-preview__label--spaced">
      Detail page:
    </p>
    <nav class="ghrm-breadcrumb">
      <a
        class="ghrm-breadcrumb__link"
        href="#"
      >{{ truncate(config.root_name || 'Home') }}</a>
      <span
        v-if="config.show_category !== false"
        class="ghrm-breadcrumb__separator"
      >{{ config.separator || '/' }}</span>
      <a
        v-if="config.show_category !== false"
        class="ghrm-breadcrumb__link"
        href="#"
      >{{ truncate('Backend') }}</a>
      <span class="ghrm-breadcrumb__separator">{{ config.separator || '/' }}</span>
      <span class="ghrm-breadcrumb__current">{{ truncate('LoopAI Core') }}</span>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GhrmBreadcrumbConfig } from '../api/ghrmWidgetApi';

interface Props {
  config: GhrmBreadcrumbConfig;
  widgetId: string;
}

const props = defineProps<Props>();

const maxLen = computed(() => props.config.max_label_length ?? 40);

function truncate(label: string): string {
  return label.length > maxLen.value ? label.slice(0, maxLen.value) + '…' : label;
}
</script>

<style scoped>
.ghrm-breadcrumb-preview__label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 6px;
}
.ghrm-breadcrumb-preview__label--spaced { margin-top: 16px; }

/* Default breadcrumb styles — overridden by config.css injected above */
.ghrm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  flex-wrap: wrap;
}
.ghrm-breadcrumb__link { color: #3498db; text-decoration: none; }
.ghrm-breadcrumb__link:hover { text-decoration: underline; }
.ghrm-breadcrumb__separator { color: #9ca3af; user-select: none; }
.ghrm-breadcrumb__current { color: #374151; font-weight: 500; }
</style>
