import { getRequest } from '@/utils/request'

export function treeSelectItemCategory(query) { return getRequest('/wms/itemCategory/treeselect', query) }
