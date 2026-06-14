<template>
  <nav class="navbar glass-panel">
    <div class="container nav-container">
      <router-link to="/" class="logo">
        <span class="icon">✨</span>
        <span class="text">FreeTime<span class="highlight">Matcher</span></span>
      </router-link>
      
      <button v-if="user" class="hamburger" :class="{'is-open': menuOpen}" @click="menuOpen = !menuOpen" aria-label="選單">
        <span></span><span></span><span></span>
      </button>

      <div class="nav-links" :class="{'nav-open': menuOpen}">
        <template v-if="user">
          <router-link to="/" class="nav-item" @click="menuOpen = false">🏠 群組首頁</router-link>
          <router-link to="/profile" class="nav-item" @click="menuOpen = false">📅 個人資訊</router-link>
          <div class="user-badge" style="display: flex; align-items: center; gap: 8px;">
            <img v-if="user.avatar_style === 'custom' && user.avatar_url" :src="user.avatar_url" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--primary); object-fit: cover;" />
            <img v-else :src="`https://api.dicebear.com/9.x/${user.avatar_style === 'custom' ? 'notionists' : user.avatar_style || 'notionists'}/svg?seed=${user.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--primary); object-fit: cover;" />
            <span>{{ user.display_name || user.username }}</span>
          </div>
          <button @click="logout" class="btn btn-outline btn-sm">登出</button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const user = ref(null);
const router = useRouter();
const menuOpen = ref(false);

const checkTheme = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser && storedUser !== 'undefined') {
    try {
      const u = JSON.parse(storedUser);
      if (u.theme_color) {
        document.documentElement.setAttribute('data-theme', u.theme_color);
      }
    } catch(e) {}
  }
};

const checkUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser && storedUser !== 'undefined') {
    try {
      user.value = JSON.parse(storedUser);
    } catch(e) {}
  } else {
    user.value = null;
  }
};

// 路由切換時關閉選單
router.afterEach(() => {
  menuOpen.value = false;
});

onMounted(() => {
  checkTheme();
  checkUser();
  window.addEventListener('user-changed', checkUser);
});

onUnmounted(() => {
  window.removeEventListener('user-changed', checkUser);
});

const logout = () => {
  localStorage.removeItem('user');
  user.value = null;
  menuOpen.value = false;
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
  z-index: 1000;
  border-radius: 40px;
  overflow: visible !important;
  /* 覆蓋 glass-panel 的 hover 效果，避免干擾點擊 */
  transform: none !important;
}

.navbar:hover {
  transform: none !important;
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
  cursor: pointer;
  padding: 4px 0;
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

/* Hamburger Button */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  z-index: 1001;
}

.hamburger span {
  display: block;
  width: 24px;
  height: 2.5px;
  background: var(--text-main);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.hamburger.is-open span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.is-open span:nth-child(2) {
  opacity: 0;
}

.hamburger.is-open span:nth-child(3) {
  transform: rotate(-45deg) translate(6px, -6px);
}

@media (max-width: 768px) {
  .navbar {
    padding: 12px 16px;
    margin: 12px;
    border-radius: 20px;
    position: sticky;
    top: 12px;
  }

  .hamburger {
    display: flex;
  }

  .nav-links {
    display: none;
    flex-direction: column;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    left: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 16px;
    gap: 12px;
    box-shadow: var(--shadow-lg);
    z-index: 1001;
  }

  .nav-links.nav-open {
    display: flex;
  }

  .nav-item {
    padding: 8px 12px;
    border-radius: 10px;
    width: 100%;
    text-align: center;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.05);
  }

  .user-badge {
    justify-content: center;
    width: 100%;
  }

  .logo .text {
    font-size: 1.2rem;
  }
}
</style>
