<template>
  <nav class="navbar glass-panel">
    <div class="container nav-container">
      <router-link to="/" class="logo">
        <span class="icon">✨</span>
        <span class="text">FreeTime<span class="highlight">Matcher</span></span>
      </router-link>
      
      <div class="nav-links">
        <button @click="toggleTheme" class="btn btn-outline btn-sm" title="切換深/淺色主題" style="margin-right: 8px;">
          {{ isDark ? '🌞' : '🌛' }}
        </button>
        <template v-if="user">
          <router-link to="/" class="nav-item">🏠 群組首頁</router-link>
          <router-link to="/profile" class="nav-item">📅 我的課表</router-link>
          <span class="user-badge">Hi, {{ user.username }}</span>
          <button @click="logout" class="btn btn-outline btn-sm">登出</button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const user = ref(null);
const isDark = ref(true);
const router = useRouter();
const route = useRoute();

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const theme = isDark.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const checkTheme = () => {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'light') {
    isDark.value = false;
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    isDark.value = true;
    document.documentElement.removeAttribute('data-theme');
  }
};

const checkUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user.value = JSON.parse(storedUser);
  } else {
    user.value = null;
  }
};

onMounted(() => {
  checkTheme();
  checkUser();
  window.addEventListener('user-changed', checkUser);
});

onUnmounted(() => {
  window.removeEventListener('user-changed', checkUser);
});

watch(route, checkUser);

const logout = () => {
  localStorage.removeItem('user');
  user.value = null;
  window.dispatchEvent(new Event('user-changed'));
  router.push('/');
};
</script>

<style scoped>
.navbar {
  max-width: 1000px;
  margin: 24px auto;
  padding: 12px 32px;
  position: sticky;
  top: 24px;
  z-index: 100;
  border-radius: 40px;
  overflow: visible !important;
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
  gap: 12px;
  transition: all 0.3s;
  padding: 4px;
}

.logo:hover {
  transform: translateY(-2px);
  filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.4));
}

.logo .icon {
  font-size: 1.8rem;
}

.logo .text {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.05em;
}

.logo .highlight {
  color: transparent;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
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
  transition: all 0.2s;
  position: relative;
}

.nav-item::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: all 0.3s;
  transform: translateX(-50%);
  border-radius: 2px;
}

.nav-item:hover {
  color: var(--text-main);
}

.nav-item.router-link-active {
  color: var(--text-main);
}

.nav-item.router-link-active::after {
  width: 100%;
}

.user-badge {
  background: rgba(99, 102, 241, 0.15);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--primary);
  font-weight: 700;
  border: 1px solid rgba(99, 102, 241, 0.3);
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.1);
}

:root[data-theme="light"] .user-badge {
  background: rgba(79, 70, 229, 0.1);
}

@media (max-width: 768px) {
  .navbar {
    padding: 12px 16px;
    margin: 12px;
    border-radius: 20px;
    position: static;
  }
  .nav-container {
    flex-direction: column;
    gap: 12px;
  }
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
  .logo .text {
    font-size: 1.2rem;
  }
}
</style>
