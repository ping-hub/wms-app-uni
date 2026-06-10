import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listMovementOrder(query) { return getRequest('/wms/movementOrder/list', query) }
export function getMovementOrder(id) { return getRequest('/wms/movementOrder/' + id) }
export function addMovementOrder(data) { return postRequest('/wms/movementOrder', data) }
export function updateMovementOrder(data) { return putRequest('/wms/movementOrder', data) }
export function delMovementOrder(id) { return delRequest('/wms/movementOrder/' + id) }
export function moveOrder(data) { return postRequest('/wms/movementOrder/move', data) }
