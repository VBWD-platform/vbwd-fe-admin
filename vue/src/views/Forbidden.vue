<template>
  <div class="forbidden-container">
    <div class="forbidden-box">
      <h1>403</h1>
      <h2>{{ $t('errors.forbidden') }}</h2>
      <p>{{ $t('errors.forbiddenMessage') }}</p>
      <p
        v-if="requiredPermission"
        class="required-perm"
      >
        Required: <code>{{ requiredPermission }}</code>
      </p>
      <router-link
        to="/admin/dashboard"
        class="btn-primary"
      >
        Back to Dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const requiredPermission = computed(() => route.query.required as string || '');
</script>

<style scoped>
.forbidden-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.forbidden-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

h1 {
  font-size: 72px;
  color: #dc3545;
  margin-bottom: 10px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

p {
  color: #666;
  margin-bottom: 30px;
}

.btn-primary {
  display: inline-block;
  padding: 12px 24px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 16px;
}

.btn-primary:hover {
  background: #0056b3;
}
</style>
