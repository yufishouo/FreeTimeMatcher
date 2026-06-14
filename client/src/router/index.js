import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/join/:inviteCode', component: () => import('../views/Home.vue') },
  { path: '/profile', component: () => import('../views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/group/:id', component: () => import('../views/GroupMatch.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 導航守衛：未登入時攔截需要認證的頁面，並記住目標路徑
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const userStr = localStorage.getItem('user')
    if (!userStr || userStr === 'undefined') {
      // 記住使用者原本想去的頁面
      sessionStorage.setItem('redirectAfterLogin', to.fullPath)
      next('/')
      return
    }
  }
  next()
})

export default router
