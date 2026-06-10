<template>
  <view class="check-edit-page">
    <scroll-view class="edit-scroll" scroll-y>
      <!-- 盘点范围 -->
      <view class="card">
        <view class="card-title">盘点范围</view>
        <view class="form-item">
          <text class="form-label required">范围类型</text>
          <picker :range="scopeTypeList" range-key="dictLabel" @change="onScopeTypeChange" :value="scopeTypeIndex">
            <view class="picker-value" :class="{ placeholder: !form.checkScopeType }">
              {{ scopeTypeLabel || '请选择范围类型' }}
            </view>
          </picker>
        </view>
        <view class="form-item" v-if="form.checkScopeType === 'warehouse'">
          <text class="form-label required">仓库</text>
          <picker :range="warehousePickerList" range-key="warehouseName" @change="onWarehouseChange" :value="warehouseIndex">
            <view class="picker-value" :class="{ placeholder: !form.warehouseId }">{{ currentWarehouseName || '请选择仓库' }}</view>
          </picker>
        </view>
        <view class="form-item" v-if="form.checkScopeType === 'area'">
          <text class="form-label required">库区</text>
          <picker :range="areaPickerList" range-key="areaName" @change="onAreaChange" :value="areaIndex">
            <view class="picker-value" :class="{ placeholder: !form.areaId }">{{ currentAreaName || '请选择库区' }}</view>
          </picker>
        </view>
        <view class="form-item" v-if="form.checkScopeType === 'rack'">
          <text class="form-label required">货架</text>
          <picker :range="rackPickerList" range-key="rackName" @change="onRackChange" :value="rackIndex">
            <view class="picker-value" :class="{ placeholder: !form.rackId }">{{ currentRackName || '请选择货架' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">盘点日期</text>
          <picker mode="date" @change="onCheckDateChange" :value="form.checkDate">
            <view class="picker-value" :class="{ placeholder: !form.checkDate }">
              {{ form.checkDate || '请选择盘点日期' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">盘点人</text>
          <input class="form-input" v-model="form.checkerName" placeholder="请输入盘点人"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">备注</text>
          <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注" :maxlength="100"  placeholder-class="input-placeholder" />
        </view>
        <view class="detail-actions" v-if="!isViewMode && !form.details.length">
          <view class="action-card manual-action" style="flex:1" @click="loadInventoryDetails">
            <text class="action-icon">📋</text>
            <text class="action-text">加载库存明细</text>
          </view>
        </view>
      </view>

      <!-- 盘点明细 -->
      <view class="card" v-if="form.details.length">
        <view class="card-title flex-between">
          <text>盘点明细 ({{ form.details.length }})</text>
          <text :class="['tag', totalDiff >= 0 ? 'tag-success' : 'tag-danger']">
            差异合计：{{ Math.round(totalDiff) }}
          </text>
        </view>
        <view v-for="(detail, index) in form.details" :key="index" class="detail-card">
          <view class="detail-header flex-between">
            <text class="detail-name">{{ detail.instanceCode || '-' }}</text>
            <text class="detail-sku text-secondary">{{ detail.itemName || detail.skuName || '-' }}</text>
          </view>
          <view class="detail-nums">
            <view class="num-row">
              <text class="num-label">系统数</text>
              <text class="num-value">{{ Math.round(detail.quantity || 0) }}</text>
            </view>
            <view class="num-row" v-if="!isViewMode">
              <text class="num-label">实盘数</text>
              <input class="num-input" v-model="detail.checkQuantity" placeholder="0" @blur="calcDifference(detail)" />
            </view>
            <view class="num-row" v-else>
              <text class="num-label">实盘数</text>
              <text class="num-value">{{ Math.round(detail.checkQuantity || 0) }}</text>
            </view>
            <view class="num-row">
              <text class="num-label">差异</text>
              <text :class="['num-value', detail.differenceQuantity > 0 ? 'text-success' : detail.differenceQuantity < 0 ? 'text-danger' : '']">
                {{ Math.round(detail.differenceQuantity || 0) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 200rpx"></view>
    </scroll-view>

    <view class="bottom-bar" v-if="!isViewMode">
      <view class="summary-info">
        <text class="summary-text">明细：{{ form.details.length }}项</text>
      </view>
      <view class="bottom-actions">
        <button class="btn-save" @click="handleSave">暂存</button>
        <button class="btn-check" @click="handleCheck">执行盘点</button>
      </view>
    </view>
    <view class="bottom-bar bottom-bar-view" v-else>
      <button class="btn-close" @click="goBack">关闭</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCheckOrder, addCheckOrder, updateCheckOrder, checkOrder } from '@/api/wms/checkOrder'
import { listInventoryDetail } from '@/api/wms/inventoryDetail'
import { listRackNoPage } from '@/api/wms/rack'
import { useWmsStore } from '@/store/wms'

const wmsStore = useWmsStore()
const isViewMode = ref(false)
const orderId = ref(undefined)

const form = ref({
  id: undefined,
  checkOrderNo: undefined,
  checkScopeType: 'warehouse',
  checkOrderStatus: 0,
  checkOrderTotal: 0,
  warehouseId: undefined,
  areaId: undefined,
  rackId: undefined,
  checkDate: undefined,
  checkerName: undefined,
  reviewerName: undefined,
  remark: undefined,
  details: []
})

const scopeTypeList = computed(() => wmsStore.dictMap['wms_check_scope_type'] || [])
const scopeTypeIndex = computed(() => Math.max(0, scopeTypeList.value.findIndex(d => d.dictValue === form.value.checkScopeType)))
const scopeTypeLabel = computed(() => scopeTypeList.value.find(d => d.dictValue === form.value.checkScopeType)?.dictLabel || '')

const warehousePickerList = computed(() => wmsStore.warehouseList)
const warehouseIndex = computed(() => warehousePickerList.value.findIndex(w => w.id === form.value.warehouseId))
const currentWarehouseName = computed(() => wmsStore.warehouseMap.get(form.value.warehouseId)?.warehouseName || '')

const areaPickerList = computed(() => wmsStore.areaList)
const areaIndex = computed(() => areaPickerList.value.findIndex(a => a.id === form.value.areaId))
const currentAreaName = computed(() => wmsStore.areaMap.get(form.value.areaId)?.areaName || '')

const rackPickerList = ref([])
const rackIndex = computed(() => rackPickerList.value.findIndex(r => r.id === form.value.rackId))
const currentRackName = computed(() => rackPickerList.value.find(r => r.id === form.value.rackId)?.rackName || '')

const totalDiff = computed(() => {
  let sum = 0
  form.value.details.forEach(d => { sum += Number(d.differenceQuantity || 0) })
  return sum
})

const onCheckDateChange = (e) => {
  form.value.checkDate = e.detail.value
}

const onScopeTypeChange = (e) => {
  form.value.checkScopeType = scopeTypeList.value[e.detail.value]?.dictValue
  form.value.warehouseId = undefined
  form.value.areaId = undefined
  form.value.rackId = undefined
  form.value.details = []
}

const onWarehouseChange = (e) => {
  form.value.warehouseId = warehousePickerList.value[e.detail.value]?.id
  form.value.details = []
}

const onAreaChange = (e) => {
  form.value.areaId = areaPickerList.value[e.detail.value]?.id
  form.value.details = []
  loadRacksByArea(form.value.areaId)
}

const onRackChange = (e) => {
  form.value.rackId = rackPickerList.value[e.detail.value]?.id
  form.value.details = []
}

const loadRacksByArea = async (areaId) => {
  if (!areaId) { rackPickerList.value = []; return }
  try {
    const res = await listRackNoPage({ areaId })
    rackPickerList.value = res.data || []
  } catch (e) { rackPickerList.value = [] }
}

const loadInventoryDetails = async () => {
  if (!form.value.checkScopeType) return uni.showToast({ title: '请选择范围类型', icon: 'none' })
  if (form.value.checkScopeType === 'warehouse' && !form.value.warehouseId) return uni.showToast({ title: '请选择仓库', icon: 'none' })
  if (form.value.checkScopeType === 'area' && !form.value.areaId) return uni.showToast({ title: '请选择库区', icon: 'none' })
  if (form.value.checkScopeType === 'rack' && !form.value.rackId) return uni.showToast({ title: '请选择货架', icon: 'none' })

  try {
    const query = { pageNum: 1, pageSize: 500 }
    if (form.value.warehouseId) query.warehouseId = form.value.warehouseId
    if (form.value.areaId) query.areaId = form.value.areaId
    if (form.value.rackId) query.rackId = form.value.rackId
    const res = await listInventoryDetail(query)
    const rows = res.rows || []
    form.value.details = rows.map(it => ({
      skuId: it.skuId,
      instanceCode: it.instanceCode || '',
      itemCode: it.itemCode || '',
      itemName: it.itemName || '',
      skuName: it.skuName || '',
      quantity: it.remainQuantity || it.quantity || 0,
      checkQuantity: it.remainQuantity || it.quantity || 0,
      differenceQuantity: 0,
      itemInstanceId: it.itemInstanceId,
      boxId: it.boxId,
      warehouseId: it.warehouseId,
      areaId: it.areaId,
      rackId: it.rackId,
      locationId: it.locationId,
      inventoryDetailId: it.id
    }))
    uni.showToast({ title: `已加载${form.value.details.length}条库存明细`, icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '加载库存明细失败', icon: 'none' })
  }
}

const calcDifference = (detail) => {
  const sys = Number(detail.quantity || 0)
  detail.checkQuantity = Math.floor(Number(detail.checkQuantity || 0))
  const check = Number(detail.checkQuantity || 0)
  detail.differenceQuantity = Math.floor(check - sys)
}

const buildSubmitDetails = () => form.value.details.map(it => ({
  id: it.id, checkOrderId: form.value.id, skuId: it.skuId,
  quantity: it.quantity, checkQuantity: it.checkQuantity,
  differenceQuantity: it.differenceQuantity,
  itemInstanceId: it.itemInstanceId, boxId: it.boxId
}))

const buildSubmitParams = (checkOrderStatus) => ({
  id: form.value.id, checkOrderNo: form.value.checkOrderNo, checkOrderStatus,
  checkScopeType: form.value.checkScopeType,
  checkOrderTotal: totalDiff.value,
  warehouseId: form.value.warehouseId, areaId: form.value.areaId, rackId: form.value.rackId,
  checkDate: form.value.checkDate,
  checkerName: form.value.checkerName, reviewerName: form.value.reviewerName,
  remark: form.value.remark, details: buildSubmitDetails()
})

const validate = () => {
  if (!form.value.checkScopeType) { uni.showToast({ title: '请选择范围类型', icon: 'none' }); return false }
  return true
}

const handleSave = async () => {
  if (!validate()) return
  try {
    const params = buildSubmitParams(0)
    if (params.id) await updateCheckOrder(params)
    else await addCheckOrder(params)
    uni.showToast({ title: '暂存成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const handleCheck = async () => {
  if (!validate()) return
  if (!form.value.details.length) return uni.showToast({ title: '请加载库存明细', icon: 'none' })
  const { confirm } = await uni.showModal({ title: '确认盘点', content: `确认执行盘点吗？共${form.value.details.length}项` })
  if (!confirm) return
  try {
    const params = buildSubmitParams(form.value.checkOrderStatus)
    await checkOrder(params)
    uni.showToast({ title: '盘点成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const goBack = () => uni.redirectTo({ url: "/pages/check/list" })

const loadDetail = async (id) => {
  try {
    const res = await getCheckOrder(id)
    const data = res.data
    form.value = {
      ...data,
      details: (data.details || []).map(it => ({
        ...it,
        instanceCode: it.instanceCode || it.itemInstance?.instanceCode || '',
        itemCode: it.itemCode || it.itemSku?.item?.itemCode || '',
        quantity: Number(it.quantity || 0),
        checkQuantity: Number(it.checkQuantity || 0),
        differenceQuantity: Number(it.differenceQuantity || 0)
      }))
    }
    if (form.value.areaId) loadRacksByArea(form.value.areaId)
  } catch (e) {}
}

onMounted(async () => {
  await Promise.all([
    wmsStore.getDict('wms_check_status'),
    wmsStore.getDict('wms_check_scope_type'),
    wmsStore.loadWarehouses(),
    wmsStore.loadAreas()
  ])
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const options = page.options || page.$page?.options || {}
  if (options.id) { orderId.value = options.id; await loadDetail(options.id) }
  if (options.mode === 'view') isViewMode.value = true
})
</script>

<style lang="scss" scoped>
.check-edit-page { min-height: 100vh; background-color: #f5f6fa; }
.edit-scroll { height: calc(100vh - 160rpx); }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666666; margin-bottom: 8rpx; }
.form-label.required::before { content: '*'; color: #e43d33; margin-right: 4rpx; }
.form-input { width: 100%; height: 76rpx; background: #ffffff; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; box-sizing: border-box; }
.form-textarea { width: 100%; height: 120rpx; background: #ffffff; border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; box-sizing: border-box; }
.picker-value { height: 76rpx; line-height: 76rpx; background: #ffffff; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; color: #333333; }
.picker-value.placeholder { color: #c0c4cc; }
.detail-actions { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.action-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20rpx 12rpx; background: #f5f6fa; border-radius: 12rpx; border: 2rpx dashed #d0d0d0; }
.manual-action { border-color: #ff9900; background: #fff8e6; }
.action-icon { font-size: 40rpx; margin-bottom: 4rpx; }
.action-text { font-size: 24rpx; color: #333333; }
.detail-card { background: #fafbfc; border: 2rpx solid #e8e8e8; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.detail-header { margin-bottom: 12rpx; }
.detail-name { font-size: 28rpx; font-weight: 500; color: #333333; }
.detail-sku { font-size: 24rpx; }
.detail-nums { display: flex; gap: 16rpx; }
.num-row { flex: 1; display: flex; flex-direction: column; align-items: center; }
.num-label { font-size: 22rpx; color: #999999; margin-bottom: 8rpx; }
.num-value { font-size: 28rpx; font-weight: 600; color: #333333; }
.num-input { width: 100%; height: 64rpx; background: #f5f6fa; border-radius: 8rpx; padding: 0 16rpx; font-size: 28rpx; border: 2rpx solid #ff9900; box-sizing: border-box; text-align: center; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #f5f6fa; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06); display: flex; align-items: center; justify-content: space-between; z-index: 100; }
.summary-info { display: flex; flex-direction: column; }
.summary-text { font-size: 24rpx; color: #666666; }
.bottom-actions { display: flex; gap: 16rpx; }
.btn-save { height: 80rpx; padding: 0 40rpx; background: #f5f6fa; color: #ff9900; border-radius: 12rpx; font-size: 28rpx; border: 2rpx solid #ff9900; line-height: 80rpx; &::after { border: none; } }
.btn-check { height: 80rpx; padding: 0 40rpx; background: #ff9900; color: #ffffff; border-radius: 12rpx; font-size: 28rpx; border: none; line-height: 80rpx; &::after { border: none; } }
.btn-close { width: 100%; height: 80rpx; background: #f5f6fa; color: #666666; border-radius: 12rpx; font-size: 28rpx; border: none; line-height: 80rpx; &::after { border: none; } }
.input-placeholder { color: #c0c4cc; }
</style>
