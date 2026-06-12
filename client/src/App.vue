<template>
  <Navbar />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <Toast />
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import Toast from './components/Toast.vue';
</script>

<style>
.main-content {
  flex: 1;
  padding: 40px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
