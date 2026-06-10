import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listReceiptOrder(query) { return getRequest('/wms/receiptOrder/list', query) }
export function getReceiptOrder(id) { return getRequest('/wms/receiptOrder/' + id) }
export function addReceiptOrder(data) { return postRequest('/wms/receiptOrder', data) }
export function updateReceiptOrder(data) { return putRequest('/wms/receiptOrder', data) }
export function delReceiptOrder(id) { return delRequest('/wms/receiptOrder/' + id) }
export function warehousing(data) { return postRequest('/wms/receiptOrder/warehousing', data) }
export function generateReceiptOrderNo() { return getRequest('/wms/receiptOrder/generate/no') }
export function listByReceiptOrderId(receiptOrderId) { return getRequest('/wms/receiptOrderDetail/list/' + receiptOrderId) }
