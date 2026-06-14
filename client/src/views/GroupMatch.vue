<template>
  <div class="container mt-8">
    <div v-if="loading" class="skeleton-grid mt-4"></div>
    
    <div v-else-if="!group" class="text-center mt-8 text-danger">
      <p>找不到群組，請確認網址是否正確。</p>
      <router-link to="/" class="btn btn-primary mt-4">回首頁</router-link>
    </div>

    <div v-else>
      <div class="group-header glass-panel mb-4" style="padding: 24px;">
        <div class="header-top" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 24px;">
          
          <div class="title-area" style="flex: 1 1 300px;">
            <div class="flex-align-center gap-2" style="flex-wrap: wrap; margin-bottom: 12px;">
              <h2 class="group-title">{{ group.name }}</h2>
              <span class="invite-badge">邀請碼: {{ group.invite_code }}</span>
            </div>
            <div class="member-list" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <div v-for="m in members" :key="m.id" class="member-tag glass-panel-inner" @click="showMemberInfo(m)" style="cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 20px;">
                <img v-if="m.avatar_style === 'custom' && m.avatar_url" :src="m.avatar_url" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                <img v-else :src="`https://api.dicebear.com/9.x/${m.avatar_style === 'custom' ? 'notionists' : m.avatar_style || 'notionists'}/svg?seed=${m.login_username || m.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                <span class="member-name">{{ m.username }}</span>
                <span v-if="m.id === group.creator_id" title="管理員">👑</span>
                <span v-else-if="m.role === 'subadmin'" title="副管理員">🛡️</span>
                <template v-if="isAdmin">
                  <select v-model="m.weight" @click.stop @change="changeWeight(m.id, m.weight)" class="mini-select">
                    <option :value="1">權重 1</option>
                    <option :value="2">權重 2</option>
                    <option :value="5">權重 5</option>
                    <option :value="10">權重 10</option>
                  </select>
                  <select v-if="isCreator && m.id !== group.creator_id" @click.stop v-model="m.role" @change="toggleRole(m)" class="mini-select">
                    <option value="member">一般成員</option>
                    <option value="subadmin">副管理員</option>
                  </select>
                  <button v-if="isCreator && m.id !== currentUser.id" @click.stop="kickMember(m.id)" class="kick-btn" title="移除成員">✖</button>
                </template>
                <template v-else-if="m.weight > 1">
                  <span class="text-warning weight-display">(權重: {{ m.weight }})</span>
                </template>
              </div>
            </div>
          </div>

          <div class="header-actions" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: flex-end; flex: 1 1 400px;">
            <button v-if="isCreator" @click="deleteGroup" class="btn btn-outline" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.5); white-space: nowrap;">🗑️ 刪除群組</button>
            <button v-else @click="leaveGroup" class="btn btn-outline" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.5); white-space: nowrap;">🚪 退出群組</button>
            <button @click="showEditModal = true" class="btn btn-primary" style="white-space: nowrap; box-shadow: 0 0 15px rgba(99,102,241,0.5);">✏️ 填寫群組課表</button>
            <button @click="refreshMatch" class="btn btn-outline" style="white-space: nowrap;">🔄 重整</button>
            <button @click="copyInviteLink" class="btn btn-outline" style="white-space: nowrap;">🔗 邀請</button>
            <button @click="downloadImage" class="btn btn-outline" :disabled="downloading" style="white-space: nowrap;">📸 截圖</button>
            <button @click="copyRecommendations" class="btn btn-primary" style="white-space: nowrap;">📋 複製</button>
            <router-link to="/" class="btn btn-outline" style="white-space: nowrap;">返回</router-link>
          </div>
          
        </div>
      </div>
      <!-- 群組公告 -->
      <div v-if="group.announcement || isAdmin" class="announcement-panel glass-panel mt-4 mb-4">
        <div class="announcement-header">
          <h3>📢 群組公告</h3>
          <button v-if="isAdmin && !editingAnnouncement" @click="startEditAnnouncement" class="btn btn-sm btn-outline">✏️ 編輯</button>
          <div v-if="isAdmin && editingAnnouncement" style="display: flex; gap: 8px;">
            <button @click="saveAnnouncement" class="btn btn-sm btn-primary" :disabled="savingAnnouncement">💾 儲存</button>
            <button @click="cancelEditAnnouncement" class="btn btn-sm btn-outline">取消</button>
          </div>
        </div>
        <div v-if="editingAnnouncement" class="mt-2">
          <textarea v-model="announcementDraft" class="input-field announcement-textarea" placeholder="輸入公告內容（最多 200 字）" maxlength="200" rows="3"></textarea>
          <div class="text-muted" style="text-align: right; font-size: 0.8rem; margin-top: 4px;">{{ announcementDraft.length }} / 200</div>
        </div>
        <div v-else-if="group.announcement" class="announcement-content mt-2">
          {{ group.announcement }}
        </div>
        <div v-else class="text-muted mt-2" style="font-style: italic;">
          尚未設定公告，點擊「編輯」來新增一條群組公告吧！
        </div>
      </div>

      <!-- 系統推薦最佳開會時間 -->
      <div v-if="recommendedTimes.length > 0" class="recommendations-panel glass-panel mt-4 mb-4">
        <h3 class="mb-3 text-highlight">🏆 智慧分析：最佳集會時段推薦</h3>
        <div class="recommendation-cards">
          <div v-for="(rt, idx) in recommendedTimes" :key="idx" class="reco-card glass-panel-inner" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 16px; align-items: center;">
              <div class="reco-medal">{{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️' }}</div>
              <div class="reco-info">
                <h4>{{ group.is_specific_dates ? rt.dayStr : '星期' + rt.dayStr }} 第 {{ rt.periodStr }} 節</h4>
                <p :class="rt.count >= totalWeight ? 'text-success' : 'text-warning'">綜合契合度分數 {{ rt.count }} / {{ totalWeight }}</p>
              </div>
            </div>
            <button @click="createPoll(rt)" class="btn btn-sm btn-primary" style="white-space: nowrap; flex-shrink: 0;">發起投票</button>
          </div>
        </div>
      </div>

      <!-- 熱力圖與圖例區塊 (供截圖用) -->
      <div ref="exportContainer" class="export-wrapper" style="padding: 16px; border-radius: 12px;">
        <div class="legend glass-panel mt-4 mb-4">
          <h4>🔥 空堂熱力圖例 (共同空閒狀態)</h4>
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
            :totalMembers="totalWeight"
            :highlightCells="recommendedTimes"
            :days="customDays"
            @create-poll="createPoll"
          />
        </div>
      </div>

      <!-- 討論區 -->
      <div class="mt-4 chat-section glass-panel mb-8">
        <h3 class="mb-3">💬 群組討論區</h3>
        <div class="chat-messages" ref="chatContainer" @scroll="handleChatScroll">
          <div v-for="msg in messages" :key="msg.id" class="message-bubble" :class="{'my-message': msg.login_username === currentUser.username}">
            <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 4px;">
              <img v-if="msg.avatar_style === 'custom' && msg.avatar_url" :src="msg.avatar_url" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); object-fit: cover;" />
              <img v-else :src="`https://api.dicebear.com/9.x/${msg.avatar_style === 'custom' ? 'notionists' : msg.avatar_style || 'notionists'}/svg?seed=${msg.login_username}&backgroundColor=b6e3f4,c0aede,d1d4f9`" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); object-fit: cover;" />
              <div style="flex: 1;">
                <div class="message-sender">{{ msg.username }} <span class="message-time">{{ new Date(msg.created_at).toLocaleTimeString() }}</span></div>
                <div class="message-text">{{ msg.message }}</div>
                
                <div v-if="msg.type === 'poll'" class="poll-container mt-2" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                  <div v-for="(opt, oIdx) in (msg.parsedPayload?.options || [])" :key="oIdx" class="poll-option mb-2">
                    <button @click="votePoll(msg.id, oIdx)" class="btn btn-sm" style="width: 100%; text-align: left; display: flex; justify-content: space-between;" :class="(opt.voters || []).includes(currentUser.id) ? 'btn-primary' : 'btn-outline'">
                      <span>{{ opt.text }}</span>
                      <span>{{ (opt.voters || []).length }} 票</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="messages.length === 0" class="text-muted text-center py-4">尚無留言，來搶頭香吧！</div>
        </div>
        <button v-if="hasNewMessages" @click="scrollToBottomAndClear" class="new-msg-indicator">
          ⬇️ 有新訊息
        </button>
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
          <button class="btn paint-btn free" :class="{'active': editPaintColor === 2}" @click="editPaintColor = 2">✅ 有空</button>
          <button class="btn paint-btn warn" :class="{'active': editPaintColor === 1}" @click="editPaintColor = 1">⚠️ 盡量不要</button>
          <button class="btn paint-btn busy" :class="{'active': editPaintColor === 0}" @click="editPaintColor = 0">❌ 沒空</button>
        </div>

        <div class="quick-actions mb-4" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button @click="quickFillWeekend" class="btn btn-sm btn-outline" style="font-size: 0.8rem;">📅 週末全標沒空</button>
          <button @click="quickFillEvening" class="btn btn-sm btn-outline" style="font-size: 0.8rem;">🌙 晚上全標沒空</button>
          <button @click="quickClearAll" class="btn btn-sm btn-outline" style="font-size: 0.8rem;">🔄 全部清除</button>
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
    <!-- 成員資訊彈窗 -->
    <div v-if="selectedMember" class="modal-overlay" @click.self="selectedMember = null">
      <div class="modal-content glass-panel" style="max-width: 400px; text-align: center;">
        <div class="modal-header mb-4">
          <h3>👤 成員資訊</h3>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <img v-if="selectedMember.avatar_style === 'custom' && selectedMember.avatar_url" :src="selectedMember.avatar_url" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--primary); object-fit: cover;" />
          <img v-else :src="`https://api.dicebear.com/9.x/${selectedMember.avatar_style === 'custom' ? 'notionists' : selectedMember.avatar_style || 'notionists'}/svg?seed=${selectedMember.login_username || selectedMember.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--primary); object-fit: cover;" />
          <h2 style="margin: 0;">{{ selectedMember.username }}</h2>
          <p v-if="selectedMember.status_message" style="color: var(--text-muted); font-style: italic;">"{{ selectedMember.status_message }}"</p>
          
          <div style="width: 100%; text-align: left; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; margin-top: 8px;">
            <p v-if="selectedMember.contact_line"><strong>LINE:</strong> {{ selectedMember.contact_line }}</p>
            <p v-if="selectedMember.contact_discord"><strong>Discord:</strong> {{ selectedMember.contact_discord }}</p>
            <p v-if="selectedMember.contact_ig"><strong>IG:</strong> {{ selectedMember.contact_ig }}</p>
            <p v-if="!selectedMember.contact_line && !selectedMember.contact_discord && !selectedMember.contact_ig" style="color: var(--text-muted);">此成員尚未設定聯絡方式</p>
          </div>
        </div>
        <div class="modal-footer" style="margin-top: 16px;">
          <button class="btn btn-outline w-full" @click="selectedMember = null">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import html2canvas from 'html2canvas';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import { showToast } from '../toastState.js';
import { apiClient, SOCKET_URL } from '../api.js';

const route = useRoute();
const router = useRouter();

const groupId = route.params.id;
const currentUser = ref(null);
const group = ref(null);
const members = ref([]);
const loading = ref(true);
const socket = ref(null);
const selectedMember = ref(null);

const showMemberInfo = (member) => {
  selectedMember.value = member;
};

const isCreator = computed(() => {
  return group.value && currentUser.value && group.value.creator_id === currentUser.value.id;
});

const myRole = computed(() => {
  if (!currentUser.value) return 'member';
  const me = members.value.find(m => m.id === currentUser.value.id);
  return me ? me.role : 'member';
});

const isSubAdmin = computed(() => myRole.value === 'subadmin');
const isAdmin = computed(() => isCreator.value || isSubAdmin.value);

const totalWeight = computed(() => {
  return members.value.reduce((sum, m) => sum + (m.weight || 1), 0);
});

const messages = ref([]);
const newMessage = ref('');
const chatContainer = ref(null);
const hasNewMessages = ref(false);

const exportContainer = ref(null);
const downloading = ref(false);

const editingAnnouncement = ref(false);
const announcementDraft = ref('');
const savingAnnouncement = ref(false);

const showEditModal = ref(false);
const editPaintColor = ref(2);
const savingSchedule = ref(false);
const myGroupSchedule = ref([]);

// Modal 開啟時鎖定背景滾動 + Escape 關閉
watch(showEditModal, (val) => {
  document.body.style.overflow = val ? 'hidden' : '';
});

const handleEscKey = (e) => {
  if (e.key === 'Escape') {
    if (showEditModal.value) showEditModal.value = false;
    if (selectedMember.value) selectedMember.value = null;
  }
};

onMounted(() => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser || storedUser === 'undefined') {
    router.push('/');
    return;
  }
  try {
    currentUser.value = JSON.parse(storedUser);
  } catch(e) {
    router.push('/');
    return;
  }
  fetchGroupMatch();
  fetchMessages();

  window.addEventListener('keydown', handleEscKey);

  // Socket.io connection
  socket.value = io(SOCKET_URL);
  socket.value.emit('join-group', route.params.id);
  
  socket.value.on('schedule-updated', () => {
    fetchGroupMatch(false);
  });

  socket.value.on('new-message', (msg) => {
    if (msg.type === 'poll') {
      try { msg.parsedPayload = JSON.parse(msg.payload); } catch(e) {}
    }
    messages.value.push(msg);
    if (isUserAtBottom()) {
      scrollToBottom();
    } else {
      hasNewMessages.value = true;
    }
    
    if (msg.login_username !== currentUser.value?.username) {
      playNotificationSound();
    }
  });
  
  socket.value.on('poll-updated', ({ messageId, payload }) => {
    const msg = messages.value.find(m => m.id === messageId);
    if (msg) {
      msg.payload = payload;
      try { msg.parsedPayload = JSON.parse(payload); } catch(e) {}
    }
  });

  socket.value.on('member-kicked', (kickedUserId) => {
    if (kickedUserId === currentUser.value.id) {
      showToast('您已被管理員移除群組', 'error');
      router.push('/');
    } else {
      fetchGroupMatch();
    }
  });

  socket.value.on('weight-updated', () => {
    fetchGroupMatch();
  });

  socket.value.on('role-updated', () => {
    fetchGroupMatch();
  });

  socket.value.on('announcement-updated', (newAnnouncement) => {
    if (group.value) {
      group.value.announcement = newAnnouncement;
    }
  });

  socket.value.on('group-deleted', () => {
    showToast('此群組已被解散！', 'info');
    router.push('/');
  });
});

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
  window.removeEventListener('keydown', handleEscKey);
  document.body.style.overflow = '';
});

// --- Announcement Functions ---
const startEditAnnouncement = () => {
  announcementDraft.value = group.value?.announcement || '';
  editingAnnouncement.value = true;
};

const cancelEditAnnouncement = () => {
  editingAnnouncement.value = false;
  announcementDraft.value = '';
};

const saveAnnouncement = async () => {
  savingAnnouncement.value = true;
  try {
    const data = await apiClient.put(`/groups/${route.params.id}/announcement`, {
      userId: currentUser.value.id,
      announcement: announcementDraft.value.trim()
    });
    if (data.success) {
      group.value.announcement = announcementDraft.value.trim();
      editingAnnouncement.value = false;
      showToast(announcementDraft.value.trim() ? '公告已更新！' : '公告已清除', 'success');
    } else {
      showToast(data.error || '更新失敗', 'error');
    }
  } catch(e) {
    showToast('更新公告失敗', 'error');
  } finally {
    savingAnnouncement.value = false;
  }
};

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
    const data = await apiClient.delete(`/groups/${route.params.id}`, { userId: currentUser.value.id });
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

const leaveGroup = async () => {
  if (!confirm('確定要退出這個群組嗎？此操作無法復原。')) return;
  try {
    await apiClient.delete(`/groups/${route.params.id}/members/${currentUser.value.id}`, { userId: currentUser.value.id });
    showToast('您已退出群組', 'success');
    router.push('/');
  } catch (error) {
    showToast('退出群組失敗', 'error');
  }
};

const kickMember = async (memberId) => {
  if (!confirm('確定要移除該成員嗎？')) return;
  try {
    const data = await apiClient.delete(`/groups/${route.params.id}/members/${memberId}`, { userId: currentUser.value.id });
    if (data && data.error) throw new Error(data.error);
    showToast('成員已成功移除', 'success');
    fetchGroupMatch();
  } catch (e) {
    showToast(e.message || '無法移除該成員，請稍後再試', 'error');
  }
};

// --- Quick Schedule Fill ---
const quickFillWeekend = () => {
  const newSchedule = myGroupSchedule.value.map((day, idx) => [...day]);
  const days = customDays.value;
  for (let d = 0; d < days.length; d++) {
    const dayLabel = days[d];
    // 判斷是否為週末：純星期模式看「六」「日」，日期模式看括號中的星期
    const isWeekend = dayLabel === '六' || dayLabel === '日' || dayLabel.includes('(六)') || dayLabel.includes('(日)');
    if (isWeekend) {
      for (let p = 0; p < 14; p++) {
        newSchedule[d][p] = 0;
      }
    }
  }
  myGroupSchedule.value = newSchedule;
  showToast('已將週末全部標記為沒空', 'success');
};

const quickFillEvening = () => {
  const newSchedule = myGroupSchedule.value.map(day => [...day]);
  for (let d = 0; d < newSchedule.length; d++) {
    for (let p = 9; p < 14; p++) { // 第 10~14 節 (index 9~13)
      newSchedule[d][p] = 0;
    }
  }
  myGroupSchedule.value = newSchedule;
  showToast('已將每天第 10-14 節標記為沒空', 'success');
};

const quickClearAll = () => {
  myGroupSchedule.value = Array(customDays.value.length).fill().map(() => Array(14).fill(0));
  showToast('已清除全部課表', 'info');
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio context errors
  }
};

const changeWeight = async (memberId, newWeight) => {
  try {
    const data = await apiClient.put(`/groups/${group.value.id}/members/${memberId}/weight`, { 
      userId: currentUser.value.id,
      weight: newWeight
    });
    if (data && data.error) throw new Error(data.error);
  } catch (err) {
    showToast(err.message || '更改權重失敗', 'error');
  }
};

const toggleRole = async (member) => {
  try {
    const data = await apiClient.put(`/groups/${group.value.id}/members/${member.id}/role`, {
      userId: currentUser.value.id,
      role: member.role
    });
    if (data && data.error) throw new Error(data.error);
    showToast(`已將 ${member.username} 設為${member.role === 'subadmin' ? '副管理員' : '一般成員'}`, 'success');
  } catch (err) {
    console.error('Role update error:', err);
    showToast(err.message || '更改身分失敗', 'error');
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
      messages.value = data.messages.map(m => {
        if (m.type === 'poll') {
          try { m.parsedPayload = JSON.parse(m.payload); } catch(e) {}
        }
        return m;
      });
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

const createPoll = async (rt) => {
  const dayLabel = group.value.is_specific_dates ? rt.dayStr : `星期${rt.dayStr}`;
  const pollData = {
    options: [
      { text: `${dayLabel} 第 ${rt.periodStr} 節 好嗎？`, voters: [] },
      { text: `我沒空 / 時間不行`, voters: [] }
    ]
  };
  try {
    await apiClient.post(`/groups/${route.params.id}/messages`, {
      userId: currentUser.value.id,
      message: `發起了開會時間投票：${dayLabel} 第 ${rt.periodStr} 節`,
      type: 'poll',
      payload: JSON.stringify(pollData)
    });
    showToast('已發起投票', 'success');
  } catch(e) {
    showToast('發起投票失敗', 'error');
  }
};

const votePoll = async (messageId, optionIndex) => {
  try {
    await apiClient.post(`/messages/${messageId}/vote`, {
      userId: currentUser.value.id,
      optionIndex
    });
  } catch (e) {
    showToast('投票失敗', 'error');
  }
};

const isUserAtBottom = () => {
  if (!chatContainer.value) return true;
  const el = chatContainer.value;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
};

const handleChatScroll = () => {
  if (isUserAtBottom()) {
    hasNewMessages.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const scrollToBottomAndClear = () => {
  hasNewMessages.value = false;
  scrollToBottom();
};

const refreshMatch = () => {
  fetchGroupMatch();
};

const customDays = computed(() => {
  if (!group.value || !group.value.is_specific_dates) return ['一', '二', '三', '四', '五', '六', '日'];
  const [sy, sm, sd] = group.value.start_date.split('-');
  const [ey, em, ed] = group.value.end_date.split('-');
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

// Compute heatmap data: dynamic length x14 array
const heatmapData = computed(() => {
  const result = Array(customDays.value.length).fill().map(() => Array(14).fill(0));
  
  if (!members.value.length) return result;

  members.value.forEach(member => {
    const weight = member.weight || 1;
    if (member.schedule) {
      for (let day = 0; day < customDays.value.length; day++) {
        for (let period = 0; period < 14; period++) {
          const state = member.schedule[day]?.[period];
          if (state === 2) {
            result[day][period] += weight;
          } else if (state === 1) {
            result[day][period] += (weight * 0.5);
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
const copyRecommendations = async () => {
  if (recommendedTimes.value.length === 0) {
    showToast('目前沒有推薦的空堂時段！', 'info');
    return;
  }
  let text = `【${group.value.name}】最佳開會時間推薦：\n\n`;
  recommendedTimes.value.forEach((rt, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️';
    text += `${medal} 星期${rt.dayStr} 第 ${rt.periodStr} 節 (權重分數 ${rt.count}/${totalWeight.value})\n`;
  });
  text += `\n✨ 使用 FreeTimeMatcher 快速媒合空堂！`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('推薦結果已複製到剪貼簿！', 'success');
  } catch(e) {
    showToast('瀏覽器不支援複製，請手動框選', 'error');
  }
};

const copyInviteLink = async () => {
  const url = `${window.location.origin}/join/${group.value.invite_code}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('專屬邀請連結已複製！快貼給朋友吧', 'success');
  } catch(e) {
    showToast('複製失敗，請直接複製上方網址列', 'error');
  }
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

.announcement-panel {
  padding: 20px;
  border-left: 4px solid var(--primary);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.03));
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.announcement-header h3 {
  margin: 0;
}

.announcement-content {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}

.announcement-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: 'Outfit', sans-serif;
}

.group-title {
  margin: 0;
  font-size: 2.5rem;
  background: linear-gradient(135deg, var(--text-main), var(--primary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: normal;
  line-height: 1.2;
  word-break: break-word;
}

.flex-align-center {
  display: flex;
  align-items: center;
}

.member-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.member-tag:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.member-name {
  font-weight: 600;
  color: var(--text-main);
}

.mini-select {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-select:hover {
  border-color: var(--primary);
}

.mini-select option {
  color: var(--text-main);
  background: var(--mesh-1);
}

.kick-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--danger);
  font-size: 1rem;
  margin-left: 4px;
  transition: transform 0.2s, filter 0.2s;
}

.kick-btn:hover {
  transform: scale(1.2);
  filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.5));
}

.weight-display {
  font-size: 0.8rem;
  margin-left: 4px;
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
  background: rgba(128, 128, 128, 0.1);
  border-radius: 8px;
  border: 1px solid var(--glass-border);
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
  position: relative;
}

.new-msg-indicator {
  display: block;
  margin: 8px auto 0;
  padding: 6px 20px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  animation: bounceIn 0.3s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.new-msg-indicator:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
}

@keyframes bounceIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
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
  background: var(--glass-bg);
  padding: 12px 16px;
  border-radius: 18px 18px 18px 4px;
  max-width: 80%;
  align-self: flex-start;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
}

.message-bubble.my-message {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2));
  border-color: rgba(236, 72, 153, 0.3);
  border-radius: 18px 18px 4px 18px;
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
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.modal-content {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  border-radius: 16px;
  width: 90%; max-width: 900px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
}
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.mb-8 { margin-bottom: 32px; }

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .group-title {
    font-size: 1.8rem;
  }
  .header-actions {
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start !important;
  }
  .header-actions .btn {
    flex: 1 1 45%;
    padding: 8px;
    font-size: 0.85rem;
    justify-content: center;
  }
  .reco-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .reco-card button {
    width: 100%;
  }
  .legend-items {
    gap: 8px;
  }
  .legend-item {
    font-size: 0.75rem;
  }
  .export-wrapper {
    padding: 8px;
  }
}
</style>
