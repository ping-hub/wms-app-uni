<template>
  <view class="home-page">
    <!-- 渐变头部 -->
    <view class="home-header">
      <view class="header-bg"></view>
      <view class="header-content">
        <view class="header-top">
          <view class="user-info">
            <view class="avatar-wrap">
              <text class="avatar-text">{{ nickName.charAt(0) || 'A' }}</text>
            </view>
            <view class="user-detail">
              <text class="user-name">{{ nickName || '用户' }}</text>
              <text class="user-role">{{ roles.length ? roles.join('、') : '普通用户' }}</text>
            </view>
          </view>
          <view class="header-actions">
            <view class="icon-btn" @click="handleLogout">
              <text class="icon-btn-text">⏻</text>
            </view>
          </view>
        </view>
        <!-- 快捷扫码入口 -->
        <view class="quick-bar">
          <view class="quick-item" @click="goTo('/pages/receipt/list')">
            <text class="quick-icon">📥</text>
            <text class="quick-label">入库</text>
          </view>
          <view class="quick-item" @click="goTo('/pages/shipment/list')">
            <text class="quick-icon">📤</text>
            <text class="quick-label">出库</text>
          </view>
          <view class="quick-item" @click="goTo('/pages/check/list')">
            <text class="quick-icon">📋</text>
            <text class="quick-label">盘点</text>
          </view>
          <view class="quick-item" @click="goTo('/pages/instance/list')">
            <text class="quick-icon">🔍</text>
            <text class="quick-label">台账</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能区域 -->
    <scroll-view class="home-body" scroll-y>
      <!-- 仓储作业 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">仓储作业</text>
        </view>
        <view class="func-grid">
          <view class="func-card" @click="goTo('/pages/receipt/list')">
            <view class="func-card-icon func-icon-receipt">
              <text class="icon-text">📥</text>
            </view>
            <view class="func-card-info">
              <text class="func-card-label">入库管理</text>
              <text class="func-card-desc">器材接收与入库</text>
            </view>
            <text class="func-card-arrow">›</text>
          </view>
          <view class="func-card" @click="goTo('/pages/shipment/list')">
            <view class="func-card-icon func-icon-shipment">
              <text class="icon-text">📤</text>
            </view>
            <view class="func-card-info">
              <text class="func-card-label">出库管理</text>
              <text class="func-card-desc">器材发放与出库</text>
            </view>
            <text class="func-card-arrow">›</text>
          </view>
          <view class="func-card" @click="goTo('/pages/check/list')">
            <view class="func-card-icon func-icon-check">
              <text class="icon-text">📋</text>
            </view>
            <view class="func-card-info">
              <text class="func-card-label">盘点管理</text>
              <text class="func-card-desc">库存盘点与核对</text>
            </view>
            <text class="func-card-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 库存中心 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">库存中心</text>
        </view>
        <view class="func-grid">
          <view class="func-card" @click="goTo('/pages/instance/list')">
            <view class="func-card-icon func-icon-instance">
              <text class="icon-text">🔍</text>
            </view>
            <view class="func-card-info">
              <text class="func-card-label">器材台账</text>
              <text class="func-card-desc">器材明细查询</text>
            </view>
            <text class="func-card-arrow">›</text>
          </view>
        </view>
      </view>

      <view style="height: 40rpx"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useWmsStore } from '@/store/wms'

const userStore = useUserStore()
const wmsStore = useWmsStore()

const nickName = computed(() => userStore.nickName)
const roles = computed(() => userStore.roles)

onMounted(() => {
  wmsStore.loadWarehouses()
  wmsStore.loadAreas()
  wmsStore.getDict('wms_receipt_status')
  wmsStore.getDict('wms_receipt_type')
  wmsStore.getDict('wms_dispatch_mode')
  wmsStore.getDict('wms_shipment_status')
  wmsStore.getDict('wms_shipment_type')
  wmsStore.getDict('wms_check_status')
  wmsStore.getDict('wms_check_scope_type')
  wmsStore.getDict('wms_instance_status')
})

const goTo = (url) => {
  uni.navigateTo({ url })
}

const handleLogout = async () => {
  const { confirm } = await uni.showModal({
    title: '提示',
    content: '确定退出登录吗？'
  })
  if (confirm) {
    await userStore.logoutAction()
    wmsStore.clearCache()
    uni.reLaunch({ url: '/pages/login/index' })
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: #f0f2f5;
}

.home-header {
  position: relative;
  padding-bottom: 24rpx;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 360rpx;
  background: linear-gradient(135deg, #2979ff 0%, #1e62d0 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 0 32rpx;
  padding-top: calc(var(--status-bar-height, 44px) + 20rpx);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0 32rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar-wrap {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
}

.avatar-text {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 600;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
}

.user-role {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
  margin-top: 4rpx;
}

.header-actions {
  display: flex;
  gap: 24rpx;
}

.icon-btn {
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn-text {
  font-size: 36rpx;
  color: #ffffff;
}

.quick-bar {
  display: flex;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 0;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1rpx;
    background: #f0f0f0;
  }

  &:last-child::after {
    display: none;
  }
}

.quick-icon {
  font-size: 44rpx;
}

.quick-label {
  font-size: 24rpx;
  color: #333333;
  font-weight: 500;
}

.home-body {
  height: calc(100vh - 420rpx);
}

.section {
  margin-top: 24rpx;
  padding: 0 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.func-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.func-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  position: relative;
}

.func-card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.func-icon-receipt { background: #e8f0fe; }
.func-icon-shipment { background: #fef0ef; }
.func-icon-check { background: #fff8e6; }
.func-icon-instance { background: #fee8f0; }
.func-icon-scan { background: #e8f4fe; }

.icon-text {
  font-size: 40rpx;
}

.func-card-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}

.func-card-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}

.func-card-desc {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

.func-card-arrow {
  font-size: 36rpx;
  color: #cccccc;
  flex-shrink: 0;
}

.func-card-badge {
  font-size: 20rpx;
  color: #999999;
  background: #f0f0f0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
</style>
