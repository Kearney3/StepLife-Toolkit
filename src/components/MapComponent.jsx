import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, Rectangle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 修复 Leaflet 默认图标问题
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Canvas 渲染层组件 - 用于高性能渲染大量点
function CanvasLayer({ dataPoints, selectedPoints, onPointClick, isSelecting, pointColor, selectedColor, pointSize }) {
  const map = useMap()
  const canvasRef = useRef(null)
  const [bounds, setBounds] = useState(map.getBounds())
  const [zoom, setZoom] = useState(map.getZoom())

  // 防抖函数
  const debounce = useCallback((func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }, [])

  // 更新视口和缩放级别
  const updateView = useCallback(() => {
    setBounds(map.getBounds())
    setZoom(map.getZoom())
  }, [map])

  // 防抖的更新函数
  const debouncedUpdateView = useMemo(
    () => debounce(updateView, 100),
    [updateView, debounce]
  )

  // 监听地图移动和缩放
  useEffect(() => {
    map.on('moveend', updateView)
    map.on('zoomend', updateView)
    map.on('move', debouncedUpdateView)
    map.on('zoom', debouncedUpdateView)

    return () => {
      map.off('moveend', updateView)
      map.off('zoomend', updateView)
      map.off('move', debouncedUpdateView)
      map.off('zoom', debouncedUpdateView)
    }
  }, [map, updateView, debouncedUpdateView])

  // 计算可见点和采样
  const visiblePoints = useMemo(() => {
    if (dataPoints.length === 0) return []

    // 视口裁剪 - 只保留在当前视口内的点
    const visible = dataPoints.filter(point => {
      return bounds.contains([point.latitude, point.longitude])
    })

    // 根据缩放级别采样
    // 缩放级别越低，采样越多（显示更少的点）
    let sampleRate = 1
    if (zoom < 10) {
      sampleRate = Math.max(1, Math.floor(visible.length / 5000)) // 最多显示5000个点
    } else if (zoom < 12) {
      sampleRate = Math.max(1, Math.floor(visible.length / 10000)) // 最多显示10000个点
    } else if (zoom < 14) {
      sampleRate = Math.max(1, Math.floor(visible.length / 20000)) // 最多显示20000个点
    }
    // zoom >= 14 时显示所有点

    if (sampleRate === 1) {
      return visible
    }

    // 采样
    return visible.filter((_, index) => index % sampleRate === 0)
  }, [dataPoints, bounds, zoom])

  // 渲染 Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const container = map.getContainer()
    
    // 设置 Canvas 尺寸（考虑设备像素比以获得清晰的渲染）
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    ctx.scale(dpr, dpr)

    // 清空画布
    ctx.clearRect(0, 0, rect.width, rect.height)

    if (visiblePoints.length === 0) return

    // 渲染点
    visiblePoints.forEach(point => {
      const isSelected = selectedPoints.has(point.id)
      const pointPos = map.latLngToContainerPoint([point.latitude, point.longitude])

      // 只渲染在视口内的点（添加一些边距以处理边界情况）
      const margin = 20
      if (
        pointPos.x < -margin || pointPos.x > rect.width + margin ||
        pointPos.y < -margin || pointPos.y > rect.height + margin
      ) {
        return
      }

      // 绘制点（无边框）
      // 根据点大小设置半径
      const sizeMap = {
        small: { normal: 3, selected: 4 },
        medium: { normal: 4, selected: 6 },
        large: { normal: 6, selected: 8 }
      }
      const sizeConfig = sizeMap[pointSize] || sizeMap.medium
      const radius = isSelected ? sizeConfig.selected : sizeConfig.normal
      
      ctx.beginPath()
      ctx.arc(pointPos.x, pointPos.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? selectedColor : pointColor
      ctx.fill()
    })
  }, [visiblePoints, selectedPoints, map, pointColor, selectedColor, pointSize])

  // 处理点击事件
  const handleCanvasClick = useCallback((e) => {
    if (!isSelecting) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mapContainer = map.getContainer()
    const mapRect = mapContainer.getBoundingClientRect()
    
    // 计算相对于地图容器的坐标
    const x = e.clientX - mapRect.left
    const y = e.clientY - mapRect.top

    // 查找点击附近的点（容差 10 像素）
    const tolerance = 10
    let clickedPoint = null
    let minDistance = Infinity

    visiblePoints.forEach(point => {
      const pointPos = map.latLngToContainerPoint([point.latitude, point.longitude])
      const distance = Math.sqrt(
        Math.pow(pointPos.x - x, 2) + Math.pow(pointPos.y - y, 2)
      )

      if (distance < tolerance && distance < minDistance) {
        minDistance = distance
        clickedPoint = point
      }
    })

    if (clickedPoint) {
      const isSelected = selectedPoints.has(clickedPoint.id)
      onPointClick(clickedPoint.id, !isSelected)
    }
  }, [isSelecting, map, visiblePoints, selectedPoints, onPointClick])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 500,
        pointerEvents: isSelecting ? 'auto' : 'none',
        cursor: isSelecting ? 'crosshair' : 'default'
      }}
      onClick={handleCanvasClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

// 地图更新组件
function MapUpdater({ center, zoom }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  
  return null
}

// 框选组件
function BoxSelector({ isSelecting, onBoxSelect, dataPoints, bounds }) {
  const map = useMap()
  const [boxStart, setBoxStart] = useState(null)
  const [boxEnd, setBoxEnd] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (!isSelecting) {
      setBoxStart(null)
      setBoxEnd(null)
      setIsDrawing(false)
      return
    }

    const handleMouseDown = (e) => {
      // 只处理左键，并且需要按住 Shift 键
      if (e.originalEvent.button !== 0 || !e.originalEvent.shiftKey) {
        return
      }
      
      // 阻止地图拖动
      e.originalEvent.preventDefault()
      e.originalEvent.stopPropagation()
      
      // 临时禁用地图拖动
      map.dragging.disable()
      
      setIsDrawing(true)
      const latlng = e.latlng
      setBoxStart(latlng)
      setBoxEnd(latlng)
    }

    const handleMouseMove = (e) => {
      if (isDrawing && boxStart) {
        // 如果框选过程中释放了 Shift 键，取消框选
        if (!e.originalEvent.shiftKey) {
          setIsDrawing(false)
          setBoxStart(null)
          setBoxEnd(null)
          map.dragging.enable()
          return
        }
        setBoxEnd(e.latlng)
      }
    }

    const handleMouseUp = (e) => {
      if (isDrawing && boxStart && boxEnd) {
        // 计算框选区域的最小尺寸，避免误触
        const boxBounds = L.latLngBounds(boxStart, boxEnd)
        const boxSize = boxBounds.getNorthEast().distanceTo(boxBounds.getSouthWest())
        
        // 如果框选区域太小（小于 10 米），不执行选择
        if (boxSize > 10) {
          // 优化：只检查可见区域内的点
          const visiblePoints = dataPoints.filter(point => 
            bounds.contains([point.latitude, point.longitude])
          )
          
          const selectedIds = visiblePoints
            .filter(point => boxBounds.contains([point.latitude, point.longitude]))
            .map(point => point.id)
          
          if (selectedIds.length > 0) {
            onBoxSelect(selectedIds)
          }
        }
        
        setIsDrawing(false)
        setBoxStart(null)
        setBoxEnd(null)
      }
      
      // 恢复地图拖动（如果之前被禁用）
      if (isDrawing) {
        map.dragging.enable()
      }
    }

    // 监听键盘事件，如果释放 Shift 键时正在框选，取消框选
    const handleKeyUp = (e) => {
      if (e.key === 'Shift' && isDrawing) {
        setIsDrawing(false)
        setBoxStart(null)
        setBoxEnd(null)
        map.dragging.enable()
      }
    }

    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove)
    map.on('mouseup', handleMouseUp)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      window.removeEventListener('keyup', handleKeyUp)
      // 确保恢复地图拖动
      map.dragging.enable()
    }
  }, [isSelecting, isDrawing, boxStart, boxEnd, map, dataPoints, bounds, onBoxSelect])

  if (!isSelecting || !boxStart || !boxEnd) {
    return null
  }

  return (
    <Rectangle
      bounds={[boxStart, boxEnd]}
      pathOptions={{
        color: '#1890ff',
        fillColor: '#1890ff',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
      }}
    />
  )
}

// 获取当前视口边界
function ViewportBounds({ onBoundsChange }) {
  const map = useMap()
  
  useEffect(() => {
    const updateBounds = () => {
      onBoundsChange(map.getBounds())
    }
    
    updateBounds()
    map.on('moveend', updateBounds)
    map.on('zoomend', updateBounds)
    
    return () => {
      map.off('moveend', updateBounds)
      map.off('zoomend', updateBounds)
    }
  }, [map, onBoundsChange])
  
  return null
}

const MapComponent = forwardRef(({ 
  dataPoints, 
  selectedPoints, 
  isSelecting,
  onPointSelect,
  onBoxSelect,
  pointColor = '#1890ff',
  selectedColor = '#ff4d4f',
  pointSize = 'medium'
}, ref) => {
  const [center, setCenter] = useState([39.9, 116.3])
  const [zoom, setZoom] = useState(13)
  const [bounds, setBounds] = useState(null)
  const hasInitializedRef = useRef(false)
  const previousDataLengthRef = useRef(0)

  // 只在首次加载数据时计算中心点，删除后不重置地图位置
  // 如果数据被清空后重新导入，则重新初始化
  useEffect(() => {
    // 如果数据从 0 变为有数据，或者从未初始化过，则设置中心点
    if (dataPoints.length > 0 && (previousDataLengthRef.current === 0 || !hasInitializedRef.current)) {
      const avgLat = dataPoints.reduce((sum, p) => sum + p.latitude, 0) / dataPoints.length
      const avgLng = dataPoints.reduce((sum, p) => sum + p.longitude, 0) / dataPoints.length
      setCenter([avgLat, avgLng])
      hasInitializedRef.current = true
      
      // 如果只有一个点，放大一点
      if (dataPoints.length === 1) {
        setZoom(15)
      }
    }
    
    // 如果数据被清空，重置初始化标志
    if (dataPoints.length === 0) {
      hasInitializedRef.current = false
    }
    
    previousDataLengthRef.current = dataPoints.length
  }, [dataPoints.length])

  useImperativeHandle(ref, () => ({
    getMap: () => null
  }))

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />
      <ViewportBounds onBoundsChange={setBounds} />
      {bounds && (
        <>
          <CanvasLayer
            dataPoints={dataPoints}
            selectedPoints={selectedPoints}
            onPointClick={onPointSelect}
            isSelecting={isSelecting}
            pointColor={pointColor}
            selectedColor={selectedColor}
            pointSize={pointSize}
          />
          <BoxSelector 
            isSelecting={isSelecting}
            onBoxSelect={onBoxSelect}
            dataPoints={dataPoints}
            bounds={bounds}
          />
        </>
      )}
    </MapContainer>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent
