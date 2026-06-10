<template>
  <view class="instance-list-page">
    <view class="search-bar card">
      <input class="search-input" v-model="queryParams.instanceCode" placeholder="搜索实例编码/器材名称" confirm-type="search" @confirm="handleSearch" />
    </view>

    <scroll-view class="status-scroll" scroll-x>
      <view class="status-chips">
        <view v-for="tab in statusTabs" :key="tab.value" class="status-chip" :class="{ 'chip-active': currentStatus === tab.value }" @click="switchStatus(tab.value)">
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <scroll-view class="instance-list" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="onLoadMore">
      <view v-if="!list.length && !loading" class="empty-tip"><text class="text-secondary">暂无器材实例</text></view>

      <view v-for="item in list" :key="item.id" class="instance-card card" @click="goDetail(item)">
        <view class="inst-header flex-between">
          <text class="inst-code">{{ item.instanceCode }}</text>
          <text :class="['tag', getStatusTagClass(item.instanceStatus)]">{{ item.instanceStatus }}</text>
        </view>
        <view class="inst-body">
          <view class="inst-row">
            <text class="inst-label">器材</text>
            <text class="inst-value">{{ item.itemName || '-' }}</text>
          </view>
          <view class="inst-row" v-if="item.skuName">
            <text class="inst-label">规格</text>
            <text class="inst-value">{{ item.skuName }}</text>
          </view>
          <view class="inst-row">
            <text class="inst-label">位置</text>
            <text class="inst-value">{{ getLocationLabel(item) }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-tip"><text class="text-secondary">加载中...</text></view>
      <view v-if="!loading && list.length && noMore" class="loading-tip"><text class="text-secondary">没有更多了</text></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listItemInstance } from '@/api/wms/itemInstance'
import { useWmsStore } from '@/store/wms'

const wmsStore = useWmsStore()
const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const currentStatus = ref('')

const statusTabs = [
  { label: '全部', value: '' },
  { label: '在库', value: '在库' },
  { label: '待入库', value: '待入库' },
  { label: '出库', value: '出库' },
  { label: '借出', value: '借出' },
  { label: '盘亏', value: '盘亏' },
  { label: '报废', value: '报废' }
]

const queryParams = ref({ pageNum: 1, pageSize: 20, instanceCode: undefined, instanceStatus: undefined })

const getStatusTagClass = (status) => {
  if (status === '在库') return 'tag-success'
  if (status === '出库' || status === '报废') return 'tag-danger'
  if (status === '借出' || status === '盘亏') return 'tag-warning'
  return 'tag-info'
}

const getLocationLabel = (item) => {
  const parts = []
  const wh = wmsStore.warehouseMap.get(item.warehouseId)
  const area = wmsStore.areaMap.get(item.areaId)
  if (wh) parts.push(wh.warehouseName)
  if (area) parts.push(area.areaName)
  return parts.join(' / ') || '-'
}

const getList = async (reset = false) => {
  if (loading.value) return
  if (reset) { queryParams.value.pageNum = 1; noMore.value = false }
  loading.value = true
  try {
    const params = { ...queryParams.value }
    if (currentStatus.value) params.instanceStatus = currentStatus.value
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k] })
    const res = await listItemInstance(params)
    const rows = res.rows || []
    if (reset) list.value = rows; else list.value = [...list.value, ...rows]
    noMore.value = rows.length < queryParams.value.pageSize
  } catch (e) {} finally { loading.value = false; refreshing.value = false }
}

const switchStatus = (status) => { currentStatus.value = status; getList(true) }
const handleSearch = () => getList(true)
const onRefresh = () => { refreshing.value = true; getList(true) }
const onLoadMore = () => { if (noMore.value || loading.value) return; queryParams.value.pageNum++; getList() }
const goDetail = (item) => uni.navigateTo({ url: '/pages/instance/detail?id=' + item.id })

onMounted(() => {
  wmsStore.loadWarehouses()
  wmsStore.loadAreas()
  getList(true)
})
</script>

<style lang="scss" scoped>
.instance-list-page { min-height: 100vh; background-color: #f5f6fa; display: flex; flex-direction: column; }
.search-bar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; margin: 16rpx 16rpx 0; border-radius: 16rpx; }
.search-input { flex: 1; height: 72rpx; background: #f5f6fa; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.status-scroll { white-space: nowrap; }
.status-chips { display: flex; gap: 12rpx; padding: 16rpx; }
.status-chip { padding: 10rpx 24rpx; background: #ffffff; border-radius: 24rpx; font-size: 24rpx; color: #666666; }
.chip-active { background: #f0e8fe; color: #7c3aed; }
.instance-list { flex: 1; padding: 0 16rpx; }
.instance-card { padding: 24rpx; margin-bottom: 16rpx; }
.inst-header { margin-bottom: 12rpx; }
.inst-code { font-size: 28rpx; font-weight: 600; color: #7c3aed; }
.inst-body { }
.inst-row { display: flex; justify-content: space-between; padding: 4rpx 0; }
.inst-label { color: #999999; font-size: 24rpx; }
.inst-value { color: #333333; font-size: 24rpx; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-tip { text-align: center; padding: 120rpx 0; }
.loading-tip { text-align: center; padding: 24rpx 0; }
</style>
