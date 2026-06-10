import { getRequest } from '@/utils/request'

export function listWarehouse(query) { return getRequest('/wms/warehouse/list', query) }
export function listWarehouseNoPage(query) { return getRequest('/wms/warehouse/listNoPage', query) }
