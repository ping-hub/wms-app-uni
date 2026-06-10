import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { login as loginApi, getInfo, logout as logoutApi } from '@/api/login'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() || '')
  const userId = ref('')
  const userName = ref('')
  const nickName = ref('')
  const avatar = ref('')
  const roles = ref([])
  const permissions = ref([])

  // 登录
  // 后端返回格式: { code: 200, data: { token: "xxx" } }
  async function loginAction(loginData) {
    const res = await loginApi(loginData)
    const data = res.data || res
    const tokenValue = data.token
    token.value = tokenValue
    setToken(tokenValue)
    return res
  }

  // 获取用户信息
  // 后端返回格式: { code: 200, data: { user: {...}, roles: [...], permissions: [...] } }
  async function getInfoAction() {
    const res = await getInfo()
    const data = res.data || res
    const user = data.user || {}
    userId.value = user.userId
    userName.value = user.userName
    nickName.value = user.nickName || user.userName
    avatar.value = user.avatar
    roles.value = data.roles || []
    permissions.value = data.permissions || []
    return res
  }

  // 退出登录
  async function logoutAction() {
    try {
      await logoutApi()
    } catch (e) {
      // ignore
    }
    token.value = ''
    userId.value = ''
    userName.value = ''
    nickName.value = ''
    roles.value = []
    permissions.value = []
    removeToken()
  }

  return {
    token, userId, userName, nickName, avatar, roles, permissions,
    loginAction, getInfoAction, logoutAction
  }
})
