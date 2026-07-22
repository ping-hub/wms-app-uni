<template>
  <view class="offline-check-page">
    <!-- 顶部说明 -->
    <view class="tip-bar card">
      <text class="tip-icon">📡</text>
      <text class="tip-text">下载盘点数据到本地，无网环境下扫码盘点，联网后上传结果</text>
    </view>

    <!-- Tab切换 -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ 'tab-active': currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.value === 'local' && localTasks.length" class="tab-badge">{{ localTasks.length }}</text>
      </view>
    </view>

    <!-- 可下载列表（在线盘点单） -->
    <scroll-view
      v-if="currentTab === 'server'"
      class="task-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="serverRefreshing"
      @refresherrefresh="onServerRefresh"
    >
      <view v-if="!serverList.length && !serverLoading" class="empty-tip">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无可下载的盘点单</text>
        <text class="empty-sub">请先在 Web 端创建并启动盘点单</text>
      </view>

      <view v-for="item in serverList" :key="item.id" class="task-card card">
        <view class="task-header">
          <text class="task-no">{{ item.checkOrderNo || '待生成' }}</text>
          <text class="task-scope">{{ getScopeLabel(item) }}</text>
        </view>
        <view class="task-body">
          <view class="task-row">
            <text class="task-label">仓库</text>
            <text class="task-value">{{ getWarehouseName(item.warehouseId) }}</text>
          </view>
          <view class="task-row">
            <text class="task-label">盘点人</text>
            <text class="task-value">{{ item.executorName || '-' }}</text>
          </view>
          <view class="task-row">
            <text class="task-label">创建时间</text>
            <text class="task-value">{{ formatTime(item.createTime) }}</text>
          </view>
          <view class="task-row" v-if="isDownloaded(item.id)">
            <text class="task-label">本地状态</text>
            <text class="task-value downloaded">已下载</text>
          </view>
        </view>
        <view class="task-footer">
          <button
            class="btn-download"
            :disabled="downloadingId === item.id"
            @click="downloadSnapshot(item)"
          >
            {{ downloadingId === item.id ? '下载中...' : (isDownloaded(item.id) ? '重新下载' : '⬇ 下载数据') }}
          </button>
        </view>
      </view>

      <view v-if="serverLoading" class="loading-tip">
        <text class="text-secondary">加载中...</text>
      </view>
    </scroll-view>

    <!-- 已下载列表（本地离线任务） -->
    <scroll-view v-if="currentTab === 'local'" class="task-list" scroll-y>
      <view v-if="!localTasks.length" class="empty-tip">
        <text class="empty-icon">📥</text>
        <text class="empty-text">暂无已下载的盘点任务</text>
        <text class="empty-sub">请先在"可下载"列表中下载盘点数据</text>
      </view>

      <view v-for="task in localTasks" :key="task.checkOrderId" class="task-card card" :class="'status-' + task.status">
        <view class="task-header">
          <text class="task-no">{{ task.checkOrderNo || '盘点单' }}</text>
          <text class="status-tag" :class="'tag-' + task.status">{{ getStatusLabel(task.status) }}</text>
        </view>
        <view class="task-body">
          <view class="task-row">
            <text class="task-label">盘点范围</text>
            <text class="task-value">{{ task.scopeLabel || '-' }}</text>
          </view>
          <view class="task-row">
            <text class="task-label">下载时间</text>
            <text class="task-value">{{ formatDownloadTime(task.downloadTime) }}</text>
          </view>
          <view class="task-row" v-if="task.lastScanTime">
            <text class="task-label">最近扫码</text>
            <text class="task-value">{{ formatDownloadTime(task.lastScanTime) }}</text>
          </view>
        </view>
        <view class="task-footer flex-between">
          <button
            v-if="task.status !== 'uploaded'"
            class="btn-start"
            @click="goTask(task)"
          >
            {{ task.status === 'in_progress' ? '继续盘点' : '开始盘点' }}
          </button>
          <button
            v-if="task.status === 'in_progress' || task.status === 'completed'"
            class="btn-upload"
            :disabled="uploadingId === task.checkOrderId"
            @click="uploadResult(task)"
          >
            {{ uploadingId === task.checkOrderId ? '上传中...' : '⬆ 上传结果' }}
          </button>
          <button class="btn-delete" @click="deleteTask(task)">删除</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listCheckOrder } from '@/api/wms/checkOrder'
import { getOfflineSnapshot, uploadOfflineResult } from '@/api/wms/offlineCheck'
import { useWmsStore } from '@/store/wms'
import { formatTime } from '@/utils/scan'
import {
  getOfflineTasks, saveOfflineTask, removeOfflineTask,
  updateTaskStatus, saveSnapshot, getSnapshot, getProgress, clearProgress
} from '@/utils/offlineStorage'

const wmsStore = useWmsStore()

const tabs = [
  { label: '可下载', value: 'server' },
  { label: '已下载', value: 'local' }
]
const currentTab = ref('server')

// ── 服务器端盘点单列表 ──────────────────────────────────────────────────────
const serverList = ref([])
const serverLoading = ref(false)
const serverRefreshing = ref(false)
const downloadingId = ref(null)

// ── 本地离线任务列表 ─────────────────────────────────────────────────────────
const localTasks = ref([])
const uploadingId = ref(null)

function loadLocalTasks() {
  localTasks.value = getOfflineTasks()
}

// ── Tab切换 ──────────────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab.value = tab
  if (tab === 'local') loadLocalTasks()
}

// ── 服务器列表加载 ──────────────────────────────────────────────────────────
async function loadServerList() {
  serverLoading.value = true
  try {
    // 只查 status=1（待盘点）的盘点单，即已提交且已startCheck的
    const res = await listCheckOrder({ pageNum: 1, pageSize: 50, checkOrderStatus: '1' })
    serverList.value = (res.rows || []).filter(r => r.executorName) // 必须有盘点人才能离线盘
  } catch (e) {
    console.error('loadServerList error', e)
  } finally {
    serverLoading.value = false
    serverRefreshing.value = false
  }
}

function onServerRefresh() {
  serverRefreshing.value = true
  loadServerList()
}

// ── 辅助函数 ─────────────────────────────────────────────────────────────────
function getScopeLabel(item) {
  const typeLabel = wmsStore.getDictLabel('wms_check_scope_type', item.checkScopeType) || ''
  let name = ''
  if (item.checkScopeType === 'warehouse') {
    name = wmsStore.warehouseMap.get(item.warehouseId)?.warehouseName || ''
  } else if (item.checkScopeType === 'area') {
    name = wmsStore.areaMap.get(item.areaId)?.areaName || ''
  } else if (item.checkScopeType === 'rack') {
    name = wmsStore.rackMap.get(item.rackId)?.rackName || ''
  }
  return typeLabel + (name ? ' - ' + name : '')
}

function getWarehouseName(warehouseId) {
  return wmsStore.warehouseMap.get(warehouseId)?.warehouseName || '-'
}

function isDownloaded(checkOrderId) {
  return localTasks.value.some(t => t.checkOrderId === checkOrderId)
}

function formatDownloadTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function getStatusLabel(status) {
  const map = {
    downloaded: '待盘点',
    in_progress: '盘点中',
    completed: '已完成',
    uploaded: '已上传'
  }
  return map[status] || status
}

// ── 下载快照 ─────────────────────────────────────────────────────────────────
async function downloadSnapshot(item) {
  downloadingId.value = item.id
  try {
    const res = await getOfflineSnapshot(item.id)
    const snapshot = res.data || res

    // 保存到本地
    saveSnapshot(item.id, snapshot)

    // 保存任务元信息
    saveOfflineTask({
      checkOrderId: item.id,
      checkOrderNo: item.checkOrderNo || '待生成',
      scopeLabel: getScopeLabel(item),
      warehouseName: getWarehouseName(item.warehouseId),
      status: 'downloaded',
      downloadTime: Date.now(),
      totalInstanceCount: snapshot.totalInstanceCount || 0,
      lastScanTime: null
    })

    loadLocalTasks()
    uni.showToast({ title: '下载成功', icon: 'success' })

    // 自动切换到已下载 Tab
    setTimeout(() => switchTab('local'), 800)
  } catch (e) {
    const msg = e?.message || e?.errMsg || '下载失败，请检查网络'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    downloadingId.value = null
  }
}

// ── 进入离线盘点作业页 ──────────────────────────────────────────────────────
function goTask(task) {
  uni.navigateTo({ url: `/pages/offline-check/task?id=${task.checkOrderId}` })
}

// ── 上传盘点结果 ─────────────────────────────────────────────────────────────
async function uploadResult(task) {
  const progress = getProgress(task.checkOrderId)
  if (!progress || !progress.scannedCodes?.length) {
    uni.showToast({ title: '暂无扫码数据', icon: 'none' })
    return
  }

  // 检查网络
  const net = await uni.getNetworkType()
  if (net.networkType === 'none') {
    uni.showToast({ title: '无网络，请先联网', icon: 'none' })
    return
  }

  const { confirm } = await uni.showModal({
    title: '上传确认',
    content: `确认上传【${task.checkOrderNo}】的盘点结果（${progress.scannedCodes.length} 条扫码记录）？`
  })
  if (!confirm) return

  uploadingId.value = task.checkOrderId
  try {
    await uploadOfflineResult({
      id: task.checkOrderId,
      scannedInstanceCodes: progress.scannedCodes
    })
    updateTaskStatus(task.checkOrderId, 'uploaded')
    clearProgress(task.checkOrderId)
    loadLocalTasks()
    uni.showToast({ title: '上传成功', icon: 'success' })
  } catch (e) {
    const msg = e?.message || e?.errMsg || '上传失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    uploadingId.value = null
  }
}

// ── 删除本地任务 ─────────────────────────────────────────────────────────────
async function deleteTask(task) {
  const { confirm } = await uni.showModal({
    title: '删除确认',
    content: `确认删除本地离线任务【${task.checkOrderNo}】？\n（不会影响服务器端盘点单）`
  })
  if (!confirm) return
  removeOfflineTask(task.checkOrderId)
  loadLocalTasks()
  uni.showToast({ title: '已删除', icon: 'success' })
}

// ── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  wmsStore.loadWarehouses()
  wmsStore.loadAreas()
  wmsStore.loadRacks()
  wmsStore.getDict('wms_check_scope_type')
})

onShow(() => {
  loadServerList()
  loadLocalTasks()
})
</script>

<style lang="scss" scoped>
.offline-check-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

.tip-bar {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 16rpx 16rpx 0;
  padding: 20rpx 24rpx;
  background: #e8f0fe;
  border-radius: 16rpx;
}
.tip-icon { font-size: 32rpx; flex-shrink: 0; }
.tip-text { font-size: 24rpx; color: #2979ff; line-height: 1.6; }

.tabs {
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
  position: relative;
}
.tab-active { background: #2979ff; }
.tab-active .tab-text { color: #ffffff; }
.tab-text { font-size: 26rpx; color: #666666; }
.tab-badge {
  position: absolute;
  top: -8rpx;
  right: 16rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 20rpx;
}

.task-list {
  flex: 1;
  padding: 16rpx;
  padding-bottom: 80rpx;
}

.task-card {
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  background: #ffffff;
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.task-no {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}
.task-scope {
  font-size: 22rpx;
  color: #999999;
}
.task-body {
  margin-bottom: 16rpx;
}
.task-row {
  display: flex;
  justify-content: space-between;
  padding: 6rpx 0;
}
.task-label {
  color: #999999;
  font-size: 24rpx;
}
.task-value {
  color: #333333;
  font-size: 24rpx;
  text-align: right;
  max-width: 60%;
}
.task-value.downloaded {
  color: #67c23a;
  font-weight: 500;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}
.tag-downloaded { background: #f0f9eb; color: #67c23a; }
.tag-in_progress { background: #fff8e6; color: #e6a23c; }
.tag-completed { background: #e8f0fe; color: #2979ff; }
.tag-uploaded { background: #f4f4f5; color: #909399; }

.task-footer {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.btn-download,
.btn-start,
.btn-upload,
.btn-delete {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 10rpx;
  font-size: 26rpx;
  border: none;
  min-height: auto;
  padding: 0;

  &::after { border: none; }
}

.btn-download {
  background: #2979ff;
  color: #ffffff;
  &[disabled] { background: #a0c4ff; }
}

.btn-start {
  background: #2979ff;
  color: #ffffff;
}

.btn-upload {
  background: #67c23a;
  color: #ffffff;
  &[disabled] { background: #b3e19d; }
}

.btn-delete {
  flex: 0 0 auto;
  width: 120rpx;
  background: #f5f6fa;
  color: #999999;
  border: 1rpx solid #e8e8e8;
}

.empty-tip {
  text-align: center;
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #666666; }
.empty-sub { font-size: 24rpx; color: #999999; }

.loading-tip {
  text-align: center;
  padding: 24rpx 0;
}
.text-secondary { color: #999999; font-size: 24rpx; }

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
