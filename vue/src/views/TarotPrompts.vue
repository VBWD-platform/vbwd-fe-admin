<template>
  <div class="tarot-prompts-view">
    <div class="page-header">
      <h2>Tarot Oracle Prompts</h2>
      <p>Manage LLM prompt templates for Tarot readings</p>
    </div>

    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>Loading prompts...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="errorMessage"
      class="error-state"
    >
      <p>{{ errorMessage }}</p>
      <button
        class="retry-btn"
        @click="loadPrompts"
      >
        Retry
      </button>
    </div>

    <!-- Prompts list -->
    <div
      v-else
      class="prompts-container"
    >
      <div
        v-for="(_prompt, slug) in prompts"
        :key="slug"
        class="prompt-card"
      >
        <!-- Header -->
        <div
          class="prompt-header"
          @click="togglePrompt(slug)"
        >
          <span class="prompt-name">{{ slug }}</span>
          <span class="toggle-icon">{{ expandedPrompt === slug ? '▼' : '▶' }}</span>
        </div>

        <!-- Content -->
        <div
          v-if="expandedPrompt === slug"
          class="prompt-content"
        >
          <!-- Template -->
          <div class="section">
            <label>Template (Jinja2)</label>
            <textarea
              v-model="editingPrompt[slug].template"
              rows="6"
              class="template-input"
              placeholder="Enter prompt template..."
            />
            <small>Use double curly braces like &#123;&#123;variable_name&#125;&#125; for template variables</small>
          </div>

          <!-- Variables display -->
          <div class="section">
            <label>Variables</label>
            <div
              v-if="editingPrompt[slug].variables?.length > 0"
              class="variables-display"
            >
              <span
                v-for="(v, i) in editingPrompt[slug].variables"
                :key="i"
                class="variable-badge"
              >
                {{ v }}
              </span>
            </div>
            <p
              v-else
              class="empty-state"
            >
              No variables in this template
            </p>
          </div>

          <!-- Actions -->
          <div class="section-actions">
            <button
              class="btn btn-primary"
              :disabled="isSaving"
              @click="savePrompt(slug)"
            >
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="isSaving"
              @click="discardChanges(slug)"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { api } from '@/api';

interface Prompt {
  template: string;
  variables: string[];
}

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');

const prompts = ref<Record<string, Prompt>>({});
const expandedPrompt = ref<string | null>(null);
const editingPrompt = reactive<Record<string, Prompt>>({});

onMounted(async () => {
  await loadPrompts();
});

async function loadPrompts() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/tarot/admin/prompts') as any;
    prompts.value = response.prompts || {};

    // Initialize editingPrompt with copies of prompts
    Object.keys(prompts.value).forEach((slug) => {
      editingPrompt[slug] = { ...prompts.value[slug] };
    });
  } catch (error: any) {
    errorMessage.value = `Failed to load prompts: ${error.message}`;
    console.error('Error loading prompts:', error);
  } finally {
    isLoading.value = false;
  }
}

function togglePrompt(slug: string) {
  if (expandedPrompt.value === slug) {
    expandedPrompt.value = null;
  } else {
    expandedPrompt.value = slug;
    editingPrompt[slug] = { ...prompts.value[slug] };
  }
}

async function savePrompt(slug: string) {
  isSaving.value = true;
  errorMessage.value = '';

  try {
    const data = {
      template: editingPrompt[slug].template,
      variables: editingPrompt[slug].variables
    };

    await api.put(`/tarot/admin/prompts/${slug}`, data);
    await loadPrompts();
    expandedPrompt.value = null;
    alert(`Prompt "${slug}" saved successfully`);
  } catch (error: any) {
    errorMessage.value = `Failed to save prompt: ${error.message}`;
    console.error('Error saving prompt:', error);
  } finally {
    isSaving.value = false;
  }
}

function discardChanges(slug: string) {
  editingPrompt[slug] = { ...prompts.value[slug] };
  expandedPrompt.value = null;
}
</script>

<style scoped>
.tarot-prompts-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  padding-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  color: var(--color-text-primary, #1a1a1a);
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: var(--color-text-secondary, #666);
  font-size: 0.95rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: var(--color-text-secondary, #666);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border, #e0e0e0);
  border-top-color: var(--color-primary, #007bff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-state {
  padding: 1.5rem;
  background-color: var(--color-danger-light, #fee);
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: 0.5rem;
  color: var(--color-danger-dark, #721c24);
  margin-bottom: 2rem;
}

.error-state p {
  margin: 0 0 1rem 0;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background-color: var(--color-danger, #dc3545);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: var(--color-danger-dark, #c82333);
}

/* Prompts Container */
.prompts-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Prompt Card */
.prompt-card {
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--color-background, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s;
}

.prompt-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

/* Prompt Header */
.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: var(--color-background-secondary, #f9f9f9);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.prompt-header:hover {
  background-color: var(--color-background, #f0f0f0);
}

.prompt-name {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary, #1a1a1a);
  letter-spacing: 0.5px;
}

.toggle-icon {
  color: var(--color-text-secondary, #999);
  font-size: 0.8rem;
  transition: transform 0.2s;
}

.prompt-card:has(.prompt-header:hover) .toggle-icon {
  color: var(--color-primary, #007bff);
}

/* Prompt Content */
.prompt-content {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border, #e0e0e0);
}

.section {
  margin-bottom: 1.5rem;
}

.section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--color-text-primary, #1a1a1a);
  font-size: 0.95rem;
}

.section small {
  display: block;
  margin-top: 0.375rem;
  color: var(--color-text-secondary, #666);
  font-size: 0.85rem;
}

.template-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 0.375rem;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  background-color: var(--color-background, #fff);
  color: var(--color-text-primary, #1a1a1a);
  resize: vertical;
}

.template-input:focus {
  outline: none;
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

/* Variables Display */
.variables-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.variable-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  background-color: var(--color-primary-light, #e7f3ff);
  color: var(--color-primary, #007bff);
  border-radius: 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 500;
}

.empty-state {
  color: var(--color-text-secondary, #666);
  font-style: italic;
  margin: 0.5rem 0 0 0;
}

/* Section Actions */
.section-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e0e0e0);
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--color-primary, #007bff);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark, #0056b3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
  background-color: var(--color-background-secondary, #f0f0f0);
  color: var(--color-text-primary, #1a1a1a);
  border: 1px solid var(--color-border, #e0e0e0);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-border, #e0e0e0);
}

/* Responsive */
@media (max-width: 768px) {
  .tarot-prompts-view {
    padding: 1rem;
  }

  .page-header h2 {
    font-size: 1.5rem;
  }

  .prompt-header {
    padding: 0.75rem 1rem;
  }

  .prompt-content {
    padding: 1rem;
  }

  .section-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
