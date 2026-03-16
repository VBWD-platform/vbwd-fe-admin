<template>
  <div ref="editorEl" class="code-editor-wrap" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'

const props = defineProps<{
  modelValue: string
  language?: 'html' | 'text'
}>()
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>()

const editorEl = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let ignoreUpdate = false

onMounted(() => {
  const extensions = [
    basicSetup,
    oneDark,
    EditorView.updateListener.of(update => {
      if (update.docChanged && !ignoreUpdate) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
    EditorView.theme({ '&': { height: '100%', minHeight: '320px' } }),
  ]
  if (props.language !== 'text') {
    extensions.push(html())
  }

  view = new EditorView({
    state: EditorState.create({ doc: props.modelValue, extensions }),
    parent: editorEl.value!,
  })
})

watch(() => props.modelValue, val => {
  if (!view) return
  const current = view.state.doc.toString()
  if (current !== val) {
    ignoreUpdate = true
    view.dispatch({ changes: { from: 0, to: current.length, insert: val } })
    ignoreUpdate = false
  }
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<style scoped>
.code-editor-wrap {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
  min-height: 320px;
}
.code-editor-wrap :deep(.cm-editor) {
  min-height: 320px;
  font-size: 13px;
}
.code-editor-wrap :deep(.cm-scroller) {
  font-family: 'Courier New', monospace;
}
</style>
