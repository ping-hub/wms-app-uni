import { getRequest, postRequest } from '@/utils/request'

/**
 * 下载盘点单快照（离线盘点专用，一次性返回全量数据）
 * GET /wms/checkOrder/offline/snapshot/{checkOrderId}
 *
 * 返回结构：
 * {
 *   checkOrderId, checkOrderNo, warehouseName, scopeLabel,
 *   skus: [{ skuId, itemName, itemCode, spec, bookQuantity,
 *            instances: [{ instanceId, instanceCode, locationName }] }],
 *   allInstanceCodes: string[],
 *   totalInstanceCount: number
 * }
 */
export function getOfflineSnapshot(checkOrderId) {
  return getRequest('/wms/checkOrder/offline/snapshot/' + checkOrderId)
}

/**
 * 上传离线盘点结果（复用现有 check 接口）
 * POST /wms/checkOrder/check
 *
 * @param {Object} data - { id: checkOrderId, scannedInstanceCodes: string[] }
 */
export function uploadOfflineResult(data) {
  return postRequest('/wms/checkOrder/check', data)
}
