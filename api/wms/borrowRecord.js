import { getRequest, postRequest } from '@/utils/request'

export function listBorrowRecord(query) { return getRequest('/wms/borrowRecord/list', query) }
export function listBorrowRecordNoPage(query) { return getRequest('/wms/borrowRecord/listNoPage', query) }
export function getBorrowRecord(id) { return getRequest('/wms/borrowRecord/' + id) }
export function getCurrentBorrow(itemInstanceId) { return getRequest('/wms/borrowRecord/current/' + itemInstanceId) }
export function getBorrowWarningStats() { return getRequest('/wms/borrowRecord/warning/stats') }
export function borrowItem(data) { return postRequest('/wms/borrowRecord/borrow', data) }
export function returnItem(data) { return postRequest('/wms/borrowRecord/return', data) }
