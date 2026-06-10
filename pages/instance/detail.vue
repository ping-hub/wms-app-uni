<template>
  <view class="inst-detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view class="card" v-if="info">
        <view class="card-title">基本信息</view>
        <view class="info-row"><text class="info-label">实例编码</text><text class="info-value text-primary">{{ info.instanceCode }}</text></view>
        <view class="info-row"><text class="info-label">状态</text><text :class="['tag', getStatusTagClass(info.instanceStatus)]">{{ info.instanceStatus }}</text></view>
        <view class="info-row"><text class="info-label">器材</text><text class="info-value">{{ info.itemName || '-' }}</text></view>
        <view class="info-row"><text class="info-label">规格</text><text class="info-value">{{ info.skuName || '-' }}</text></view>
        <view class="info-row" v-if="info.itemCode"><text class="info-label">器材编码</text><text class="info-value">{{ info.itemCode }}</text></view>
        <view class="info-row" v-if="info.unit"><text class="info-label">单位</text><text class="info-value">{{ info.unit }}</text></view>
        <view class="info-row" v-if="info.qualityGrade"><text class="info-label">质量等级</text><text class="info-value">{{ info.qualityGrade }}</text></view>
      </view>

      <view class="card" v-if="info">
        <view class="card-title">位置信息</view>
        <view class="info-row"><text class="info-label">仓库</text><text class="info-value">{{ warehouseLabel }}</text></view>
        <view class="info-row"><text class="info-label">库区</text><text class="info-value">{{ areaLabel }}</text></view>
        <view class="info-row" v-if="info.sourceOrderNo"><text class="info-label">来源单据</text><text class="info-value">{{ info.sourceOrderNo }}</text></view>
        <view class="info-row" v-if="info.sourceType"><text class="info-label">来源类型</text><text class="info-value">{{ info.sourceType }}</text></view>
      </view>

    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getItemInstance } from '@/api/wms/itemInstance'
import { useWmsStore } from '@/store/wms'

const wmsStore = useWmsStore()
const info = ref(null)

const warehouseLabel = computed(() => wmsStore.warehouseMap.get(info.value?.warehouseId)?.warehouseName || '-')
const areaLabel = computed(() => wmsStore.areaMap.get(info.value?.areaId)?.areaName || '-')

const getStatusTagClass = (status) => {
  if (status === '在库') return 'tag-success'
  if (status === '出库' || status === '报废') return 'tag-danger'
  if (status === '借出' || status === '盘亏') return 'tag-warning'
  return 'tag-info'
}

onMounted(async () => {
  await wmsStore.loadWarehouses()
  await wmsStore.loadAreas()

  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const options = page.options || page.$page?.options || {}

  if (options.id) {
    try {
      const res = await getItemInstance(options.id)
      info.value = res.data
    } catch (e) {}
  }
})
</script>

<style lang="scss" scoped>
.inst-detail-page { min-height: 100vh; background-color: #f5f6fa; }
.detail-scroll { height: 100vh; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.info-row:last-child { border-bottom: none; }
.info-label { color: #999999; font-size: 26rpx; }
.info-value { color: #333333; font-size: 26rpx; text-align: right; max-width: 60%; }
</style>
