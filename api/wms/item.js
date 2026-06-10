import { getRequest } from '@/utils/request'

export function listItem(query) { return getRequest('/wms/item/listNoPage', query) }
