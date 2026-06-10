import { getRequest } from '@/utils/request'

export function listItemSku(query) { return getRequest('/wms/itemSku/listNoPage', query) }
