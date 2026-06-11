<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast"
        :class="'toast-' + toast.type"
      >
        <span class="icon" v-if="toast.type === 'success'">✅</span>
        <span class="icon" v-else-if="toast.type === 'error'">❌</span>
        <span class="icon" v-else>ℹ️</span>
        <span class="message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { toasts } from '../toastState.js';
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  color: var(--text-main);
  font-weight: 500;
  pointer-events: auto;
}

.toast-success {
  border-left: 4px solid var(--success);
}

.toast-error {
  border-left: 4px solid var(--danger);
}

.toast-info {
  border-left: 4px solid var(--primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
