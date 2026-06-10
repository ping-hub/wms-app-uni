import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listWarehouseNoPage } from '@/api/wms/warehouse'
import { listAreaNoPage } from '@/api/wms/area'
import { listRackNoPage } from '@/api/wms/rack'
import { listLocationNoPage } from '@/api/wms/location'
import { treeSelectItemCategory } from '@/api/wms/itemCategory'
import { getDictData } from '@/api/common'

// 统一解析后端响应：{ code: 200, data: ... } → 提取 data
function extractData(res) {
  return res.data !== undefined ? res.data : res
}

export const useWmsStore = defineStore('wms', () => {
  const warehouseList = ref([])
  const areaList = ref([])
  const rackList = ref([])
  const locationList = ref([])
  const itemCategoryTree = ref([])
  const dictMap = ref({})
  const dictLoading = ref({})

  const warehouseMap = computed(() => {
    const map = new Map()
    warehouseList.value.forEach(w => map.set(w.id, w))
    return map
  })

  const areaMap = computed(() => {
    const map = new Map()
    areaList.value.forEach(a => map.set(a.id, a))
    return map
  })

  const rackMap = computed(() => {
    const map = new Map()
    rackList.value.forEach(r => map.set(r.id, r))
    return map
  })

  const locationMap = computed(() => {
    const map = new Map()
    locationList.value.forEach(l => map.set(l.id, l))
    return map
  })

  function getAreasByWarehouseId(warehouseId) {
    return areaList.value.filter(a => a.warehouseId === warehouseId)
  }

  function getRacksByAreaId(areaId) {
    return rackList.value.filter(r => r.areaId === areaId)
  }

  function getLocationsByRackId(rackId) {
    return locationList.value.filter(l => l.rackId === rackId)
  }

  async function loadWarehouses() {
    if (warehouseList.value.length) return
    const res = await listWarehouseNoPage()
    warehouseList.value = extractData(res) || []
  }

  async function loadAreas() {
    if (areaList.value.length) return
    const res = await listAreaNoPage()
    areaList.value = extractData(res) || []
  }

  async function loadRacks(query = {}) {
    const res = await listRackNoPage(query)
    rackList.value = extractData(res) || []
  }

  async function loadLocations(query = {}) {
    const res = await listLocationNoPage(query)
    locationList.value = extractData(res) || []
  }

  async function loadItemCategoryTree() {
    if (itemCategoryTree.value.length) return
    const res = await treeSelectItemCategory()
    itemCategoryTree.value = extractData(res) || []
  }

  async function getDict(dictType) {
    if (dictMap.value[dictType]) return dictMap.value[dictType]
    if (dictLoading.value[dictType]) return []
    dictLoading.value[dictType] = true
    try {
      const res = await getDictData(dictType)
      const list = extractData(res) || []
      dictMap.value[dictType] = list
      return list
    } catch (e) {
      return []
    } finally {
      dictLoading.value[dictType] = false
    }
  }

  function getDictLabel(dictType, value) {
    const list = dictMap.value[dictType] || []
    const item = list.find(d => d.dictValue === String(value))
    return item ? item.dictLabel : value
  }

  function clearCache() {
    warehouseList.value = []
    areaList.value = []
    rackList.value = []
    locationList.value = []
    itemCategoryTree.value = []
    dictMap.value = {}
  }

  return {
    warehouseList, areaList, rackList, locationList, itemCategoryTree,
    warehouseMap, areaMap, rackMap, locationMap, dictMap,
    getAreasByWarehouseId, getRacksByAreaId, getLocationsByRackId,
    loadWarehouses, loadAreas, loadRacks, loadLocations, loadItemCategoryTree,
    getDict, getDictLabel, clearCache
  }
})
