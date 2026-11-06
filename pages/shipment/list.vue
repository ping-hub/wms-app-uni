<template>
  <view class="shipment-list-page">
    <view class="search-bar card">
      <input
        class="search-input"
        v-model="queryParams.shipmentOrderNo"
        placeholder="搜索出库单号"
        confirm-type="search"
        @confirm="handleSearch"
      />
      <view class="filter-btn" @click="showFilter = true">
        <text>筛选</text>
      </view>
    </view>

    <scroll-view
      class="order-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="!list.length && !loading" class="empty-tip">
        <text class="text-secondary">暂无出库单</text>
      </view>

      <view v-for="item in list" :key="item.id" class="swipe-wrapper">
        <view
          class="swipe-content"
          :class="{ 'swipe-open': openId === item.id }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove($event, item)"
          @touchend="onTouchEnd(item)"
          @click="goSmart(item)"
        >
          <view class="order-header">
            <text class="order-no">{{ item.shipmentOrderNo || '待生成' }}</text>
            <text :class="['tag', getStatusTagClass(item.shipmentOrderStatus)]">{{ getStatusLabel(item.shipmentOrderStatus) }}</text>
          </view>
          <view class="order-tags">
            <text class="tag tag-plain">{{ getShipmentTypeLabel(item.shipmentOrderType) }}</text>
            <text class="tag tag-plain">{{ Math.floor(item.totalQuantity || 0) }}件</text>
          </view>
        </view>
        <view class="swipe-action-delete" v-if="canDelete(item)" @click="handleDelete(item)">
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

    <view class="fab-btn" @click="goAdd">
      <text class="fab-icon">+</text>
    </view>

    <view class="filter-mask" v-if="showFilter" @click="showFilter = false">
      <view class="filter-panel" @click.stop>
        <view class="card-title">筛选条件</view>
        <view class="form-item">
          <text class="form-label">状态</text>
          <picker :range="statusTabs" range-key="label" @change="onStatusChange">
            <view class="picker-value">{{ selectedStatusLabel || '全部' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">出库类型</text>
          <picker :range="shipmentTypeOptions" range-key="dictLabel" @change="onTypeChange">
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
import { listShipmentOrder, delShipmentOrder } from '@/api/wms/shipmentOrder'
import { useWmsStore } from '@/store/wms'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/scan'
import { useSwipe } from '@/utils/swipe'

const wmsStore = useWmsStore()
const userStore = useUserStore()
const { openId, onTouchStart, onTouchMove, onTouchEnd } = useSwipe()

const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const showFilter = ref(false)

const statusTabs = [
  { label: '全部', value: '' },
  { label: '草稿', value: '0' },
  { label: '待审批', value: '1' },
  { label: '已审批', value: '2' },
  { label: '已出库', value: '3' },
  { label: '驳回', value: '-2' },
  { label: '作废', value: '-1' }
]
const currentStatus = ref('')

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  shipmentOrderNo: undefined,
  shipmentOrderType: undefined,
  shipmentOrderStatus: undefined,
  basisNo: undefined,
  receiveUnit: undefined
})

const shipmentTypeOptions = computed(() => wmsStore.dictMap['wms_shipment_type'] || [])

const selectedTypeLabel = computed(() => {
  if (!queryParams.value.shipmentOrderType) return ''
  const item = shipmentTypeOptions.value.find(d => d.dictValue === queryParams.value.shipmentOrderType)
  return item ? item.dictLabel : ''
})

const getStatusLabel = (status) => wmsStore.getDictLabel('wms_shipment_status', status)
const getShipmentTypeLabel = (type) => wmsStore.getDictLabel('wms_shipment_type', type)

const getStatusTagClass = (status) => {
  const s = String(status)
  if (s === '3') return 'tag-success'
  if (s === '-1') return 'tag-danger'
  if (s === '-2') return 'tag-danger'
  if (s === '1') return 'tag-warning'
  if (s === '2') return 'tag-info'
  return 'tag-default'
}

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
      params.shipmentOrderStatus = currentStatus.value
    }
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k]
    })
    const res = await listShipmentOrder(params)
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
const onStatusChange = (e) => {
  const idx = Number(e.detail.value)
  currentStatus.value = statusTabs[idx].value
  getList(true)
}
const selectedStatusLabel = computed(() => {
  const tab = statusTabs.find(t => t.value === currentStatus.value)
  return tab ? tab.label : ''
})

const handleSearch = () => getList(true)
const onRefresh = () => { refreshing.value = true; getList(true) }
const onLoadMore = () => {
  if (noMore.value || loading.value) return
  queryParams.value.pageNum++
  getList()
}

const onTypeChange = (e) => {
  const idx = e.detail.value
  queryParams.value.shipmentOrderType = shipmentTypeOptions.value[idx]?.dictValue
}

const resetFilter = () => {
  queryParams.value.shipmentOrderType = undefined
  queryParams.value.basisNo = undefined
  queryParams.value.receiveUnit = undefined
}

const applyFilter = () => {
  showFilter.value = false
  getList(true)
}

const goAdd = () => uni.navigateTo({ url: '/pages/shipment/edit' })
const goEdit = (row) => uni.navigateTo({ url: '/pages/shipment/edit?id=' + row.id })
// ===== 身份校验 =====
const isApplicant = (row) => String(row.applicantId) === String(userStore.userId)
const isApprover = (row) => String(row.approverId) === String(userStore.userId)
const isExecutor = (row) => String(row.executorId) === String(userStore.userId)

const goView = (row) => uni.navigateTo({ url: '/pages/shipment/edit?id=' + row.id + '&mode=view' })

// 左滑删除条件：草稿/驳回 且 本人申请
const canDelete = (row) => (row.shipmentOrderStatus === 0 || row.shipmentOrderStatus === -2) && isApplicant(row)

// 当前用户可直接操作的单据(编辑/审批/完成出库)
const canOperate = (row) => canDelete(row)
  || (row.shipmentOrderStatus === 1 && isApprover(row))
  || (row.shipmentOrderStatus === 2 && isExecutor(row))

const goSmart = (row) => {
  if (openId.value === row.id) {
    openId.value = null
    return
  }
  canOperate(row) ? goEdit(row) : goView(row)
}

// ===== 审批操作 =====












onMounted(() => {
  wmsStore.getDict('wms_shipment_type')
  wmsStore.getDict('wms_shipment_status')
})

onShow(() => {
  getList(true)
})
</script>

<style lang="scss" scoped>
.shipment-list-page {
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

.status-tabs-scroll {
  white-space: nowrap;
  padding: 16rpx 16rpx 0;
}

.status-tabs {
  display: inline-flex;
  gap: 8rpx;
}

.tab-item {
  text-align: center;
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  background: #ffffff;
  white-space: nowrap;
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
  background: linear-gradient(135deg, #2979ff, #5c9aff);
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
