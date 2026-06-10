<script>
import { useUserStore } from '@/store/user'

export default {
  onLaunch() {
    const userStore = useUserStore()
    if (userStore.token) {
      // 已登录，获取用户信息
      userStore.getInfoAction().catch(() => {
        userStore.logoutAction()
        uni.reLaunch({ url: '/pages/login/index' })
      })
    } else {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  }
}
</script>

<style>
page {
  background-color: #f5f6fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 28rpx;
  color: #333333;
}

/* 全局通用样式 */
.container {
  padding: 20rpx;
}

.card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.text-secondary {
  color: #999999;
  font-size: 24rpx;
}

.text-primary {
  color: #2979ff;
}

.text-danger {
  color: #e43d33;
}

.text-success {
  color: #19be6b;
}

.text-warning {
  color: #ff9900;
}

.mt10 { margin-top: 10rpx; }
.mt20 { margin-top: 20rpx; }
.mb10 { margin-bottom: 10rpx; }
.mb20 { margin-bottom: 20rpx; }

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 状态标签 */
.tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
}

.tag-success {
  background-color: #e8f8ef;
  color: #19be6b;
}

.tag-danger {
  background-color: #fef0ef;
  color: #e43d33;
}

.tag-warning {
  background-color: #fff8e6;
  color: #ff9900;
}

.tag-info {
  background-color: #f4f4f5;
  color: #909399;
}

.tag-primary {
  background-color: #e8f0fe;
  color: #2979ff;
}
</style>
