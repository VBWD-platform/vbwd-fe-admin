<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProductAdminStore } from '../stores/productAdmin';

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  is_primary: boolean;
}

const props = defineProps<{
  productId: string;
}>();

const store = useProductAdminStore();
const images = ref<ProductImage[]>([]);
const uploading = ref(false);

async function loadImages() {
  images.value = await store.fetchProductImages(props.productId);
}

async function setPrimary(imageId: string) {
  await store.setProductImagePrimary(props.productId, imageId);
  await loadImages();
}

async function removeImage(imageId: string) {
  await store.deleteProductImage(props.productId, imageId);
  await loadImages();
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    await store.uploadProductImage(props.productId, file);
    await loadImages();
  } finally {
    uploading.value = false;
    target.value = '';
  }
}

onMounted(loadImages);
</script>

<template>
  <div
    class="image-gallery"
    data-testid="product-image-gallery"
  >
    <h3>Product Images</h3>
    <div class="image-gallery__grid">
      <div
        v-for="image in images"
        :key="image.id"
        class="image-gallery__card"
        :class="{ primary: image.is_primary }"
        :data-testid="`product-image-${image.id}`"
      >
        <img
          :src="image.url"
          :alt="image.alt || ''"
        >
        <div class="image-gallery__actions">
          <button
            :class="{ active: image.is_primary }"
            title="Set as primary"
            data-testid="set-primary-btn"
            @click="setPrimary(image.id)"
          >
            &#9733;
          </button>
          <button
            class="delete"
            title="Remove image"
            data-testid="remove-image-btn"
            @click="removeImage(image.id)"
          >
            &times;
          </button>
        </div>
      </div>
      <label
        class="image-gallery__add-card"
        data-testid="upload-image-btn"
      >
        <span v-if="uploading">Uploading...</span>
        <span v-else>+</span>
        <input
          type="file"
          accept="image/*"
          :disabled="uploading"
          @change="handleUpload"
        >
      </label>
    </div>
  </div>
</template>

<style scoped>
.image-gallery {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eee;
}

.image-gallery h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.image-gallery__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.image-gallery__card {
  position: relative;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  background: #f8f9fa;
  transition: border-color 0.2s;
}

.image-gallery__card:hover {
  border-color: #3498db;
}

.image-gallery__card.primary {
  border-color: #f0ad4e;
  box-shadow: 0 0 0 1px #f0ad4e;
}

.image-gallery__card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-gallery__actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 6px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.image-gallery__card:hover .image-gallery__actions {
  opacity: 1;
}

.image-gallery__actions button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  transition: background-color 0.2s, color 0.2s;
}

.image-gallery__actions button:hover {
  background: #fff;
}

.image-gallery__actions button.active {
  color: #f0ad4e;
}

.image-gallery__actions button.delete:hover {
  background: #f8d7da;
  color: #721c24;
}

.image-gallery__add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  aspect-ratio: 1;
  cursor: pointer;
  background: #f8f9fa;
  transition: border-color 0.2s, background-color 0.2s;
}

.image-gallery__add-card:hover {
  border-color: #3498db;
  background: #eef6fd;
}

.image-gallery__add-card span {
  font-size: 2rem;
  color: #999;
  font-weight: 300;
}

.image-gallery__add-card input {
  display: none;
}

@media (max-width: 768px) {
  .image-gallery__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
