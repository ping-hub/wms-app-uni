import { getRequest } from '@/utils/request'

export function listShipmentOrderDetail(query) { return getRequest('/wms/shipmentOrderDetail/list', query) }
