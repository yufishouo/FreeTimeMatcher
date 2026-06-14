<template>
  <div class="container home-container">
    <!-- Hero Section for Non-logged in Users -->
    <div v-if="loading" class="skeleton-grid mt-4"></div>
    <div v-else-if="!user" class="hero text-center">

      <h1 class="hero-title">告別喬時間的煩惱<br><span class="gradient-text">一秒找出完美空堂</span></h1>
      <p class="hero-subtitle">快速比對群組成員課表，讓社團開會、小組討論不再難產。</p>
      
      <div class="login-card glass-panel mx-auto">
        <div class="auth-tabs" style="display: flex; justify-content: center; gap: 32px; margin-bottom: 24px; position: relative;">
          <h2 :class="{'active-tab': isLoginMode, 'inactive-tab': !isLoginMode}" @click="isLoginMode = true" style="cursor: pointer; margin: 0; padding-bottom: 8px; transition: 0.3s;">登入</h2>
          <h2 :class="{'active-tab': !isLoginMode, 'inactive-tab': isLoginMode}" @click="isLoginMode = false" style="cursor: pointer; margin: 0; padding-bottom: 8px; transition: 0.3s;">註冊</h2>
          <div class="tab-indicator" :style="{ left: isLoginMode ? 'calc(50% - 64px)' : 'calc(50% + 24px)' }"></div>
        </div>
        <form @submit.prevent="authAction" class="login-form">
          <div style="margin-bottom: 16px; text-align: left;">
            <label class="form-label">專屬代號 (帳號)</label>
            <input 
              type="text" 
              v-model="username" 
              placeholder="輸入您的專屬代號" 
              class="input-field"
              required
              :disabled="loading"
              autocomplete="username"
            />
          </div>
          <div style="margin-bottom: 24px; text-align: left;">
            <label class="form-label">登入密碼</label>
            <input 
              type="password" 
              v-model="password" 
              placeholder="請設定至少 6 位數密碼" 
              class="input-field"
              required
              :disabled="loading"
              :autocomplete="isLoginMode ? 'current-password' : 'new-password'"
            />
            <div v-if="!isLoginMode && password.length > 0" class="password-strength mt-2">
              <div class="strength-bar">
                <div class="strength-fill" :style="{ width: passwordStrength.width, background: passwordStrength.color }"></div>
              </div>
              <span class="strength-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            {{ loading ? '處理中...' : (isLoginMode ? '登入系統' : '註冊帳號') }}
          </button>
        </form>
      </div>
    </div>

    <!-- Dashboard for Logged in Users -->
    <div v-else class="dashboard">
      <div class="dashboard-header">
        <h2>歡迎回來，{{ user?.username }}！</h2>
        <p class="text-muted">在這裡管理您的所有集會群組，或是加入好友的討論行列。</p>
      </div>

      <div class="grid">
        <!-- Create Group Card -->
        <div class="glass-panel action-card">
          <h3>建立新群組</h3>
          <p class="text-muted mb-4">發起專屬集會群組，一鍵產生邀請碼，輕鬆比對所有人的空堂。</p>
          <form @submit.prevent="createGroup">
            <div class="mb-3">
              <label class="form-label">群組名稱</label>
              <input type="text" v-model="newGroupName" placeholder="例如：期末報告討論" class="input-field" required>
            </div>
            
            <div class="mb-3">
              <label class="form-label">選擇排程模式</label>
              <div class="mode-toggle mt-2">
                <label class="radio-label">
                  <input type="radio" v-model="isSpecificDates" :value="false"> 常規一週 (固定週一到週日)
                </label>
                <label class="radio-label mt-2">
                  <input type="radio" v-model="isSpecificDates" :value="true"> 特定日期範圍
                </label>
              </div>
            </div>
            
            <div v-if="isSpecificDates" class="mb-3 date-range">
              <div style="flex: 1;">
                <label class="form-label">開始日期</label>
                <input type="date" v-model="startDate" class="input-field" required>
              </div>
              <div style="flex: 1;">
                <label class="form-label">結束日期</label>
                <input type="date" v-model="endDate" class="input-field" required>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-full" :disabled="creatingGroup">
              {{ creatingGroup ? '建立中...' : '建立群組' }}
            </button>
          </form>
        </div>

        <!-- Join Group Card -->
        <div class="glass-panel action-card">
          <h3>加入群組</h3>
          <p class="text-muted mb-4">手邊有邀請碼嗎？立刻輸入序號，加入好友的開會行列。</p>
          <form @submit.prevent="joinGroup">
            <input 
              type="text" 
              v-model="inviteCode" 
              placeholder="輸入 6 碼邀請碼" 
              class="input-field mb-3"
              required
            />
            <button type="submit" class="btn btn-outline w-full" :disabled="joiningGroup">
              {{ joiningGroup ? '加入中...' : '加入群組' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Group List -->
      <div class="group-list mt-8">
        <h3>已加入的群組</h3>
        <div v-if="groups.length === 0" class="empty-state glass-panel mt-4" style="text-align: center; padding: 48px 24px;">
          <div style="font-size: 4rem; margin-bottom: 16px;">📭</div>
          <h4 style="margin-bottom: 8px;">您目前尚未參與任何群組</h4>
          <p class="text-muted">點擊上方「建立群組」或「加入群組」開始使用！</p>
        </div>
        <div v-else class="grid mt-4">
          <div v-for="group in groups" :key="group.id" class="glass-panel group-card">
            <div class="group-info">
              <h4>{{ group.name }}</h4>
              <div class="invite-code-display" @click="copyCode(group.invite_code)">
                邀請碼: <span>{{ group.invite_code }}</span> 📋
              </div>
            </div>
            <router-link :to="`/group/${group.id}`" class="btn btn-primary">查看空堂</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from '../toastState.js';
import { apiClient } from '../api.js';

const router = useRouter();
const route = useRoute();
const user = ref(null);
const groups = ref([]);
const loading = ref(false);
const username = ref('');
const password = ref('');
const isLoginMode = ref(true);
const creatingGroup = ref(false);
const joiningGroup = ref(false);

const passwordStrength = computed(() => {
  const p = password.value;
  if (p.length < 6) return { width: '20%', color: '#ef4444', label: '太短' };
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  const hasSpecial = /[^A-Za-z0-9]/.test(p);
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  if (p.length >= 8 && score >= 3) return { width: '100%', color: '#10b981', label: '強' };
  if (p.length >= 8 && score >= 2) return { width: '75%', color: '#f59e0b', label: '中等' };
  return { width: '40%', color: '#f97316', label: '弱' };
});

const newGroupName = ref('');
const isSpecificDates = ref(false);
const startDate = ref('');
const endDate = ref('');
const inviteCode = ref('');

const checkUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser && storedUser !== 'undefined') {
    try {
      user.value = JSON.parse(storedUser);
      fetchGroups();
    } catch(e) {}
  } else {
    user.value = null;
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('user-changed', checkUser);

  if (route.params.inviteCode) {
    inviteCode.value = route.params.inviteCode;
    if (user.value) {
      joinGroup().then(id => {
        if (id) router.push(`/group/${id}`);
      });
    } else {
      showToast('請先輸入暱稱進入系統，將自動幫您加入群組！', 'info');
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('user-changed', checkUser);
});

const authAction = async () => {
  if (!username.value || !password.value) return;
  loading.value = true;
  try {
    const endpoint = isLoginMode.value ? '/auth/login' : '/auth/register';
    const data = await apiClient.post(endpoint, { username: username.value, password: password.value });
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      user.value = data.user;
      window.dispatchEvent(new Event('user-changed'));
      
      if (inviteCode.value && route.params.inviteCode) {
        const joinedGroupId = await joinGroup();
        if (joinedGroupId) {
          router.push(`/group/${joinedGroupId}`);
        } else {
          router.push('/');
        }
      } else {
        // 檢查是否有「被攔截前想去的頁面」
        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          router.push(redirectPath);
        } else {
          fetchGroups();
        }
      }
      
      showToast(isLoginMode.value ? '登入成功！' : '註冊成功！', 'success');
    } else {
      showToast(data.error || '操作失敗', 'error');
    }
  } catch (error) {
    console.error('Auth error', error);
    showToast('無法連線到伺服器，請確認後端已啟動。', 'error');
  } finally {
    loading.value = false;
  }
};

const fetchGroups = async () => {
  if (!user.value) return;
  try {
    const data = await apiClient.get(`/users/${user.value.id}/groups`);
    if (data.groups) {
      groups.value = data.groups;
    }
  } catch (error) {
    console.error('Fetch groups error', error);
    showToast('獲取群組列表失敗，請稍後再試。', 'error');
  }
};

const createGroup = async () => {
  if (!newGroupName.value.trim()) return;
  
  if (isSpecificDates.value) {
    if (!startDate.value || !endDate.value) {
      showToast('請選擇完整的日期範圍', 'error');
      return;
    }
    const [sy, sm, sd] = startDate.value.split('-');
    const [ey, em, ed] = endDate.value.split('-');
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (start > end) {
      showToast('結束日期不能早於開始日期', 'error');
      return;
    }
    const diffDays = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1; 
    if (diffDays > 14) {
      showToast('日期範圍最多支援 14 天', 'error');
      return;
    }
  }

  creatingGroup.value = true;
  try {
    const data = await apiClient.post('/groups', { 
      name: newGroupName.value, 
      userId: user.value.id,
      is_specific_dates: isSpecificDates.value,
      start_date: startDate.value,
      end_date: endDate.value
    });
    if (data.group) {
      navigator.clipboard.writeText(data.group.invite_code)
        .then(() => {
          showToast(`群組建立成功！邀請碼 ${data.group.invite_code} 已複製。`, 'success');
        })
        .catch(() => {
          showToast(`群組建立成功！您的邀請碼是：${data.group.invite_code}`, 'success');
        });
        
      newGroupName.value = '';
      isSpecificDates.value = false;
      startDate.value = '';
      endDate.value = '';
      fetchGroups();
    } else {
      showToast(data.error || '建立失敗', 'error');
    }
  } catch (error) {
    console.error('Create group error', error);
    showToast('建立群組失敗，請確認網路連線。', 'error');
  } finally {
    creatingGroup.value = false;
  }
};

const joinGroup = async () => {
  if (!inviteCode.value) return null;
  joiningGroup.value = true;
  try {
    const data = await apiClient.post('/groups/join', { inviteCode: inviteCode.value.toUpperCase(), userId: user.value.id });
    if (data.error) {
      showToast(data.error, 'error');
      return null;
    } else if (data.group) {
      inviteCode.value = '';
      fetchGroups();
      showToast('成功加入群組！', 'success');
      return data.group.id;
    }
  } catch (error) {
    console.error('Join group error', error);
    showToast('加入群組失敗，請確認網路連線。', 'error');
    return null;
  } finally {
    joiningGroup.value = false;
  }
};

const copyCode = (code) => {
  navigator.clipboard.writeText(code)
    .then(() => showToast('邀請碼已複製！', 'success'))
    .catch(() => showToast(`邀請碼: ${code}`, 'info'));
};
</script>

<style scoped>
.text-center { text-align: center; }
.mx-auto { margin-left: auto; margin-right: auto; }
.w-full { width: 100%; }

.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

:root[data-theme="light"] .strength-bar {
  background: rgba(0,0,0,0.1);
}

.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background 0.3s ease;
}

.strength-text {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }

.hero {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  padding: 8px 16px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 24px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.hero-title {
  font-size: 4rem;
  line-height: 1.2;
  margin-bottom: 24px;
  animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 600px;
  margin-bottom: 48px;
}

.login-card {
  max-width: 400px;
  width: 100%;
}

.login-card h2 {
  margin-bottom: 24px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-header {
  margin-bottom: 32px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.action-card {
  display: flex;
  flex-direction: column;
}

.action-card form {
  margin-top: auto;
}

.group-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.invite-code-display {
  margin-top: 8px;
  font-size: 0.875rem;
  color: var(--text-muted);
  background: rgba(0,0,0,0.2);
  padding: 4px 12px;
  border-radius: 4px;
  display: inline-block;
  cursor: pointer;
  transition: background 0.2s;
}

.invite-code-display:hover {
  background: rgba(255,255,255,0.1);
}

.invite-code-display span {
  font-family: monospace;
  font-weight: bold;
  color: var(--text-main);
  letter-spacing: 1px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
}

.active-tab {
  color: var(--text-main);
  font-weight: 700;
}

.inactive-tab {
  color: var(--text-muted);
  font-weight: 400;
}

.auth-tabs {
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);
}

.tab-indicator {
  position: absolute;
  bottom: -2px;
  width: 40px;
  height: 3px;
  background: var(--primary);
  border-radius: 3px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 2rem;
  }
}
</style>
