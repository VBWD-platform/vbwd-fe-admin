<template>
  <div class="email-template-edit-view">
    <div class="tpl-editor__header">
      <h2>{{ isNew ? 'New Template' : (template ? template.event_type : 'Email Template') }}</h2>
      <div class="tpl-editor__actions">
        <router-link
          to="/admin/email/templates"
          class="btn btn--ghost"
        >
          Cancel
        </router-link>
        <button
          v-if="!isNew && template"
          class="btn btn--danger"
          :disabled="saving"
          @click="remove"
        >
          Delete
        </button>
        <button
          class="btn btn--primary"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <span
          v-if="savedMsg"
          class="tpl-saved-msg"
        >{{ savedMsg }}</span>
      </div>
    </div>

    <div
      v-if="loading"
      class="cms-table__empty"
    >
      Loading…
    </div>
    <div
      v-else-if="!isNew && !template"
      class="tpl-error"
    >
      Template not found.
    </div>

    <template v-else>
      <div
        v-if="!isNew && template && !form.is_active"
        class="tpl-inactive-warning"
      >
        This template is inactive — no emails will be sent for this event.
      </div>

      <!-- Meta card -->
      <div class="card">
        <div class="meta-grid">
          <div class="field-group">
            <label class="field-label">Event Type</label>
            <select
              v-model="form.event_type"
              class="field-input"
            >
              <option
                v-for="et in store.eventTypes"
                :key="et.event_type"
                :value="et.event_type"
              >
                {{ et.event_type }}
              </option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">
              Subject <span class="field-hint">(Jinja2 template)</span>
            </label>
            <input
              v-model="form.subject"
              class="field-input"
              type="text"
            >
          </div>
          <div class="field-group checkbox-group">
            <label class="field-label">
              <input
                v-model="form.is_active"
                type="checkbox"
              > Active
            </label>
          </div>
        </div>
      </div>

      <!-- Editor card -->
      <div class="card">
        <div class="tpl-tabs">
          <button
            v-for="tab in ['html', 'text', 'preview']"
            :key="tab"
            type="button"
            :class="['tpl-tab', { active: activeTab === tab }]"
            @click="switchTab(tab)"
          >
            {{ tabLabel(tab) }}
          </button>
        </div>

        <div class="tpl-tab-body">
          <!-- HTML tab -->
          <div v-show="activeTab === 'html'">
            <CodeEditor
              v-model="form.html_body"
              language="html"
            />
          </div>

          <!-- Plain text tab -->
          <div v-show="activeTab === 'text'">
            <CodeEditor
              v-model="form.text_body"
              language="text"
            />
          </div>

          <!-- Preview tab -->
          <div
            v-show="activeTab === 'preview'"
            class="tpl-preview"
          >
            <div class="tpl-preview__toolbar">
              <button
                class="btn btn--sm"
                @click="loadPreview"
              >
                Refresh Preview
              </button>
            </div>
            <div
              v-if="preview"
              class="tpl-preview__subject"
            >
              <strong>Subject:</strong> {{ preview.subject }}
            </div>
            <iframe
              v-if="preview"
              :srcdoc="preview.html_body"
              class="tpl-preview__frame"
              sandbox="allow-same-origin"
            />
            <p
              v-else
              class="tpl-preview__hint"
            >
              Click "Refresh Preview" to render with example data.
            </p>
          </div>
        </div>
      </div>

      <!-- Variables card -->
      <div
        v-if="eventInfo"
        class="card"
      >
        <h3 class="section-title">
          Available Variables
        </h3>
        <table class="cms-table vars-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Type</th>
              <th>Example</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(info, name) in eventInfo.variables"
              :key="name"
            >
              <td
                class="tpl-var-name"
                v-text="'{{ ' + name + ' }}'"
              />
              <td>{{ info.type }}</td>
              <td>{{ info.example }}</td>
              <td>{{ info.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Test send card -->
      <div class="card">
        <h3 class="section-title">
          Send Test Email
        </h3>
        <div class="tpl-test-send">
          <input
            v-model="testEmail"
            class="field-input"
            type="email"
            placeholder="test@example.com"
            style="max-width: 280px"
          >
          <button
            class="btn btn--sm"
            :disabled="!testEmail"
            @click="sendTest"
          >
            Send Test
          </button>
          <span
            v-if="testMsg"
            class="tpl-saved-msg"
          >{{ testMsg }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmailStore } from '../stores/useEmailStore'
import CodeEditor from '../components/CodeEditor.vue'

const route = useRoute()
const router = useRouter()
const store = useEmailStore()

const id = route.params.id as string | undefined
const isNew = !id || id === 'new'

const loading = ref(!isNew)
const saving = ref(false)
const savedMsg = ref('')
const testMsg = ref('')
const testEmail = ref('')
const activeTab = ref<'html' | 'text' | 'preview'>('html')
const preview = ref<{ subject: string; html_body: string; text_body: string } | null>(null)

interface FormData {
  event_type: string
  subject: string
  html_body: string
  text_body: string
  is_active: boolean
}
const template = ref<import('../stores/useEmailStore').EmailTemplate | null>(null)
const form = ref<FormData>({ event_type: '', subject: '', html_body: '', text_body: '', is_active: true })

const eventInfo = computed(() =>
  store.eventTypes.find(e => e.event_type === form.value.event_type)
)

onMounted(async () => {
  await store.fetchEventTypes()
  if (!isNew) {
    const tpl = await store.fetchTemplate(id!)
    if (tpl) {
      template.value = tpl
      form.value = {
        event_type: tpl.event_type,
        subject: tpl.subject,
        html_body: tpl.html_body,
        text_body: tpl.text_body,
        is_active: tpl.is_active,
      }
    }
    loading.value = false
  } else {
    // Default event_type to first available
    if (store.eventTypes.length) {
      form.value.event_type = store.eventTypes[0].event_type
    }
  }
})

function tabLabel(tab: string): string {
  return { html: 'HTML', text: 'Plain Text', preview: 'Preview' }[tab] ?? tab
}

function switchTab(tab: string) {
  activeTab.value = tab as 'html' | 'text' | 'preview'
}

async function loadPreview() {
  const info = eventInfo.value
  const ctx = info
    ? Object.fromEntries(
        Object.entries(info.variables).map(([k, v]) => [k, v.example])
      )
    : {}
  preview.value = await store.renderPreview(form.value.event_type, ctx)
}

async function save() {
  saving.value = true
  savedMsg.value = ''
  if (isNew) {
    const created = await store.createTemplate(form.value)
    saving.value = false
    if (created) {
      router.replace(`/admin/email/templates/${created.id}/edit`)
    }
  } else {
    if (!template.value) return
    const result = await store.saveTemplate(template.value.id, form.value)
    saving.value = false
    if (result) {
      template.value = result
      savedMsg.value = 'Saved'
      setTimeout(() => { savedMsg.value = '' }, 3000)
    }
  }
}

async function remove() {
  if (!template.value || !confirm('Delete this template?')) return
  await store.deleteTemplate(template.value.id)
  router.push('/admin/email/templates')
}

async function sendTest() {
  if (!testEmail.value) return
  testMsg.value = ''
  const ok = await store.sendTest(form.value.event_type, testEmail.value)
  testMsg.value = ok ? `Test sent to ${testEmail.value}` : 'Send failed'
  setTimeout(() => { testMsg.value = '' }, 4000)
}
</script>

<style scoped>
.email-template-edit-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Header */
.tpl-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.tpl-editor__header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: monospace;
  color: var(--admin-heading, #2c3e50);
}
.tpl-editor__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Inactive warning */
.tpl-inactive-warning {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 14px;
  color: #92400e;
}

/* Card */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
}
.section-title {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--admin-heading, #2c3e50);
}

/* Meta grid */
.meta-grid {
  display: grid;
  grid-template-columns: 220px 1fr 100px;
  gap: 0 1rem;
  align-items: start;
}
@media (max-width: 700px) { .meta-grid { grid-template-columns: 1fr; } }
.checkbox-group { padding-top: 1.5rem; }

/* Fields */
.field-group { margin-bottom: 0; }
.field-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--admin-heading, #374151);
}
.field-hint {
  font-weight: 400;
  color: var(--admin-muted, #9ca3af);
  font-size: 0.78rem;
}
.field-input {
  width: 100%;
  padding: 0.45rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
  color: var(--admin-text, #333);
}
.field-input:focus {
  outline: none;
  border-color: var(--admin-focus, #3b82f6);
}

/* Tabs */
.tpl-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
}
.tpl-tab {
  padding: 0.5rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--admin-muted, #6b7280);
  margin-bottom: -1px;
}
.tpl-tab.active {
  color: #1d4ed8;
  border-bottom-color: #1d4ed8;
  font-weight: 600;
}
.tpl-tab-body {
  padding-top: 1rem;
}

/* Code editors */
.tpl-code-editor {
  width: 100%;
  min-height: 320px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  resize: vertical;
  background: #1e1e2e;
  color: #cdd6f4;
  box-sizing: border-box;
}
.tpl-code-editor--text {
  background: #282c34;
  color: #abb2bf;
}

/* Preview */
.tpl-preview__toolbar { margin-bottom: 10px; }
.tpl-preview__subject {
  font-size: 14px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--admin-th-bg, #f8f9fa);
  border-radius: 4px;
  color: var(--admin-text, #333);
}
.tpl-preview__frame {
  width: 100%;
  height: 480px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.tpl-preview__hint {
  color: var(--admin-muted, #9ca3af);
  font-size: 14px;
  text-align: center;
  padding: 40px;
}

/* Variables table */
.vars-table td:first-child,
.vars-table th:first-child { min-width: 180px; }
.tpl-var-name {
  font-family: monospace;
  font-size: 13px;
  color: #1d4ed8;
}

/* Test send */
.tpl-test-send {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  padding: 0.45rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: none;
  color: var(--admin-text, #333);
  display: inline-flex;
  align-items: center;
}
.btn--ghost { color: var(--admin-text, #374151); }
.btn--primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--sm { font-size: 0.8rem; padding: 0.35rem 0.65rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Feedback */
.tpl-saved-msg {
  font-size: 13px;
  color: var(--admin-badge-ok, #155724);
}
.tpl-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.6rem 1rem;
  border-radius: 4px;
}

/* Table (shared with CMS) */
.cms-table { width: 100%; border-collapse: collapse; }
.cms-table th,
.cms-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--admin-border-light, #eee);
  font-size: 13px;
  color: var(--admin-text, #333);
}
.cms-table th {
  background: var(--admin-th-bg, #f8f9fa);
  font-weight: 600;
  color: var(--admin-heading, #2c3e50);
}
</style>
