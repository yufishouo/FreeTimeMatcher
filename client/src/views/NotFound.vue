<template>
  <div class="not-found container text-center fade-up-enter-active">
    <div class="glass-panel" style="max-width: 600px; margin: 60px auto; padding: 60px 24px;">
      <div class="emoji-huge mb-4">🔍</div>
      <h1 class="mb-3 gradient-text">404 - 找不到頁面</h1>
      <p class="text-muted mb-4">哎呀！您似乎闖入了一個不存在的空間。<br>這個網址可能已經失效，或是被移除了。</p>
      <router-link to="/" class="btn btn-primary">返回首頁</router-link>
    </div>
  </div>
</template>

<style scoped>
.emoji-huge {
  font-size: 5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
