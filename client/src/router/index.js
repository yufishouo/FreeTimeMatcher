import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/join/:inviteCode', component: () => import('../views/Home.vue') },
  { path: '/profile', component: () => import('../views/Profile.vue') },
  { path: '/group/:id', component: () => import('../views/GroupMatch.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
