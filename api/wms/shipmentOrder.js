import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listShipmentOrder(query) { return getRequest('/wms/shipmentOrder/list', query) }
export function getShipmentOrder(id) { return getRequest('/wms/shipmentOrder/' + id) }
export function addShipmentOrder(data) { return postRequest('/wms/shipmentOrder', data) }
export function updateShipmentOrder(data) { return putRequest('/wms/shipmentOrder', data) }
export function delShipmentOrder(id) { return delRequest('/wms/shipmentOrder/' + id) }
export function shipment(data) { return putRequest('/wms/shipmentOrder/shipment', data) }
// 提交审批
export function submitForApproval(id, approverId, approverName) {
  let url = '/wms/shipmentOrder/submit/' + id + '?'
  if (approverId) url += 'approverId=' + approverId + '&'
  if (approverName) url += 'approverName=' + encodeURIComponent(approverName) + '&'
  return putRequest(url)
}
// 审批通过
export function approveOrder(id, remark, executorId, executorName) {
  let url = '/wms/shipmentOrder/approve/' + id + '?'
  if (remark) url += 'remark=' + encodeURIComponent(remark) + '&'
  if (executorId) url += 'executorId=' + executorId + '&'
  if (executorName) url += 'executorName=' + encodeURIComponent(executorName) + '&'
  return putRequest(url)
}
// 驳回
export function rejectOrder(id, remark) {
  let url = '/wms/shipmentOrder/reject/' + id
  if (remark) url += '?remark=' + encodeURIComponent(remark)
  return putRequest(url)
}
// 作废
export function voidOrder(id) { return putRequest('/wms/shipmentOrder/void/' + id) }
