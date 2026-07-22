<template>
  <view class="shipment-edit-page">
    <scroll-view class="edit-scroll" scroll-y>
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="form-item">
          <text class="form-label required">出库类型</text>
          <picker :disabled="isViewMode" :range="shipmentTypeList" range-key="dictLabel" @change="onShipmentTypeChange" :value="shipmentTypeIndex">
            <view class="picker-value" :class="{ placeholder: !form.shipmentOrderType }">
              {{ shipmentTypeLabel || '请选择出库类型' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">出库日期</text>
          <picker :disabled="isViewMode" mode="date" @change="onShipmentDateChange" :value="form.shipmentDate">
            <view class="picker-value" :class="{ placeholder: !form.shipmentDate }">
              {{ form.shipmentDate || '请选择出库日期' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">采购日期</text>
          <picker :disabled="isViewMode" mode="date" @change="onPurchaseDateChange" :value="form.purchaseDate">
            <view class="picker-value" :class="{ placeholder: !form.purchaseDate }">
              {{ form.purchaseDate || '请选择采购日期' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">调拨根据</text>
          <input :disabled="isViewMode" class="form-input" v-model="form.basisNo" placeholder="请输入调拨根据"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">调拨方式</text>
          <input :disabled="isViewMode" class="form-input" v-model="form.dispatchMode" placeholder="请输入调拨方式" placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">通知机关</text>
          <input :disabled="isViewMode" class="form-input" v-model="form.noticeOrg" placeholder="请输入通知机关"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">收物单位</text>
          <input :disabled="isViewMode" class="form-input" v-model="form.receiveUnit" placeholder="请输入收物单位"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">备注</text>
          <textarea :disabled="isViewMode" class="form-textarea" v-model="form.remark" placeholder="请输入备注" :maxlength="100"  placeholder-class="input-placeholder" />
        </view>
        <!-- 审批人（草稿/已驳回时可编辑） -->
        <view class="form-item" v-if="canEdit">
          <text class="form-label required">审批人</text>
          <picker :range="userNickNames" @change="onApproverChange" :value="approverIndex">
            <view class="picker-value" :class="{ placeholder: !form.approverId }">
              {{ currentApproverName || '请选择审批人' }}
            </view>
          </picker>
        </view>
        <!-- 操作人（待审批阶段，当前用户是审批人时可指定） -->
        <view class="form-item" v-if="!isViewMode && form.shipmentOrderStatus === 1 && isCurrentApprover">
          <text class="form-label required">操作人</text>
          <picker :range="userNickNames" @change="onExecutorChange" :value="executorIndex">
            <view class="picker-value" :class="{ placeholder: !form.executorId }">
              {{ currentExecutorName || '请指定操作人' }}
            </view>
          </picker>
        </view>
        <!-- 操作人（已审批/已出库，只读） -->
        <view class="form-item" v-if="[2, 3].includes(Number(form.shipmentOrderStatus)) && form.executorId">
          <text class="form-label">操作人</text>
          <view class="picker-value" style="color: #333;">{{ getNickNameById(form.executorId) }}</view>
        </view>
        <!-- 驳回原因（已驳回状态） -->
        <view class="form-item" v-if="Number(form.shipmentOrderStatus) === -2 && form.approveRemark">
          <text class="form-label">驳回原因</text>
          <view class="picker-value" style="color: #f56c6c;">{{ form.approveRemark }}</view>
        </view>
        <!-- 关联调拨单 -->
        <view class="form-item" v-if="form.movementOrderId">
          <text class="form-label">关联调拨单</text>
          <view class="picker-value" style="color: #2979ff;" @click="goToMovementOrder">{{ form.basisNo || '查看调拨单' }}</view>
        </view>
      </view>

      <!-- 出库明细 -->
      <view class="card">
        <view class="card-title flex-between">
          <text>出库明细 ({{ form.details.length }})</text>
        </view>
        <view class="detail-tip" v-if="canEdit">
          <text class="text-secondary">选择在库器材实例执行出库，支持扫码或手动选择</text>
        </view>

        <view class="detail-actions" v-if="canEdit">
          <view class="action-card scan-action" @click="handleScan">
            <text class="action-icon">📷</text>
            <text class="action-text">扫码添加</text>
          </view>
          <view class="action-card continuous-action" @click="handleContinuousScan">
            <text class="action-icon">📷📷</text>
            <text class="action-text">连续扫码</text>
          </view>
          <view class="action-card manual-action" @click="openItemPicker">
            <text class="action-icon">➕</text>
            <text class="action-text">手动选择</text>
          </view>
        </view>

        <view v-if="!form.details.length && canEdit" class="empty-detail">
          <text class="text-secondary">暂无出库明细，请扫码或手动添加</text>
        </view>
        <view v-if="!form.details.length && !canEdit" class="empty-detail">
          <text class="text-secondary">暂无出库明细</text>
        </view>
        <view
          v-for="(detail, index) in form.details"
          :key="index"
          class="detail-card"
        >
          <view class="detail-header flex-between">
            <text class="detail-instance-code">{{ detail.instanceCode || '-' }}</text>
            <text v-if="canEdit" class="detail-remove" @click="removeDetail(index)">删除</text>
          </view>
          <view class="detail-info">
            <text class="detail-name">{{ detail.itemName || '-' }}</text>
            <text class="detail-sku text-secondary" v-if="detail.skuName">规格：{{ detail.skuName }}</text>
            <text class="detail-unit text-secondary" v-if="detail.unit">单位：{{ detail.unit }}</text>
            <text class="detail-grade text-secondary" v-if="detail.qualityGrade">质量等级：{{ detail.qualityGrade }}</text>
            <text class="detail-grade text-secondary" v-if="detail.warrantyPeriod">质保期：{{ detail.warrantyPeriod }}</text>
          </view>
          <view class="detail-location">
            <view class="location-row">
              <text class="location-label">位置</text>
              <text class="location-value">{{ getFullLocation(detail) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 200rpx"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="canEdit">
      <view class="summary-info">
        <text class="summary-text">合计：{{ form.details.length }}件</text>
      </view>
      <view class="bottom-actions">
        <button class="btn-save" @click="handleSave">暂存</button>
        <button class="btn-void" v-if="form.id" @click="handleVoid">作废</button>
        <button class="btn-submit" @click="handleSubmitApproval">提交审批</button>
      </view>
    </view>
    <view class="bottom-bar" v-else-if="!isViewMode && form.shipmentOrderStatus === 1 && isCurrentApprover">
      <view class="summary-info">
        <text class="summary-text">待审批</text>
      </view>
      <view class="bottom-actions">
        <button class="btn-reject" @click="handleReject">驳回</button>
        <button class="btn-approve" @click="handleApprove">审批通过</button>
      </view>
    </view>
    <view class="bottom-bar" v-else-if="!isViewMode && form.shipmentOrderStatus === 2 && String(form.executorId || '') === String(userStore.userId)">
      <view class="summary-info">
        <text class="summary-text">合计：{{ form.details.length }}件</text>
      </view>
      <view class="bottom-actions">
        <button class="btn-shipment" @click="handleShipment">执行出库</button>
      </view>
    </view>
    <view class="bottom-bar bottom-bar-view" v-else>
      <button class="btn-close" @click="goBack">关闭</button>
    </view>

    <!-- 手动选择器材实例弹窗 -->
    <view class="picker-mask" v-if="showItemPicker" @click="showItemPicker = false">
      <view class="picker-panel" @click.stop>
        <view class="picker-header flex-between">
          <text class="picker-title">选择在库实例</text>
          <text class="picker-close" @click="showItemPicker = false">✕</text>
        </view>
        <view class="picker-search">
          <input :disabled="isViewMode" class="search-input" v-model="instanceQuery.instanceCode" placeholder="搜索实例编码" confirm-type="search" @confirm="searchInstances" />
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view
            v-for="item in instanceList"
            :key="item.id"
            class="instance-item"
            :class="{ 'instance-selected': isInstanceSelected(item.id) }"
            @click="toggleInstance(item)"
          >
            <view class="instance-check">
              <text v-if="isInstanceSelected(item.id)">✓</text>
            </view>
            <view class="instance-info">
              <text class="instance-code">{{ item.instanceCode }}</text>
              <text class="instance-name text-secondary">{{ item.itemName }}</text>
              <text class="instance-sku text-secondary" v-if="item.skuName">{{ item.skuName }}</text>
            </view>
          </view>
          <view v-if="instanceLoading" class="loading-tip">
            <text class="text-secondary">加载中...</text>
          </view>
        </scroll-view>
        <view class="picker-footer">
          <text class="selected-count">已选 {{ selectedInstances.length }} 项</text>
          <button class="picker-confirm" @click="confirmSelectInstances">确认添加</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getShipmentOrder, addShipmentOrder, updateShipmentOrder, shipment as shipmentApi, submitForApproval, approveOrder, rejectOrder, voidOrder } from '@/api/wms/shipmentOrder'
import { getUserSelectList } from '@/api/common'
import { listItemInstance, getItemInstanceByCode } from '@/api/wms/itemInstance'
import { listInventoryDetailNoPage } from '@/api/wms/inventoryDetail'
import { useWmsStore } from '@/store/wms'
import { useUserStore } from '@/store/user'
import { parseScanContent } from '@/utils/scan'

const wmsStore = useWmsStore()
const userStore = useUserStore()

const isViewMode = ref(false)
const canEdit = computed(() => !isViewMode.value && (form.value.shipmentOrderStatus === 0 || form.value.shipmentOrderStatus === -2) && (!form.value.id || String(form.value.applicantId || '') === String(userStore.userId)))
const orderId = ref(undefined)

const form = ref({
  id: undefined,
  shipmentOrderNo: undefined,
  shipmentOrderType: undefined,
  basisNo: undefined,
  dispatchMode: undefined,
  noticeOrg: undefined,
  receiveUnit: undefined,
  purchaseDate: undefined,
  shipmentDate: undefined,
  receivableAmount: undefined,
  remark: undefined,
  totalQuantity: 0,
  shipmentOrderStatus: 0,
  approverId: undefined,
  approverName: undefined,
  executorId: undefined,
  executorName: undefined,
  approveRemark: undefined,
  movementOrderId: undefined,
  details: []
})

// 库存明细缓存（按仓库ID缓存）

// 字典
const shipmentTypeList = computed(() => wmsStore.dictMap['wms_shipment_type'] || [])

const shipmentTypeIndex = computed(() => {
  const idx = shipmentTypeList.value.findIndex(d => d.dictValue === form.value.shipmentOrderType)
  return idx >= 0 ? idx : 0
})
const shipmentTypeLabel = computed(() => {
  const item = shipmentTypeList.value.find(d => d.dictValue === form.value.shipmentOrderType)
  return item ? item.dictLabel : ''
})

// 位置展示
const getFullLocation = (detail) => {
  const parts = []
  const warehouseName = wmsStore.warehouseMap.get(detail.warehouseId)?.warehouseName
  if (warehouseName) parts.push(warehouseName)
  const areaName = detail.areaName || wmsStore.areaMap.get(detail.areaId)?.areaName
  if (areaName) parts.push(areaName)
  if (detail.rackName) parts.push(detail.rackName)
  if (detail.locationName) parts.push(detail.locationName)
  return parts.join(' / ') || '-'
}

// 用户选择相关
const userNickNames = computed(() => userList.value.map(u => u.nickName))
const approverIndex = computed(() => {
  if (!form.value.approverId) return -1
  const idx = userList.value.findIndex(u => String(u.userId) === String(form.value.approverId))
  return idx >= 0 ? idx : -1
})
const currentApproverName = computed(() => getNickNameById(form.value.approverId))
const executorIndex = computed(() => {
  if (!form.value.executorId) return -1
  const idx = userList.value.findIndex(u => String(u.userId) === String(form.value.executorId))
  return idx >= 0 ? idx : -1
})
const currentExecutorName = computed(() => getNickNameById(form.value.executorId))
const isCurrentApprover = computed(() => {
  if (!userStore.userId || !form.value.approverId) return false
  return String(userStore.userId) === String(form.value.approverId)
})
const getNickNameById = (userId) => {
  if (!userId) return ''
  const u = userList.value.find(x => String(x.userId) === String(userId))
  return u ? u.nickName : ''
}
const onApproverChange = (e) => {
  const u = userList.value[e.detail.value]
  if (u) {
    form.value.approverId = u.userId
    form.value.approverName = u.nickName
  }
}
const onExecutorChange = (e) => {
  const u = userList.value[e.detail.value]
  if (u) {
    form.value.executorId = u.userId
    form.value.executorName = u.nickName
  }
}

// 跳转关联调拨单
const goToMovementOrder = () => {
  if (!form.value.movementOrderId) return
  uni.navigateTo({ url: '/pages/movement/edit?id=' + form.value.movementOrderId + '&mode=view' })
}

// Picker 事件
const onShipmentTypeChange = (e) => {
  form.value.shipmentOrderType = shipmentTypeList.value[e.detail.value]?.dictValue
}

const onShipmentDateChange = (e) => {
  form.value.shipmentDate = e.detail.value
}



const onPurchaseDateChange = (e) => {
  form.value.purchaseDate = e.detail.value
}

// ===== 扫码 =====
const handleScan = async () => {
  try {
    const res = await uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true
    })
    // 调试：显示原始返回
    console.log('[出库扫码] typeof res:', typeof res)
    console.log('[出库扫码] Array.isArray:', Array.isArray(res))
    console.log('[出库扫码] res:', JSON.stringify(res))

    // 多格式兼容提取扫码内容
    let content = ''
    if (typeof res === 'string') {
      content = res
    } else if (res?.result) {
      content = res.result
    } else if (Array.isArray(res)) {
      const data = res[1] || res[0]
      content = data?.result || ''
      if (!content && typeof data === 'string') content = data
    }

    if (!content) {
      uni.showToast({ title: '扫码结果为空: ' + JSON.stringify(res).substring(0, 50), icon: 'none', duration: 3000 })
      return
    }

    // URL 解码
    try {
      const decoded = decodeURIComponent(content)
      if (decoded !== content) content = decoded
    } catch (e) {}

    console.log('[出库扫码] 最终内容:', content)

    const parsed = parseScanContent(content)
    console.log('[出库扫码] 解析结果:', JSON.stringify(parsed.parsed))

    if (!parsed.parsed?.instanceCode) {
      uni.showToast({ title: '未识别到实例编码', icon: 'none', duration: 2500 })
      return
    }
    await addInstanceByCode(parsed.parsed.instanceCode)
  } catch (e) {
    console.error('[出库扫码] 异常:', e)
    const msg = e?.errMsg || e?.message || String(e) || ''
    if (msg && !msg.includes('cancel')) {
      uni.showToast({ title: '扫码失败: ' + msg.substring(0, 40), icon: 'none', duration: 2500 })
    }
  }
}

const continuousScanning = ref(false)

const handleContinuousScan = async () => {
  continuousScanning.value = true
  doContinuousScan()
}

const doContinuousScan = async () => {
  if (!continuousScanning.value) return
  try {
    const res = await uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true
    })
    // 多格式兼容提取扫码内容
    let content = ''
    if (typeof res === 'string') {
      content = res
    } else if (res?.result) {
      content = res.result
    } else if (Array.isArray(res)) {
      const data = res[1] || res[0]
      content = data?.result || ''
      if (!content && typeof data === 'string') content = data
    }
    if (content) {
      // URL 解码
      try {
        const decoded = decodeURIComponent(content)
        if (decoded !== content) content = decoded
      } catch (e) {}
      const parsed = parseScanContent(content)
      const instanceCode = parsed.parsed?.instanceCode
      if (instanceCode) {
        if (form.value.details.some(d => d.instanceCode === instanceCode)) {
          uni.showToast({ title: '重复：' + instanceCode, icon: 'none' })
          uni.vibrateShort()
        } else {
          await addInstanceFromScanData(parsed.parsed)
          uni.vibrateShort()
        }
      }
    }
    // 继续扫码
    setTimeout(() => doContinuousScan(), 300)
  } catch (e) {
    console.error('[连续扫码] 异常:', e)
    // 用户取消连续扫码
    continuousScanning.value = false
  }
}

const addInstanceFromScanData = async (parsed) => {
  const instanceCode = parsed.instanceCode
  if (form.value.details.some(d => d.instanceCode === instanceCode)) {
    uni.showToast({ title: '已在单据中：' + instanceCode, icon: 'none' })
    return
  }
  try {
    const res = await getItemInstanceByCode(instanceCode, {
      unshippedOnly: true,
      instanceStatus: '在库'
    })
    const item = res.data
    if (!item || !item.id) {
      uni.showToast({ title: '未找到在库实例：' + instanceCode, icon: 'none', duration: 2000 })
      return
    }
    await addItemInstancesToShipment([item])
    uni.showToast({ title: '已添加：' + instanceCode, icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '添加失败', icon: 'none', duration: 2000 })
  }
}

const addInstanceByCode = async (instanceCode) => {
  try {
    const res = await getItemInstanceByCode(instanceCode, {
      unshippedOnly: true,
      instanceStatus: '在库'
    })
    const item = res.data
    if (!item || !item.id) {
      uni.showToast({ title: '未找到在库实例：' + instanceCode, icon: 'none', duration: 2000 })
      return
    }
    await addItemInstancesToShipment([item])
    uni.showToast({ title: '已添加：' + instanceCode, icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '添加失败', icon: 'none', duration: 2000 })
  }
}

const inventoryDetailCache = new Map()

const refreshInventoryOptions = async (warehouseId) => {
  if (!warehouseId) return
  if (inventoryDetailCache.has(warehouseId)) return
  try {
    const res = await listInventoryDetailNoPage({ warehouseId })
    inventoryDetailCache.set(warehouseId, res.data || [])
  } catch (e) {
    inventoryDetailCache.set(warehouseId, [])
  }
}

const matchInventoryDetail = (source, extraUsage = {}) => {
  const list = inventoryDetailCache.get(source.warehouseId) || []
  const candidates = list.filter(it => {
    return it.skuId === source.skuId
      && it.warehouseId === source.warehouseId
      && (!source.areaId || it.areaId === source.areaId)
  })
  return candidates.find(it => {
    const usedQuantity = form.value.details.reduce((sum, d) => {
      if (d.inventoryDetailId === it.id) return sum + Number(d.quantity || 0)
      return sum
    }, 0)
    const available = Number(it.remainQuantity || 0) - usedQuantity - Number(extraUsage[it.id] || 0)
    return available >= Number(source.quantity || 1)
  })
}

const addItemInstancesToShipment = async (items) => {
  if (!items?.length) return
  const extraUsage = {}
  const newRows = []
  for (const item of items) {
    if (form.value.details.some(d => d.itemInstanceId === item.id)) {
      throw new Error('器材实例编码 ' + item.instanceCode + ' 已添加')
    }
    await refreshInventoryOptions(item.warehouseId)
    const matched = matchInventoryDetail({ skuId: item.skuId, warehouseId: item.warehouseId, areaId: item.areaId, quantity: 1 }, extraUsage)
    if (!matched) {
      throw new Error('器材实例编码 ' + item.instanceCode + ' 未匹配到可用库存明细')
    }
    extraUsage[matched.id] = Number(extraUsage[matched.id] || 0) + 1
    newRows.push({
      id: item.id,
      itemInstanceId: item.id,
      instanceCode: item.instanceCode,
      skuId: item.skuId,
      itemName: item.itemName,
      itemCode: item.itemCode,
      skuName: item.skuName,
      unit: item.unit,
      productIdentifier: item.productIdentifier,
      qualityGrade: item.qualityGrade,
      quantity: 1,
      remainQuantity: matched.remainQuantity,
      warehouseId: item.warehouseId,
      areaId: item.areaId,
      inventoryDetailId: matched.id,
      areaName: wmsStore.areaMap.get(item.areaId)?.areaName || '',
      rackId: matched.rackId,
      rackName: matched.rackName,
      locationId: matched.locationId,
      locationName: matched.locationName,
      remark: item.remark || ''
    })
  }
  form.value.details.push(...newRows)
  recalculate()
}

// ===== 手动选择 =====
const openItemPicker = () => {
  showItemPicker.value = true
  getInstanceList()
}
const showItemPicker = ref(false)
const instanceList = ref([])
const instanceLoading = ref(false)
const instanceQuery = ref({
  pageNum: 1,
  pageSize: 20,
  instanceCode: undefined,
  instanceStatus: '在库',
  unshippedOnly: true,
  warehouseId: undefined
})
const selectedInstances = ref([])

const searchInstances = () => {
  instanceQuery.value.pageNum = 1
  getInstanceList()
}

const getInstanceList = async () => {
  instanceLoading.value = true
  try {
    const params = { ...instanceQuery.value, warehouseId: undefined }
    const res = await listItemInstance(params)
    instanceList.value = res.rows || []
  } catch (e) {
    instanceList.value = []
  } finally {
    instanceLoading.value = false
  }
}

const isInstanceSelected = (id) => {
  return selectedInstances.value.some(s => s.id === id) ||
    form.value.details.some(d => d.itemInstanceId === id)
}

const toggleInstance = (item) => {
  const idx = selectedInstances.value.findIndex(s => s.id === item.id)
  if (idx >= 0) {
    selectedInstances.value.splice(idx, 1)
  } else {
    selectedInstances.value.push(item)
  }
}

const confirmSelectInstances = async () => {
  if (!selectedInstances.value.length) {
    return uni.showToast({ title: '请选择器材实例', icon: 'none' })
  }
  try {
    await addItemInstancesToShipment(selectedInstances.value)
    selectedInstances.value = []
    showItemPicker.value = false
  } catch (e) {
    uni.showToast({ title: e.message || '添加失败', icon: 'none', duration: 2000 })
  }
}

const removeDetail = (index) => {
  form.value.details.splice(index, 1)
  recalculate()
}

const recalculate = () => {
  form.value.totalQuantity = form.value.details.length
  // 应收金额 = 明细数量合计（每个实例数量=1，暂无单价逻辑，按件数计）
  form.value.receivableAmount = form.value.details.length
}

// ===== 审批操作 =====
const userList = ref([])
const loadUserList = async () => {
  try { const res = await getUserSelectList(); userList.value = res.data || [] } catch (e) {}
}

const handleSubmitApproval = async () => {
  if (!validate()) return
  if (!form.value.details.length) return uni.showToast({ title: '请添加出库明细', icon: 'none' })
  if (!form.value.approverId) return uni.showToast({ title: '请选择审批人', icon: 'none' })
  // 先暂存
  const params = buildSubmitParams(0)
  let savedId = form.value.id
  try {
    if (params.id) { await updateShipmentOrder(params) }
    else { const res = await addShipmentOrder(params); savedId = res.data }
  } catch (e) { return }
  try {
    await submitForApproval(savedId, form.value.approverId, form.value.approverName)
    uni.showToast({ title: '已提交审批', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const handleApprove = async () => {
  if (!form.value.executorId) return uni.showToast({ title: '请先指定操作人', icon: 'none' })
  try {
    await approveOrder(form.value.id, '', form.value.executorId, form.value.executorName)
    uni.showToast({ title: '审批通过', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const handleReject = async () => {
  const { confirm, content: remark } = await uni.showModal({ title: '驳回', content: '', placeholder: '请输入驳回原因（可选）', editable: true })
  if (!confirm) return
  try {
    await rejectOrder(form.value.id, remark || '')
    uni.showToast({ title: '已驳回', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const handleVoid = async () => {
  const { confirm } = await uni.showModal({ title: '确认', content: '确认作废出库单吗？' })
  if (!confirm) return
  try {
    await voidOrder(form.value.id)
    uni.showToast({ title: '已作废', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

// ===== 保存/提交 =====
const buildSubmitDetails = () => {
  return form.value.details.map(it => ({
    id: it.id,
    shipmentOrderId: form.value.id,
    skuId: it.skuId,
    itemCode: it.itemCode,
    itemName: it.itemName,
    skuName: it.skuName,
    unit: it.unit,
    productIdentifier: it.productIdentifier,
    qualityGrade: it.qualityGrade,
    quantity: 1,
    inventoryDetailId: it.inventoryDetailId,
    itemInstanceId: it.itemInstanceId,
    instanceCode: it.instanceCode,
    warehouseId: it.warehouseId,
    areaId: it.areaId,
    rackId: it.rackId,
    locationId: it.locationId,
    remark: it.remark
  }))
}

const buildSubmitParams = (shipmentOrderStatus) => ({
  id: form.value.id,
  shipmentOrderNo: form.value.shipmentOrderNo,
  shipmentOrderStatus,
  shipmentOrderType: form.value.shipmentOrderType,
  basisNo: form.value.basisNo,
  dispatchMode: form.value.dispatchMode,
  noticeOrg: form.value.noticeOrg,
  receiveUnit: form.value.receiveUnit,
  purchaseDate: form.value.purchaseDate,
  shipmentDate: form.value.shipmentDate,
  receivableAmount: form.value.receivableAmount,
  remark: form.value.remark,
  totalQuantity: form.value.totalQuantity,
  approverId: form.value.approverId,
  approverName: form.value.approverName,
  details: buildSubmitDetails()
})

const validate = () => {
  if (!form.value.shipmentOrderType) {
    uni.showToast({ title: '请选择出库类型', icon: 'none' })
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validate()) return
  try {
    const params = buildSubmitParams(form.value.shipmentOrderStatus)
    if (params.id) {
      await updateShipmentOrder(params)
    } else {
      const res = await addShipmentOrder(params)
      form.value.id = res.data
    }
    uni.showToast({ title: '暂存成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const handleShipment = async () => {
  const { confirm } = await uni.showModal({
    title: '确认出库',
    content: `确认执行出库吗？共${form.value.details.length}项，此操作不可撤销。`
  })
  if (!confirm) return
  try {
    const res = await getShipmentOrder(form.value.id)
    const data = { ...res.data }
    await shipmentApi(data)
    uni.showToast({ title: '出库成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {}
}

const goBack = () => uni.redirectTo({ url: "/pages/shipment/list" })

// ===== 初始化 =====
const loadDetail = async (id) => {
  try {
    const res = await getShipmentOrder(id)
    const data = res.data
    form.value = {
      ...data,
      details: (data.details || []).map(it => ({
        ...it,
        itemInstanceId: it.itemInstanceId,
        instanceCode: it.instanceCode || it.itemInstanceId || '',
        itemName: it.itemName || '',
        itemCode: it.itemCode || '',
        skuName: it.skuName || '',
        unit: it.unit || '',
        quantity: Math.floor(Number(it.quantity || 1))
      }))
    }
    recalculate()
  } catch (e) {}
}

onMounted(async () => {
  await Promise.all([
    wmsStore.getDict('wms_shipment_type'),
    wmsStore.getDict('wms_shipment_status'),
    wmsStore.loadWarehouses(),
    wmsStore.loadAreas(),
    loadUserList()
  ])

  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const options = page.options || page.$page?.options || {}

  if (options.id) {
    orderId.value = options.id
    await loadDetail(options.id)
  }
  if (options.mode === 'view') {
    isViewMode.value = true
  }

  if (!form.value.shipmentOrderType && shipmentTypeList.value.length) {
    form.value.shipmentOrderType = shipmentTypeList.value[0]?.dictValue
  }
})
</script>

<style lang="scss" scoped>
.shipment-edit-page {
  min-height: 100vh;
  background-color: #f5f6fa;
}

.edit-scroll {
  height: calc(100vh - 160rpx);
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 8rpx;
}

.form-label.required::before {
  content: '*';
  color: #e43d33;
  margin-right: 4rpx;
}

.form-input {
  width: 100%;
  height: 76rpx;
  background: #ffffff;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 120rpx;
  background: #ffffff;
  border-radius: 10rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  box-sizing: border-box;
}

.picker-value {
  height: 76rpx;
  line-height: 76rpx;
  background: #ffffff;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  color: #333333;
  position: relative;
}

.picker-value::after {
  content: '▼';
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #999999;
}

.picker-value.placeholder {
  color: #c0c4cc;
}

.detail-tip {
  margin-bottom: 20rpx;
}

.detail-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  border: 2rpx dashed #d0d0d0;
}

.scan-action { border-color: #2979ff; background: #e8f0fe; }
.continuous-action { border-color: #ff9900; background: #fff8e6; }
.manual-action { border-color: #19be6b; background: #e8f8ef; }

.action-icon { font-size: 40rpx; margin-bottom: 4rpx; }
.action-text { font-size: 24rpx; color: #333333; }

.empty-detail {
  text-align: center;
  padding: 60rpx 0;
}

.detail-card {
  background: #fafbfc;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.detail-header { margin-bottom: 8rpx; }

.detail-instance-code {
  font-size: 26rpx;
  font-weight: 600;
  color: #e43d33;
}

.detail-remove { font-size: 24rpx; color: #e43d33; }

.detail-info { margin-bottom: 12rpx; }

.detail-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.detail-sku, .detail-unit, .detail-grade {
  display: block;
  font-size: 24rpx;
  margin-top: 4rpx;
}

.detail-location {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed #e8e8e8;
}

.location-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  gap: 12rpx;
}

.location-label {
  width: 80rpx;
  flex-shrink: 0;
  font-size: 24rpx;
  color: #999999;
}

.location-value {
  flex: 1;
  font-size: 24rpx;
  color: #333333;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f5f6fa;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.summary-info { display: flex; flex-direction: column; }
.summary-text { font-size: 24rpx; color: #666666; }

.bottom-actions { display: flex; gap: 16rpx; }

.btn-save {
  height: 80rpx;
  padding: 0 32rpx;
  background: #f5f6fa;
  color: #666;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: 2rpx solid #ddd;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-submit {
  height: 80rpx;
  padding: 0 32rpx;
  background: #2979ff;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-void {
  height: 80rpx;
  padding: 0 32rpx;
  background: #fff;
  color: #f56c6c;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: 2rpx solid #f56c6c;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-approve {
  height: 80rpx;
  padding: 0 32rpx;
  background: #67c23a;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-reject {
  height: 80rpx;
  padding: 0 32rpx;
  background: #fff;
  color: #f56c6c;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: 2rpx solid #f56c6c;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-shipment {
  height: 80rpx;
  padding: 0 40rpx;
  background: #e43d33;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
  &::after { border: none; }
}

.btn-close {
  width: 100%;
  height: 80rpx;
  background: #f5f6fa;
  color: #666666;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
  &::after { border: none; }
}

.picker-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.picker-panel {
  width: 100%;
  max-height: 80vh;
  background: #f5f6fa;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.picker-header {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.picker-title { font-size: 32rpx; font-weight: 600; color: #333333; }
.picker-close { font-size: 36rpx; color: #999999; padding: 8rpx; }
.picker-search { padding: 16rpx 32rpx; }

.picker-list {
  flex: 1;
  padding: 0 32rpx;
  max-height: 50vh;
}

.instance-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 16rpx;
}

.instance-selected {
  background: #fef0ef;
  border-radius: 8rpx;
  padding: 20rpx 12rpx;
  margin: 0 -12rpx;
}

.instance-check {
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid #d0d0d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #e43d33;
  flex-shrink: 0;
}

.instance-selected .instance-check {
  border-color: #e43d33;
  background: #e43d33;
  color: #ffffff;
}

.instance-info { flex: 1; }

.instance-code { display: block; font-size: 28rpx; font-weight: 500; color: #333333; }
.instance-name, .instance-sku { display: block; font-size: 24rpx; margin-top: 4rpx; }

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.selected-count { font-size: 26rpx; color: #666666; }

.picker-confirm {
  padding: 0 60rpx;
  height: 80rpx;
  background: #e43d33;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
  &::after { border: none; }
}
.auto-calc { background: #f0f9eb; color: #67c23a; font-weight: 600; }
.input-placeholder { color: #c0c4cc; }
</style>
