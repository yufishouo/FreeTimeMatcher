<template>
  <div class="container mt-8">
    <div class="header-section">
      <div>
        <h2>專屬課表設定</h2>
        <p class="text-muted">請在下方網格繪製您的行程。綠色代表完全有空，紅色代表已經有約。</p>
      </div>
      <div class="actions">
        <button @click="fillAll" class="btn btn-outline" style="margin-right: 8px;">✨ 填滿整週</button>
        <button @click="clearAll" class="btn btn-outline" style="margin-right: 16px;">🗑️ 清空整週</button>
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
      <ScheduleGrid v-model="schedule" :paintColor="paintColor" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import { showToast } from '../toastState.js';
import { apiClient } from '../api.js';

const router = useRouter();
const user = ref(null);
const loading = ref(true);
const saving = ref(false);
const paintColor = ref(2);

// Initialize empty 7x14 grid (0 = busy, 1 = maybe, 2 = free)
const createEmptySchedule = () => Array(7).fill().map(() => Array(14).fill(0));
const createFullSchedule = () => Array(7).fill().map(() => Array(14).fill(2));

const schedule = ref(createEmptySchedule());

const clearAll = () => {
  schedule.value = createEmptySchedule();
};

const fillAll = () => {
  schedule.value = createFullSchedule();
};

onMounted(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user.value = JSON.parse(storedUser);
    fetchSchedule();
  } else {
    router.push('/');
  }
});

const fetchSchedule = async () => {
  try {
    const data = await apiClient.get(`/schedule/${user.value.id}`);
    if (data.schedule) {
      schedule.value = data.schedule;
    }
  } catch (error) {
    console.error('Fetch schedule error', error);
    showToast('獲取課表失敗，請稍後再試。', 'error');
  } finally {
    loading.value = false;
  }
};

const saveSchedule = async () => {
  saving.value = true;
  try {
    const data = await apiClient.post(`/schedule/${user.value.id}`, { schedule: schedule.value });
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
</style>
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.text-center { text-align: center; }

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  align-items: center;
}

.paint-palette-container {
  padding: 16px;
}

.paint-palette {
  display: flex;
  gap: 16px;
}

.btn-active {
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
  border-width: 2px;
}
</style>
