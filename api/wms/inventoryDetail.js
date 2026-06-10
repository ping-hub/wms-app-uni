import { getRequest, postRequest } from '@/utils/request'

export function listInventoryDetail(query) { return getRequest('/wms/inventoryDetail/list', query) }
export function listInventoryDetailNoPage(query) { return getRequest('/wms/inventoryDetail/listNoPage', query) }
export function exportInventoryDetail(data) { return postRequest('/wms/inventoryDetail/export', data) }
