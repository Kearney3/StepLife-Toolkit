// 地图提供商配置
// 参考: https://fow.vicc.wang/coords_transform.html#

export const mapProviders = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'gaode',
    name: '高德地图',
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>',
    maxZoom: 18,
    subdomains: ['1', '2', '3', '4'],
    coordinateSystem: 'GCJ02',
    note: '注意：高德地图使用GCJ02坐标系，坐标可能有轻微偏移'
  },
  {
    id: 'gaode_satellite',
    name: '高德卫星图',
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>',
    maxZoom: 18,
    subdomains: ['1', '2', '3', '4'],
    coordinateSystem: 'GCJ02'
  },
  {
    id: 'tencent',
    name: '腾讯地图',
    url: 'https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3',
    attribution: '&copy; <a href="https://map.qq.com/">腾讯地图</a>',
    maxZoom: 18,
    subdomains: ['0', '1', '2', '3'],
    coordinateSystem: 'GCJ02',
    note: '注意：腾讯地图使用GCJ02坐标系，坐标可能有轻微偏移'
  },
  {
    id: 'tencent_satellite',
    name: '腾讯卫星图',
    url: 'https://p{s}.map.gtimg.com/sateTiles/{z}/{x}/{y}/{x}_{y}.jpg',
    attribution: '&copy; <a href="https://map.qq.com/">腾讯地图</a>',
    maxZoom: 18,
    subdomains: ['0', '1', '2', '3'],
    coordinateSystem: 'GCJ02'
  },
  {
    id: 'google',
    name: 'Google Maps',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'google_satellite',
    name: 'Google 卫星图',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'google_hybrid',
    name: 'Google 混合图',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'cartodb',
    name: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'cartodb_dark',
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'esri',
    name: 'Esri WorldImagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
    subdomains: [],
    coordinateSystem: 'WGS84'
  },
  {
    id: 'esri_street',
    name: 'Esri WorldStreetMap',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
    subdomains: [],
    coordinateSystem: 'WGS84'
  }
]

// 获取默认地图提供商
export const getDefaultProvider = () => mapProviders[0]

// 根据ID获取地图提供商
export const getProviderById = (id) => {
  return mapProviders.find(provider => provider.id === id) || getDefaultProvider()
}

