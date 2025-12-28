import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, Rectangle } from 'react-leaflet'
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
  const animationFrameRef = useRef(null)
  const [bounds, setBounds] = useState(map.getBounds())
  const [zoom, setZoom] = useState(map.getZoom())

  // 更新视口和缩放级别
  const updateView = useCallback(() => {
    setBounds(map.getBounds())
    setZoom(map.getZoom())
  }, [map])

  // 实时更新函数（用于地图移动中）
  const updateViewRealtime = useCallback(() => {
    const newBounds = map.getBounds()
    const newZoom = map.getZoom()
    setBounds(prevBounds => {
      // 如果边界变化不大，避免不必要的重新渲染
      if (prevBounds &&
          Math.abs(prevBounds.getNorth() - newBounds.getNorth()) < 0.0001 &&
          Math.abs(prevBounds.getSouth() - newBounds.getSouth()) < 0.0001 &&
          Math.abs(prevBounds.getEast() - newBounds.getEast()) < 0.0001 &&
          Math.abs(prevBounds.getWest() - newBounds.getWest()) < 0.0001 &&
          newZoom === zoom) {
        return prevBounds
      }
      return newBounds
    })
    setZoom(newZoom)
  }, [map, zoom])

  // 防抖函数（用于最终位置更新）
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

  // 防抖的最终位置更新（延迟更短）
  const debouncedFinalUpdate = useMemo(
    () => debounce(updateView, 16), // 约60fps
    [updateView, debounce]
  )

  // 监听地图移动和缩放
  useEffect(() => {
    // 实时监听移动和缩放事件，立即更新
    const handleMove = () => updateViewRealtime()
    const handleZoom = () => updateViewRealtime()

    // 最终位置更新（防抖）
    const handleMoveEnd = () => debouncedFinalUpdate()
    const handleZoomEnd = () => debouncedFinalUpdate()

    map.on('move', handleMove)
    map.on('zoom', handleZoom)
    map.on('moveend', handleMoveEnd)
    map.on('zoomend', handleZoomEnd)

    return () => {
      map.off('move', handleMove)
      map.off('zoom', handleZoom)
      map.off('moveend', handleMoveEnd)
      map.off('zoomend', handleZoomEnd)
    }
  }, [map, updateViewRealtime, debouncedFinalUpdate])

  // 计算可见点和采样 - 优化版本，支持100万个点
  const visiblePoints = useMemo(() => {
    if (dataPoints.length === 0 || !bounds) return []

    // 优化：使用更高效的视口裁剪算法
    // 对于大数据量，先进行粗略的空间筛选
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()
    
    // 快速预筛选：只检查边界框，避免调用 contains 方法
    const visible = []
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i]
      if (point.latitude >= south && point.latitude <= north &&
          point.longitude >= west && point.longitude <= east) {
        visible.push(point)
      }
    }

    // 根据缩放级别和点密度采样
    // 缩放级别越低，采样越多（显示更少的点）
    const totalVisible = visible.length
    let sampleRate = 1
    let maxPoints = 10000 // 默认最多显示10000个点

    // 优化：根据数据总量和缩放级别动态调整采样策略
    if (dataPoints.length > 500000) {
      // 超大数据量（50万+）：更激进的采样
      if (zoom < 10) {
        maxPoints = 2000
      } else if (zoom < 12) {
        maxPoints = 4000
      } else if (zoom < 14) {
        maxPoints = 6000
      } else {
        maxPoints = 8000
      }
    } else if (dataPoints.length > 100000) {
      // 大数据量（10万+）：中等采样
      if (zoom < 10) {
        maxPoints = 3000
      } else if (zoom < 12) {
        maxPoints = 5000
      } else if (zoom < 14) {
        maxPoints = 7000
      } else {
        maxPoints = 10000
      }
    } else if (totalVisible > 10000) {
      // 可见点数量多：根据缩放级别调整
      if (zoom < 10) {
        maxPoints = 3000
      } else if (zoom < 12) {
        maxPoints = 5000
      } else if (zoom < 14) {
        maxPoints = 8000
      } else {
        maxPoints = 10000
      }
    } else if (totalVisible > 5000) {
      maxPoints = 8000
    }

    if (totalVisible > maxPoints) {
      sampleRate = Math.max(1, Math.floor(totalVisible / maxPoints))
    }

    if (sampleRate === 1) {
      return visible
    }

    // 优化采样算法：使用更均匀的分布，保持空间分布
    const result = []
    for (let i = 0; i < visible.length; i += sampleRate) {
      result.push(visible[i])
    }
    return result
  }, [dataPoints, bounds, zoom])

  // 渲染 Canvas - 使用requestAnimationFrame优化性能
  useEffect(() => {
    const renderCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      const container = map.getContainer()

      // 设置 Canvas 尺寸（考虑设备像素比以获得清晰的渲染）
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      const canvasWidth = rect.width * dpr
      const canvasHeight = rect.height * dpr

      // 只有当尺寸真正改变时才重新设置Canvas尺寸
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'
        ctx.scale(dpr, dpr)
      }

      // 清空画布
      ctx.clearRect(0, 0, rect.width, rect.height)

      if (visiblePoints.length === 0) return

      // 预计算点大小配置
      const sizeMap = {
        '1': { normal: 2, selected: 3 },   // extra-small
        '2': { normal: 3, selected: 4 },   // small
        '3': { normal: 4, selected: 6 },   // medium
        '4': { normal: 6, selected: 8 },   // large
        '5': { normal: 8, selected: 10 }   // extra-large
      }
      const sizeConfig = sizeMap[pointSize] || sizeMap['3']

      // 批量渲染优化：分离选中和未选中点
      const normalPoints = []
      const selectedPointsList = []

      visiblePoints.forEach(point => {
        const pointPos = map.latLngToContainerPoint([point.latitude, point.longitude])

        // 只渲染在视口内的点（添加一些边距以处理边界情况）
        const margin = 20
        if (
          pointPos.x < -margin || pointPos.x > rect.width + margin ||
          pointPos.y < -margin || pointPos.y > rect.height + margin
        ) {
          return
        }

        if (selectedPoints.has(point.id)) {
          selectedPointsList.push(pointPos)
        } else {
          normalPoints.push(pointPos)
        }
      })

      // 批量渲染普通点
      if (normalPoints.length > 0) {
        ctx.fillStyle = pointColor
        ctx.beginPath()
        normalPoints.forEach(pos => {
          ctx.moveTo(pos.x + sizeConfig.normal, pos.y)
          ctx.arc(pos.x, pos.y, sizeConfig.normal, 0, 2 * Math.PI)
        })
        ctx.fill()
      }

      // 批量渲染选中点
      if (selectedPointsList.length > 0) {
        ctx.fillStyle = selectedColor
        ctx.beginPath()
        selectedPointsList.forEach(pos => {
          ctx.moveTo(pos.x + sizeConfig.selected, pos.y)
          ctx.arc(pos.x, pos.y, sizeConfig.selected, 0, 2 * Math.PI)
        })
        ctx.fill()
      }
    }

    // 取消之前的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // 请求新的动画帧进行渲染
    animationFrameRef.current = requestAnimationFrame(renderCanvas)

    // 清理函数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [visiblePoints, selectedPoints, map, pointColor, selectedColor, pointSize])

  // 组件卸载时清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

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
function BoxSelector({ isSelecting, isBoxSelectMode, onBoxSelect, dataPoints, bounds }) {
  const map = useMap()
  const [boxStart, setBoxStart] = useState(null)
  const [boxEnd, setBoxEnd] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const touchStartTimeRef = useRef(null)
  const longPressTimerRef = useRef(null)

      // 完成框选 - 优化版本，支持大数据量
  const finishBoxSelect = useCallback((start, end) => {
    if (!start || !end) return
    
    // 计算框选区域的最小尺寸，避免误触
    const boxBounds = L.latLngBounds(start, end)
    const boxSize = boxBounds.getNorthEast().distanceTo(boxBounds.getSouthWest())
    
    // 如果框选区域太小（小于 10 米），不执行选择
    if (boxSize > 10) {
      // 优化：先进行快速边界框筛选，再精确检查
      const boxNorth = boxBounds.getNorth()
      const boxSouth = boxBounds.getSouth()
      const boxEast = boxBounds.getEast()
      const boxWest = boxBounds.getWest()
      
      // 如果数据量很大，先检查可见区域内的点
      let pointsToCheck = dataPoints
      if (dataPoints.length > 100000 && bounds) {
        const north = bounds.getNorth()
        const south = bounds.getSouth()
        const east = bounds.getEast()
        const west = bounds.getWest()
        pointsToCheck = dataPoints.filter(point => 
          point.latitude >= south && point.latitude <= north &&
          point.longitude >= west && point.longitude <= east
        )
      }
      
      // 快速边界框筛选
      const selectedIds = []
      for (let i = 0; i < pointsToCheck.length; i++) {
        const point = pointsToCheck[i]
        if (point.latitude >= boxSouth && point.latitude <= boxNorth &&
            point.longitude >= boxWest && point.longitude <= boxEast) {
          // 精确检查（对于边界框内的点）
          if (boxBounds.contains([point.latitude, point.longitude])) {
            selectedIds.push(point.id)
          }
        }
      }
      
      if (selectedIds.length > 0) {
        onBoxSelect(selectedIds)
      }
    }
  }, [dataPoints, bounds, onBoxSelect])

  useEffect(() => {
    if (!isSelecting) {
      setBoxStart(null)
      setBoxEnd(null)
      setIsDrawing(false)
      map.dragging.enable()
      return
    }

    // 框选模式下禁用地图拖动
    if (isBoxSelectMode) {
      map.dragging.disable()
    } else {
      map.dragging.enable()
    }

    const handleMouseDown = (e) => {
      // 框选模式：直接拖拽框选
      if (isBoxSelectMode) {
        if (e.originalEvent.button !== 0) return
        
        e.originalEvent.preventDefault()
        e.originalEvent.stopPropagation()
        
        setIsDrawing(true)
        const latlng = e.latlng
        setBoxStart(latlng)
        setBoxEnd(latlng)
        return
      }
      
      // 非框选模式：需要按住 Shift 键
      if (e.originalEvent.button !== 0 || !e.originalEvent.shiftKey) {
        return
      }
      
      e.originalEvent.preventDefault()
      e.originalEvent.stopPropagation()
      map.dragging.disable()
      
      setIsDrawing(true)
      const latlng = e.latlng
      setBoxStart(latlng)
      setBoxEnd(latlng)
    }

    const handleMouseMove = (e) => {
      if (isDrawing && boxStart) {
        if (isBoxSelectMode) {
          // 框选模式：直接更新框选区域
          setBoxEnd(e.latlng)
        } else {
          // 非框选模式：如果释放了 Shift 键，取消框选
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
    }

    const handleMouseUp = (e) => {
      if (isDrawing && boxStart && boxEnd) {
        finishBoxSelect(boxStart, boxEnd)
        setIsDrawing(false)
        setBoxStart(null)
        setBoxEnd(null)
      }
      
      if (isDrawing && !isBoxSelectMode) {
        map.dragging.enable()
      }
    }

    // 触摸事件处理（移动端支持）
    const handleTouchStart = (e) => {
      if (!isBoxSelectMode) return
      
      const touch = e.originalEvent.touches[0]
      if (!touch) return
      
      touchStartTimeRef.current = Date.now()
      
      // 长按开始框选（500ms）
      longPressTimerRef.current = setTimeout(() => {
        e.originalEvent.preventDefault()
        e.originalEvent.stopPropagation()
        
        const containerPoint = L.point(touch.clientX, touch.clientY)
        const mapContainer = map.getContainer()
        const mapRect = mapContainer.getBoundingClientRect()
        const relativePoint = L.point(
          touch.clientX - mapRect.left,
          touch.clientY - mapRect.top
        )
        const latlng = map.containerPointToLatLng(relativePoint)
        
        setIsDrawing(true)
        setBoxStart(latlng)
        setBoxEnd(latlng)
      }, 500)
    }

    const handleTouchMove = (e) => {
      if (!isBoxSelectMode || !isDrawing || !boxStart) return
      
      const touch = e.originalEvent.touches[0]
      if (!touch) return
      
      e.originalEvent.preventDefault()
      
      const mapContainer = map.getContainer()
      const mapRect = mapContainer.getBoundingClientRect()
      const relativePoint = L.point(
        touch.clientX - mapRect.left,
        touch.clientY - mapRect.top
      )
      const latlng = map.containerPointToLatLng(relativePoint)
      setBoxEnd(latlng)
    }

    const handleTouchEnd = (e) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      
      if (isDrawing && boxStart && boxEnd) {
        finishBoxSelect(boxStart, boxEnd)
        setIsDrawing(false)
        setBoxStart(null)
        setBoxEnd(null)
      }
    }

    // 监听键盘事件，如果释放 Shift 键时正在框选，取消框选
    const handleKeyUp = (e) => {
      if (e.key === 'Shift' && isDrawing && !isBoxSelectMode) {
        setIsDrawing(false)
        setBoxStart(null)
        setBoxEnd(null)
        map.dragging.enable()
      }
    }

    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove)
    map.on('mouseup', handleMouseUp)
    map.on('touchstart', handleTouchStart)
    map.on('touchmove', handleTouchMove)
    map.on('touchend', handleTouchEnd)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      map.off('touchstart', handleTouchStart)
      map.off('touchmove', handleTouchMove)
      map.off('touchend', handleTouchEnd)
      window.removeEventListener('keyup', handleKeyUp)
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      map.dragging.enable()
    }
  }, [isSelecting, isBoxSelectMode, isDrawing, boxStart, boxEnd, map, finishBoxSelect])

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
  isBoxSelectMode = false,
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
            isBoxSelectMode={isBoxSelectMode}
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
