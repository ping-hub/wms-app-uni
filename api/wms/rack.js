import { getRequest } from '@/utils/request'

export function listRackNoPage(query) { return getRequest('/wms/rack/listNoPage', query) }
