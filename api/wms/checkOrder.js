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
