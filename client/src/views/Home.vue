<template>
  <div class="container home-container">
    <!-- Hero Section for Non-logged in Users -->
    <div v-if="loading" class="skeleton-grid mt-4"></div>
    <div v-else-if="!user" class="hero text-center">

      <h1 class="hero-title">告別喬時間的煩惱<br><span class="gradient-text">一秒找出完美空堂</span></h1>
      <p class="hero-subtitle">快速比對群組成員課表，讓社團開會、小組討論不再難產。</p>
      
      <div class="login-card glass-panel mx-auto">
        <h2>馬上開始使用</h2>
        <form @submit.prevent="login" class="login-form">
          <input 
            type="text" 
            v-model="username" 
            placeholder="輸入您的暱稱" 
            class="input-field"
            required
            :disabled="loading"
          />
          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            {{ loading ? '登入中...' : '進入系統' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Dashboard for Logged in Users -->
    <div v-else class="dashboard">
      <div class="dashboard-header">
        <h2>我的群組</h2>
        <p class="text-muted">管理您的群組或加入新群組來比對空堂時間。</p>
      </div>

      <div class="grid">
        <!-- Create Group Card -->
        <div class="glass-panel action-card">
          <h3>建立新群組</h3>
          <p class="text-muted mb-4">建立一個專屬群組，邀請好友加入比對。</p>
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
          <p class="text-muted mb-4">輸入好友分享的邀請碼，加入現有群組。</p>
          <form @submit.prevent="joinGroup">
            <input 
              type="text" 
              v-model="inviteCode" 
              placeholder="輸入 6 碼邀請碼" 
              class="input-field mb-3"
              required
            />
            <button type="submit" class="btn btn-outline w-full">加入群組</button>
          </form>
        </div>
      </div>

      <!-- Group List -->
      <div class="group-list mt-8">
        <h3>已加入的群組</h3>
        <div v-if="groups.length === 0" class="empty-state glass-panel mt-4">
          您還沒有加入任何群組，趕快建立或加入一個吧！
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from '../toastState.js';

const router = useRouter();
const user = ref(null);
const username = ref('');
const loading = ref(false);
const creatingGroup = ref(false);

const newGroupName = ref('');
const isSpecificDates = ref(false);
const startDate = ref('');
const endDate = ref('');
const inviteCode = ref('');
const groups = ref([]);

const API_URL = 'http://localhost:3000/api';

const checkUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user.value = JSON.parse(storedUser);
    fetchGroups();
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

const login = async () => {
  if (!username.value) return;
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      user.value = data.user;
      window.dispatchEvent(new Event('user-changed'));
      fetchGroups();
      showToast('登入成功！', 'success');
    } else {
      showToast(data.error || '登入失敗', 'error');
    }
  } catch (error) {
    console.error('Login error', error);
    showToast('無法連線到伺服器，請確認後端已啟動。', 'error');
  } finally {
    loading.value = false;
  }
};

const fetchGroups = async () => {
  if (!user.value) return;
  try {
    const res = await fetch(`${API_URL}/users/${user.value.id}/groups`);
    if (!res.ok) throw new Error('API 回應錯誤');
    const data = await res.json();
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
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    if (start > end) {
      showToast('結束日期不能早於開始日期', 'error');
      return;
    }
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1; 
    if (diffDays > 14) {
      showToast('日期範圍最多支援 14 天', 'error');
      return;
    }
  }

  creatingGroup.value = true;
  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newGroupName.value, 
        userId: user.value.id,
        is_specific_dates: isSpecificDates.value,
        start_date: startDate.value,
        end_date: endDate.value
      })
    });
    const data = await res.json();
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
  if (!inviteCode.value) return;
  try {
    const res = await fetch(`${API_URL}/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: inviteCode.value.toUpperCase(), userId: user.value.id })
    });
    if (!res.ok) throw new Error('API 回應錯誤');
    const data = await res.json();
    if (data.error) {
      showToast(data.error, 'error');
    } else if (data.group) {
      inviteCode.value = '';
      fetchGroups();
      showToast('成功加入群組！', 'success');
    }
  } catch (error) {
    console.error('Join group error', error);
    showToast('加入群組失敗，請確認網路連線。', 'error');
  }
};

const copyCode = (code) => {
  navigator.clipboard.writeText(code);
  showToast('邀請碼已複製！', 'success');
};
</script>

<style scoped>
.text-center { text-align: center; }
.mx-auto { margin-left: auto; margin-right: auto; }
.w-full { width: 100%; }
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
}

.gradient-text {
  background: linear-gradient(to right, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
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
  color: var(--text-muted);
  padding: 40px;
}
</style>
