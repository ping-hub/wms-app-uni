import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listCheckOrder(query) { return getRequest('/wms/checkOrder/list', query) }
export function getCheckOrder(id) { return getRequest('/wms/checkOrder/' + id) }
export function addCheckOrder(data) { return postRequest('/wms/checkOrder', data) }
export function updateCheckOrder(data) { return putRequest('/wms/checkOrder', data) }
export function delCheckOrder(id) { return delRequest('/wms/checkOrder/' + id) }
// 开始盘点：生成SKU级明细，返回轻量统计信息
export function startCheck(id) { return postRequest('/wms/checkOrder/startCheck/' + id) }
// 验码：校验扫码结果是否属于盘点范围，实时返回盘盈信息
export function verifyCodes(checkOrderId, instanceCodes) { return postRequest('/wms/checkOrder/verify/' + checkOrderId, instanceCodes) }
// 完成盘点：保存差异+实例明细
export function check(data) { return postRequest('/wms/checkOrder/check', data) }

// 提交审批（草稿/已驳回 → 待盘点）
export function submitForApproval(id, executorId, executorName) {
  let url = '/wms/checkOrder/submit/' + id + '?'
  if (executorId) url += 'executorId=' + executorId + '&'
  if (executorName) url += 'executorName=' + encodeURIComponent(executorName) + '&'
  return putRequest(url)
}
// 完成盘点并提交复核（待盘点 → 待复核）
export function completeCheck(data, reviewerId, reviewerName) {
  let url = '/wms/checkOrder/complete?'
  if (reviewerId) url += 'reviewerId=' + reviewerId + '&'
  if (reviewerName) url += 'reviewerName=' + encodeURIComponent(reviewerName) + '&'
  return postRequest(url, data)
}
// 复核通过（待复核 → 已完成）
export function approveOrder(id, remark) {
  let url = '/wms/checkOrder/approve/' + id
  if (remark) url += '?remark=' + encodeURIComponent(remark)
  return putRequest(url)
}
// 驳回（待盘点/待复核 → 已驳回）
export function rejectOrder(id, remark) {
  let url = '/wms/checkOrder/reject/' + id
  if (remark) url += '?remark=' + encodeURIComponent(remark)
  return putRequest(url)
}
// 作废（草稿/已驳回 → 作废）
export function voidOrder(id) { return putRequest('/wms/checkOrder/void/' + id) }
