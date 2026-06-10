import { getRequest } from '@/utils/request'

export function listInventoryHistory(query) { return getRequest('/wms/inventoryHistory/list', query) }
