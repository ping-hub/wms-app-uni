<template>
  <view class="check-edit-page">
    <scroll-view class="edit-scroll" scroll-y>

      <!-- 查看模式提示 -->
      <view v-if="isViewMode && !isVoid" class="card view-banner">
        <text class="view-text">盘点结果（只读）</text>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <!-- 新建模式：表单 -->
        <template v-if="isNew && !form.id">
          <view class="form-item">
            <text class="form-label required">仓库</text>
            <picker :range="warehousePickerList" range-key="warehouseName" @change="onWarehouseChange" :value="warehouseIndex">
              <view class="picker-value" :class="{ placeholder: !form.warehouseId }">{{ form.warehouseId ? currentWarehouseName : '请选择仓库' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">库区</text>
            <picker :range="areaPickerList" range-key="areaName" @change="onAreaChange" :value="areaIndex" :disabled="!form.warehouseId">
              <view class="picker-value" :class="{ placeholder: !form.areaId }">{{ form.areaId ? currentAreaName : '请选择库区' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">货架</text>
            <picker :range="rackPickerList" range-key="rackName" @change="onRackChange" :value="rackIndex" :disabled="!form.areaId">
              <view class="picker-value" :class="{ placeholder: !form.rackId }">{{ form.rackId ? currentRackName : '请选择货架' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注" :maxlength="100" placeholder-class="input-placeholder" />
          </view>
        </template>
        <!-- 编辑/查看模式：展示 -->
        <template v-else>
          <view class="info-row">
            <text class="info-label">盘点单号</text>
            <text class="info-value">{{ form.checkOrderNo }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">仓库</text>
            <text class="info-value">{{ getWarehouseName(form.warehouseId) }}</text>
          </view>
          <view class="info-row" v-if="form.areaId">
            <text class="info-label">库区</text>
            <text class="info-value">{{ getAreaName(form.areaId) }}</text>
          </view>
          <view class="info-row" v-if="form.rackId">
            <text class="info-label">货架</text>
            <text class="info-value">{{ getRackName(form.rackId) }}</text>
          </view>
          <view class="info-row" v-if="form.executorName">
            <text class="info-label">盘点人</text>
            <text class="info-value">{{ form.executorName }}</text>
          </view>
          <view class="info-row" v-if="form.reviewerName">
            <text class="info-label">复核人</text>
            <text class="info-value">{{ form.reviewerName }}</text>
          </view>
          <view class="info-row" v-if="form.remark">
            <text class="info-label">备注</text>
            <text class="info-value">{{ form.remark }}</text>
          </view>
          <view class="info-row" v-if="form.approveRemark && isRejected">
            <text class="info-label">驳回原因</text>
            <text class="info-value" style="color:#f56c6c">{{ form.approveRemark }}</text>
          </view>
        </template>
      </view>

      <!-- ===== 审批控件：草稿/已驳回 → 盘点人选择 ===== -->
      <view class="card approval-card" v-if="showApprovalControls">
        <view class="form-item">
          <text class="form-label required">盘点人</text>
          <picker :range="userList" range-key="nickName" @change="onCheckerChange" :value="checkerIndex">
            <view class="picker-value" :class="{ placeholder: !submitExecutorId }">{{ submitExecutorName || '请选择盘点人' }}</view>
          </picker>
        </view>
      </view>

      <!-- ===== 审批控件：待盘点 → 复核人选择 ===== -->
      <view class="card approval-card" v-if="showReviewerSelect">
        <view class="form-item">
          <text class="form-label required">复核人</text>
          <picker :range="userList" range-key="nickName" @change="onReviewerChange" :value="reviewerIndex">
            <view class="picker-value" :class="{ placeholder: !form.reviewerId }">{{ form.reviewerName || '请选择复核人' }}</view>
          </picker>
        </view>
      </view>

      <!-- ===== 扫码盘点区域（仅编辑模式 + 已startCheck） ===== -->
        <template v-if="!isViewMode && started">
          <!-- 进度统计 -->
          <view class="card progress-card">
            <view class="progress-header">
              <text class="progress-title">扫码进度</text>
              <text class="progress-count">{{ matchedCount }} / {{ totalInstanceCount }}</text>
            </view>
            <progress :percent="progressPercent" activeColor="#2979ff" stroke-width="8" />
            <view class="progress-stats">
              <text class="stat-item">已匹配：<b>{{ matchedCount }}</b></text>
              <text class="stat-item stat-surplus">盘盈：<b>{{ surplusItems.length }}</b></text>
              <text class="stat-item">总扫码：<b>{{ scannedCodes.length }}</b></text>
            </view>
          </view>

          <!-- 扫码按钮 -->
          <view class="card" v-if="!isViewMode">
            <view class="detail-actions">
              <view class="action-card scan-action" @tap="handleScan">
                <text class="action-icon">📷</text>
                <text class="action-text">扫码盘点</text>
              </view>
              <view class="action-card continuous-action" @tap="handleContinuousScan">
                <text class="action-icon">📷📷</text>
                <text class="action-text">连续扫码</text>
              </view>
            </view>
          </view>

          <!-- 盘盈明细（实时） -->
          <view class="card" v-if="surplusItems.length > 0">
            <view class="card-title">盘盈明细 <text class="badge-surplus">{{ surplusItems.length }}</text></view>
            <view class="surplus-list">
              <view class="surplus-item" v-for="(item, idx) in surplusItems" :key="'surplus-' + idx">
                <text class="surplus-code">{{ item.code }}</text>
                <text class="surplus-label">账面无此记录</text>
                <button class="btn-del" @tap="removeSurplus(idx)">×</button>
              </view>
            </view>
          </view>

          <!-- 已扫码列表（最近扫码） -->
          <view class="card" v-if="scannedCodes.length > 0">
            <view class="card-title">
              已扫描编码
              <text class="text-muted">{{ scannedCodes.length }}个</text>
            </view>
            <scroll-view scroll-y class="scan-history-scroll" :style="{ maxHeight: '400rpx' }">
              <view class="scan-history-list">
                <view class="scan-history-item" v-for="(code, idx) in recentScans" :key="'scan-' + idx">
                  <text class="scan-code">{{ code }}</text>
                  <button class="btn-del-sm" @tap="removeScannedCode(scannedCodes.length - 1 - idx)">×</button>
                </view>
              </view>
              <view class="scan-more" v-if="scannedCodes.length > 20" @tap="showAllScans = !showAllScans">
                <text>{{ showAllScans ? '收起' : `展开全部 ${scannedCodes.length} 条` }}</text>
              </view>
            </scroll-view>
          </view>
        </template>

        <!-- ===== 未开始盘点 ===== -->
        <template v-if="isPendingCheck && !isViewMode && !started">
          <view class="card start-card">
            <text class="start-desc">点击下方按钮开始盘点，系统将自动生成盘点明细。</text>
            <button class="btn-primary" @tap="handleStartCheck" :loading="startLoading">开始盘点</button>
          </view>
        </template>

        <!-- ===== 查看模式：结果展示 ===== -->
        <template v-if="isViewMode && !isVoid">
          <view class="card" v-if="form.details && form.details.length">
            <view class="card-title">盘点结果</view>
            <view class="summary-bar">
              <text class="summary-tag loss">盘亏 {{ lossCount }} 项</text>
              <text class="summary-tag gain">盘盈 {{ gainCount }} 项</text>
              <text class="summary-tag equal">无差异 {{ equalCount }} 项</text>
            </view>
            <view v-for="d in form.details" :key="d.skuId" class="sku-result-card"
              :class="{ 'sku-loss': d.profitAndLoss < 0, 'sku-gain': d.profitAndLoss > 0 }">
              <view class="sku-result-row">
                <text class="sku-name-sm">{{ d.itemSku?.itemName || '' }} {{ d.itemSku?.skuName || '' }}</text>
                <text class="sku-diff" :class="d.profitAndLoss > 0 ? 'text-success' : d.profitAndLoss < 0 ? 'text-danger' : ''">
                  {{ d.profitAndLoss > 0 ? '+' : '' }}{{ d.profitAndLoss || 0 }}
                </text>
              </view>
              <view class="sku-result-detail">
                <text>账 {{ d.quantity || 0 }} → 实 {{ d.checkQuantity || 0 }}</text>
              </view>
            </view>
          </view>
        </template>

    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-bar" v-if="!loading">
      <!-- 新建模式 -->
      <template v-if="isNew && !form.id">
        <button class="btn-outline flex-1" @tap="goBack">取消</button>
        <button class="btn-primary flex-1" @tap="handleAdd" :loading="saving">保存草稿</button>
      </template>
      <!-- 草稿/已驳回：提交审批、作废 -->
      <template v-else-if="showApprovalControls">
        <button class="btn-outline flex-1" @tap="goBack">返回</button>
        <button class="btn-outline flex-1" style="color:#f56c6c;border-color:#f56c6c" @tap="handleVoid">作废</button>
        <button class="btn-primary flex-1" @tap="handleSubmitForApproval" :loading="saving">提交</button>
      </template>
      <!-- 待盘点：暂存、作废、完成盘点 -->
      <template v-else-if="isPendingCheck && !isViewMode">
        <button class="btn-outline flex-1" @tap="handleSaveDraft" :loading="saving">暂存</button>
        <button class="btn-outline flex-1" style="color:#f56c6c;border-color:#f56c6c" @tap="handleVoid">作废</button>
        <button class="btn-primary flex-1" @tap="handleCompleteCheck" :loading="completing">提交复核</button>
      </template>
      <!-- 待复核：驳回、复核通过 -->
      <template v-else-if="isPendingReview && !isViewMode">
        <button class="btn-outline flex-1" @tap="goBack">返回</button>
        <button class="btn-outline flex-1" style="color:#f56c6c;border-color:#f56c6c" @tap="handleReject">驳回</button>
        <button class="btn-primary flex-1" @tap="handleApprove" :loading="completing">复核通过</button>
      </template>
      <!-- 查看模式/已完成/已作废 -->
      <template v-else>
        <button class="btn-outline flex-1" @tap="goBack">返回</button>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useWmsStore } from '@/store/wms'
import { getCheckOrder, addCheckOrder, updateCheckOrder, startCheck as startCheckApi, verifyCodes, check, submitForApproval, completeCheck as completeCheckApi, approveOrder, rejectOrder, voidOrder } from '@/api/wms/checkOrder'
import { getUserSelectList } from '@/api/common'
import { parseScanContent } from '@/utils/scan'

const wmsStore = useWmsStore()
const isNew = ref(false)
const isViewMode = ref(false)
const loading = ref(false)
const saving = ref(false)
const completing = ref(false)
const startLoading = ref(false)

const form = ref({})
const userList = ref([])
const warehouseIndex = ref(0)
const areaIndex = ref(0)
const rackIndex = ref(0)
const checkerIndex = ref(0)
const reviewerIndex = ref(0)

// 扫码驱动
const started = ref(false)
const scannedCodes = ref([])
const surplusItems = ref([])
const totalInstanceCount = ref(0)
const skuCount = ref(0)
const showAllScans = ref(false)

// ===== 计算属性 =====
const warehousePickerList = computed(() => wmsStore.warehouseList || [])
const areaPickerList = computed(() => (wmsStore.areaList || []).filter(a => !form.value.warehouseId || a.warehouseId === form.value.warehouseId))
const rackPickerList = computed(() => (wmsStore.rackList || []).filter(r => !form.value.areaId || r.areaId === form.value.areaId))
const currentWarehouseName = computed(() => warehousePickerList.value[warehouseIndex.value]?.warehouseName || '')
const currentAreaName = computed(() => areaPickerList.value[areaIndex.value]?.areaName || '')
const currentRackName = computed(() => rackPickerList.value[rackIndex.value]?.rackName || '')

const matchedCount = computed(() => scannedCodes.value.length - surplusItems.value.length)
const progressPercent = computed(() => {
  if (!totalInstanceCount.value) return 0
  return Math.min(100, Math.round(matchedCount.value / totalInstanceCount.value * 100))
})

const recentScans = computed(() => {
  if (showAllScans.value) return [...scannedCodes.value].reverse()
  return [...scannedCodes.value].reverse().slice(0, 20)
})

const lossCount = computed(() => (form.value.details || []).filter(d => (d.profitAndLoss || 0) < 0).length)
const gainCount = computed(() => (form.value.details || []).filter(d => (d.profitAndLoss || 0) > 0).length)
const equalCount = computed(() => (form.value.details || []).filter(d => (d.profitAndLoss || 0) === 0).length)

// ===== 状态计算 =====
const status = computed(() => Number(form.value.checkOrderStatus ?? 0))
const isDraft = computed(() => status.value === 0)
const isPendingCheck = computed(() => status.value === 1)
const isPendingReview = computed(() => status.value === 2)
const isCompleted = computed(() => status.value === 3)
const isVoid = computed(() => status.value === -1)
const isRejected = computed(() => status.value === -2)
const canEdit = computed(() => isDraft.value || isRejected.value)
const showApprovalControls = computed(() => (isDraft.value || isRejected.value) && !isViewMode.value)
const showReviewerSelect = computed(() => isPendingCheck.value && !isViewMode.value)

// ===== Picker 事件 =====
const onWarehouseChange = (e) => {
  warehouseIndex.value = Number(e.detail.value)
  form.value.warehouseId = warehousePickerList.value[warehouseIndex.value]?.id
  form.value.areaId = null; form.value.rackId = null
  areaIndex.value = 0; rackIndex.value = 0
}
const onAreaChange = (e) => {
  areaIndex.value = Number(e.detail.value)
  form.value.areaId = areaPickerList.value[areaIndex.value]?.id
  form.value.rackId = null; rackIndex.value = 0
}
const onRackChange = (e) => {
  rackIndex.value = Number(e.detail.value)
  form.value.rackId = rackPickerList.value[rackIndex.value]?.id
}
const submitExecutorId = ref(undefined)
const submitExecutorName = ref('')
const onCheckerChange = (e) => {
  checkerIndex.value = Number(e.detail.value)
  const u = userList.value[checkerIndex.value]
  if (u) { submitExecutorId.value = u.userId; submitExecutorName.value = u.nickName }
}
const onReviewerChange = (e) => {
  reviewerIndex.value = Number(e.detail.value)
  const u = userList.value[reviewerIndex.value]
  if (u) { form.value.reviewerId = u.userId; form.value.reviewerName = u.nickName }
}

// ===== 名称查找 =====
const getWarehouseName = (id) => wmsStore.warehouseMap?.get(id)?.warehouseName || '-'
const getAreaName = (id) => wmsStore.areaMap?.get(id)?.areaName || '-'
const getRackName = (id) => wmsStore.rackMap?.get(id)?.rackName || '-'

// ===== 加载用户列表 =====
const loadUserList = async () => {
  try {
    const res = await getUserSelectList()
    userList.value = (res.data || res) || []
  } catch (e) { userList.value = [] }
}

// ===== 新建保存草稿 =====
const handleAdd = async () => {
  if (!form.value.warehouseId) return uni.showToast({ title: '请选择仓库', icon: 'none' })
  saving.value = true
  try {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    form.value.checkDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const checkScopeType = form.value.rackId ? 'rack' : (form.value.areaId ? 'area' : 'warehouse')
    await addCheckOrder({ ...form.value, checkScopeType, checkOrderStatus: 0 })
    uni.showToast({ title: '已保存草稿', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {} finally { saving.value = false }
}

// ===== 提交审批（草稿/已驳回 → 待盘点） =====
const handleSubmitForApproval = async () => {
  if (!submitExecutorId.value) return uni.showToast({ title: '请选择盘点人', icon: 'none' })
  saving.value = true
  try {
    // 先保存基本信息
    if (form.value.id) {
      await updateCheckOrder({
        id: form.value.id,
        checkOrderNo: form.value.checkOrderNo,
        warehouseId: form.value.warehouseId,
        areaId: form.value.areaId,
        rackId: form.value.rackId,
        checkScopeType: form.value.checkScopeType,
        remark: form.value.remark,
      })
    }
    await submitForApproval(form.value.id, submitExecutorId.value, submitExecutorName.value)
    uni.showToast({ title: '已提交，待盘点', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally { saving.value = false }
}

// ===== 开始盘点 =====
const handleStartCheck = async () => {
  startLoading.value = true
  try {
    const res = await startCheckApi(form.value.id)
    const data = res.data || res
    totalInstanceCount.value = data.totalInstanceCount || 0
    skuCount.value = data.skuCount || 0
    started.value = true
    uni.showToast({ title: `已加载 ${skuCount.value} 种SKU，共 ${totalInstanceCount.value} 件`, icon: 'none', duration: 2500 })
  } catch (e) {
    uni.showToast({ title: '开始盘点失败', icon: 'none' })
  } finally { startLoading.value = false }
}

// ===== 扫码 =====
const handleScan = async () => {
  try {
    const res = await uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true
    })
    // 调试：显示原始返回
    console.log('[盘点扫码] typeof res:', typeof res)
    console.log('[盘点扫码] Array.isArray:', Array.isArray(res))
    console.log('[盘点扫码] res:', JSON.stringify(res))

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

    console.log('[盘点扫码] 最终内容:', content)

    const parsed = parseScanContent(content)
    console.log('[盘点扫码] 解析结果:', JSON.stringify(parsed.parsed))

    const code = parsed.parsed?.instanceCode || content
    if (!code) {
      uni.showToast({ title: '未识别到实例编码', icon: 'none', duration: 2500 })
      return
    }
    await addScannedCode(code)
  } catch (e) {
    console.error('[盘点扫码] 异常:', e)
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
      try {
        const decoded = decodeURIComponent(content)
        if (decoded !== content) content = decoded
      } catch (e) {}
      const parsed = parseScanContent(content)
      const code = parsed.parsed?.instanceCode || content
      if (code) {
        if (scannedCodes.value.includes(code)) {
          uni.showToast({ title: '重复：' + code, icon: 'none' })
          uni.vibrateShort()
        } else {
          await addScannedCode(code)
          uni.vibrateShort()
        }
      }
    }
    // 继续扫码
    setTimeout(() => doContinuousScan(), 300)
  } catch (e) {
    console.error('[盘点连续扫码] 异常:', e)
    // 用户取消，结束连续扫码
    continuousScanning.value = false
  }
}

const addScannedCode = async (code) => {
  // 去重
  if (scannedCodes.value.includes(code)) {
    uni.showToast({ title: '重复扫码', icon: 'none' })
    return
  }
  scannedCodes.value.push(code)

  // 验码：检测是否属于盘点范围
  try {
    const res = await verifyCodes(form.value.id, [code])
    const data = res.data || res
    if (data.surplus > 0 && data.surplusCodes?.length) {
      data.surplusCodes.forEach(c => {
        surplusItems.value.push({ code: c })
      })
      uni.showToast({ title: '发现盘盈！', icon: 'none' })
    }
  } catch (e) {
    // 验码失败不阻断扫码流程
  }
}

const removeScannedCode = (idx) => {
  const code = scannedCodes.value[idx]
  scannedCodes.value.splice(idx, 1)
  // 移除对应盘盈记录
  const surplusIdx = surplusItems.value.findIndex(s => s.code === code)
  if (surplusIdx >= 0) surplusItems.value.splice(surplusIdx, 1)
}

const removeSurplus = (idx) => {
  const item = surplusItems.value[idx]
  surplusItems.value.splice(idx, 1)
  // 同步移除已扫码
  const codeIdx = scannedCodes.value.indexOf(item.code)
  if (codeIdx >= 0) scannedCodes.value.splice(codeIdx, 1)
}

// ===== 暂存 =====
const handleSaveDraft = async () => {
  saving.value = true
  try {
    await updateCheckOrder({
      id: form.value.id,
      checkOrderNo: form.value.checkOrderNo,
      warehouseId: form.value.warehouseId,
      areaId: form.value.areaId,
      rackId: form.value.rackId,
      checkScopeType: form.value.checkScopeType,
      reviewerName: form.value.reviewerName,
      remark: form.value.remark,
      checkOrderTotal: form.value.checkOrderTotal || 0,
      scannedInstanceCodes: scannedCodes.value,
    })
    uni.showToast({ title: '暂存成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '暂存失败', icon: 'none' })
  } finally { saving.value = false }
}

// ===== 作废 =====
const handleVoid = async () => {
  const { confirm } = await uni.showModal({ title: '提示', content: '确认作废盘点单吗？' })
  if (!confirm) return
  saving.value = true
  try {
    await voidOrder(form.value.id)
    uni.showToast({ title: '已作废', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '作废失败', icon: 'none' })
  } finally { saving.value = false }
}

// ===== 完成盘点并提交复核（待盘点 → 待复核） =====
const handleCompleteCheck = async () => {
  if (scannedCodes.value.length === 0) {
    return uni.showToast({ title: '尚未扫描任何器材', icon: 'none' })
  }
  if (!form.value.reviewerId) {
    return uni.showToast({ title: '请先选择复核人', icon: 'none' })
  }
  const { confirm } = await uni.showModal({
    title: '确认完成',
    content: `已匹配 ${matchedCount.value}/${totalInstanceCount.value}，盘盈 ${surplusItems.value.length} 个（总扫码 ${scannedCodes.value.length} 个）。确认提交复核？`
  })
  if (!confirm) return

  completing.value = true
  try {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const checkDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    await completeCheckApi({
      id: form.value.id,
      checkOrderNo: form.value.checkOrderNo,
      warehouseId: form.value.warehouseId,
      areaId: form.value.areaId,
      rackId: form.value.rackId,
      checkScopeType: form.value.checkScopeType,
      checkDate,
      remark: form.value.remark,
      scannedInstanceCodes: scannedCodes.value,
    }, form.value.reviewerId, form.value.reviewerName)
    uni.showToast({ title: '已提交复核', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally { completing.value = false }
}

// ===== 复核通过（待复核 → 已完成） =====
const handleApprove = async () => {
  const { confirm } = await uni.showModal({ title: '提示', content: '确认复核通过？' })
  if (!confirm) return
  completing.value = true
  try {
    await approveOrder(form.value.id, '')
    uni.showToast({ title: '复核通过', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '复核失败', icon: 'none' })
  } finally { completing.value = false }
}

// ===== 驳回 =====
const handleReject = async () => {
  const { confirm } = await uni.showModal({ title: '提示', content: '确认驳回？' })
  if (!confirm) return
  saving.value = true
  try {
    await rejectOrder(form.value.id, '')
    uni.showToast({ title: '已驳回', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/check/list' }), 1000)
  } catch (e) {
    uni.showToast({ title: '驳回失败', icon: 'none' })
  } finally { saving.value = false }
}

// ===== 加载详情 =====
const loadDetail = async (id) => {
  loading.value = true
  try {
    const res = await getCheckOrder(id)
    const data = res.data || res
    data.checkScopeType = data.checkScopeType || (data.rackId ? 'rack' : (data.areaId ? 'area' : 'warehouse'))
    form.value = { ...data }

    // 如果已有明细（已startCheck或已完成），标记为已开始
    if (data.details && data.details.length > 0) {
      started.value = true
      skuCount.value = data.details.length
      // 计算账面实例总数
      totalInstanceCount.value = data.details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)
    }

    // 查看模式：如果有盘点结果，展示差异
    if (Number(data.checkOrderStatus) === 1 && data.details) {
      form.value.details = data.details.map(it => ({
        ...it,
        checkQuantity: it.checkQuantity ?? it.quantity,
        profitAndLoss: it.profitAndLoss ?? it.differenceQuantity ?? 0
      }))
    }

    // 恢复已保存的扫码数据（暂存恢复）
    if (Number(data.checkOrderStatus) === 0 && data.instances) {
      const savedScanned = data.instances.filter(i => i.resultType === 'scanned')
      if (savedScanned.length > 0) {
        scannedCodes.value = savedScanned.map(i => i.instanceCode)
        // 验码恢复盘盈
        try {
          const res2 = await verifyCodes(id, scannedCodes.value)
          const vData = res2.data || res2
          if (vData.surplus > 0 && vData.surplusCodes?.length) {
            surplusItems.value = vData.surplusCodes.map(c => ({ code: c }))
          }
        } catch (e) {}
      }
    }
  } catch (e) {} finally { loading.value = false }
}

const goBack = () => { if (isNew.value) uni.redirectTo({ url: '/pages/check/list' }); else uni.navigateBack() }

onMounted(() => {
  wmsStore.loadWarehouses()
  wmsStore.loadAreas()
  wmsStore.loadRacks()
  loadUserList()
})

onLoad((options) => {
  if (options.mode === 'view') {
    isViewMode.value = true
    uni.setNavigationBarTitle({ title: '盘点单详情' })
    if (options.id) loadDetail(options.id)
  } else if (!options.id) {
    isNew.value = true
    uni.setNavigationBarTitle({ title: '新增盘点单' })
  } else {
    loadDetail(options.id)
  }
})
</script>

<style lang="scss" scoped>
.check-edit-page { min-height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.edit-scroll { flex: 1; padding: 16rpx; padding-bottom: 180rpx; }
.view-banner { background: #e8f0fe; .view-text { color: #2979ff; font-weight: 600; } }
.info-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.info-label { color: #999; font-size: 26rpx; }
.info-value { color: #333; font-size: 26rpx; text-align: right; max-width: 60%; }
.text-primary { color: #2979ff; font-size: 26rpx; }
.text-muted { color: #999; font-size: 24rpx; margin-left: 12rpx; }
.text-danger { color: #f56c6c; }
.text-success { color: #67c23a; }

/* 表单控件 */
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666666; margin-bottom: 8rpx; }
.form-label.required::before { content: '*'; color: #e43d33; margin-right: 4rpx; }
.form-textarea { width: 100%; height: 120rpx; background: #ffffff; border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; box-sizing: border-box; }
.picker-value { height: 76rpx; line-height: 76rpx; background: #ffffff; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; border: 2rpx solid #e8e8e8; color: #333333; position: relative; }
.picker-value::after { content: '\25BC'; position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 20rpx; color: #999999; }
.picker-value.placeholder { color: #c0c4cc; }
:deep(.input-placeholder) { color: #c0c4cc; }

/* 进度卡片 */
.progress-card { background: linear-gradient(135deg, #e8f0fe, #f0f7ff); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.progress-title { font-size: 30rpx; font-weight: 600; color: #333; }
.progress-count { font-size: 36rpx; font-weight: 700; color: #2979ff; }
.progress-stats { display: flex; gap: 24rpx; margin-top: 12rpx; }
.stat-item { font-size: 24rpx; color: #666; b { color: #333; } }
.stat-surplus b { color: #67c23a; }

/* 扫码按钮 */
.detail-actions { display: flex; gap: 16rpx; }
.action-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24rpx; border-radius: 12rpx; }
.scan-action { background: #e8f0fe; }
.continuous-action { background: #e8f5e9; }
.action-icon { font-size: 44rpx; margin-bottom: 8rpx; }
.action-text { font-size: 26rpx; color: #333; font-weight: 500; }

/* 盘盈列表 */
.badge-surplus { background: #67c23a; color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 20rpx; margin-left: 8rpx; }
.surplus-list { }
.surplus-item { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #eee; }
.surplus-code { font-family: monospace; font-size: 24rpx; color: #333; flex: 1; word-break: break-all; }
.surplus-label { font-size: 22rpx; color: #67c23a; margin-right: 12rpx; }

/* 已扫列表 */
.scan-history-scroll { }
.scan-history-list { }
.scan-history-item { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.scan-code { font-family: monospace; font-size: 22rpx; color: #555; flex: 1; word-break: break-all; }
.scan-more { text-align: center; padding: 12rpx; color: #2979ff; font-size: 24rpx; }

/* 删除按钮 */
.btn-del { width: 44rpx; height: 44rpx; padding: 0; margin: 0; background: #f56c6c; color: #fff; border-radius: 50%; font-size: 28rpx; line-height: 44rpx; border: none; min-height: auto; &::after { border: none; } }
.btn-del-sm { width: 36rpx; height: 36rpx; padding: 0; margin: 0; background: #eee; color: #999; border-radius: 50%; font-size: 22rpx; line-height: 36rpx; border: none; min-height: auto; &::after { border: none; } }

/* 开始盘点卡片 */
.start-card { text-align: center; padding: 48rpx 24rpx; }
.start-desc { display: block; color: #999; margin-bottom: 32rpx; font-size: 26rpx; }

/* 查看模式结果 */
.summary-bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.summary-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 4rpx; }
.summary-tag.loss { background: #fef0f0; color: #f56c6c; }
.summary-tag.gain { background: #f0f9eb; color: #67c23a; }
.summary-tag.equal { background: #f4f4f5; color: #909399; }
.sku-result-card { background: #fafafa; border-radius: 8rpx; margin-bottom: 8rpx; padding: 16rpx; border-left: 6rpx solid #ddd; }
.sku-result-card.sku-loss { border-left-color: #f56c6c; }
.sku-result-card.sku-gain { border-left-color: #67c23a; }
.sku-result-row { display: flex; justify-content: space-between; align-items: center; }
.sku-name-sm { font-size: 26rpx; color: #333; font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sku-diff { font-size: 28rpx; font-weight: 700; min-width: 60rpx; text-align: right; }
.sku-result-detail { font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* 通用按钮 */
.btn-primary { background: #2979ff; color: #fff; border: none; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; font-size: 30rpx; &::after { border: none; } }
.btn-outline { background: #fff; color: #666; border: 1rpx solid #ddd; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; &::after { border: none; } }
.flex-1 { flex: 1; }

/* 底部栏 */
.footer-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); display: flex; gap: 16rpx; border-top: 1rpx solid #eee; z-index: 100; box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.06); }

/* 审批控件 */
.approval-card { background: #f8faff; border-left: 6rpx solid #2979ff; }
</style>
