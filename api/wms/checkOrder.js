import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listCheckOrder(query) { return getRequest('/wms/checkOrder/list', query) }
export function getCheckOrder(id) { return getRequest('/wms/checkOrder/' + id) }
export function addCheckOrder(data) { return postRequest('/wms/checkOrder', data) }
export function updateCheckOrder(data) { return putRequest('/wms/checkOrder', data) }
export function delCheckOrder(id) { return delRequest('/wms/checkOrder/' + id) }
export function checkOrder(data) { return postRequest('/wms/checkOrder/check', data) }
