import { getRequest, putRequest } from '@/utils/request'

export function listItemInstance(query) { return getRequest('/wms/itemInstance/list', query) }
export function listItemInstanceNoPage(query) { return getRequest('/wms/itemInstance/listNoPage', query) }
export function getItemInstance(id) { return getRequest('/wms/itemInstance/' + id) }
export function getItemInstanceByCode(instanceCode, query = {}) { return getRequest('/wms/itemInstance/code/' + instanceCode, query) }
export function updateItemInstanceStatus(data) { return putRequest('/wms/itemInstance/status', data) }
export function updateItemInstanceLocation(data) { return putRequest('/wms/itemInstance/location', data) }
