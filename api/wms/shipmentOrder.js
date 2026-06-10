import { getRequest, postRequest, putRequest, delRequest } from '@/utils/request'

export function listShipmentOrder(query) { return getRequest('/wms/shipmentOrder/list', query) }
export function getShipmentOrder(id) { return getRequest('/wms/shipmentOrder/' + id) }
export function addShipmentOrder(data) { return postRequest('/wms/shipmentOrder', data) }
export function updateShipmentOrder(data) { return putRequest('/wms/shipmentOrder', data) }
export function delShipmentOrder(id) { return delRequest('/wms/shipmentOrder/' + id) }
export function shipment(data) { return putRequest('/wms/shipmentOrder/shipment', data) }
