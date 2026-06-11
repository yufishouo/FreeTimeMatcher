<template>
  <Navbar />
  <main class="main-content">
    <router-view></router-view>
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
