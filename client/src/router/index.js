import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import GroupMatch from '../views/GroupMatch.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/profile', component: Profile },
  { path: '/group/:id', component: GroupMatch }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
