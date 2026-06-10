import { getRequest } from '@/utils/request'

export function listMovementOrderDetail(query) { return getRequest('/wms/movementOrderDetail/list', query) }
