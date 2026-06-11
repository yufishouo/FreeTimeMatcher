<template>
  <nav class="navbar glass-panel">
    <div class="container nav-container">
      <router-link to="/" class="logo">
        <span class="icon">✨</span>
        <span class="text">FreeTime<span class="highlight">Matcher</span></span>
      </router-link>
      
      <div class="nav-links" v-if="user">
        <router-link to="/" class="nav-item">🏠 群組首頁</router-link>
        <router-link to="/profile" class="nav-item">📅 我的課表</router-link>
        <span class="user-badge">Hi, {{ user.username }}</span>
        <button @click="logout" class="btn btn-outline btn-sm">登出</button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const user = ref(null);
const router = useRouter();
const route = useRoute();

const checkUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user.value = JSON.parse(storedUser);
  } else {
    user.value = null;
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('user-changed', checkUser);
});

onUnmounted(() => {
  window.removeEventListener('user-changed', checkUser);
});

watch(route, checkUser); // Re-check when route changes

const logout = () => {
  localStorage.removeItem('user');
  user.value = null;
  window.dispatchEvent(new Event('user-changed'));
  router.push('/');
};
</script>

<style scoped>
.navbar {
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo .icon {
  font-size: 1.5rem;
}

.logo .text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main);
}

.logo .highlight {
  color: var(--primary);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-item {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
  transition: color 0.2s;
}

.nav-item:hover, .nav-item.router-link-active {
  color: var(--text-main);
}

.user-badge {
  background: rgba(99, 102, 241, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  color: var(--primary);
  font-weight: 600;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.875rem;
}
</style>
