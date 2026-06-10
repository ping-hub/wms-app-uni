import { getRequest } from '@/utils/request'

export function listBox(query) { return getRequest('/wms/box/list', query) }
export function listBoxNoPage(query) { return getRequest('/wms/box/listNoPage', query) }
export function getBox(id) { return getRequest('/wms/box/' + id) }
export function getBoxByCode(boxCode) { return getRequest('/wms/box/code/' + boxCode) }
