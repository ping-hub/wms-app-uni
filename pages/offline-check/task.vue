<template>
  <view class="offline-task-page">
    <scroll-view class="task-scroll" scroll-y :scroll-top="scrollTop">

      <!-- 离线状态提示 -->
      <view class="offline-banner" :class="{ 'online-mode': isOnline }">
        <text class="offline-dot"></text>
        <text class="offline-text">{{ isOnline ? '已联网，可上传盘点结果' : '离线模式 — 扫码数据已本地保存' }}</text>
      </view>

      <!-- 进度卡片 -->
      <view class="card progress-card">
        <view class="progress-header">
          <text class="progress-title">盘点进度</text>
          <text class="progress-count">{{ scannedSet.size }} / {{ totalInstanceCount }}</text>
        </view>
        <view class="progress-bar-wrap">
          <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <view class="progress-stats">
          <text class="stat-item">已扫 <b>{{ scannedCodes.length }}</b></text>
          <text class="stat-item">重复 <b class="text-muted">{{ duplicateCount }}</b></text>
          <text class="stat-item stat-surplus">盘盈 <b>{{ surplusCodes.length }}</b></text>
          <text class="stat-item stat-loss">盘亏 <b>{{ lossCount }}</b></text>
        </view>
      </view>

      <!-- 扫码按钮 -->
      <view class="card scan-actions-card">
        <view class="detail-actions">
          <view class="action-card scan-action" @click="doScan(false)">
            <text class="action-icon">📷</text>
            <text class="action-text">扫码</text>
          </view>
          <view class="action-card continuous-action" @click="doScan(true)">
            <text class="action-icon">🔄</text>
            <text class="action-text">连续扫码</text>
          </view>
        </view>
      </view>

      <!-- 扫码结果反馈 -->
      <view v-if="lastScanResult" class="card scan-result-card" :class="'result-' + lastScanResult.type">
        <view class="result-row">
          <text class="result-icon">{{ lastScanResult.type === 'normal' ? '✓' : (lastScanResult.type === 'surplus' ? '⚠' : (lastScanResult.type === 'duplicate' ? '↺' : '✗')) }}</text>
          <view class="result-info">
            <text class="result-code">{{ lastScanResult.code }}</text>
            <text class="result-msg">{{ lastScanResult.message }}</text>
          </view>
        </view>
      </view>

      <!-- 盘盈列表 -->
      <view v-if="surplusCodes.length" class="card surplus-card">
        <view class="section-header">
          <text class="section-title">盘盈器材</text>
          <text class="badge-surplus">{{ surplusCodes.length }}</text>
        </view>
        <view class="surplus-list">
          <view v-for="(code, idx) in surplusCodes" :key="idx" class="surplus-item">
            <text class="surplus-label">盘盈</text>
            <text class="surplus-code">{{ code }}</text>
            <button class="btn-del btn-del-sm" @click="removeSurplus(idx)">×</button>
          </view>
        </view>
      </view>

      <!-- 最近扫码记录 -->
      <view v-if="scanHistory.length" class="card history-card">
        <view class="section-header">
          <text class="section-title">最近扫码</text>
          <text class="text-muted">{{ scannedCodes.length }} 条</text>
        </view>
        <view class="history-list">
          <view v-for="(item, idx) in scanHistory" :key="idx" class="history-item">
            <text class="history-code">{{ item.code }}</text>
            <text class="history-info" v-if="item.skuName">{{ item.skuName }}</text>
            <text class="history-status" :class="'hs-' + item.type">{{ item.label }}</text>
            <button class="btn-del btn-del-sm" @click="removeScanned(item.code)">×</button>
          </view>
        </view>
        <view v-if="scannedCodes.length > scanHistoryLimit" class="history-more" @click="showMoreHistory">
          <text class="text-primary">查看更多...</text>
        </view>
      </view>

    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-bar">
      <button class="btn-outline flex-1" @click="saveAndToast">💾 本地暂存</button>
      <button
        class="btn-primary flex-1"
        :disabled="!isOnline || !scannedCodes.length"
        @click="finishCheck"
      >
        ⬆ 完成盘点（上传）
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { uploadOfflineResult } from '@/api/wms/offlineCheck'
import { doScanCode } from '@/utils/scan'
import {
  getSnapshot, getProgress, saveProgress,
  updateTaskStatus, clearProgress, buildCodeLookupMap, buildCodeSet
} from '@/utils/offlineStorage'

const checkOrderId = ref(null)
const scrollTop = ref(0)

// ── 快照数据（从本地加载）─────────────────────────────────────────────────────
const snapshot = ref(null)
const allInstanceCodesSet = ref(new Set())    // O(1) 白名单查找
const codeLookupMap = ref(new Map())          // code → { skuId, skuName, itemName, locationName }
const totalInstanceCount = ref(0)

// ── 扫码状态 ─────────────────────────────────────────────────────────────────
const scannedCodes = ref([])
const scannedSet = ref(new Set())             // O(1) 去重
const surplusCodes = ref([])                  // 盘盈码
const duplicateCount = ref(0)
const lastScanResult = ref(null)
const scanHistory = ref([])
const scanHistoryLimit = ref(20)
const isContinuous = ref(false)

// ── 网络状态 ─────────────────────────────────────────────────────────────────
const isOnline = ref(true)
let networkCb = null

// ── 计算属性 ─────────────────────────────────────────────────────────────────
const progressPercent = computed(() => {
  if (!totalInstanceCount.value) return 0
  return Math.min(100, Math.round((scannedSet.value.size / totalInstanceCount.value) * 100))
})

const lossCount = computed(() => {
  // 盘亏 = 账面总数 - 已扫到的有效码数量（排除盘盈和重复）
  return Math.max(0, totalInstanceCount.value - scannedSet.value.size)
})

// ── 初始化 ───────────────────────────────────────────────────────────────────
function initTask(id) {
  checkOrderId.value = id

  // 加载快照
  const snap = getSnapshot(id)
  if (!snap) {
    uni.showToast({ title: '本地无快照数据，请重新下载', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  snapshot.value = snap
  totalInstanceCount.value = snap.totalInstanceCount || 0
  allInstanceCodesSet.value = buildCodeSet(snap.allInstanceCodes)
  codeLookupMap.value = buildCodeLookupMap(snap.skus)

  // 恢复扫码进度
  const progress = getProgress(id)
  if (progress) {
    scannedCodes.value = progress.scannedCodes || []
    scannedSet.value = new Set(scannedCodes.value)
    surplusCodes.value = progress.surplusCodes || []
    duplicateCount.value = progress.duplicateCount || 0
    updateTaskStatus(id, 'in_progress')
  } else {
    updateTaskStatus(id, 'in_progress')
  }

  // 构建初始扫码历史
  rebuildHistory()
}

function rebuildHistory() {
  const list = []
  const codes = scannedCodes.value.slice().reverse()
  for (const code of codes.slice(0, scanHistoryLimit.value)) {
    const info = codeLookupMap.value.get(code)
    list.push({
      code,
      type: 'normal',
      label: '正常',
      skuName: info?.skuName || '',
      itemName: info?.itemName || ''
    })
  }
  // 盘盈码也显示在历史中（排在前面）
  for (const code of surplusCodes.value.slice().reverse().slice(0, 5)) {
    list.unshift({
      code,
      type: 'surplus',
      label: '盘盈',
      skuName: '',
      itemName: ''
    })
  }
  scanHistory.value = list
}

// ── 网络检测 ─────────────────────────────────────────────────────────────────
async function checkNetwork() {
  try {
    const res = await uni.getNetworkType()
    isOnline.value = res.networkType !== 'none'
  } catch (e) {
    isOnline.value = false
  }
}

// ── 扫码核心逻辑 ─────────────────────────────────────────────────────────────
async function doScan(continuous) {
  isContinuous.value = continuous
  try {
    const content = await doScanCode()
    if (!content) return
    processCode(content)
    // 连续扫码递归调用
    if (continuous) {
      setTimeout(() => doScan(true), 300)
    }
  } catch (e) {
    // 用户取消扫码不报错
    if (e?.errMsg?.includes('cancel')) return
    uni.showToast({ title: '扫码失败', icon: 'none' })
    if (continuous) isContinuous.value = false
  }
}

function processCode(rawContent) {
  // 从扫码内容中提取 instanceCode
  let code = rawContent.trim()
  try {
    const json = JSON.parse(rawContent)
    code = json.instanceCode || json.instance_code || json.code || rawContent.trim()
  } catch (e) {
    // 非 JSON，直接使用原始内容
  }

  if (!code) {
    lastScanResult.value = { type: 'error', code: rawContent, message: '无法识别器材编码' }
    return
  }

  // 重复扫码检测
  if (scannedSet.value.has(code)) {
    duplicateCount.value++
    lastScanResult.value = { type: 'duplicate', code, message: '该器材已扫描过' }
    persistProgress()
    return
  }

  // 盘盈检测：码不在账面白名单中
  if (!allInstanceCodesSet.value.has(code)) {
    surplusCodes.value.push(code)
    lastScanResult.value = { type: 'surplus', code, message: '该器材不在盘点范围内（盘盈）' }
    // 也加入已扫列表（但不计入进度）
    persistProgress()
    rebuildHistory()
    vibrateShort()
    return
  }

  // 正常匹配
  scannedCodes.value.push(code)
  scannedSet.value.add(code)
  const info = codeLookupMap.value.get(code)
  lastScanResult.value = {
    type: 'normal',
    code,
    message: info ? `${info.itemName} ${info.skuName}` : '匹配成功'
  }

  persistProgress()
  rebuildHistory()
  vibrateShort()

  // 滚动到顶部展示最新结果
  scrollTop.value = 0
}

function vibrateShort() {
  try { uni.vibrateShort() } catch (e) {}
}

// ── 本地持久化（每次扫码后立即调用）─────────────────────────────────────────
function persistProgress() {
  if (!checkOrderId.value) return
  saveProgress(checkOrderId.value, {
    scannedCodes: scannedCodes.value,
    surplusCodes: surplusCodes.value,
    duplicateCount: duplicateCount.value,
    status: 'in_progress',
    lastScanTime: Date.now()
  })
}

// ── 删除已扫码 ──────────────────────────────────────────────────────────────
function removeScanned(code) {
  scannedCodes.value = scannedCodes.value.filter(c => c !== code)
  scannedSet.value.delete(code)
  persistProgress()
  rebuildHistory()
}

function removeSurplus(idx) {
  surplusCodes.value.splice(idx, 1)
  persistProgress()
  rebuildHistory()
}

// ── 查看更多历史 ─────────────────────────────────────────────────────────────
function showMoreHistory() {
  scanHistoryLimit.value += 30
  rebuildHistory()
}

// ── 本地暂存 ─────────────────────────────────────────────────────────────────
function saveAndToast() {
  persistProgress()
  uni.showToast({ title: '已本地保存', icon: 'success' })
}

// ── 完成盘点（上传）──────────────────────────────────────────────────────────
async function finishCheck() {
  if (!isOnline.value) {
    uni.showToast({ title: '无网络，请先联网', icon: 'none' })
    return
  }
  if (!scannedCodes.value.length && !surplusCodes.value.length) {
    uni.showToast({ title: '暂无扫码数据', icon: 'none' })
    return
  }

  const { confirm } = await uni.showModal({
    title: '完成盘点',
    content: `已扫 ${scannedCodes.value.length} 条，盘盈 ${surplusCodes.value.length} 条，盘亏 ${lossCount.value} 条。\n确认上传盘点结果？`
  })
  if (!confirm) return

  uni.showLoading({ title: '上传中...' })
  try {
    // 合并：scannedCodes 是账面内匹配到的码，surplusCodes 是盘盈的码
    // 后端 check 接口的 scannedInstanceCodes 需要全部已扫的码（含盘盈）
    const allScanned = [...scannedCodes.value, ...surplusCodes.value]
    await uploadOfflineResult({
      id: checkOrderId.value,
      scannedInstanceCodes: allScanned
    })
    updateTaskStatus(checkOrderId.value, 'uploaded')
    clearProgress(checkOrderId.value)
    uni.hideLoading()
    uni.showToast({ title: '上传成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e) {
    uni.hideLoading()
    const msg = e?.message || e?.errMsg || '上传失败，数据已本地保存'
    uni.showToast({ title: msg, icon: 'none' })
  }
}

// ── 生命周期 ─────────────────────────────────────────────────────────────────
onLoad((options) => {
  if (options.id) {
    initTask(options.id)
  }
})

onMounted(() => {
  checkNetwork()
  networkCb = (res) => { isOnline.value = res.isConnected }
  uni.onNetworkStatusChange(networkCb)
})

onUnmounted(() => {
  if (networkCb) {
    try { uni.offNetworkStatusChange(networkCb) } catch (e) {}
  }
})
</script>

<style lang="scss" scoped>
.offline-task-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

.task-scroll {
  flex: 1;
  padding: 16rpx;
  padding-bottom: 180rpx;
}

/* 网络状态条 */
.offline-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #fff8e6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}
.offline-banner.online-mode { background: #f0f9eb; }
.offline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e6a23c;
  flex-shrink: 0;
}
.online-mode .offline-dot { background: #67c23a; }
.offline-text { font-size: 24rpx; color: #666; }

/* 进度卡片 */
.progress-card {
  background: linear-gradient(135deg, #e8f0fe, #f0f7ff);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.progress-title { font-size: 28rpx; font-weight: 600; color: #333; }
.progress-count { font-size: 36rpx; font-weight: 700; color: #2979ff; }
.progress-bar-wrap {
  height: 16rpx;
  background: rgba(255,255,255,0.8);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #2979ff, #5c9aff);
  border-radius: 8rpx;
  transition: width 0.3s;
}
.progress-stats {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}
.stat-item {
  font-size: 24rpx;
  color: #666;
  b { color: #333; }
}
.stat-surplus b { color: #67c23a; }
.stat-loss b { color: #f56c6c; }
.text-muted { color: #999; }

/* 扫码按钮 */
.scan-actions-card {
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.detail-actions {
  display: flex;
  gap: 16rpx;
}
.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx;
  border-radius: 12rpx;
}
.scan-action { background: #e8f0fe; }
.continuous-action { background: #e8f5e9; }
.action-icon { font-size: 44rpx; margin-bottom: 8rpx; }
.action-text { font-size: 26rpx; color: #333; font-weight: 500; }

/* 扫码结果反馈 */
.scan-result-card {
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.result-normal { background: #f0f9eb; border-left: 6rpx solid #67c23a; }
.result-surplus { background: #fff8e6; border-left: 6rpx solid #e6a23c; }
.result-duplicate { background: #f4f4f5; border-left: 6rpx solid #909399; }
.result-error { background: #fef0f0; border-left: 6rpx solid #f56c6c; }
.result-row { display: flex; align-items: center; gap: 16rpx; }
.result-icon {
  font-size: 40rpx;
  width: 60rpx;
  text-align: center;
}
.result-normal .result-icon { color: #67c23a; }
.result-surplus .result-icon { color: #e6a23c; }
.result-duplicate .result-icon { color: #909399; }
.result-error .result-icon { color: #f56c6c; }
.result-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.result-code {
  font-family: monospace;
  font-size: 26rpx;
  color: #333;
  word-break: break-all;
}
.result-msg { font-size: 22rpx; color: #666; }

/* 盘盈列表 */
.surplus-card {
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.section-title { font-size: 28rpx; font-weight: 600; color: #333; }
.badge-surplus {
  background: #67c23a;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
}
.surplus-list { display: flex; flex-direction: column; gap: 8rpx; }
.surplus-item {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.surplus-label {
  font-size: 22rpx;
  color: #67c23a;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.surplus-code {
  font-family: monospace;
  font-size: 24rpx;
  color: #333;
  flex: 1;
  word-break: break-all;
}

/* 扫码历史 */
.history-card {
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.history-list { display: flex; flex-direction: column; }
.history-item {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 12rpx;
}
.history-code {
  font-family: monospace;
  font-size: 22rpx;
  color: #555;
  flex: 1;
  word-break: break-all;
}
.history-info {
  font-size: 20rpx;
  color: #999;
  max-width: 140rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-status {
  font-size: 22rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.hs-normal { color: #67c23a; background: #f0f9eb; }
.hs-surplus { color: #e6a23c; background: #fff8e6; }
.history-more {
  text-align: center;
  padding: 12rpx;
}
.text-primary { color: #2979ff; font-size: 24rpx; }

/* 删除按钮 */
.btn-del {
  width: 44rpx;
  height: 44rpx;
  padding: 0;
  margin: 0;
  background: #f56c6c;
  color: #fff;
  border-radius: 50%;
  font-size: 28rpx;
  line-height: 44rpx;
  border: none;
  min-height: auto;
  flex-shrink: 0;
  &::after { border: none; }
}
.btn-del-sm {
  width: 36rpx;
  height: 36rpx;
  font-size: 22rpx;
  line-height: 36rpx;
  background: #f5f5f5;
  color: #999;
}

/* 底部栏 */
.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 16rpx;
  border-top: 1rpx solid #eee;
  z-index: 100;
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.06);
}
.btn-primary {
  background: #2979ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  &::after { border: none; }
  &[disabled] { background: #a0c4ff; }
}
.btn-outline {
  background: #fff;
  color: #666;
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  &::after { border: none; }
}
.flex-1 { flex: 1; }
</style>
