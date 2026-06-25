/**
 * 离线盘点本地持久化工具
 *
 * 数据结构（uni.setStorageSync）：
 *   offline_check_tasks          → [{ checkOrderId, checkOrderNo, scopeLabel, status, downloadTime }]
 *   offline_check_{id}_snapshot  → { checkOrderId, skus, allInstanceCodes, totalInstanceCount, ... }
 *   offline_check_{id}_progress  → { scannedCodes: [], surplusCodes: [], status, lastScanTime }
 */

const KEY_TASKS = 'offline_check_tasks'

function snapshotKey(id) { return `offline_check_${id}_snapshot` }
function progressKey(id) { return `offline_check_${id}_progress` }

// ── 任务列表 ─────────────────────────────────────────────────────────────────

/**
 * 获取全部离线盘点任务
 * @returns {Array}
 */
export function getOfflineTasks() {
  try {
    return uni.getStorageSync(KEY_TASKS) || []
  } catch (e) {
    return []
  }
}

/**
 * 新增或更新一个离线任务元信息
 * @param {Object} taskMeta - { checkOrderId, checkOrderNo, scopeLabel, warehouseName, status, downloadTime }
 */
export function saveOfflineTask(taskMeta) {
  const list = getOfflineTasks()
  const idx = list.findIndex(t => t.checkOrderId === taskMeta.checkOrderId)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...taskMeta }
  } else {
    list.unshift(taskMeta)
  }
  uni.setStorageSync(KEY_TASKS, list)
}

/**
 * 删除一个离线任务及其全部本地数据
 * @param {number|string} checkOrderId
 */
export function removeOfflineTask(checkOrderId) {
  const list = getOfflineTasks().filter(t => t.checkOrderId !== checkOrderId)
  uni.setStorageSync(KEY_TASKS, list)
  try { uni.removeStorageSync(snapshotKey(checkOrderId)) } catch (e) {}
  try { uni.removeStorageSync(progressKey(checkOrderId)) } catch (e) {}
}

/**
 * 更新任务状态
 * @param {number|string} checkOrderId
 * @param {string} status - downloaded | in_progress | completed | uploaded
 */
export function updateTaskStatus(checkOrderId, status) {
  const list = getOfflineTasks()
  const t = list.find(t => t.checkOrderId === checkOrderId)
  if (t) {
    t.status = status
    if (status === 'in_progress') t.lastScanTime = Date.now()
    uni.setStorageSync(KEY_TASKS, list)
  }
}

// ── 快照数据 ─────────────────────────────────────────────────────────────────

/**
 * 保存盘点快照（从服务器下载的全量数据）
 * @param {number|string} checkOrderId
 * @param {Object} snapshot - { checkOrderId, skus, allInstanceCodes, totalInstanceCount, ... }
 */
export function saveSnapshot(checkOrderId, snapshot) {
  uni.setStorageSync(snapshotKey(checkOrderId), snapshot)
}

/**
 * 读取盘点快照
 * @param {number|string} checkOrderId
 * @returns {Object|null}
 */
export function getSnapshot(checkOrderId) {
  try {
    return uni.getStorageSync(snapshotKey(checkOrderId)) || null
  } catch (e) {
    return null
  }
}

// ── 扫码进度 ─────────────────────────────────────────────────────────────────

/**
 * 保存扫码进度（每次扫码后立即调用，保证崩溃安全）
 * @param {number|string} checkOrderId
 * @param {Object} progress - { scannedCodes, surplusCodes, status, lastScanTime }
 */
export function saveProgress(checkOrderId, progress) {
  uni.setStorageSync(progressKey(checkOrderId), progress)
}

/**
 * 读取扫码进度
 * @param {number|string} checkOrderId
 * @returns {{ scannedCodes: string[], surplusCodes: string[], status: string, lastScanTime: number } | null}
 */
export function getProgress(checkOrderId) {
  try {
    return uni.getStorageSync(progressKey(checkOrderId)) || null
  } catch (e) {
    return null
  }
}

/**
 * 清除扫码进度（上传成功后调用）
 * @param {number|string} checkOrderId
 */
export function clearProgress(checkOrderId) {
  try { uni.removeStorageSync(progressKey(checkOrderId)) } catch (e) {}
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 构建 instanceCode → { skuId, skuName, itemName, locationName } 的快速查找 Map
 * @param {Array} skus - 快照中的 skus 列表
 * @returns {Map<string, Object>}
 */
export function buildCodeLookupMap(skus) {
  const map = new Map()
  if (!skus) return map
  for (const sku of skus) {
    if (!sku.instances) continue
    for (const inst of sku.instances) {
      map.set(inst.instanceCode, {
        skuId: sku.skuId,
        skuName: sku.skuName || sku.spec || '',
        itemName: sku.itemName || '',
        locationName: inst.locationName || ''
      })
    }
  }
  return map
}

/**
 * 将 allInstanceCodes 数组转为 Set（O(1) 查找）
 * @param {string[]} codes
 * @returns {Set<string>}
 */
export function buildCodeSet(codes) {
  return new Set(codes || [])
}

/**
 * 获取本地离线任务数量（用于首页徽标）
 * @returns {number}
 */
export function getOfflineTaskCount() {
  const list = getOfflineTasks()
  return list.filter(t => t.status !== 'uploaded').length
}
