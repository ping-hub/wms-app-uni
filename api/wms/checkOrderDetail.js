import { getRequest } from '@/utils/request'

export function listCheckOrderDetail(query) { return getRequest('/wms/checkOrderDetail/list', query) }
