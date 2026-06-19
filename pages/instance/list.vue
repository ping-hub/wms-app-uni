<template>
  <view class="instance-list-page">
    <!-- 搜索栏 -->
    <view class="search-bar card">
      <input class="search-input" v-model="queryParams.instanceCode" placeholder="实例编码/器材名称/器材编码" confirm-type="search" @confirm="handleSearch" />
      <view class="filter-btn" @click="showFilter = true"><text>筛选</text></view>
    </view>

    <!-- 列表 -->
    <scroll-view class="instance-list" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="onLoadMore">
      <view v-if="!list.length && !loading" class="empty-tip"><text class="text-secondary">暂无库存明细</text></view>
      <view v-for="item in list" :key="item.id" class="instance-card card" @click="goDetail(item)">
        <view class="inst-header flex-between">
          <text class="inst-code">{{ item.instanceCode }}</text>
          <text :class="['tag', getStatusTagClass(item.instanceStatus)]">{{ item.instanceStatus }}</text>
        </view>
        <view class="inst-body">
          <view class="inst-row"><text class="inst-label">器材</text><text class="inst-value">{{ item.itemName || '-' }}</text></view>
          <view class="inst-row" v-if="item.itemCode"><text class="inst-label">器材编码</text><text class="inst-value">{{ item.itemCode }}</text></view>
          <view class="inst-row" v-if="item.skuName"><text class="inst-label">规格型号</text><text class="inst-value">{{ item.skuName }}</text></view>
          <view class="inst-row"><text class="inst-label">仓库</text><text class="inst-value">{{ item.warehouseName || getWarehouseName(item.warehouseId) }}</text></view>
          <view class="inst-row"><text class="inst-label">库区</text><text class="inst-value">{{ item.areaName || getAreaName(item.areaId) }}</text></view>
        </view>
      </view>
      <view v-if="loading" class="loading-tip"><text class="text-secondary">加载中...</text></view>
      <view v-if="!loading && list.length && noMore" class="loading-tip"><text class="text-secondary">没有更多了</text></view>
    </scroll-view>

    <!-- 筛选面板 -->
    <view class="filter-mask" v-if="showFilter" @click="showFilter = false">
      <view class="filter-panel" @click.stop>
        <view class="card-title">筛选条件</view>
        <view class="form-item">
          <text class="form-label">状态</text>
          <picker :range="statusOptions" range-key="label" @change="onStatusPickerChange">
            <view class="picker-value">{{ selectedStatusLabel || '全部' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">仓库</text>
          <picker :range="warehousePickerList" range-key="warehouseName" @change="onWarehouseChange">
            <view class="picker-value">{{ currentWarehouseLabel || '全部仓库' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">库区</text>
          <picker :range="areaPickerList" range-key="areaName" @change="onAreaChange">
            <view class="picker-value">{{ currentAreaLabel || '全部库区' }}</view>
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
import { listItemInstance } from '@/api/wms/itemInstance'
import { useWmsStore } from '@/store/wms'

const wmsStore = useWmsStore()
const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const showFilter = ref(false)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '在库', value: '在库' },
  { label: '待入库', value: '待入库' },
  { label: '出库', value: '出库' },
  { label: '借出', value: '借出' },
  { label: '盘亏', value: '盘亏' },
  { label: '报废', value: '报废' }
]
const currentStatus = ref('')
const selectedStatusLabel = computed(() => {
  const opt = statusOptions.find(o => o.value === currentStatus.value)
  return opt ? opt.label : ''
})

const form = ref({ warehouseId: undefined, areaId: undefined })
const queryParams = ref({ pageNum: 1, pageSize: 20, instanceCode: undefined, instanceStatus: undefined, warehouseId: undefined, areaId: undefined })

const warehousePickerList = computed(() => [{ id: undefined, warehouseName: '全部仓库' }, ...(wmsStore.warehouseList || [])])
const areaPickerList = computed(() => {
  const base = [{ id: undefined, areaName: '全部库区' }]
  if (!form.value.warehouseId) return [...base, ...(wmsStore.areaList || [])]
  return [...base, ...(wmsStore.areaList || []).filter(a => a.warehouseId === form.value.warehouseId)]
})
const currentWarehouseLabel = computed(() => {
  if (!form.value.warehouseId) return ''
  return wmsStore.warehouseMap?.get(form.value.warehouseId)?.warehouseName || ''
})
const currentAreaLabel = computed(() => {
  if (!form.value.areaId) return ''
  return wmsStore.areaMap?.get(form.value.areaId)?.areaName || ''
})

const getWarehouseName = (id) => wmsStore.warehouseMap?.get(id)?.warehouseName || '-'
const getAreaName = (id) => wmsStore.areaMap?.get(id)?.areaName || '-'
const getStatusTagClass = (status) => {
  if (status === '在库') return 'tag-success'
  if (status === '出库' || status === '报废') return 'tag-danger'
  if (status === '借出' || status === '盘亏') return 'tag-warning'
  return 'tag-info'
}

const onStatusPickerChange = (e) => {
  const idx = Number(e.detail.value)
  currentStatus.value = statusOptions[idx].value
}
const onWarehouseChange = (e) => {
  const idx = Number(e.detail.value)
  const item = warehousePickerList.value[idx]
  form.value.warehouseId = item?.id || undefined
  form.value.areaId = undefined
  queryParams.value.warehouseId = form.value.warehouseId
  queryParams.value.areaId = undefined
}
const onAreaChange = (e) => {
  const idx = Number(e.detail.value)
  const item = areaPickerList.value[idx]
  form.value.areaId = item?.id || undefined
  queryParams.value.areaId = form.value.areaId
}

const resetFilter = () => {
  currentStatus.value = ''
  form.value.warehouseId = undefined
  form.value.areaId = undefined
  queryParams.value.warehouseId = undefined
  queryParams.value.areaId = undefined
}
const applyFilter = () => { showFilter.value = false; getList(true) }

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
.filter-btn { padding: 12rpx 28rpx; background: #e8f0fe; border-radius: 32rpx; color: #2979ff; font-size: 26rpx; }
.instance-list { flex: 1; padding: 16rpx; }
.instance-card { padding: 24rpx; margin-bottom: 16rpx; }
.inst-header { margin-bottom: 12rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.inst-code { font-size: 28rpx; font-weight: 600; color: #2979ff; }
.inst-row { display: flex; justify-content: space-between; padding: 4rpx 0; }
.inst-label { color: #999999; font-size: 24rpx; }
.inst-value { color: #333333; font-size: 24rpx; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-tip { text-align: center; padding: 120rpx 0; }
.loading-tip { text-align: center; padding: 24rpx 0; }
.filter-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; justify-content: flex-end; }
.filter-panel { width: 80%; height: 100%; background: #fff; padding: 40rpx 32rpx; overflow-y: auto; }
.filter-panel .form-item { margin-bottom: 32rpx; }
.filter-panel .form-label { display: block; font-size: 28rpx; color: #333; margin-bottom: 12rpx; font-weight: 500; }
.picker-value { height: 80rpx; line-height: 80rpx; background: #f5f6fa; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; color: #333; }
.filter-actions { display: flex; gap: 20rpx; margin-top: 60rpx; }
.filter-reset { flex: 1; height: 88rpx; background: #f5f6fa; color: #666; border-radius: 12rpx; font-size: 30rpx; border: none; line-height: 88rpx; &::after { border: none; } }
.filter-confirm { flex: 1; height: 88rpx; background: #2979ff; color: #fff; border-radius: 12rpx; font-size: 30rpx; border: none; line-height: 88rpx; &::after { border: none; } }
</style>
