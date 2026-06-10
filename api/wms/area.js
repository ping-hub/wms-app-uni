import { getRequest } from '@/utils/request'

export function listAreaNoPage(query) { return getRequest('/wms/area/listNoPage', query) }
