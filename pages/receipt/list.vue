<template>
  <view class="receipt-list-page">
    <!-- 顶部搜索栏 -->
    <view class="search-bar card">
      <input
        class="search-input"
        v-model="queryParams.receiptOrderNo"
        placeholder="搜索入库单号"
        confirm-type="search"
        @confirm="handleSearch"
      />
      <view class="filter-btn" @click="showFilter = true">
        <text>筛选</text>
      </view>
    </view>

    <!-- 状态Tab -->
    <view class="status-tabs">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        class="tab-item"
        :class="{ 'tab-active': currentStatus === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="order-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="!list.length && !loading" class="empty-tip">
        <text class="text-secondary">暂无入库单</text>
      </view>

      <view v-for="item in list" :key="item.id" class="swipe-wrapper">
        <view
          class="swipe-content"
          :class="{ 'swipe-open': openId === item.id }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove($event, item)"
          @touchend="onTouchEnd(item)"
          @click="goDetail(item)"
        >
          <view class="order-header">
            <text class="order-no">{{ item.receiptOrderNo || '待生成' }}</text>
            <text :class="['tag', getStatusTagClass(item.receiptOrderStatus)]">{{ getStatusLabel(item.receiptOrderStatus) }}</text>
          </view>
          <view class="order-tags">
            <text class="tag tag-plain">{{ getReceiptTypeLabel(item.receiptOrderType) }}</text>
            <text class="tag tag-plain area-tag">{{ getAreaLabel(item.areaId) }}</text>
          </view>
        </view>
        <view class="swipe-action-delete" v-if="item.receiptOrderStatus === 0" @click="handleDelete(item)">
          <text>删除</text>
        </view>
      </view>

      <view v-if="loading" class="loading-tip">
        <text class="text-secondary">加载中...</text>
      </view>
      <view v-if="!loading && list.length && noMore" class="loading-tip">
        <text class="text-secondary">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goAdd">
      <text class="fab-icon">+</text>
    </view>

    <!-- 筛选弹窗 -->
    <view class="filter-mask" v-if="showFilter" @click="showFilter = false">
      <view class="filter-panel" @click.stop>
        <view class="card-title">筛选条件</view>
        <view class="form-item">
          <text class="form-label">入库类型</text>
          <picker :range="receiptTypeOptions" range-key="dictLabel" @change="onTypeChange">
            <view class="picker-value">
              {{ selectedTypeLabel || '请选择' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">调拨根据</text>
          <input class="form-input" v-model="queryParams.basisNo" placeholder="请输入"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">收物单位</text>
          <input class="form-input" v-model="queryParams.receiveUnit" placeholder="请输入"  placeholder-class="input-placeholder" />
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
import { listReceiptOrder, delReceiptOrder } from '@/api/wms/receiptOrder'
import { useWmsStore } from '@/store/wms'
import { useSwipe } from '@/utils/swipe'

const wmsStore = useWmsStore()
const { openId, onTouchStart, onTouchMove, onTouchEnd } = useSwipe()

const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const showFilter = ref(false)

const statusTabs = [
  { label: '全部', value: '' },
  { label: '未入库', value: '0' },
  { label: '已入库', value: '1' },
  { label: '作废', value: '-1' }
]
const currentStatus = ref('')

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  receiptOrderNo: undefined,
  receiptOrderType: undefined,
  receiptOrderStatus: undefined,
  basisNo: undefined,
  receiveUnit: undefined
})

// 字典数据
const receiptTypeOptions = computed(() => wmsStore.dictMap['wms_receipt_type'] || [])
const receiptStatusOptions = computed(() => wmsStore.dictMap['wms_receipt_status'] || [])

const selectedTypeLabel = computed(() => {
  if (!queryParams.value.receiptOrderType) return ''
  const item = receiptTypeOptions.value.find(d => d.dictValue === queryParams.value.receiptOrderType)
  return item ? item.dictLabel : ''
})

const getStatusLabel = (status) => {
  return wmsStore.getDictLabel('wms_receipt_status', status)
}

const getStatusTagClass = (status) => {
  const s = String(status)
  if (s === '1') return 'tag-success'
  if (s === '-1') return 'tag-danger'
  return 'tag-warning'
}

const getReceiptTypeLabel = (type) => {
  return wmsStore.getDictLabel('wms_receipt_type', type)
}

const getWarehouseLabel = (warehouseId, areaId) => {
  const wh = wmsStore.warehouseMap.get(warehouseId)
  const area = wmsStore.areaMap.get(areaId)
  let label = wh ? wh.warehouseName : '-'
  if (area) label += ' / ' + area.areaName
  return label
}

const getAreaLabel = (areaId) => {
  const area = wmsStore.areaMap.get(areaId)
  return area ? area.areaName : '-'
}

const formatTime = (time) => {
  if (!time) return ''
  const d = new Date(time)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

// 加载列表
const getList = async (reset = false) => {
  if (loading.value) return
  if (reset) {
    queryParams.value.pageNum = 1
    noMore.value = false
  }
  loading.value = true
  try {
    const params = { ...queryParams.value }
    if (currentStatus.value !== '') {
      params.receiptOrderStatus = currentStatus.value
    }
    // 清除空值
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k]
    })
    const res = await listReceiptOrder(params)
    const rows = res.rows || []
    if (reset) {
      list.value = rows
    } else {
      list.value = [...list.value, ...rows]
    }
    noMore.value = rows.length < queryParams.value.pageSize
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const switchTab = (status) => {
  currentStatus.value = status
  getList(true)
}

const handleSearch = () => {
  getList(true)
}

const onRefresh = () => {
  refreshing.value = true
  getList(true)
}

const onLoadMore = () => {
  if (noMore.value || loading.value) return
  queryParams.value.pageNum++
  getList()
}

// 筛选
const onTypeChange = (e) => {
  const idx = e.detail.value
  queryParams.value.receiptOrderType = receiptTypeOptions.value[idx]?.dictValue
}

const resetFilter = () => {
  queryParams.value.receiptOrderType = undefined
  queryParams.value.basisNo = undefined
  queryParams.value.receiveUnit = undefined
}

const applyFilter = () => {
  showFilter.value = false
  getList(true)
}

const handleDelete = async (row) => {
  const { confirm } = await uni.showModal({ title: '提示', content: `确认删除入库单【${row.receiptOrderNo}】吗？` })
  if (confirm) {
    try {
      await delReceiptOrder(row.id)
      uni.showToast({ title: '删除成功', icon: 'success' })
      getList(true)
    } catch (e) {}
  }
}

// 操作
const goAdd = () => {
  uni.navigateTo({ url: '/pages/receipt/edit' })
}

const goEdit = (row) => {
  uni.navigateTo({ url: '/pages/receipt/edit?id=' + row.id })
}

const goDetail = (row) => {
  if (openId.value === row.id) {
    openId.value = null
    return
  }
  if (row.receiptOrderStatus === 0) {
    goEdit(row)
  } else {
    uni.navigateTo({ url: '/pages/receipt/edit?id=' + row.id + '&mode=view' })
  }
}



onMounted(() => {
wmsStore.getDict('wms_receipt_type')
  wmsStore.getDict('wms_receipt_status')
})

onShow(() => {
  getList(true)
})
</script>

<style lang="scss" scoped>
.receipt-list-page {
  min-height: 100vh;
  background-color: #f5f6fa;
  display: flex;
  flex-direction: column;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  margin: 16rpx 16rpx 0;
  border-radius: 16rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: #f5f6fa;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
}

.filter-btn {
  padding: 12rpx 28rpx;
  background: #e8f0fe;
  border-radius: 32rpx;
  color: #2979ff;
  font-size: 26rpx;
}

.status-tabs {
  display: flex;
  padding: 16rpx 16rpx 0;
  gap: 8rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 8rpx;
  background: #ffffff;
}

.tab-active {
  background: #2979ff;
}

.tab-active .tab-text {
  color: #ffffff;
}

.tab-text {
  font-size: 26rpx;
  color: #666666;
}

.order-list {
  flex: 1;
  padding: 16rpx;
}

.swipe-wrapper {
  position: relative;
  margin-bottom: 16rpx;
  overflow: hidden;
  border-radius: 16rpx;
}

.swipe-content {
  position: relative;
  z-index: 1;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease;
}

.swipe-open {
  transform: translateX(-140rpx);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.order-no {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
  overflow: hidden;
}

.tag-plain {
  background: #f0f2f5;
  color: #666666;
}

.area-tag {
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.swipe-action-delete {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 140rpx;
  background: #e43d33;
  color: #ffffff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-tip {
  text-align: center;
  padding: 120rpx 0;
}

.loading-tip {
  text-align: center;
  padding: 24rpx 0;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 112rpx;
  height: 112rpx;
  background: linear-gradient(135deg, #2979ff, #5ba7ff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(41, 121, 255, 0.4);
  z-index: 100;
}

.fab-icon {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 300;
  line-height: 1;
}

/* 筛选弹窗 */
.filter-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.filter-panel {
  width: 80%;
  height: 100%;
  background: #ffffff;
  padding: 40rpx 32rpx;
  overflow-y: auto;
}

.filter-panel .form-item {
  margin-bottom: 32rpx;
}

.filter-panel .form-label {
  display: block;
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.filter-panel .form-input {
  width: 100%;
  height: 80rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  box-sizing: border-box;
}

.picker-value {
  height: 80rpx;
  line-height: 80rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  color: #333333;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 60rpx;
}

.filter-reset {
  flex: 1;
  height: 88rpx;
  background: #f5f6fa;
  color: #666666;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
  line-height: 88rpx;

  &::after { border: none; }
}

.filter-confirm {
  flex: 1;
  height: 88rpx;
  background: #2979ff;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
  line-height: 88rpx;

  &::after { border: none; }
}
.input-placeholder { color: #c0c4cc; }
</style>
