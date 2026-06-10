<template>
  <view class="receipt-edit-page">
    <scroll-view class="edit-scroll" scroll-y>
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="form-item">
          <text class="form-label required">入库类型</text>
          <picker :range="receiptTypeList" range-key="dictLabel" @change="onReceiptTypeChange" :value="receiptTypeIndex">
            <view class="picker-value" :class="{ placeholder: !form.receiptOrderType }">
              {{ receiptTypeLabel || '请选择入库类型' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label required">仓库</text>
          <picker :range="warehousePickerList" range-key="warehouseName" @change="onWarehouseChange" :value="warehouseIndex">
            <view class="picker-value" :class="{ placeholder: !form.warehouseId }">
              {{ currentWarehouseName || '请选择仓库' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label required">库区</text>
          <picker :range="areaPickerList" range-key="areaName" @change="onAreaChange" :value="areaIndex" :disabled="!form.warehouseId">
            <view class="picker-value" :class="{ placeholder: !form.areaId }">
              {{ currentAreaName || '请选择库区' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">调拨根据</text>
          <input class="form-input" v-model="form.basisNo" placeholder="请输入调拨根据"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">调拨方式</text>
          <picker :range="dispatchModeList" range-key="dictLabel" @change="onDispatchModeChange" :value="dispatchModeIndex">
            <view class="picker-value" :class="{ placeholder: !form.dispatchMode }">
              {{ dispatchModeLabel || '请选择调拨方式' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">通知机关</text>
          <input class="form-input" v-model="form.noticeOrg" placeholder="请输入通知机关"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">收物单位</text>
          <input class="form-input" v-model="form.receiveUnit" placeholder="请输入收物单位"  placeholder-class="input-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">采购日期</text>
          <picker mode="date" @change="onPurchaseDateChange" :value="form.purchaseDate">
            <view class="picker-value" :class="{ placeholder: !form.purchaseDate }">
              {{ form.purchaseDate || '请选择采购日期' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">入库日期</text>
          <picker mode="date" @change="onReceiptDateChange" :value="form.receiptDate">
            <view class="picker-value" :class="{ placeholder: !form.receiptDate }">
              {{ form.receiptDate || '请选择入库日期' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">备注</text>
          <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注" :maxlength="100"  placeholder-class="input-placeholder" />
        </view>
      </view>

      <!-- 入库明细 -->
      <view class="card">
        <view class="card-title flex-between">
          <text>入库明细 ({{ form.details.length }})</text>
        </view>
        <view class="detail-tip">
          <text class="text-secondary">按器材实例执行入库，支持扫码或手动选择</text>
        </view>

        <!-- 操作按钮 -->
        <view class="detail-actions" v-if="!isViewMode">
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

        <!-- 明细列表 -->
        <view v-if="!form.details.length" class="empty-detail">
          <text class="text-secondary">暂无入库明细，请扫码或手动添加</text>
        </view>
        <view
          v-for="(detail, index) in form.details"
          :key="index"
          class="detail-card"
        >
          <view class="detail-header flex-between">
            <text class="detail-instance-code">{{ detail.instanceCode || '-' }}</text>
            <text v-if="!isViewMode" class="detail-remove" @click="removeDetail(index)">删除</text>
          </view>
          <view class="detail-info">
            <text class="detail-name">{{ detail.itemName || '-' }}</text>
            <text class="detail-sku text-secondary" v-if="detail.skuName">规格：{{ detail.skuName }}</text>
            <text class="detail-unit text-secondary" v-if="detail.unit">单位：{{ detail.unit }}</text>
            <text class="detail-grade text-secondary" v-if="detail.qualityGrade">等级：{{ detail.qualityGrade }}</text>
          </view>
          <!-- 货架/货位选择 -->
          <view class="detail-location" v-if="!isViewMode">
            <view class="location-row">
              <text class="location-label">货架</text>
              <picker :range="getRackOptions(detail)" range-key="rackName" @change="(e) => onRackChange(detail, e)">
                <view class="picker-value picker-small" :class="{ placeholder: !detail.rackId }">
                  {{ getRackName(detail) || '选择货架' }}
                </view>
              </picker>
            </view>
            <view class="location-row">
              <text class="location-label">货位</text>
              <picker :range="getLocationOptions(detail)" range-key="locationName" @change="(e) => onLocationChange(detail, e)" :disabled="!detail.rackId">
                <view class="picker-value picker-small" :class="{ placeholder: !detail.locationId }">
                  {{ getLocationName(detail) || '选择货位' }}
                </view>
              </picker>
            </view>
            <view class="location-row">
              <text class="location-label">箱码</text>
              <input class="location-input" v-model="detail.boxCode" placeholder="选填" />
            </view>
          </view>
          <view class="detail-location" v-else>
            <view class="location-row">
              <text class="location-label">位置</text>
              <text class="location-value">{{ getFullLocation(detail) }}</text>
            </view>
          </view>
          <!-- 单价 -->
          <view class="detail-price" v-if="!isViewMode">
            <view class="location-row">
              <text class="location-label">单价</text>
              <input class="location-input" type="digit" v-model="detail.unitPrice" placeholder="0.00" @blur="calcLineAmount(detail)" />
            </view>
            <view class="location-row" v-if="detail.lineAmount">
              <text class="location-label">总价</text>
              <text class="location-value">¥{{ Number(detail.lineAmount || 0).toFixed(2) }}</text>
            </view>
          </view>
          <view class="detail-price" v-else>
            <view class="location-row" v-if="detail.unitPrice">
              <text class="location-label">单价</text>
              <text class="location-value">¥{{ Number(detail.unitPrice).toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 200rpx"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="!isViewMode">
      <view class="summary-info">
        <text class="summary-text">合计：{{ form.details.length }}件</text>
        <text class="summary-amount">¥{{ Number(form.payableAmount || 0).toFixed(2) }}</text>
      </view>
      <view class="bottom-actions">
        <button class="btn-save" @click="handleSave">暂存</button>
        <button class="btn-warehousing" @click="handleWarehousing">完成入库</button>
      </view>
    </view>
    <view class="bottom-bar bottom-bar-view" v-else>
      <button class="btn-close" @click="goBack">关闭</button>
    </view>

    <!-- 手动选择器材实例弹窗 -->
    <view class="picker-mask" v-if="showItemPicker" @click="showItemPicker = false">
      <view class="picker-panel" @click.stop>
        <view class="picker-header flex-between">
          <text class="picker-title">选择器材实例</text>
          <text class="picker-close" @click="showItemPicker = false">✕</text>
        </view>
        <view class="picker-search">
          <input class="search-input" v-model="instanceQuery.instanceCode" placeholder="搜索实例编码" confirm-type="search" @confirm="searchInstances" />
        </view>
        <scroll-view class="picker-list" scroll-y @scrolltolower="loadMoreInstances">
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
    <!-- 扫码结果预览弹窗 -->
    <view class="picker-mask" v-if="showScanPreview" @click="showScanPreview = false">
      <view class="scan-preview-panel" @click.stop>
        <view class="picker-header flex-between">
          <text class="picker-title">扫码识别结果</text>
          <text class="picker-close" @click="showScanPreview = false">✕</text>
        </view>
        <scroll-view class="scan-preview-content" scroll-y>
          <view class="scan-raw-card">
            <text class="scan-raw-label">原始内容</text>
            <text class="scan-raw-text">{{ scanPreview.rawContent }}</text>
          </view>
          <view class="scan-parsed-card" v-if="scanPreview.parsed">
            <view class="card-title">解析结果</view>
            <view class="scan-info-row" v-if="scanPreview.parsed.instanceCode">
              <text class="scan-info-label">实例编码</text>
              <text class="scan-info-value">{{ scanPreview.parsed.instanceCode }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.itemName">
              <text class="scan-info-label">器材名称</text>
              <text class="scan-info-value">{{ scanPreview.parsed.itemName }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.skuName">
              <text class="scan-info-label">规格型号</text>
              <text class="scan-info-value">{{ scanPreview.parsed.skuName }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.itemCode">
              <text class="scan-info-label">器材编码</text>
              <text class="scan-info-value">{{ scanPreview.parsed.itemCode }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.unit">
              <text class="scan-info-label">单位</text>
              <text class="scan-info-value">{{ scanPreview.parsed.unit }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.qualityGrade">
              <text class="scan-info-label">质量等级</text>
              <text class="scan-info-value">{{ scanPreview.parsed.qualityGrade }}</text>
            </view>
            <view class="scan-info-row" v-if="scanPreview.parsed.boxCode">
              <text class="scan-info-label">箱码</text>
              <text class="scan-info-value">{{ scanPreview.parsed.boxCode }}</text>
            </view>
            <view class="scan-info-row" v-for="(value, key) in scanPreview.extraFields" :key="key">
              <text class="scan-info-label">{{ key }}</text>
              <text class="scan-info-value">{{ value }}</text>
            </view>
          </view>
          <view class="scan-status" v-if="scanPreview.status">
            <text :class="['tag', scanPreview.statusClass]">{{ scanPreview.status }}</text>
          </view>
        </scroll-view>
        <view class="scan-preview-footer">
          <button class="scan-btn-cancel" @click="showScanPreview = false">取消</button>
          <button class="scan-btn-confirm" @click="confirmScanAdd" :disabled="!scanPreview.canAdd">确认添加</button>
        </view>
      </view>
    </view>

    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getReceiptOrder, addReceiptOrder, updateReceiptOrder, warehousing } from '@/api/wms/receiptOrder'
import { getItemInstanceByCode, listItemInstance } from '@/api/wms/itemInstance'
import { listRackNoPage } from '@/api/wms/rack'
import { listLocationNoPage } from '@/api/wms/location'
import { useWmsStore } from '@/store/wms'

const wmsStore = useWmsStore()

const props = defineProps({})
const isViewMode = ref(false)
const orderId = ref(undefined)
// 扫码预览
const showScanPreview = ref(false)
const scanPreview = ref({
  rawContent: '',
  parsed: null,
  extraFields: {},
  status: '',
  statusClass: '',
  canAdd: false,
  instanceData: null
})

// 表单数据
const form = ref({
  id: undefined,
  receiptOrderNo: undefined,
  receiptOrderType: undefined,
  basisNo: undefined,
  dispatchMode: undefined,
  noticeOrg: undefined,
  receiveUnit: undefined,
  purchaseDate: undefined,
  receiptDate: undefined,
  remark: undefined,
  payableAmount: 0,
  totalQuantity: 0,
  receiptOrderStatus: 0,
  warehouseId: undefined,
  areaId: undefined,
  details: []
})

// 字典数据
const receiptTypeList = computed(() => wmsStore.dictMap['wms_receipt_type'] || [])
const dispatchModeList = computed(() => wmsStore.dictMap['wms_dispatch_mode'] || [])

const receiptTypeIndex = computed(() => {
  const idx = receiptTypeList.value.findIndex(d => d.dictValue === form.value.receiptOrderType)
  return idx >= 0 ? idx : 0
})
const receiptTypeLabel = computed(() => {
  const item = receiptTypeList.value.find(d => d.dictValue === form.value.receiptOrderType)
  return item ? item.dictLabel : ''
})
const dispatchModeIndex = computed(() => {
  const idx = dispatchModeList.value.findIndex(d => d.dictValue === form.value.dispatchMode)
  return idx >= 0 ? idx : 0
})
const dispatchModeLabel = computed(() => {
  const item = dispatchModeList.value.find(d => d.dictValue === form.value.dispatchMode)
  return item ? item.dictLabel : ''
})

// 仓库/库区选择
const warehousePickerList = computed(() => wmsStore.warehouseList)
const warehouseIndex = computed(() => {
  return warehousePickerList.value.findIndex(w => w.id === form.value.warehouseId)
})
const currentWarehouseName = computed(() => {
  return wmsStore.warehouseMap.get(form.value.warehouseId)?.warehouseName || ''
})

const areaPickerList = computed(() => {
  if (!form.value.warehouseId) return []
  return wmsStore.getAreasByWarehouseId(form.value.warehouseId)
})
const areaIndex = computed(() => {
  return areaPickerList.value.findIndex(a => a.id === form.value.areaId)
})
const currentAreaName = computed(() => {
  return wmsStore.areaMap.get(form.value.areaId)?.areaName || ''
})

// 货架/货位数据（按需加载）
const rackDataMap = ref({})  // { areaId: [racks] }
const locationDataMap = ref({}) // { rackId: [locations] }

const getRackOptions = (detail) => {
  const areaId = form.value.areaId
  return rackDataMap.value[areaId] || []
}

const getRackName = (detail) => {
  const racks = getRackOptions(detail)
  const rack = racks.find(r => r.id === detail.rackId)
  return rack ? rack.rackName : ''
}

const getLocationOptions = (detail) => {
  return locationDataMap.value[detail.rackId] || []
}

const getLocationName = (detail) => {
  const locs = getLocationOptions(detail)
  const loc = locs.find(l => l.id === detail.locationId)
  return loc ? loc.locationName : ''
}

const getFullLocation = (detail) => {
  const parts = []
  if (currentWarehouseName.value) parts.push(currentWarehouseName.value)
  if (currentAreaName.value) parts.push(currentAreaName.value)
  if (detail.rackId) parts.push(getRackName(detail))
  if (detail.locationId) parts.push(getLocationName(detail))
  return parts.join(' / ') || '-'
}

// 加载货架
const loadRacks = async (areaId) => {
  if (!areaId || rackDataMap.value[areaId]) return
  try {
    const res = await listRackNoPage({ areaId })
    rackDataMap.value[areaId] = res.data || []
  } catch (e) {
    rackDataMap.value[areaId] = []
  }
}

// 加载货位
const loadLocations = async (rackId) => {
  if (!rackId || locationDataMap.value[rackId]) return
  try {
    const res = await listLocationNoPage({ rackId })
    locationDataMap.value[rackId] = res.data || []
  } catch (e) {
    locationDataMap.value[rackId] = []
  }
}

// Picker 事件
const onReceiptTypeChange = (e) => {
  const idx = e.detail.value
  form.value.receiptOrderType = receiptTypeList.value[idx]?.dictValue
}

const onWarehouseChange = (e) => {
  const idx = e.detail.value
  form.value.warehouseId = warehousePickerList.value[idx]?.id
  form.value.areaId = undefined
  // 清除明细中的位置
  form.value.details.forEach(d => {
    d.rackId = undefined
    d.locationId = undefined
  })
  loadRacks(form.value.areaId)
}

const onAreaChange = (e) => {
  const idx = e.detail.value
  form.value.areaId = areaPickerList.value[idx]?.id
  // 清除明细中的位置
  form.value.details.forEach(d => {
    d.rackId = undefined
    d.locationId = undefined
  })
  loadRacks(form.value.areaId)
}

const onDispatchModeChange = (e) => {
  const idx = e.detail.value
  form.value.dispatchMode = dispatchModeList.value[idx]?.dictValue
}

const onPurchaseDateChange = (e) => {
  form.value.purchaseDate = e.detail.value
}

const onReceiptDateChange = (e) => {
  form.value.receiptDate = e.detail.value
}

const onRackChange = async (detail, e) => {
  const idx = e.detail.value
  const rack = getRackOptions(detail)[idx]
  detail.rackId = rack?.id
  detail.locationId = undefined
  await loadLocations(rack?.id)
}

const onLocationChange = (detail, e) => {
  const idx = e.detail.value
  const loc = getLocationOptions(detail)[idx]
  detail.locationId = loc?.id
}

// ===== 扫码功能 =====
// 解析扫码内容
const parseScanContent = (content) => {
  const result = {
    rawContent: content,
    parsed: null,
    extraFields: {},
    status: '',
    statusClass: '',
    canAdd: false,
    instanceData: null
  }
  
  if (!content) {
    result.status = '扫码内容为空'
    result.statusClass = 'tag-danger'
    return result
  }
  
  // 尝试解析 JSON
  try {
    const json = JSON.parse(content)
    if (typeof json === 'object' && json !== null) {
      result.parsed = {
        instanceCode: json.instanceCode || json.instance_code || json.code || '',
        itemName: json.itemName || json.item_name || json.name || '',
        skuName: json.skuName || json.sku_name || json.sku || json.spec || '',
        itemCode: json.itemCode || json.item_code || '',
        unit: json.unit || '',
        qualityGrade: json.qualityGrade || json.quality_grade || json.grade || '',
        boxCode: json.boxCode || json.box_code || ''
      }
      // 收集额外字段
      const knownKeys = ['instanceCode', 'instance_code', 'code', 'itemName', 'item_name', 'name',
        'skuName', 'sku_name', 'sku', 'spec', 'itemCode', 'item_code', 'unit',
        'qualityGrade', 'quality_grade', 'grade', 'boxCode', 'box_code']
      Object.keys(json).forEach(key => {
        if (!knownKeys.includes(key) && typeof json[key] !== 'object') {
          result.extraFields[key] = json[key]
        }
      })
      if (result.parsed.instanceCode) {
        result.status = '已识别实例编码'
        result.statusClass = 'tag-success'
        result.canAdd = true
      } else {
        result.status = '未找到实例编码字段'
        result.statusClass = 'tag-warning'
      }
      return result
    }
  } catch (e) {
    // 不是 JSON，继续尝试其他格式
  }
  
  // 尝试解析 key=value 格式（支持 ; , | & 换行 分隔，也支持单个 key=value）
  if (content.includes('=')) {
    const separators = [';', ',', '|', '&', '\n']
    let pairs = [content]
    for (const sep of separators) {
      if (content.includes(sep)) {
        pairs = content.split(sep)
        break
      }
    }
    const obj = {}
    pairs.forEach(pair => {
      const eqIndex = pair.indexOf('=')
      if (eqIndex > 0) {
        const key = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        if (key && value) obj[key] = value
      }
    })
    if (Object.keys(obj).length > 0) {
      result.parsed = {
        instanceCode: obj.instanceCode || obj.instance_code || obj.code || obj.id || '',
        itemName: obj.itemName || obj.item_name || obj.name || '',
        skuName: obj.skuName || obj.sku_name || obj.sku || obj.spec || '',
        itemCode: obj.itemCode || obj.item_code || '',
        unit: obj.unit || '',
        qualityGrade: obj.qualityGrade || obj.quality_grade || obj.grade || '',
        boxCode: obj.boxCode || obj.box_code || ''
      }
      if (result.parsed.instanceCode) {
        result.status = '已识别实例编码（键值对格式）'
        result.statusClass = 'tag-success'
        result.canAdd = true
      }
      return result
    }
  }
  
  // 纯文本 - 当作实例编码
  result.parsed = { instanceCode: content }
  result.status = '将作为实例编码处理'
  result.statusClass = 'tag-info'
  result.canAdd = true
  return result
}

const handleScan = async () => {
  if (!form.value.warehouseId || !form.value.areaId) {
    return uni.showToast({ title: '请先选择仓库和库区', icon: 'none' })
  }
  try {
    const res = await uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true
    })
    // 调试：显示原始返回类型和结构
    console.log('[扫码] typeof res:', typeof res)
    console.log('[扫码] Array.isArray:', Array.isArray(res))
    console.log('[扫码] res:', JSON.stringify(res))
    console.log('[扫码] res.result:', res?.result)

    // 多格式兼容提取扫码内容
    let content = ''
    if (typeof res === 'string') {
      // 直接返回字符串
      content = res
    } else if (res?.result) {
      // 直接返回对象 { result: 'xxx' }
      content = res.result
    } else if (Array.isArray(res)) {
      // 数组格式 [err, { result: 'xxx' }]
      const data = res[1] || res[0]
      content = data?.result || ''
      if (!content && typeof data === 'string') content = data
    }

    if (!content) {
      uni.showToast({ title: '扫码结果为空: ' + JSON.stringify(res).substring(0, 50), icon: 'none', duration: 3000 })
      return
    }

    // 尝试 URL 解码
    try {
      const decoded = decodeURIComponent(content)
      if (decoded !== content) content = decoded
    } catch (e) {}

    console.log('[扫码] 最终内容:', content)

    // 解析并添加
    const parsed = parseScanContent(content)
    console.log('[扫码] 解析结果:', JSON.stringify(parsed.parsed))

    if (!parsed.parsed?.instanceCode) {
      uni.showToast({ title: '未识别到实例编码', icon: 'none', duration: 2500 })
      return
    }
    await addInstanceByCode(parsed.parsed.instanceCode)
  } catch (e) {
    console.error('[扫码] 异常:', e)
    const msg = e?.errMsg || e?.message || String(e) || ''
    if (msg && !msg.includes('cancel')) {
      uni.showToast({ title: '扫码失败: ' + msg.substring(0, 40), icon: 'none', duration: 2500 })
    }
  }
}

// 确认添加扫码结果
const confirmScanAdd = async () => {
  if (!scanPreview.value.canAdd || !scanPreview.value.parsed?.instanceCode) {
    showScanPreview.value = false
    return
  }
  showScanPreview.value = false
  await addInstanceByCode(scanPreview.value.parsed.instanceCode)
}

// 连续扫码
const continuousScanning = ref(false)

const handleContinuousScan = async () => {
  if (!form.value.warehouseId || !form.value.areaId) {
    return uni.showToast({ title: '请先选择仓库和库区', icon: 'none' })
  }
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
    const scanResult = res?.result ? res : (Array.isArray(res) ? res[1] : null)
    const content = scanResult?.result
    if (content) {
      const parsed = parseScanContent(content)
      const instanceCode = parsed.parsed?.instanceCode
      if (instanceCode) {
        if (form.value.details.some(d => d.instanceCode === instanceCode)) {
          uni.showToast({ title: '重复：' + instanceCode, icon: 'none' })
          uni.vibrateShort()
        } else {
          await addInstanceByCode(parsed.parsed.instanceCode)
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

// 从扫码解析数据直接创建明细
const addInstanceFromScanData = (parsed) => {
  const instanceCode = parsed.instanceCode
  if (!instanceCode) {
    uni.showToast({ title: '未识别到实例编码', icon: 'none' })
    return
  }
  if (form.value.details.some(d => d.instanceCode === instanceCode)) {
    uni.showToast({ title: '已在单据中：' + instanceCode, icon: 'none' })
    return
  }
  const detail = {
    itemInstanceId: undefined,
    instanceCode,
    boxCode: parsed.boxCode || '',
    itemId: undefined,
    skuId: undefined,
    itemName: parsed.itemName || '',
    itemCode: parsed.itemCode || '',
    skuName: parsed.skuName || '',
    unit: parsed.unit || '',
    productIdentifier: undefined,
    qualityGrade: parsed.qualityGrade || '',
    quantity: 1,
    warehouseId: form.value.warehouseId,
    areaId: form.value.areaId,
    rackId: undefined,
    locationId: undefined,
    unitPrice: undefined,
    lineAmount: 0,
    generateItemInstance: 1,
    generatedInstanceQuantity: 0,
    receiptItemInstances: [],
    remark: ''
  }
  form.value.details.push(detail)
  recalculate()
  uni.showToast({ title: `已添加：${instanceCode}`, icon: 'success' })
}

// 通过编码添加器材实例（API查询）
const addInstanceByCode = async (instanceCode) => {
  try {
    const res = await getItemInstanceByCode(instanceCode, {
      unreceivedOnly: true,
      instanceStatus: '待入库'
    })
    const item = res.data
    if (!item || !item.id) {
      uni.showToast({ title: `未找到待入库实例：${instanceCode}`, icon: 'none', duration: 2000 })
      return
    }
    if (form.value.details.some(d => d.itemInstanceId === item.id)) {
      uni.showToast({ title: '已在单据中：' + instanceCode, icon: 'none' })
      return
    }
    const detail = createDetailFromInstance(item)
    form.value.details.push(detail)
    recalculate()
    uni.showToast({ title: `已添加：${instanceCode}`, icon: 'success' })
  } catch (e) {
    console.error('[addInstanceByCode] 异常:', e)
    uni.showToast({ title: e.message || '查询实例失败', icon: 'none', duration: 2000 })
  }
}

const createDetailFromInstance = (item) => ({
  itemInstanceId: item.id,
  instanceCode: item.instanceCode,
  boxCode: item.boxCode || '',
  itemId: item.itemId,
  skuId: item.skuId,
  itemName: item.itemName,
  itemCode: item.itemCode,
  skuName: item.skuName,
  unit: item.unit,
  productIdentifier: item.productIdentifier,
  qualityGrade: item.qualityGrade,
  quantity: 1,
  warehouseId: form.value.warehouseId,
  areaId: form.value.areaId,
  rackId: undefined,
  locationId: undefined,
  unitPrice: undefined,
  lineAmount: 0,
  generateItemInstance: 1,
  generatedInstanceQuantity: 0,
  receiptItemInstances: [{
    id: item.id,
    instanceCode: item.instanceCode,
    boxCode: item.boxCode || '',
    remark: ''
  }],
  remark: ''
})

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
  instanceStatus: '待入库',
  unreceivedOnly: true
})
const selectedInstances = ref([])

const searchInstances = () => {
  instanceQuery.value.pageNum = 1
  getInstanceList()
}

const getInstanceList = async () => {
  instanceLoading.value = true
  try {
    const res = await listItemInstance(instanceQuery.value)
    instanceList.value = res.rows || []
  } catch (e) {
    instanceList.value = []
  } finally {
    instanceLoading.value = false
  }
}

const loadMoreInstances = () => {
  // 简化，不实现无限加载
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

const confirmSelectInstances = () => {
  if (!selectedInstances.value.length) {
    return uni.showToast({ title: '请选择器材实例', icon: 'none' })
  }
  selectedInstances.value.forEach(item => {
    if (!form.value.details.some(d => d.itemInstanceId === item.id)) {
      form.value.details.push(createDetailFromInstance(item))
    }
  })
  selectedInstances.value = []
  showItemPicker.value = false
  recalculate()
}

// ===== 通用操作 =====
const removeDetail = (index) => {
  form.value.details.splice(index, 1)
  recalculate()
}

const calcLineAmount = (detail) => {
  const qty = Number(detail.quantity || 0)
  const price = Number(detail.unitPrice || 0)
  detail.lineAmount = qty && price ? Number((qty * price).toFixed(2)) : 0
  recalculate()
}

const recalculate = () => {
  let quantitySum = 0
  let amountSum = 0
  form.value.details.forEach(it => {
    quantitySum += Number(it.quantity || 0)
    amountSum += Number(it.lineAmount || 0)
  })
  form.value.totalQuantity = Math.floor(quantitySum)
  form.value.payableAmount = amountSum ? Number(amountSum.toFixed(2)) : 0
}

// ===== 保存/提交 =====
const buildSubmitDetails = () => {
  return form.value.details.map(it => ({
    id: it.id,
    receiptOrderId: form.value.id,
    skuId: it.skuId,
    quantity: 1,
    itemCode: it.itemCode,
    itemName: it.itemName,
    skuName: it.skuName,
    unit: it.unit,
    productIdentifier: it.productIdentifier,
    qualityGrade: it.qualityGrade,
    unitPrice: it.unitPrice,
    lineAmount: it.lineAmount,
    boxCode: it.boxCode,
    warehouseId: form.value.warehouseId,
    areaId: form.value.areaId || it.areaId,
    rackId: it.rackId,
    locationId: it.locationId,
    generateItemInstance: 1,
    generatedInstanceQuantity: it.generatedInstanceQuantity || 0,
    receiptItemInstances: [{
      id: it.itemInstanceId ?? it.receiptItemInstances?.[0]?.id,
      instanceCode: it.instanceCode ?? it.receiptItemInstances?.[0]?.instanceCode,
      boxCode: it.boxCode ?? it.receiptItemInstances?.[0]?.boxCode,
      remark: it.remark
    }],
    remark: it.remark
  }))
}

const buildSubmitParams = (receiptOrderStatus) => ({
  id: form.value.id,
  receiptOrderNo: form.value.receiptOrderNo,
  receiptOrderStatus,
  receiptOrderType: form.value.receiptOrderType,
  basisNo: form.value.basisNo,
  dispatchMode: form.value.dispatchMode,
  noticeOrg: form.value.noticeOrg,
  receiveUnit: form.value.receiveUnit,
  purchaseDate: form.value.purchaseDate,
  receiptDate: form.value.receiptDate,
  remark: form.value.remark,
  payableAmount: form.value.payableAmount,
  totalQuantity: form.value.totalQuantity,
  warehouseId: form.value.warehouseId,
  areaId: form.value.areaId,
  details: buildSubmitDetails()
})

const validate = () => {
  if (!form.value.receiptOrderType) {
    uni.showToast({ title: '请选择入库类型', icon: 'none' })
    return false
  }
  if (!form.value.warehouseId) {
    uni.showToast({ title: '请选择仓库', icon: 'none' })
    return false
  }
  if (!form.value.areaId) {
    uni.showToast({ title: '请选择库区', icon: 'none' })
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validate()) return
  try {
    const params = buildSubmitParams(0)
    if (params.id) {
      await updateReceiptOrder(params)
    } else {
      await addReceiptOrder(params)
    }
    uni.showToast({ title: '暂存成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {
    // error handled
  }
}

const handleWarehousing = async () => {
  if (!validate()) return
  if (!form.value.details.length) {
    return uni.showToast({ title: '请添加入库明细', icon: 'none' })
  }
  // 校验实例
  for (const detail of form.value.details) {
    if (!detail.itemInstanceId && !detail.instanceCode) {
      return uni.showToast({ title: '请选择器材实例', icon: 'none' })
    }
  }
  const { confirm } = await uni.showModal({
    title: '确认入库',
    content: `确认完成入库吗？共${form.value.details.length}项`
  })
  if (!confirm) return

  try {
    const params = buildSubmitParams(form.value.receiptOrderStatus)
    await warehousing(params)
    uni.showToast({ title: '入库成功', icon: 'success' })
    setTimeout(() => goBack(), 1000)
  } catch (e) {
    // error handled
  }
}

const goBack = () => uni.redirectTo({ url: "/pages/receipt/list" })

// ===== 初始化 =====
const loadDetail = async (id) => {
  try {
    const res = await getReceiptOrder(id)
    const data = res.data
    form.value = {
      ...data,
      details: (data.details || []).map(it => ({
        ...it,
        itemId: it.itemId || it.itemSku?.item?.id,
        skuId: it.skuId || it.itemSku?.id,
        itemName: it.itemName || it.itemSku?.item?.itemName,
        itemCode: it.itemCode || it.itemSku?.item?.itemCode,
        skuName: it.skuName || it.itemSku?.skuName,
        unit: it.unit || it.itemSku?.item?.unit,
        productIdentifier: it.productIdentifier || it.itemSku?.productIdentifier,
        qualityGrade: it.qualityGrade || it.itemSku?.qualityGrade,
        itemInstanceId: it.itemInstanceId || it.receiptItemInstances?.[0]?.id,
        instanceCode: it.instanceCode || it.receiptItemInstances?.[0]?.instanceCode || '',
        boxCode: it.boxCode || it.receiptItemInstances?.[0]?.boxCode || '',
        generateItemInstance: 1,
        generatedInstanceQuantity: it.generatedInstanceQuantity ?? 0,
        receiptItemInstances: [{
      id: it.itemInstanceId ?? it.receiptItemInstances?.[0]?.id,
      instanceCode: it.instanceCode ?? it.receiptItemInstances?.[0]?.instanceCode,
      boxCode: it.boxCode ?? it.receiptItemInstances?.[0]?.boxCode,
      remark: it.remark
    }],
        quantity: Math.floor(Number(it.quantity || 1)),
        lineAmount: it.lineAmount || 0
      }))
    }
    // 加载货架数据
    if (form.value.areaId) loadRacks(form.value.areaId)
    // 加载已有明细的货位数据
    form.value.details.forEach(d => {
      if (d.rackId) loadLocations(d.rackId)
    })
    recalculate()
  } catch (e) {
    // error handled
  }
}

onMounted(async () => {
  // 加载字典
  await Promise.all([
    wmsStore.getDict('wms_receipt_type'),
    wmsStore.getDict('wms_dispatch_mode'),
    wmsStore.loadWarehouses(),
    wmsStore.loadAreas()
  ])

  // 解析页面参数
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

  // 默认入库类型
  if (!form.value.receiptOrderType && receiptTypeList.value.length) {
    form.value.receiptOrderType = receiptTypeList.value[0]?.dictValue
  }
})
</script>

<style lang="scss" scoped>
.receipt-edit-page {
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

.picker-small {
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
}

/* 明细区域 */
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

.scan-action {
  border-color: #2979ff;
  background: #e8f0fe;
}

.continuous-action {
  border-color: #ff9900;
  background: #fff8e6;
}

.manual-action {
  border-color: #19be6b;
  background: #e8f8ef;
}

.action-icon {
  font-size: 40rpx;
  margin-bottom: 4rpx;
}

.action-text {
  font-size: 24rpx;
  color: #333333;
}

.empty-detail {
  text-align: center;
  padding: 60rpx 0;
}

/* 明细卡片 */
.detail-card {
  background: #fafbfc;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.detail-header {
  margin-bottom: 8rpx;
}

.detail-instance-code {
  font-size: 26rpx;
  font-weight: 600;
  color: #2979ff;
}

.detail-remove {
  font-size: 24rpx;
  color: #e43d33;
}

.detail-info {
  margin-bottom: 12rpx;
}

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

.detail-location, .detail-price {
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

.location-input {
  flex: 1;
  height: 60rpx;
  background: #f5f6fa;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  border: 2rpx solid #e8e8e8;
}

/* 底部操作栏 */
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

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-text {
  font-size: 24rpx;
  color: #666666;
}

.summary-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #e43d33;
}

.bottom-actions {
  display: flex;
  gap: 16rpx;
}

.btn-save {
  height: 80rpx;
  padding: 0 40rpx;
  background: #f5f6fa;
  color: #2979ff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: 2rpx solid #e8e8e8;
  line-height: 80rpx;

  &::after { border: none; }
}

.btn-warehousing {
  height: 80rpx;
  padding: 0 40rpx;
  background: #2979ff;
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

/* 选择弹窗 */
.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.picker-close {
  font-size: 36rpx;
  color: #999999;
  padding: 8rpx;
}

.picker-search {
  padding: 16rpx 32rpx;
}

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
  background: #e8f0fe;
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
  color: #2979ff;
  flex-shrink: 0;
}

.instance-selected .instance-check {
  border-color: #2979ff;
  background: #2979ff;
  color: #ffffff;
}

.instance-info {
  flex: 1;
}

.instance-code {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.instance-name, .instance-sku {
  display: block;
  font-size: 24rpx;
  margin-top: 4rpx;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.selected-count {
  font-size: 26rpx;
  color: #666666;
}

.picker-confirm {
  padding: 0 60rpx;
  height: 80rpx;
  background: #2979ff;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;

  &::after { border: none; }
}

/* 扫码预览弹窗 */
.scan-preview-panel {
  width: 90%;
  max-height: 80vh;
  background: #f5f6fa;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  margin: auto;
}

.scan-preview-content {
  padding: 24rpx 32rpx;
  max-height: 60vh;
}

.scan-raw-card {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.scan-raw-label {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.scan-raw-text {
  display: block;
  font-size: 26rpx;
  color: #333333;
  word-break: break-all;
  line-height: 1.5;
}

.scan-parsed-card {
  background: #f5f6fa;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.scan-info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.scan-info-row:last-child {
  border-bottom: none;
}

.scan-info-label {
  font-size: 26rpx;
  color: #999999;
}

.scan-info-value {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}

.scan-status {
  text-align: center;
  padding: 16rpx 0;
}

.scan-preview-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.scan-btn-cancel {
  flex: 1;
  height: 80rpx;
  background: #f5f6fa;
  color: #666666;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
}

.scan-btn-cancel::after {
  border: none;
}

.scan-btn-confirm {
  flex: 1;
  height: 80rpx;
  background: #2979ff;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
}

.scan-btn-confirm::after {
  border: none;
}

.scan-btn-confirm[disabled] {
  background: #c0c4cc;
}

.input-placeholder { color: #c0c4cc; }
</style>
