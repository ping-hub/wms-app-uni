import { getRequest } from '@/utils/request'

export function listLocationNoPage(query) { return getRequest('/wms/location/listNoPage', query) }
