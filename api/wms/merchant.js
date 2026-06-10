import { getRequest } from '@/utils/request'

export function listMerchant(query) { return getRequest('/wms/merchant/list', query) }
export function listMerchantNoPage(query) { return getRequest('/wms/merchant/listNoPage', query) }
