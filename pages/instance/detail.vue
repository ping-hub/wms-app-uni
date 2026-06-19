<template>
  <view class="inst-detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view v-if="loading" class="loading-wrap"><text class="text-secondary">加载中...</text></view>
      <template v-if="info">
        <!-- 基本信息 -->
        <view class="card">
          <view class="card-title">基本信息</view>
          <view class="info-row"><text class="info-label">实例编码</text><text class="info-value text-primary">{{ info.instanceCode || '-' }}</text></view>
          <view class="info-row"><text class="info-label">器材状态</text><text :class="['tag', getStatusTagClass(info.instanceStatus)]">{{ info.instanceStatus || '-' }}</text></view>
          <view class="info-row"><text class="info-label">器材名称</text><text class="info-value">{{ info.itemName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">器材编码</text><text class="info-value">{{ info.itemCode || '-' }}</text></view>
          <view class="info-row"><text class="info-label">规格型号</text><text class="info-value">{{ info.skuName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">在箱状态</text><text class="info-value">{{ info.boxId ? '在箱' : '不在箱' }}</text></view>
          <view class="info-row"><text class="info-label">借出状态</text><text class="info-value">{{ info.instanceStatus === '借出' ? '已借出' : '未借出' }}</text></view>
        </view>

        <!-- 位置信息 -->
        <view class="card">
          <view class="card-title">位置信息</view>
          <view class="info-row"><text class="info-label">仓库</text><text class="info-value">{{ info.warehouseName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">库区</text><text class="info-value">{{ info.areaName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">货架</text><text class="info-value">{{ info.rackName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">货位</text><text class="info-value">{{ info.locationName || '-' }}</text></view>
        </view>

        <!-- 关联信息 -->
        <view class="card">
          <view class="card-title">关联信息</view>
          <view class="info-row"><text class="info-label">箱码</text><text class="info-value">{{ info.boxCode || '-' }}</text></view>
          <view class="info-row"><text class="info-label">关联单号</text><text class="info-value">{{ info.currentBusinessNo || '-' }}</text></view>
          <view class="info-row" v-if="info.remark"><text class="info-label">备注</text><text class="info-value">{{ info.remark }}</text></view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getItemInstance } from '@/api/wms/itemInstance'

const info = ref(null)
const loading = ref(true)

const getStatusTagClass = (status) => {
  if (status === '在库') return 'tag-success'
  if (status === '出库' || status === '报废') return 'tag-danger'
  if (status === '借出' || status === '盘亏') return 'tag-warning'
  return 'tag-info'
}

const loadDetail = async (id) => {
  loading.value = true
  try {
    const res = await getItemInstance(id)
    info.value = res.data || res
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally { loading.value = false }
}

onLoad((options) => {
  if (options.id) loadDetail(options.id)
})
</script>

<style lang="scss" scoped>
.inst-detail-page { min-height: 100vh; background-color: #f5f6fa; }
.detail-scroll { height: 100vh; padding: 16rpx; padding-bottom: 40rpx; }
.loading-wrap { text-align: center; padding: 120rpx 0; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.info-row:last-child { border-bottom: none; }
.info-label { color: #999999; font-size: 26rpx; flex-shrink: 0; }
.info-value { color: #333333; font-size: 26rpx; text-align: right; max-width: 65%; word-break: break-all; }
.text-primary { color: #2979ff; font-weight: 600; }
</style>
