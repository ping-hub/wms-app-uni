<template>
  <view class="check-list-page">
    <view class="search-bar card">
      <input class="search-input" v-model="queryParams.checkOrderNo" placeholder="搜索盘点单号" confirm-type="search" @confirm="handleSearch" />
      <view class="filter-btn" @click="showFilter = true"><text>筛选</text></view>
    </view>

    <view class="status-tabs">
      <view v-for="tab in statusTabs" :key="tab.value" class="tab-item" :class="{ 'tab-active': currentStatus === tab.value }" @click="switchTab(tab.value)">
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view class="order-list" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="onLoadMore">
      <view v-if="!list.length && !loading" class="empty-tip"><text class="text-secondary">暂无盘点单</text></view>

      <view v-for="item in list" :key="item.id" class="order-card card" @click="goDetail(item)">
        <view class="order-header flex-between">
          <text class="order-no">{{ item.checkOrderNo || '待生成' }}</text>
          <text :class="['tag', getStatusTagClass(item.checkOrderStatus)]">{{ getStatusLabel(item.checkOrderStatus) }}</text>
        </view>
        <view class="order-body">
          <view class="order-row">
            <text class="order-label">盘点范围</text>
            <text class="order-value">{{ getScopeLabel(item) }}</text>
          </view>
          <view class="order-row">
            <text class="order-label">盈亏数</text>
            <text class="order-value">{{ Math.floor(item.checkOrderTotal || 0) }}</text>
          </view>
          <view class="order-row" v-if="item.checkerName">
            <text class="order-label">盘点人</text>
            <text class="order-value">{{ item.checkerName }}</text>
          </view>
        </view>
        <view class="order-footer flex-between">
          <text class="text-secondary">{{ item.createBy }} · {{ formatTime(item.createTime) }}</text>
          <view class="order-actions" v-if="item.checkOrderStatus === 0">
            <text class="action-btn action-edit" @click.stop="goEdit(item)">编辑</text>
            <text class="action-btn action-delete" @click.stop="handleDelete(item)">删除</text>
          </view>
          <view class="order-actions" v-else-if="item.checkOrderStatus === 1">
            <text class="action-btn action-view">查看</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-tip"><text class="text-secondary">加载中...</text></view>
      <view v-if="!loading && list.length && noMore" class="loading-tip"><text class="text-secondary">没有更多了</text></view>
    </scroll-view>

    <view class="fab-btn" @click="goAdd"><text class="fab-icon">+</text></view>

    <view class="filter-mask" v-if="showFilter" @click="showFilter = false">
      <view class="filter-panel" @click.stop>
        <view class="card-title">筛选条件</view>
        <view class="form-item">
          <text class="form-label">仓库</text>
          <picker :range="warehousePickerList" range-key="warehouseName" @change="onWarehouseChange">
            <view class="picker-value">{{ selectedWarehouseLabel || '请选择' }}</view>
          </picker>
        </view>
        <view class="filter-actions">
          <button class="filter-reset" @click="resetFilter">重置</button>
          <button class="filter-confirm" @click="applyFilter">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listCheckOrder, delCheckOrder } from '@/api/wms/checkOrder'
import { useWmsStore } from '@/store/wms'
import { formatTime } from '@/utils/scan'

const wmsStore = useWmsStore()
const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const showFilter = ref(false)

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待盘库', value: '0' },
  { label: '已盘库', value: '1' },
  { label: '作废', value: '-1' }
]
const currentStatus = ref('')
const queryParams = ref({ pageNum: 1, pageSize: 10, checkOrderNo: undefined, checkOrderStatus: undefined, warehouseId: undefined })


const getStatusLabel = (status) => wmsStore.getDictLabel('wms_check_status', status)
const getStatusTagClass = (status) => { const s = String(status); if (s === '1') return 'tag-success'; if (s === '-1') return 'tag-danger'; return 'tag-warning' }

const getScopeLabel = (item) => {
  const type = wmsStore.getDictLabel('wms_check_scope_type', item.checkScopeType)
  let name = ''
  if (item.checkScopeType === 'warehouse') name = wmsStore.warehouseMap.get(item.warehouseId)?.warehouseName || ''
  else if (item.checkScopeType === 'area') name = wmsStore.areaMap.get(item.areaId)?.areaName || ''
  return type + (name ? ' - ' + name : '')
}

const getList = async (reset = false) => {
  if (loading.value) return
  if (reset) { queryParams.value.pageNum = 1; noMore.value = false }
  loading.value = true
  try {
    const params = { ...queryParams.value }
    if (currentStatus.value !== '') params.checkOrderStatus = currentStatus.value
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k] })
    const res = await listCheckOrder(params)
    const rows = res.rows || []
    if (reset) list.value = rows; else list.value = [...list.value, ...rows]
    noMore.value = rows.length < queryParams.value.pageSize
  } catch (e) {} finally { loading.value = false; refreshing.value = false }
}

const switchTab = (status) => { currentStatus.value = status; getList(true) }
const handleSearch = () => getList(true)
const onRefresh = () => { refreshing.value = true; getList(true) }
const onLoadMore = () => { if (noMore.value || loading.value) return; queryParams.value.pageNum++; getList() }
const warehousePickerList = computed(() => wmsStore.warehouseList)
const selectedWarehouseLabel = computed(() => warehousePickerList.value.find(w => w.id === queryParams.value.warehouseId)?.warehouseName || '')
const onWarehouseChange = (e) => { queryParams.value.warehouseId = warehousePickerList.value[e.detail.value]?.id }
const resetFilter = () => { queryParams.value.warehouseId = undefined }
const applyFilter = () => { showFilter.value = false; getList(true) }

const goAdd = () => uni.navigateTo({ url: '/pages/check/edit' })
const goEdit = (row) => uni.navigateTo({ url: '/pages/check/edit?id=' + row.id })
const goDetail = (row) => {
  if (row.checkOrderStatus === 0) goEdit(row)
  else uni.navigateTo({ url: '/pages/check/edit?id=' + row.id + '&mode=view' })
}

const handleDelete = async (row) => {
  const { confirm } = await uni.showModal({ title: '提示', content: `确认删除盘点单【${row.checkOrderNo}】吗？` })
  if (confirm) { try { await delCheckOrder(row.id); uni.showToast({ title: '删除成功', icon: 'success' }); getList(true) } catch (e) {} }
}

onMounted(() => {
wmsStore.getDict('wms_check_status')
  wmsStore.getDict('wms_check_scope_type')
  wmsStore.loadWarehouses()
  wmsStore.loadAreas()
})

onShow(() => {
  getList(true)
})
</script>

<style lang="scss" scoped>
.check-list-page { min-height: 100vh; background-color: #f5f6fa; display: flex; flex-direction: column; }
.search-bar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; margin: 16rpx 16rpx 0; border-radius: 16rpx; }
.search-input { flex: 1; height: 72rpx; background: #f5f6fa; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.filter-btn { padding: 12rpx 28rpx; background: #e8f0fe; border-radius: 32rpx; color: #2979ff; font-size: 26rpx; }
.status-tabs { display: flex; padding: 16rpx 16rpx 0; gap: 8rpx; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 8rpx; background: #ffffff; }
.tab-active { background: #2979ff; }
.tab-active .tab-text { color: #ffffff; }
.tab-text { font-size: 26rpx; color: #666666; }
.order-list { flex: 1; padding: 16rpx; }
.order-card { padding: 24rpx; margin-bottom: 16rpx; }
.order-header { margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.order-no { font-size: 30rpx; font-weight: 600; color: #333333; }
.order-body { margin-bottom: 12rpx; }
.order-row { display: flex; justify-content: space-between; padding: 6rpx 0; }
.order-label { color: #999999; font-size: 24rpx; }
.order-value { color: #333333; font-size: 24rpx; text-align: right; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-footer { padding-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.order-actions { display: flex; gap: 20rpx; }
.action-btn { font-size: 26rpx; padding: 4rpx 16rpx; }
.action-edit { color: #2979ff; }
.action-delete { color: #e43d33; }
.action-view { color: #2979ff; }
.empty-tip { text-align: center; padding: 120rpx 0; }
.loading-tip { text-align: center; padding: 24rpx 0; }
.fab-btn { position: fixed; right: 40rpx; bottom: 80rpx; width: 112rpx; height: 112rpx; background: linear-gradient(135deg, #2979ff, #5c9aff); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(41, 121, 255, 0.4); z-index: 100; }
.fab-icon { color: #ffffff; font-size: 56rpx; font-weight: 300; line-height: 1; }
.filter-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 200; display: flex; justify-content: flex-end; }
.filter-panel { width: 80%; height: 100%; background: #ffffff; padding: 40rpx 32rpx; overflow-y: auto; }
.filter-panel .form-item { margin-bottom: 32rpx; }
.filter-panel .form-label { display: block; font-size: 28rpx; color: #333333; margin-bottom: 12rpx; font-weight: 500; }
.picker-value { height: 80rpx; line-height: 80rpx; background: #f5f6fa; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; color: #333333; }
.filter-actions { display: flex; gap: 20rpx; margin-top: 60rpx; }
.filter-reset { flex: 1; height: 88rpx; background: #f5f6fa; color: #666666; border-radius: 12rpx; font-size: 30rpx; border: none; line-height: 88rpx; &::after { border: none; } }
.filter-confirm { flex: 1; height: 88rpx; background: #2979ff; color: #ffffff; border-radius: 12rpx; font-size: 30rpx; border: none; line-height: 88rpx; &::after { border: none; } }
</style>
