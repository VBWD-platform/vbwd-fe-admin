<template>
  <router-view />
  <NotificationHost />
</template>

<script setup lang="ts">
import NotificationHost from '@/components/NotificationHost.vue';
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
}

/* ── Admin design tokens ──────────────────────────────────────────────────── */
:root {
  --admin-card-bg:      #ffffff;
  --admin-bg:           #f5f5f5;
  --admin-heading:      #2c3e50;
  --admin-text:         #333333;
  --admin-muted:        #666666;
  --admin-border:       #e0e0e0;
  --admin-border-light: #eeeeee;
  --admin-th-bg:        #f8f9fa;
  --admin-row-hover:    #f8f9fa;
  --admin-input-border: #dddddd;
  --admin-focus:        #3498db;
  --admin-primary:      #3498db;
  --admin-primary-hover:#2980b9;
  --admin-success:      #27ae60;
  --admin-success-hover:#1e8449;
  --admin-danger:       #e74c3c;
  --admin-danger-hover: #c0392b;
  --admin-bulk-bg:      #f0f4f8;
  --admin-bulk-accent:  #3498db;
  --admin-badge-ok-bg:  #d4edda;
  --admin-badge-ok:     #155724;
  --admin-badge-no-bg:  #f8d7da;
  --admin-badge-no:     #721c24;
}

/* Dark mode overrides are intentionally omitted here.
   The admin panel uses a consistent light theme matching Users/Plans pages.
   To add a manual theme switcher, set [data-theme="dark"] on <html> and
   override the --admin-* variables in that selector instead. */
</style>
