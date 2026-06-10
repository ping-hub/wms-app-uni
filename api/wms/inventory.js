import { getRequest } from '@/utils/request'

export function listInventory(query) { return getRequest('/wms/inventory/list', query) }
export function getInventory(id) { return getRequest('/wms/inventory/' + id) }
