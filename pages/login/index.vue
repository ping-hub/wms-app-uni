<template>
  <view class="login-page">
    <!-- 右上角设置按钮 -->
    <view class="settings-btn" @click="showSettings = true">
      <text class="settings-icon">⚙️</text>
    </view>

    <view class="login-header">
      <view class="logo-wrap">
        <image class="logo-icon" src="/static/logo_80.png" mode="aspectFit" />
      </view>
      <text class="app-title">WMS-App</text>
      <text class="app-subtitle">仓库管理系统</text>
    </view>

    <view class="login-form card">
      <view class="form-item">
        <text class="form-label">用户名</text>
        <input
          class="form-input"
          v-model="formData.username"
          placeholder="请输入用户名"
          :maxlength="30"
        />
      </view>
      <view class="form-item">
        <text class="form-label">密码</text>
        <input
          class="form-input"
          v-model="formData.password"
          placeholder="请输入密码"
          :password="true"
          :maxlength="30"
        />
      </view>
      <view class="form-item" v-if="captchaEnabled">
        <text class="form-label">验证码</text>
        <view class="captcha-row">
          <input
            class="form-input captcha-input"
            v-model="formData.code"
            placeholder="请输入验证码"
            :maxlength="6"
          />
          <image
            class="captcha-img"
            :src="captchaUrl"
            @click="getCaptcha"
            mode="scaleToFill"
          />
        </view>
      </view>

      <button class="login-btn" :loading="loading" @click="handleLogin">
        登 录
      </button>

      <view class="login-tips">
        <text class="text-secondary">默认账号：admin / admin123</text>
      </view>
    </view>

    <!-- 服务器配置弹窗 -->
    <view class="settings-mask" v-if="showSettings" @click="showSettings = false">
      <view class="settings-panel" @click.stop>
        <view class="settings-header">
          <text class="settings-title">服务器配置</text>
          <text class="settings-close" @click="showSettings = false">✕</text>
        </view>
        <view class="settings-body">
          <view class="form-item">
            <text class="form-label">服务器地址</text>
            <input
              class="form-input"
              v-model="serverHost"
              placeholder="如：192.168.1.100"
              :maxlength="100"
            />
          </view>
          <view class="form-item">
            <text class="form-label">端口</text>
            <input
              class="form-input"
              v-model="serverPort"
              placeholder="如：8080"
              type="number"
              :maxlength="10"
            />
          </view>
          <view class="server-preview">
            <text class="text-secondary">完整地址：{{ previewUrl }}</text>
          </view>
        </view>
        <view class="settings-footer">
          <button class="settings-save-btn" @click="saveSettings">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { getCaptchaImage } from '@/api/login'
import { getBaseUrl, setBaseUrl } from '@/utils/request'

const userStore = useUserStore()

const formData = ref({
  username: '',
  password: '',
  code: '',
  uuid: ''
})

const loading = ref(false)
const captchaEnabled = ref(true)
const captchaUrl = ref('')

// 服务器配置
const showSettings = ref(false)
const serverHost = ref('')
const serverPort = ref('')

const previewUrl = computed(() => {
  const host = serverHost.value.trim()
  const port = serverPort.value.trim()
  if (!host) return '请输入地址'
  return port ? `http://${host}:${port}` : `http://${host}`
})

const parseUrl = (url) => {
  try {
    const u = new URL(url)
    serverHost.value = u.hostname
    serverPort.value = u.port || ''
  } catch (e) {
    serverHost.value = url
    serverPort.value = ''
  }
}

const saveSettings = () => {
  if (!serverHost.value.trim()) {
    return uni.showToast({ title: '请输入服务器地址', icon: 'none' })
  }
  const host = serverHost.value.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '')
  const port = serverPort.value.trim()
  const newUrl = port ? `http://${host}:${port}` : `http://${host}`
  setBaseUrl(newUrl)
  showSettings.value = false
  uni.showToast({ title: '地址已保存', icon: 'success' })
  setTimeout(() => getCaptcha(), 500)
}

const getCaptcha = async () => {
  try {
    const res = await getCaptchaImage()
    const data = res.data || res
    captchaEnabled.value = data.captchaEnabled !== false
    if (captchaEnabled.value && data.img) {
      captchaUrl.value = 'data:image/gif;base64,' + data.img
      formData.value.uuid = data.uuid
    } else {
      captchaEnabled.value = false
    }
  } catch (e) {
    console.error('获取验证码失败:', e)
    captchaEnabled.value = false
  }
}

const handleLogin = async () => {
  if (!formData.value.username) {
    return uni.showToast({ title: '请输入用户名', icon: 'none' })
  }
  if (!formData.value.password) {
    return uni.showToast({ title: '请输入密码', icon: 'none' })
  }
  if (captchaEnabled.value && !formData.value.code) {
    return uni.showToast({ title: '请输入验证码', icon: 'none' })
  }

  loading.value = true
  try {
    await userStore.loginAction({
      username: formData.value.username,
      password: formData.value.password,
      code: formData.value.code,
      uuid: formData.value.uuid
    })
    await userStore.getInfoAction()
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (e) {
    if (captchaEnabled.value) {
      getCaptcha()
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  parseUrl(getBaseUrl())
  getCaptcha()
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #2979ff 0%, #5ba7ff 100%);
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.settings-btn {
  position: absolute;
  top: calc(var(--status-bar-height, 44px) + 16rpx);
  right: 24rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.settings-icon {
  font-size: 40rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.logo-wrap {
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}

.logo-icon {
  width: 80rpx;
  height: 80rpx;
}

.app-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.app-subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

.login-form {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.form-input {
  width: 100%;
  height: 88rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #333333;
  border: 2rpx solid #e8e8e8;
  box-sizing: border-box;
}

.captcha-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
}

.captcha-input {
  flex: 1;
}

.captcha-img {
  width: 200rpx;
  height: 88rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f5f6fa;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #2979ff 0%, #5ba7ff 100%);
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn::after {
  border: none;
}

.login-tips {
  text-align: center;
  margin-top: 24rpx;
}

/* 服务器配置弹窗 */
.settings-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-panel {
  width: 85%;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.settings-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.settings-close {
  font-size: 36rpx;
  color: #999999;
  padding: 8rpx;
}

.settings-body {
  padding: 32rpx;
}

.server-preview {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #f5f6fa;
  border-radius: 8rpx;
}

.settings-footer {
  padding: 20rpx 32rpx 32rpx;
}

.settings-save-btn {
  width: 100%;
  height: 88rpx;
  background: #2979ff;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-save-btn::after {
  border: none;
}
</style>
