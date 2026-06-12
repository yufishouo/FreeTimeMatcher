<template>
  <div class="schedule-grid">
    <!-- Header Row (Days) -->
    <div class="grid-header">
      <div class="time-col-header">節次</div>
      <div v-for="(day, dayIdx) in days" :key="day" class="day-header" @click="!readonly && toggleDay(dayIdx)" :class="{'clickable': !readonly}">
        {{ day }}
      </div>
    </div>
    
    <!-- Time Slots -->
    <div v-for="period in periods" :key="period" class="grid-row">
      <div class="time-col">{{ period }}</div>
      
      <div 
        v-for="(day, dayIdx) in days" 
        :key="`${dayIdx}-${period}`"
        class="grid-cell"
        :class="{
          [`is-free-${gridData[dayIdx][parseInt(period) - 1].val}`]: !readonly,
          'is-heatmap': readonly,
          'is-selected': selectedCell && selectedCell.dayIdx === dayIdx && selectedCell.periodIdx === parseInt(period) - 1,
          [`heatmap-${gridData[dayIdx][parseInt(period) - 1].heatmapLevel}`]: readonly
        }"
        @mousedown.prevent="handleMouseDown(dayIdx, parseInt(period) - 1)"
        @mouseenter.prevent="handleMouseEnter(dayIdx, parseInt(period) - 1)"
      >
        <span v-if="readonly && gridData[dayIdx][parseInt(period) - 1].count > 0" class="heatmap-count">
          <span v-if="isHighlighted(dayIdx, parseInt(period) - 1)" class="crown-icon" title="系統推薦最佳時間">👑</span>
          <span v-else>{{ gridData[dayIdx][parseInt(period) - 1].count }}</span>
        </span>
      </div>
    </div>
    
    <!-- Selected Cell Detail Box (只在 readonly 模式顯示) -->
    <div v-if="readonly && selectedCell" class="cell-detail-card mt-4 glass-panel">
      <h4>📌 星期{{ days[selectedCell.dayIdx] }} 第 {{ selectedCell.periodIdx + 1 }} 節 - 共同空堂名單</h4>
      <div class="members-status mt-3">
        <div class="free-list">
          <h5 class="text-success">✅ 有空 ({{ selectedCell.freeMembers.length }})</h5>
          <p>{{ selectedCell.freeMembers.join(', ') || '無' }}</p>
        </div>
        <div class="maybe-list">
          <h5>⚠️ 盡量不要 ({{ selectedCell.maybeMembers.length }})</h5>
          <p>{{ selectedCell.maybeMembers.join(', ') || '無' }}</p>
        </div>
        <div class="busy-list">
          <h5 class="text-danger">❌ 沒空 ({{ selectedCell.busyMembers.length }})</h5>
          <p>{{ selectedCell.busyMembers.join(', ') || '無' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  readonly: {
    type: Boolean,
    default: false
  },
  totalMembers: {
    type: Number,
    default: 1
  },
  members: {
    type: Array,
    default: () => []
  },
  highlightCells: {
    type: Array,
    default: () => []
  },
  paintColor: {
    type: Number,
    default: 2
  },
  days: {
    type: Array,
    default: () => ['一', '二', '三', '四', '五', '六', '日']
  }
});

const emit = defineEmits(['update:modelValue']);

const periods = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

const isHighlighted = (dayIdx, periodIdx) => {
  return props.highlightCells.some(cell => cell.day === dayIdx && cell.period === periodIdx);
};

// 優化：使用 computed 預處理所有的格子資料，避免在 Template 呼叫 function 導致渲染卡頓
const gridData = computed(() => {
  const result = [];
  for (let d = 0; d < props.days.length; d++) {
    const dayData = [];
    for (let p = 0; p < 14; p++) {
      const val = props.modelValue[d]?.[p] || 0;
      let heatmapLevel = 0;
      
      // 計算熱力圖層級
      if (props.readonly && props.totalMembers > 0 && val > 0) {
        const ratio = val / props.totalMembers;
        if (ratio >= 1) heatmapLevel = 5;
        else if (ratio >= 0.8) heatmapLevel = 4;
        else if (ratio >= 0.5) heatmapLevel = 3;
        else if (ratio >= 0.2) heatmapLevel = 2;
        else heatmapLevel = 1;
      }
      
      dayData.push({
        val,
        count: val,
        heatmapLevel
      });
    }
    result.push(dayData);
  }
  return result;
});

const isDragging = ref(false);
const dragMode = ref(1);

const handleMouseDown = (dayIdx, periodIdx) => {
  if (props.readonly) {
    handleCellClick(dayIdx, periodIdx);
    return;
  }
  isDragging.value = true;
  dragMode.value = props.paintColor;
  setCell(dayIdx, periodIdx, dragMode.value);
};

const handleMouseEnter = (dayIdx, periodIdx) => {
  if (isDragging.value && !props.readonly) {
    setCell(dayIdx, periodIdx, dragMode.value);
  }
};

const stopDragging = () => {
  isDragging.value = false;
};

onMounted(() => {
  window.addEventListener('mouseup', stopDragging);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', stopDragging);
});

const setCell = (dayIdx, periodIdx, val) => {
  if (props.modelValue[dayIdx][periodIdx] === val) return;
  const newSchedule = [...props.modelValue];
  newSchedule[dayIdx] = [...newSchedule[dayIdx]];
  newSchedule[dayIdx][periodIdx] = val;
  emit('update:modelValue', newSchedule);
};

// 整日快速切換 (Quick Fill)
const toggleDay = (dayIdx) => {
  const newSchedule = [...props.modelValue];
  newSchedule[dayIdx] = [...newSchedule[dayIdx]];
  
  const allTargetColor = newSchedule[dayIdx].every(v => v === props.paintColor);
  const targetVal = allTargetColor ? 0 : props.paintColor;
  
  for (let p = 0; p < 14; p++) {
    newSchedule[dayIdx][p] = targetVal;
  }
  emit('update:modelValue', newSchedule);
};

const selectedCell = ref(null);

const handleCellClick = (dayIdx, periodIdx) => {
  if (props.readonly) {
    if (selectedCell.value?.dayIdx === dayIdx && selectedCell.value?.periodIdx === periodIdx) {
      selectedCell.value = null;
    } else {
      const freeMembers = props.members.filter(m => m.schedule?.[dayIdx]?.[periodIdx] === 2).map(m => m.username);
      const maybeMembers = props.members.filter(m => m.schedule?.[dayIdx]?.[periodIdx] === 1).map(m => m.username);
      const busyMembers = props.members.filter(m => !m.schedule?.[dayIdx]?.[periodIdx] || m.schedule?.[dayIdx]?.[periodIdx] === 0).map(m => m.username);
      selectedCell.value = {
        dayIdx,
        periodIdx,
        freeMembers,
        maybeMembers,
        busyMembers
      };
    }
  }
};
</script>

<style scoped>
.schedule-grid {
  display: flex;
  flex-direction: column;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  overflow-x: auto;
  touch-action: none;
}

.grid-header, .grid-row {
  display: flex;
  width: 100%;
  min-width: 700px; /* 確保在手機螢幕上不會擠成一團，允許橫向滑動 */
}

.grid-header {
  background: rgba(0,0,0,0.3);
  font-weight: 600;
}

.grid-row:not(:last-child) {
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.time-col-header, .time-col {
  width: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  border-right: 1px solid rgba(255,255,255,0.05);
  font-size: 0.875rem;
  color: var(--text-muted);
}

.time-col {
  height: 40px;
}

.day-header {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-right: 1px solid rgba(255,255,255,0.05);
  transition: background 0.2s;
}

.day-header.clickable {
  cursor: pointer;
}

.day-header.clickable:hover {
  background: rgba(255,255,255,0.1);
}

.grid-cell {
  flex: 1;
  height: 40px;
  border-right: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1); /* Default Busy (Red tint) */
  user-select: none;
}

.grid-cell:not(.is-heatmap):hover {
  background: rgba(255,255,255,0.1);
}

.grid-cell.is-free-2:not(.is-heatmap) {
  background: rgba(16, 185, 129, 0.4); /* Free (Green) */
}

.grid-cell.is-free-2:not(.is-heatmap):hover {
  background: rgba(16, 185, 129, 0.6);
}

.grid-cell.is-free-1:not(.is-heatmap) {
  background: rgba(245, 158, 11, 0.4); /* Maybe (Yellow) */
}

.grid-cell.is-free-1:not(.is-heatmap):hover {
  background: rgba(245, 158, 11, 0.6);
}

.grid-cell.is-free-0:not(.is-heatmap) {
  background: rgba(239, 68, 68, 0.1); /* Busy (Red tint) */
}

/* Heatmap Colors */
.grid-cell.is-heatmap {
  cursor: pointer;
  background: rgba(0,0,0,0.2); /* Default 0 count */
}

.grid-cell.is-selected {
  border: 2px solid var(--primary);
  box-shadow: 0 0 10px var(--primary);
  z-index: 10;
}

.heatmap-count {
  font-size: 0.8rem;
  font-weight: bold;
  opacity: 0.8;
  pointer-events: none;
}

.grid-cell.heatmap-1 { background: rgba(99, 102, 241, 0.2); }
.grid-cell.heatmap-2 { background: rgba(99, 102, 241, 0.4); }
.grid-cell.heatmap-3 { background: rgba(99, 102, 241, 0.6); }
.grid-cell.heatmap-4 { background: rgba(99, 102, 241, 0.8); }
.grid-cell.heatmap-5 { 
  background: var(--success);
  box-shadow: inset 0 0 10px rgba(255,255,255,0.5);
  color: white;
}
.grid-cell.heatmap-5 .heatmap-count {
  opacity: 1;
  transform: scale(1.2);
}

.crown-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));
  display: inline-block;
  animation: float 2s infinite ease-in-out;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }

.cell-detail-card {
  padding: 20px;
  background: rgba(10, 10, 15, 0.8);
}

.cell-detail-card h4 {
  margin: 0;
  color: var(--text-main);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.members-status {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.free-list, .maybe-list, .busy-list {
  flex: 1;
  min-width: 150px;
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 8px;
}

.free-list h5, .maybe-list h5, .busy-list h5 {
  margin: 0 0 8px 0;
  font-size: 1rem;
}

.maybe-list h5 {
  color: #f59e0b;
}

.free-list p, .maybe-list p, .busy-list p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}
</style>
