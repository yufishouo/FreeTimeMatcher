<template>
  <Navbar />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade-up" mode="out-in">
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
</style>
