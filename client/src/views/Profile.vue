<template>
  <div class="container mt-8 profile-dashboard">
    <div v-if="loadingStats" class="skeleton-grid mb-8"></div>
    <div v-else class="dashboard-grid mb-8">
      
      <!-- Profile Card -->
      <div class="glass-panel profile-card">
        <div class="avatar-section">
          <img v-if="profile.avatar_style === 'custom' && profile.avatar_url" :src="profile.avatar_url" alt="Avatar" class="avatar-img" />
          <img v-else :src="`https://api.dicebear.com/9.x/${profile.avatar_style === 'custom' ? 'notionists' : profile.avatar_style || 'notionists'}/svg?seed=${user?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`" alt="Avatar" class="avatar-img" />
          <div class="avatar-controls">
            <select v-model="profile.avatar_style" class="input-field select-sm">
              <option value="notionists">插畫風</option>
              <option value="bottts">機器人</option>
              <option value="micah">藝術風</option>
              <option value="avataaars">人物風</option>
              <option value="custom">自訂圖片 (URL)</option>
            </select>
          </div>
          <div v-if="profile.avatar_style === 'custom'" class="form-group w-full mt-2" style="width: 100%;">
            <input type="text" v-model="profile.avatar_url" class="input-field select-sm" placeholder="請貼上圖片網址..." />
          </div>
        </div>
        <div class="info-section">
          <div class="form-group">
            <label>顯示暱稱</label>
            <input type="text" v-model="profile.display_name" class="input-field" placeholder="輸入暱稱" />
          </div>
          <div class="form-group">
            <label>狀態小語</label>
            <input type="text" v-model="profile.status_message" class="input-field" placeholder="最近過得如何？" />
          </div>
          <div class="form-group">
            <label>專屬主題</label>
            <select v-model="profile.theme_color" class="input-field">
              <option value="default">🌌 星空黑 (預設)</option>
              <option value="sakura">🌸 櫻花粉</option>
              <option value="ocean">🌊 深海藍</option>
              <option value="mint">🌿 薄荷綠</option>
              <option value="light">☀️ 經典亮白</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Social & Stats -->
      <div class="stats-social-container">
        <!-- Stats Card -->
        <div class="glass-panel stats-card">
          <h3>📊 個人數據庫</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ stats.groupCount }}</span>
              <span class="stat-label">加入群組數</span>
            </div>
            <div class="stat-item">
              <span class="stat-value text-success">{{ stats.freeCount }}</span>
              <span class="stat-label">空堂總節數</span>
            </div>
            <div class="stat-item full-width">
              <span class="stat-label">最常有空的日子</span>
              <span class="stat-value-text">{{ stats.mostFreeDay }}</span>
            </div>
          </div>
        </div>

        <!-- Social Card -->
        <div class="glass-panel social-card mt-4">
          <h3>🔗 聯絡方式 (僅同群組可見)</h3>
          <div class="form-group">
            <input type="text" v-model="profile.contact_line" class="input-field icon-input line-icon" placeholder="LINE ID" />
          </div>
          <div class="form-group mt-2">
            <input type="text" v-model="profile.contact_discord" class="input-field icon-input discord-icon" placeholder="Discord 名稱" />
          </div>
          <div class="form-group mt-2">
            <input type="text" v-model="profile.contact_ig" class="input-field icon-input ig-icon" placeholder="Instagram 帳號" />
          </div>
          <button @click="saveProfile" class="btn btn-primary w-full mt-4" :disabled="savingProfile">
            {{ savingProfile ? '儲存中...' : '💾 儲存個人與聯絡設定' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Section -->
    <div class="header-section">
      <div>
        <h2>📅 課表設定</h2>
        <p class="text-muted">請在下方網格繪製您的行程。綠色代表完全有空，紅色代表已經有約。</p>
      </div>
      <div class="actions" style="flex-wrap: wrap; gap: 12px; margin-top: 12px;">
        <select v-model="targetGroup" @change="handleTargetChange" class="input-field" style="max-width: 250px; padding: 8px 12px; background: rgba(0,0,0,0.2);">
          <option value="default">🌐 預設課表 (套用所有群組)</option>
          <option value="quiet">🛑 絕對防禦時段 (全域覆蓋)</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">📂 {{ g.name }} (專屬課表)</option>
        </select>
        <button @click="fillAll" class="btn btn-outline">✨ 填滿</button>
        <button @click="clearAll" class="btn btn-outline">🗑️ 清空</button>
        <button @click="saveSchedule" class="btn btn-primary" :disabled="saving">
          {{ saving ? '儲存中...' : '儲存課表' }}
        </button>
      </div>
    </div>

    <div class="paint-palette-container glass-panel mt-4 mb-4">
      <h4>🎨 智慧畫筆模式：點選下方狀態後，在課表上直接拖曳即可快速塗繪。</h4>
      <div class="paint-palette mt-2">
        <button class="btn paint-btn free" :class="{'active': paintColor === 2}" @click="paintColor = 2">✅ 有空</button>
        <button class="btn paint-btn warn" :class="{'active': paintColor === 1}" @click="paintColor = 1">⚠️ 盡量不要</button>
        <button class="btn paint-btn busy" :class="{'active': paintColor === 0}" @click="paintColor = 0">❌ 沒空</button>
      </div>
    </div>

    <div v-if="loading" class="skeleton-grid mt-4"></div>
    <div v-else class="mt-4">
      <ScheduleGrid v-model="schedule" :paintColor="paintColor" :days="customDays" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import { showToast } from '../toastState.js';
import { apiClient } from '../api.js';

const router = useRouter();
const user = ref(null);
const savingProfile = ref(false);

const loading = ref(true);
const loadingStats = ref(true);
const saving = ref(false);
const paintColor = ref(2);

const groups = ref([]);
const targetGroup = ref('default');

const stats = ref({ groupCount: 0, freeCount: 0, mostFreeDay: '無資料' });
const profile = ref({
  display_name: '',
  avatar_style: 'notionists',
  avatar_url: '',
  status_message: '',
  contact_line: '',
  contact_discord: '',
  contact_ig: '',
  theme_color: 'default'
});

const customDays = computed(() => {
  if (targetGroup.value === 'default' || targetGroup.value === 'quiet') return undefined;
  const g = groups.value.find(x => x.id === targetGroup.value);
  if (!g || !g.is_specific_dates) return undefined;
  
  const [sy, sm, sd] = g.start_date.split('-');
  const [ey, em, ed] = g.end_date.split('-');
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diffDays = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  const arr = [];
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayStr = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    arr.push(`${d.getMonth() + 1}/${d.getDate()} (${dayStr})`);
  }
  return arr;
});

const getGridLength = () => customDays.value ? customDays.value.length : 7;
const createEmptySchedule = () => Array(getGridLength()).fill().map(() => Array(14).fill(0));
const createFullSchedule = () => Array(getGridLength()).fill().map(() => Array(14).fill(2));

const schedule = ref([]);

const clearAll = () => {
  schedule.value = createEmptySchedule();
};

const fillAll = () => {
  schedule.value = createFullSchedule();
};

onMounted(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser && storedUser !== 'undefined') {
    try {
      user.value = JSON.parse(storedUser);
    } catch(e) {
      router.push('/');
      return;
    }
    fetchGroups();
    fetchSchedule();
    fetchStatsAndProfile();
  } else {
    router.push('/');
  }
});

const fetchStatsAndProfile = async () => {
  loadingStats.value = true;
  try {
    const data = await apiClient.get(`/users/${user.value.id}/stats`);
    if (data.stats) stats.value = data.stats;
    if (data.user) {
      user.value = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      profile.value.display_name = data.user.display_name || data.user.username;
      profile.value.avatar_style = data.user.avatar_style || 'notionists';
      profile.value.avatar_url = data.user.avatar_url || '';
      profile.value.status_message = data.user.status_message || '';
      profile.value.contact_line = data.user.contact_line || '';
      profile.value.contact_discord = data.user.contact_discord || '';
      profile.value.contact_ig = data.user.contact_ig || '';
      profile.value.theme_color = data.user.theme_color || 'default';
      applyTheme(profile.value.theme_color);
    }
  } catch(e) {
    console.error('Fetch stats error', e);
  } finally {
    loadingStats.value = false;
  }
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new Event('theme-changed'));
};

const saveProfile = async () => {
  if (!profile.value.display_name.trim()) {
    showToast('暱稱不能為空', 'error');
    return;
  }
  savingProfile.value = true;
  try {
    const data = await apiClient.put(`/users/${user.value.id}/profile`, profile.value);
    if (data.success) {
      user.value = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('個人資訊更新成功！', 'success');
      applyTheme(profile.value.theme_color);
      window.dispatchEvent(new Event('user-changed'));
    }
  } catch(e) {
    showToast('更新失敗', 'error');
  } finally {
    savingProfile.value = false;
  }
};

const fetchGroups = async () => {
  try {
    const data = await apiClient.get(`/users/${user.value.id}/groups`);
    if (data.groups) {
      groups.value = data.groups;
    }
  } catch (error) {
    console.error('Fetch groups error', error);
  }
};

const handleTargetChange = () => {
  fetchSchedule();
};

let quietHoursCache = null;

const fetchSchedule = async () => {
  loading.value = true;
  try {
    let data;
    if (targetGroup.value === 'default') {
      data = await apiClient.get(`/schedule/${user.value.id}`);
    } else if (targetGroup.value === 'quiet') {
      // Quiet hours are stored in the user profile
      const uData = await apiClient.get(`/users/${user.value.id}/stats`);
      if (uData.user && uData.user.quiet_hours_data) {
        try { quietHoursCache = JSON.parse(uData.user.quiet_hours_data); } catch(e) {}
      }
      data = { schedule: quietHoursCache };
    } else {
      data = await apiClient.get(`/groups/${targetGroup.value}/schedule/${user.value.id}`);
    }
    
    if (data && data.schedule) {
      schedule.value = data.schedule;
    } else {
      schedule.value = createEmptySchedule();
    }
  } catch (error) {
    console.error('Fetch schedule error', error);
    showToast('獲取課表失敗，請稍後再試。', 'error');
    schedule.value = createEmptySchedule();
  } finally {
    loading.value = false;
  }
};

const saveSchedule = async () => {
  saving.value = true;
  try {
    let data;
    if (targetGroup.value === 'default') {
      data = await apiClient.post(`/schedule/${user.value.id}`, { schedule: schedule.value });
    } else if (targetGroup.value === 'quiet') {
      data = await apiClient.put(`/users/${user.value.id}/profile`, { quiet_hours_data: schedule.value });
    } else {
      data = await apiClient.post(`/groups/${targetGroup.value}/schedule`, { userId: user.value.id, schedule: schedule.value });
    }

    
    if (data.success) {
      showToast('課表儲存成功！', 'success');
    } else {
      showToast(data.error || '儲存失敗', 'error');
    }
  } catch (error) {
    console.error('Save schedule error', error);
    showToast('儲存失敗，請確認網路連線。', 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  align-items: center;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.profile-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.avatar-img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--primary);
  background: var(--mesh-2);
  object-fit: cover;
}

.avatar-controls {
  width: 100%;
}

.select-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-social-container {
  display: flex;
  flex-direction: column;
}

.stats-card {
  padding: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.stat-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stat-item.full-width {
  grid-column: 1 / -1;
  flex-direction: row;
  justify-content: space-between;
  padding: 16px 24px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-value-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.social-card {
  padding: 24px;
  flex: 1;
}

.icon-input {
  padding-left: 40px;
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 20px;
}

.line-icon {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306C755"><path d="M22.2 11.2C22.2 6.1 17.6 2 12 2S1.8 6.1 1.8 11.2c0 4.6 3.6 8.4 8.5 9.1.3 0 .8.2 1 .5.1.3.1.8.1 1.2 0 0-.2 1.3-.2 1.5-.1.5.2.7.6.4.4-.3 2.7-1.7 3.7-2.6 1.1-.9 2.1-1.9 2.1-1.9 2.8-1.9 4.6-4.9 4.6-8.2z"/></svg>');
}
.discord-icon {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235865F2"><path d="M20.3 5.3c-1.6-.7-3.3-1.2-5.1-1.5-.2.4-.4.8-.6 1.2-1.8-.3-3.6-.3-5.4 0-.2-.4-.4-.8-.6-1.2-1.8.3-3.5.8-5.1 1.5-1.1 1.6-2.2 5.1-1.8 8.6 1.6 1.2 3.2 1.9 4.7 2.4.4-.5.8-1 1.1-1.5-.8-.3-1.5-.7-2.2-1.1.2-.1.4-.2.5-.4 3.2 1.5 6.6 1.5 9.8 0 .2.2.3.3.5.4-.7.4-1.4.8-2.2 1.1.4.5.7 1 1.1 1.5 1.5-.5 3.1-1.2 4.7-2.4.4-3.5-.7-7-1.8-8.6z"/></svg>');
}
.ig-icon {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E4405F"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.5.2.9.5 1.3.9s.7.8.9 1.3c.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.5-.5.9-.9 1.3s-.8.7-1.3.9c-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.5-.2-.9-.5-1.3-.9s-.7-.8-.9-1.3c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.3 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.5.5-.9.9-1.3s.8-.7 1.3-.9c.4-.2 1-.4 2.2-.4 1.3-.1 1.6-.1 4.9-.1M12 0C8.7 0 8.3 0 7.1.1 5.8.2 4.9.4 4.2.7c-.8.3-1.5.7-2.1 1.3C1.5 2.6 1 3.4.7 4.2.4 4.9.2 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.3 2.2.6 2.9.3.8.7 1.5 1.3 2.1.6.6 1.4 1.1 2.1 1.3.7.3 1.6.5 2.9.6 1.3.1 1.7.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.2-.3 2.9-.6.8-.3 1.5-.7 2.1-1.3.6-.6 1.1-1.4 1.3-2.1.3-.7.5-1.6.6-2.9.1-1.3.1-1.7.1-4.9s0-3.7-.1-4.9c-.1-1.3-.3-2.2-.6-2.9-.3-.8-.7-1.5-1.3-2.1-.6-.6-1.4-1.1-2.1-1.3C16.9.4 16 .2 14.9.1 13.7 0 13.3 0 12 0zm0 5.8c-3.4 0-6.2 2.8-6.2 6.2s2.8 6.2 6.2 6.2 6.2-2.8 6.2-6.2-2.8-6.2-6.2-6.2zm0 10.2c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm6.4-10.4c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4 1.4.6 1.4 1.4-.6 1.4-1.4 1.4z"/></svg>');
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }
  .actions {
    width: 100%;
    justify-content: flex-start;
  }
  .actions select.input-field {
    max-width: 100% !important;
  }
  .actions .btn {
    flex: 1;
    min-width: fit-content;
    padding: 10px;
    font-size: 0.9rem;
  }
}

.paint-palette-container {
  padding: 16px;
}

.paint-palette {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.paint-btn {
  opacity: 0.7;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.paint-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.paint-btn.active {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.paint-btn.free {
  background: rgba(16, 185, 129, 0.2);
  color: var(--text-main);
}
.paint-btn.free.active {
  background: rgba(16, 185, 129, 0.4);
  border-color: var(--success);
}

.paint-btn.warn {
  background: rgba(245, 158, 11, 0.2);
  color: var(--text-main);
}
.paint-btn.warn.active {
  background: rgba(245, 158, 11, 0.4);
  border-color: var(--warning);
}

.paint-btn.busy {
  background: rgba(239, 68, 68, 0.2);
  color: var(--text-main);
}
.paint-btn.busy.active {
  background: rgba(239, 68, 68, 0.4);
  border-color: var(--danger);
}
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.mb-4 { margin-bottom: 16px; }
.mb-8 { margin-bottom: 32px; }
.text-center { text-align: center; }
.w-full { width: 100%; }
.text-success { color: var(--success); }
</style>
