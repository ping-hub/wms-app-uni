<template>
  <view class="scan-page">
    <scroll-view class="scan-scroll" scroll-y>
      <!-- 扫码入口 -->
      <view class="card scan-entry" @tap="handleScan">
        <view class="scan-icon-wrap">
          <text class="scan-icon-text">📷</text>
        </view>
        <view class="scan-entry-info">
          <text class="scan-entry-title">扫码查找器材</text>
          <text class="scan-entry-desc">扫描器材二维码，查看实例信息和位置</text>
        </view>
        <text class="scan-arrow">›</text>
      </view>

      <!-- 手动输入 -->
      <view class="card manual-input">
        <view class="input-row">
          <input class="code-input" v-model="inputCode" placeholder="手动输入实例编码" confirm-type="search" @confirm="handleSearch" />
          <button class="search-btn" @tap="handleSearch" :loading="searching">查找</button>
        </view>
      </view>

      <!-- 扫码结果 -->
      <template v-if="result">
        <view class="card result-card">
          <view class="result-header">
            <text class="result-title">查找结果</text>
            <text :class="['tag', getStatusTagClass(result.instanceStatus)]">{{ result.instanceStatus || '-' }}</text>
          </view>

          <!-- 基本信息 -->
          <view class="section-label">基本信息</view>
          <view class="info-row"><text class="info-label">实例编码</text><text class="info-value text-primary">{{ result.instanceCode || '-' }}</text></view>
          <view class="info-row"><text class="info-label">器材名称</text><text class="info-value">{{ result.itemName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">器材编码</text><text class="info-value">{{ result.itemCode || '-' }}</text></view>
          <view class="info-row"><text class="info-label">规格型号</text><text class="info-value">{{ result.skuName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">在箱状态</text><text class="info-value">{{ result.boxId ? '在箱' : '不在箱' }}</text></view>
          <view class="info-row"><text class="info-label">借出状态</text><text class="info-value">{{ result.instanceStatus === '借出' ? '已借出' : '未借出' }}</text></view>
          <view class="info-row"><text class="info-label">质量等级</text><text class="info-value">{{ result.qualityGrade || '-' }}</text></view>
          <view class="info-row"><text class="info-label">质保期</text><text class="info-value">{{ result.warrantyPeriod || '-' }}</text></view>

          <!-- 位置信息 -->
          <view class="section-label">位置信息</view>
          <view class="info-row"><text class="info-label">仓库</text><text class="info-value">{{ result.warehouseName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">库区</text><text class="info-value">{{ result.areaName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">货架</text><text class="info-value">{{ result.rackName || '-' }}</text></view>
          <view class="info-row"><text class="info-label">货位</text><text class="info-value">{{ result.locationName || '-' }}</text></view>

          <!-- 关联信息 -->
          <view class="section-label" v-if="result.boxCode || result.currentBusinessNo || result.remark">关联信息</view>
          <view class="info-row" v-if="result.boxCode"><text class="info-label">箱码</text><text class="info-value">{{ result.boxCode }}</text></view>
          <view class="info-row" v-if="result.currentBusinessNo"><text class="info-label">关联单号</text><text class="info-value">{{ result.currentBusinessNo }}</text></view>
          <view class="info-row" v-if="result.remark"><text class="info-label">备注</text><text class="info-value">{{ result.remark }}</text></view>
        </view>
      </template>

      <!-- 未找到 -->
      <view v-if="searched && !result" class="card empty-card">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">未找到编码为「{{ lastCode }}」的器材实例</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { getItemInstanceByCode } from '@/api/wms/itemInstance'
import { parseScanContent } from '@/utils/scan'

const inputCode = ref('')
const result = ref(null)
const searching = ref(false)
const searched = ref(false)
const lastCode = ref('')

const getStatusTagClass = (status) => {
  if (status === '在库') return 'tag-success'
  if (status === '出库' || status === '报废') return 'tag-danger'
  if (status === '借出' || status === '盘亏') return 'tag-warning'
  return 'tag-info'
}

const handleScan = async () => {
  try {
    const res = await uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true
    })
    // 调试：显示原始返回
    console.log('[扫码查找] typeof res:', typeof res)
    console.log('[扫码查找] Array.isArray:', Array.isArray(res))
    console.log('[扫码查找] res:', JSON.stringify(res))

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
    console.log('[扫码查找] 最终内容:', content)

    const parsed = parseScanContent(content)
    const code = parsed.parsed?.instanceCode || content
    console.log('[扫码查找] 解析结果:', JSON.stringify(parsed.parsed))
    if (!code) {
      uni.showToast({ title: '未识别到编码', icon: 'none', duration: 2500 })
      return
    }
    inputCode.value = code
    await searchByCode(code)
  } catch (e) {
    console.error('[扫码查找] 异常:', e)
    const msg = e?.errMsg || e?.message || String(e) || ''
    if (msg && !msg.includes('cancel')) {
      uni.showToast({ title: '扫码失败: ' + msg.substring(0, 40), icon: 'none', duration: 2500 })
    }
  }
}

const handleSearch = () => {
  const code = inputCode.value.trim()
  if (!code) return uni.showToast({ title: '请输入编码', icon: 'none' })
  searchByCode(code)
}

const searchByCode = async (code) => {
  searching.value = true
  searched.value = true
  lastCode.value = code
  result.value = null
  try {
    const res = await getItemInstanceByCode(code)
    const data = res.data || res
    if (data && data.id) {
      result.value = data
    }
  } catch (e) {
    result.value = null
  } finally { searching.value = false }
}
</script>

<style lang="scss" scoped>
.scan-page { min-height: 100vh; background-color: #f5f6fa; }
.scan-scroll { height: 100vh; padding: 16rpx; }

/* 扫码入口 */
.scan-entry { display: flex; align-items: center; padding: 32rpx 24rpx; margin-bottom: 16rpx; }
.scan-icon-wrap { width: 80rpx; height: 80rpx; background: #e8f0fe; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.scan-icon-text { font-size: 40rpx; }
.scan-entry-info { flex: 1; margin-left: 24rpx; display: flex; flex-direction: column; }
.scan-entry-title { font-size: 30rpx; font-weight: 600; color: #333; }
.scan-entry-desc { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.scan-arrow { font-size: 40rpx; color: #ccc; flex-shrink: 0; }

/* 手动输入 */
.manual-input { padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.input-row { display: flex; align-items: center; gap: 16rpx; }
.code-input { flex: 1; height: 72rpx; background: #f5f6fa; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; }
.search-btn { background: #2979ff; color: #fff; border: none; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; padding: 0 32rpx; min-height: auto; &::after { border: none; } }

/* 结果卡片 */
.result-card { padding: 24rpx; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.result-title { font-size: 30rpx; font-weight: 600; color: #333; }
.section-label { font-size: 24rpx; color: #999; margin-top: 20rpx; margin-bottom: 8rpx; padding-top: 8rpx; border-top: 1rpx solid #f5f5f5; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; }
.info-label { color: #999999; font-size: 26rpx; flex-shrink: 0; }
.info-value { color: #333333; font-size: 26rpx; text-align: right; max-width: 65%; word-break: break-all; }
.text-primary { color: #2979ff; font-weight: 600; }

/* 未找到 */
.empty-card { text-align: center; padding: 48rpx 24rpx; }
.empty-icon { font-size: 60rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; display: block; }
</style>
