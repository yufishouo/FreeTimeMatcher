<template>
  <div class="container mt-8">
    <div v-if="loading" class="skeleton-grid mt-4"></div>
    
    <div v-else-if="!group" class="text-center mt-8 text-danger">
      <p>找不到群組，請確認網址是否正確。</p>
      <router-link to="/" class="btn btn-primary mt-4">回首頁</router-link>
    </div>

    <div v-else>
      <div class="header-section">
        <div>
          <div class="flex-align-center gap-2">
            <h2>{{ group.name }}</h2>
            <span class="invite-badge">邀請碼: {{ group.invite_code }}</span>
          </div>
          <p class="text-muted mt-2">群組成員: {{ members.map(m => m.username).join(', ') }}</p>
        </div>
        <div class="header-actions">
          <button @click="deleteGroup" class="btn btn-outline" style="margin-right: 12px; color: var(--danger); border-color: rgba(239, 68, 68, 0.5);">🗑️ 刪除群組</button>
          <button v-if="group.is_specific_dates" @click="showEditModal = true" class="btn btn-primary" style="margin-right: 12px;">✏️ 填寫群組課表</button>
          <button @click="refreshMatch" class="btn btn-outline" style="margin-right: 12px;">🔄 重整結果</button>
          <button @click="downloadImage" class="btn btn-outline" style="margin-right: 12px;" :disabled="downloading">📸 下載圖片</button>
          <button @click="copyRecommendations" class="btn btn-primary" style="margin-right: 12px;">📋 複製結果</button>
          <router-link to="/" class="btn btn-outline">返回列表</router-link>
        </div>
      </div>

      <!-- 系統推薦最佳開會時間 -->
      <div v-if="recommendedTimes.length > 0" class="recommendations-panel glass-panel mt-4 mb-4">
        <h3 class="mb-3 text-highlight">🏆 系統推薦最佳開會時間</h3>
        <div class="recommendation-cards">
          <div v-for="(rt, idx) in recommendedTimes" :key="idx" class="reco-card glass-panel-inner">
            <div class="reco-medal">{{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉' }}</div>
            <div class="reco-info">
              <h4>星期{{ rt.dayStr }} 第 {{ rt.periodStr }} 節</h4>
              <p :class="rt.count === members.length ? 'text-success' : 'text-warning'">{{ rt.count }} / {{ members.length }} 人有空</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 熱力圖與圖例區塊 (供截圖用) -->
      <div ref="exportContainer" class="export-wrapper" style="padding: 16px; border-radius: 12px;">
        <div class="legend glass-panel mt-4 mb-4">
          <h4>圖例說明 (共同空堂人數)</h4>
          <div class="legend-items mt-2">
            <div class="legend-item"><div class="color-box heatmap-0"></div> 0人</div>
            <div class="legend-item"><div class="color-box heatmap-1"></div> 少數</div>
            <div class="legend-item"><div class="color-box heatmap-3"></div> 一半</div>
            <div class="legend-item"><div class="color-box heatmap-4"></div> 多數</div>
            <div class="legend-item"><div class="color-box heatmap-5"></div> 全部有空！</div>
          </div>
        </div>

        <div class="mt-4">
          <!-- Pass readonly and totalMembers to ScheduleGrid, and pass heatmapData as modelValue -->
          <ScheduleGrid 
            :modelValue="heatmapData" 
            :members="members"
            readonly 
            :totalMembers="members.length"
            :highlightCells="recommendedTimes"
            :days="customDays"
          />
        </div>
      </div>

      <!-- 討論區 -->
      <div class="mt-4 chat-section glass-panel mb-8">
        <h3 class="mb-3">💬 群組討論區</h3>
        <div class="chat-messages" ref="chatContainer">
          <div v-for="msg in messages" :key="msg.id" class="message-bubble" :class="{'my-message': msg.username === currentUser.username}">
            <div class="message-sender">{{ msg.username }} <span class="message-time">{{ new Date(msg.created_at).toLocaleTimeString() }}</span></div>
            <div class="message-text">{{ msg.message }}</div>
          </div>
          <div v-if="messages.length === 0" class="text-muted text-center py-4">尚無留言，來搶頭香吧！</div>
        </div>
        <form @submit.prevent="sendMessage" class="chat-input-form mt-3">
          <input type="text" v-model="newMessage" placeholder="輸入留言..." class="input-field" required>
          <button type="submit" class="btn btn-primary" :disabled="!newMessage.trim()">傳送</button>
        </form>
      </div>
    </div>

    <!-- Edit Schedule Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content glass-panel" style="max-width: 90vw; max-height: 90vh; overflow-y: auto;">
        <div class="flex-align-center mb-4" style="justify-content: space-between;">
          <h3>✏️ 填寫專屬課表 ({{ group.name }})</h3>
          <button @click="showEditModal = false" class="btn btn-sm btn-outline">關閉</button>
        </div>
        
        <div class="paint-palette mt-2 mb-4" style="display: flex; gap: 16px;">
          <button class="btn btn-sm" :class="{'btn-primary': editPaintColor === 2}" style="background: rgba(16, 185, 129, 0.4); border-color: rgba(16, 185, 129, 0.8);" @click="editPaintColor = 2">✅ 有空</button>
          <button class="btn btn-sm" :class="{'btn-primary': editPaintColor === 1}" style="background: rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 0.8);" @click="editPaintColor = 1">⚠️ 盡量不要</button>
          <button class="btn btn-sm" :class="{'btn-primary': editPaintColor === 0}" style="background: rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.8);" @click="editPaintColor = 0">❌ 沒空</button>
        </div>

        <ScheduleGrid 
          v-model="myGroupSchedule" 
          :paintColor="editPaintColor" 
          :days="customDays"
        />

        <div class="mt-4 text-center">
          <button @click="saveGroupSchedule" class="btn btn-primary w-100" :disabled="savingSchedule" style="width: 100%;">
            {{ savingSchedule ? '儲存中...' : '儲存課表' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import html2canvas from 'html2canvas';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import { showToast } from '../toastState.js';
import { apiClient, SOCKET_URL } from '../api.js';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const group = ref(null);
const members = ref([]);
const currentUser = ref(null);
const socket = ref(null);

const messages = ref([]);
const newMessage = ref('');
const chatContainer = ref(null);

const exportContainer = ref(null);
const downloading = ref(false);

const showEditModal = ref(false);
const editPaintColor = ref(2);
const savingSchedule = ref(false);
const myGroupSchedule = ref([]);

onMounted(() => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    router.push('/');
    return;
  }
  currentUser.value = JSON.parse(storedUser);
  fetchGroupMatch();
  fetchMessages();

  // Socket.io connection
  socket.value = io(SOCKET_URL);
  socket.value.emit('join-group', route.params.id);
  
  socket.value.on('schedule-updated', () => {
    // Silently refresh match data
    fetchGroupMatch(false);
  });

  socket.value.on('new-message', (msg) => {
    messages.value.push(msg);
    scrollToBottom();
  });

  socket.value.on('group-deleted', () => {
    showToast('此群組已被解散！', 'info');
    router.push('/');
  });
});

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
});

const fetchGroupMatch = async (showLoading = true) => {
  const groupId = route.params.id;
  if (showLoading) loading.value = true;
  try {
    const data = await apiClient.get(`/groups/${groupId}/match`);
    if (data.group) {
      group.value = data.group;
      members.value = data.members;
      initMyGroupSchedule();
    }
  } catch (error) {
    console.error('Fetch group match error', error);
  } finally {
    loading.value = false;
  }
};

const deleteGroup = async () => {
  if (!confirm('確定要刪除這個群組嗎？此操作無法復原，所有成員都將失去此群組。')) return;
  
  try {
    const data = await apiClient.delete(`/groups/${route.params.id}`);
    if (data.success) {
      showToast('群組已成功刪除', 'success');
      router.push('/');
    } else {
      showToast('刪除失敗', 'error');
    }
  } catch (error) {
    showToast('刪除失敗', 'error');
  }
};

const initMyGroupSchedule = () => {
  const me = members.value.find(m => m.id === currentUser.value.id);
  if (me && me.schedule) {
    myGroupSchedule.value = me.schedule;
  } else {
    myGroupSchedule.value = Array(customDays.value.length).fill().map(() => Array(14).fill(0));
  }
};

const saveGroupSchedule = async () => {
  savingSchedule.value = true;
  try {
    const data = await apiClient.post(`/groups/${route.params.id}/schedule`, { userId: currentUser.value.id, schedule: myGroupSchedule.value });
    if (data.success) {
      showToast('群組專屬課表已儲存', 'success');
      showEditModal.value = false;
      fetchGroupMatch();
    }
  } catch (error) {
    showToast('儲存失敗', 'error');
  } finally {
    savingSchedule.value = false;
  }
};

const fetchMessages = async () => {
  try {
    const data = await apiClient.get(`/groups/${route.params.id}/messages`);
    if (data.messages) {
      messages.value = data.messages;
      scrollToBottom();
    }
  } catch (error) {
    console.error('Fetch messages error', error);
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  try {
    await apiClient.post(`/groups/${route.params.id}/messages`, { userId: currentUser.value.id, message: newMessage.value.trim() });
    newMessage.value = '';
  } catch (error) {
    showToast('留言傳送失敗', 'error');
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const refreshMatch = () => {
  fetchGroupMatch();
};

const customDays = computed(() => {
  if (!group.value || !group.value.is_specific_dates) return ['一', '二', '三', '四', '五', '六', '日'];
  const start = new Date(group.value.start_date);
  const end = new Date(group.value.end_date);
  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  const arr = [];
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayStr = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    arr.push(`${d.getMonth() + 1}/${d.getDate()} (${dayStr})`);
  }
  return arr;
});

// Compute heatmap data: dynamic length x14 array
const heatmapData = computed(() => {
  const result = Array(customDays.value.length).fill().map(() => Array(14).fill(0));
  
  if (!members.value.length) return result;

  members.value.forEach(member => {
    if (member.schedule) {
      for (let day = 0; day < customDays.value.length; day++) {
        for (let period = 0; period < 14; period++) {
          const state = member.schedule[day]?.[period];
          if (state === 2) {
            result[day][period] += 1;
          } else if (state === 1) {
            result[day][period] += 0.5;
          }
        }
      }
    }
  });
  
  return result;
});

const periods = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

// 智慧空堂推薦演算法：掃描熱力圖並選出前三名
const recommendedTimes = computed(() => {
  if (!members.value.length) return [];
  const times = [];
  for (let d = 0; d < customDays.value.length; d++) {
    for (let p = 0; p < 14; p++) {
      const count = heatmapData.value[d][p];
      if (count > 0) {
        times.push({
          day: d,
          period: p,
          count: count,
          dayStr: customDays.value[d],
          periodStr: periods[p]
        });
      }
    }
  }
  // 依據有空人數由大到小排序
  times.sort((a, b) => b.count - a.count);
  return times.slice(0, 3);
});

// 一鍵複製結果
const copyRecommendations = () => {
  if (recommendedTimes.value.length === 0) {
    showToast('目前沒有推薦的空堂時段！', 'info');
    return;
  }
  let text = `【${group.value.name}】最佳開會時間推薦：\n\n`;
  recommendedTimes.value.forEach((rt, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    text += `${medal} 星期${rt.dayStr} 第 ${rt.periodStr} 節 (${rt.count}/${members.value.length}人有空)\n`;
  });
  text += `\n✨ 使用 FreeTimeMatcher 快速媒合空堂！`;
  navigator.clipboard.writeText(text);
  showToast('推薦結果已複製到剪貼簿！', 'success');
};

const downloadImage = async () => {
  if (!exportContainer.value) return;
  downloading.value = true;
  showToast('產生圖片中...', 'info');
  try {
    const canvas = await html2canvas(exportContainer.value, {
      backgroundColor: '#0f172a', // Dark theme background
      scale: 2 // High resolution
    });
    const link = document.createElement('a');
    link.download = `${group.value.name}_開會時間.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('下載成功！', 'success');
  } catch (err) {
    console.error('Download image error:', err);
    showToast('下載圖片失敗', 'error');
  } finally {
    downloading.value = false;
  }
};
</script>

<style scoped>
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.mb-4 { margin-bottom: 16px; }
.text-center { text-align: center; }
.text-danger { color: var(--danger); }
.gap-2 { gap: 8px; }

.flex-align-center {
  display: flex;
  align-items: center;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.invite-badge {
  background: rgba(99, 102, 241, 0.2);
  color: var(--primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: monospace;
}

.legend {
  padding: 16px;
}

.legend-items {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.color-box {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
}

.heatmap-0 { background: rgba(0,0,0,0.2); }
.heatmap-1 { background: rgba(99, 102, 241, 0.2); }
.heatmap-3 { background: rgba(99, 102, 241, 0.6); }
.heatmap-4 { background: rgba(99, 102, 241, 0.8); }
.heatmap-5 { 
  background: var(--success);
  box-shadow: inset 0 0 10px rgba(255,255,255,0.5);
}

.header-actions {
  display: flex;
  align-items: center;
}

.text-highlight { color: var(--primary); }
.text-success { color: var(--success); font-weight: bold; }
.text-warning { color: #f59e0b; font-weight: bold; }

.recommendations-panel {
  padding: 20px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.recommendation-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.reco-card {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.reco-medal {
  font-size: 2rem;
}

.reco-info h4 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
}

.reco-info p {
  margin: 0;
  font-size: 0.9rem;
}

/* Chat styles */
.chat-section {
  padding: 20px;
}

.chat-messages {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-bubble {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 80%;
  align-self: flex-start;
  border: 1px solid rgba(255,255,255,0.05);
}

.message-bubble.my-message {
  align-self: flex-end;
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
}

.message-sender {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.my-message .message-sender {
  text-align: right;
  color: var(--primary);
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-left: 8px;
}

.message-text {
  font-size: 0.95rem;
  line-height: 1.4;
}

.chat-input-form {
  display: flex;
  gap: 12px;
}

.chat-input-form .input-field {
  flex: 1;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--bg-color);
  padding: 24px;
  border-radius: 12px;
  width: 90%; max-width: 900px;
}
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.mb-8 { margin-bottom: 32px; }
</style>
