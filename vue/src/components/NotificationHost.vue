<template>
  <Teleport to="body">
    <div
      class="app-toast-host"
      aria-live="polite"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="app-toast"
        :class="`app-toast--${toast.type}`"
        data-testid="app-toast"
        role="status"
        @click="dismiss(toast.id)"
      >
        <strong
          v-if="toast.title"
          class="app-toast__title"
        >{{ toast.title }}</strong>
        <span class="app-toast__message">{{ toast.message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * App-wide toast renderer.
 *
 * Subscribes to the fe-core eventBus `notification:show` events and renders a
 * stacked, auto-dismissing fly-out (Teleported to <body>). This is the single
 * rendered host for the otherwise event-only fe-core notification API, so any
 * feature can surface a toast by emitting `AppEvents.NOTIFICATION_SHOW` —
 * fully decoupled from this component.
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { AppEvents, eventBus, type NotificationPayload } from 'vbwd-view-component';

const DEFAULT_DURATION_MS = 4000;

interface ActiveToast {
  id: string;
  type: NotificationPayload['type'];
  message: string;
  title?: string;
}

const toasts = ref<ActiveToast[]>([]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let unsubscribe: (() => void) | null = null;

function dismiss(id: string): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function show(payload: NotificationPayload): void {
  const id = payload.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts.value.push({
    id,
    type: payload.type,
    message: payload.message,
    title: payload.title,
  });
  const duration = payload.duration ?? DEFAULT_DURATION_MS;
  if (duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duration));
  }
}

onMounted(() => {
  unsubscribe = eventBus.on<NotificationPayload>(AppEvents.NOTIFICATION_SHOW, show);
});

onBeforeUnmount(() => {
  unsubscribe?.();
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
});
</script>

<style scoped>
/* Styled through the fe-core design system (CSS custom properties) — no bespoke
   colours. The success variant uses the shared success token. */
.app-toast-host {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.app-toast {
  pointer-events: auto;
  min-width: 16rem;
  max-width: 24rem;
  padding: 0.75rem 1rem;
  border-radius: var(--vbwd-radius-md, 8px);
  box-shadow: var(--vbwd-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.15));
  color: var(--vbwd-color-on-accent, #ffffff);
  font-size: 0.9rem;
  cursor: pointer;
  animation: app-toast-in 0.2s ease-out;
}

.app-toast__title {
  display: block;
  margin-bottom: 0.15rem;
}

.app-toast--success {
  background: var(--vbwd-color-success, #27ae60);
}

.app-toast--error {
  background: var(--vbwd-color-danger, #e74c3c);
}

.app-toast--warning {
  background: var(--vbwd-color-warning, #f39c12);
}

.app-toast--info {
  background: var(--vbwd-color-info, #3498db);
}

@keyframes app-toast-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
