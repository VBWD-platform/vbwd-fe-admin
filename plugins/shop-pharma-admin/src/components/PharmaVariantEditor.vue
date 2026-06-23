<template>
  <div
    class="variant-editor"
    data-testid="pharma-variant-editor"
  >
    <div class="variant-editor__head">
      <h3>{{ $t('pharma.variants.title') || 'Pack variants' }}</h3>
      <p class="variant-editor__hint">
        {{ $t('pharma.variants.hint')
          || 'Each pack size / strength is one priced, stocked variant. Its SKU carries the national code.' }}
      </p>
    </div>

    <p
      v-if="!productId"
      class="variant-editor__empty"
      data-testid="pharma-variants-locked"
    >
      {{ $t('pharma.variants.saveFirst') || 'Save the product first to add pack variants.' }}
    </p>

    <template v-else>
      <ul
        class="variant-list"
        data-testid="pharma-variant-list"
      >
        <li
          v-for="(variant, index) in variants"
          :key="variant.id"
          class="variant-row"
          :data-testid="`pharma-variant-${variant.id}`"
        >
          <span class="variant-name">{{ variant.name }}</span>
          <span class="variant-sku">{{ variant.sku || '—' }}</span>
          <span class="variant-price">{{ variant.price }}</span>
          <span class="variant-actions">
            <button
              class="btn btn--xs"
              :disabled="index === 0"
              :data-testid="`pharma-variant-up-${variant.id}`"
              @click="move(index, -1)"
            >↑</button>
            <button
              class="btn btn--xs"
              :disabled="index === variants.length - 1"
              :data-testid="`pharma-variant-down-${variant.id}`"
              @click="move(index, 1)"
            >↓</button>
            <button
              class="btn btn--xs btn--danger"
              :data-testid="`pharma-variant-delete-${variant.id}`"
              @click="remove(variant.id)"
            >✕</button>
          </span>
        </li>
      </ul>

      <div
        class="variant-add"
        data-testid="pharma-variant-add"
      >
        <input
          v-model="newName"
          class="variant-input"
          :placeholder="$t('pharma.variants.packName') || 'Pack name (e.g. Pack of 20)'"
          data-testid="pharma-variant-name-input"
        >
        <input
          v-model="newSku"
          class="variant-input"
          :placeholder="codeScheme ? `${codeScheme} (SKU)` : 'SKU / national code'"
          data-testid="pharma-variant-sku-input"
        >
        <input
          v-model.number="newPrice"
          type="number"
          step="0.01"
          min="0"
          class="variant-input variant-input--price"
          :placeholder="$t('pharma.variants.price') || 'Price'"
          data-testid="pharma-variant-price-input"
        >
        <button
          class="btn btn--sm btn--primary"
          :disabled="!canAdd"
          data-testid="pharma-variant-add-btn"
          @click="add"
        >
          {{ $t('pharma.variants.add') || 'Add pack' }}
        </button>
      </div>
      <p
        v-if="error"
        class="variant-error"
        data-testid="pharma-variant-error"
      >
        {{ error }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePharmaAdminStore, type PharmaVariant } from '../stores/pharmaAdmin';

const props = defineProps<{
  /** Empty until the product has been persisted (variants need a product id). */
  productId: string | null;
  /** National code scheme label from the active region (e.g. PZN). */
  codeScheme?: string;
}>();

const store = usePharmaAdminStore();

const variants = ref<PharmaVariant[]>([]);
const newName = ref('');
const newSku = ref('');
const newPrice = ref<number | null>(null);
const error = ref('');

const canAdd = computed(
  () => newName.value.trim().length > 0 && newPrice.value !== null && newPrice.value >= 0,
);

async function load(): Promise<void> {
  if (!props.productId) return;
  try {
    variants.value = await store.fetchVariants(props.productId);
  } catch (loadError) {
    error.value = (loadError as Error).message;
  }
}

async function add(): Promise<void> {
  if (!props.productId || !canAdd.value) return;
  error.value = '';
  try {
    await store.createVariant(props.productId, {
      name: newName.value.trim(),
      sku: newSku.value.trim() || null,
      price: newPrice.value,
    });
    newName.value = '';
    newSku.value = '';
    newPrice.value = null;
    await load();
  } catch (addError) {
    error.value = (addError as Error).message;
  }
}

async function remove(variantId: string): Promise<void> {
  if (!props.productId) return;
  if (!confirm('Remove this pack variant?')) return;
  await store.deleteVariant(props.productId, variantId);
  await load();
}

async function move(index: number, delta: number): Promise<void> {
  if (!props.productId) return;
  const target = index + delta;
  if (target < 0 || target >= variants.value.length) return;
  const reordered = [...variants.value];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);
  variants.value = reordered;
  await store.reorderVariants(props.productId, reordered.map((variant) => variant.id));
}

watch(() => props.productId, load);
onMounted(load);
</script>

<style scoped>
.variant-editor { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px; }
.variant-editor__head h3 { margin: 0 0 4px; }
.variant-editor__hint { color: #6b7280; font-size: 13px; margin: 0 0 12px; }
.variant-editor__empty { color: #6b7280; font-style: italic; }
.variant-list { list-style: none; padding: 0; margin: 0 0 12px; }
.variant-row { display: grid; grid-template-columns: 2fr 2fr 1fr auto; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.variant-sku { color: #6b7280; font-family: monospace; font-size: 12px; }
.variant-actions { display: flex; gap: 4px; }
.variant-add { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.variant-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.variant-input--price { width: 110px; }
.variant-error { color: #dc2626; font-size: 13px; margin-top: 8px; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn--primary { background: #3b82f6; color: white; }
.btn--sm { padding: 6px 12px; }
.btn--xs { padding: 2px 8px; font-size: 12px; background: #e5e7eb; }
.btn--danger { background: #ef4444; color: white; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
