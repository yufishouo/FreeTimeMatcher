<template>
  <Navbar />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade-up" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <Toast />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Toast from './components/Toast.vue';
import { showToast } from './toastState.js';

const router = useRouter();

const handleAuthError = (e) => {
  showToast(e.detail || '權限不足或憑證無效，請重新登入', 'error');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('user-changed'));
  router.push('/');
};

onMounted(() => {
  window.addEventListener('auth-error', handleAuthError);
  
  const userStr = localStorage.getItem('user');
  if (userStr && userStr !== 'undefined') {
    try {
      const user = JSON.parse(userStr);
      if (user.theme_color) {
        document.documentElement.setAttribute('data-theme', user.theme_color);
      }
    } catch(e) {}
  }
});

onUnmounted(() => {
  window.removeEventListener('auth-error', handleAuthError);
});
</script>

<style>
.main-content {
  flex: 1;
  padding: 40px 0;
}
</style>
