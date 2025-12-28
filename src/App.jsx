import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Layout, Upload, Button, Space, DatePicker, message, Card, Typography, Select, ColorPicker, Table, Input } from 'antd'
import { UploadOutlined, DeleteOutlined, DownloadOutlined, ClearOutlined, UpOutlined, DownOutlined, SelectOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteRowOutlined, DatabaseOutlined, ClockCircleOutlined, SwapOutlined } from '@ant-design/icons'
import Papa from 'papaparse'
import dayjs from 'dayjs'
import MapComponent from './components/MapComponent'
import './App.css'

const { Header, Content } = Layout
const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

// 可拖拽分隔线组件
function Splitter({ onResize, minLeft = 200, minRight = 300 }) {
  const [isDragging, setIsDragging] = useState(false)
  const splitterRef = useRef(null)

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const container = splitterRef.current?.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      // 计算左侧宽度比例
      let leftRatio = (mouseX / containerWidth) * 100

      // 限制最小宽度
      const minLeftPx = (minLeft / containerWidth) * 100
      const minRightPx = (minRight / containerWidth) * 100

      leftRatio = Math.max(minLeftPx, Math.min(100 - minRightPx, leftRatio))

      onResize(leftRatio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize, minLeft, minRight])

  return (
    <div
      ref={splitterRef}
      style={{
        width: '6px',
        height: '100%',
        background: isDragging ? '#1890ff' : '#d9d9d9',
        cursor: 'col-resize',
        transition: isDragging ? 'none' : 'background-color 0.2s',
        position: 'relative',
        flexShrink: 0,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => splitterRef.current.style.backgroundColor = '#1890ff'}
      onMouseLeave={() => {
        if (!isDragging) splitterRef.current.style.backgroundColor = '#d9d9d9'
      }}
    >
      {/* 分隔线装饰 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '2px',
          height: '20px',
          backgroundColor: '#fff',
          borderRadius: '1px'
        }}
      />
    </div>
  )
}

// 计算合适的选中颜色（与主颜色形成对比）
function getContrastColor(mainColor) {
  // 预定义的对比色映射
  const contrastMap = {
    '#1890ff': '#fa8c16', // 蓝色 -> 橙色
    '#52c41a': '#f5222d', // 绿色 -> 红色
    '#fa8c16': '#1890ff', // 橙色 -> 蓝色
    '#722ed1': '#52c41a', // 紫色 -> 绿色
    '#13c2c2': '#722ed1', // 青色 -> 紫色
    '#f5222d': '#1890ff', // 红色 -> 蓝色
    '#eb2f96': '#fa8c16'  // 粉色 -> 橙色
  }

  return contrastMap[mainColor] || '#1890ff' // 默认返回蓝色
}

// 预设颜色样式
const PRESET_COLORS = [
  { name: '蓝色', color: '#1890ff', selectedColor: '#fa8c16' },
  { name: '绿色', color: '#52c41a', selectedColor: '#f5222d' },
  { name: '橙色', color: '#fa8c16', selectedColor: '#1890ff' },
  { name: '紫色', color: '#722ed1', selectedColor: '#52c41a' },
  { name: '青色', color: '#13c2c2', selectedColor: '#722ed1' },
  { name: '红色', color: '#f5222d', selectedColor: '#1890ff' },
  { name: '粉色', color: '#eb2f96', selectedColor: '#fa8c16' },
  { name: '自定义', color: null, selectedColor: '#1890ff' }
]

function App() {
  // 从localStorage加载分隔比例，默认70
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem('steplife-split-ratio')
    return saved ? parseFloat(saved) : 70
  })

  const [dataPoints, setDataPoints] = useState([])
  const [selectedPoints, setSelectedPoints] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [isBoxSelectMode, setIsBoxSelectMode] = useState(false)
  const [pointColor, setPointColor] = useState('#1890ff')
  const [selectedColor, setSelectedColor] = useState(getContrastColor('#1890ff'))
  const [colorMode, setColorMode] = useState('preset')
  const [customColor, setCustomColor] = useState('#1890ff')
  const [pointSize, setPointSize] = useState('3') // 1-5: extra-small, small, medium, large, extra-large
  const [tableFilters, setTableFilters] = useState({
    timeRange: null,
    longitude: { min: '', max: '' },
    latitude: { min: '', max: '' },
    speed: { min: '', max: '' },
    altitude: { min: '', max: '' }
  })
  const [pageSize, setPageSize] = useState(30)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [overviewCollapsed, setOverviewCollapsed] = useState(false)
  const mapRef = useRef(null)
  const processedFilesRef = useRef(new Set())
  const performanceWarningShownRef = useRef(false)

  // 保存分隔比例到localStorage
  useEffect(() => {
    localStorage.setItem('steplife-split-ratio', splitRatio.toString())
  }, [splitRatio])

  // 处理分隔线调整
  const handleSplitResize = useCallback((newRatio) => {
    setSplitRatio(Math.round(newRatio))
  }, [])

  // 性能监控和提示
  useEffect(() => {
    if (dataPoints.length > 100000 && !performanceWarningShownRef.current) {
      message.info(
        `已导入 ${dataPoints.length.toLocaleString()} 个坐标点。系统已启用高性能模式，支持最多100万个点的显示。`,
        8
      )
      performanceWarningShownRef.current = true
    } else if (dataPoints.length > 50000 && dataPoints.length <= 100000 && !performanceWarningShownRef.current) {
      message.info(
        `已导入 ${dataPoints.length.toLocaleString()} 个坐标点。系统已启用性能优化模式。`,
        6
      )
      performanceWarningShownRef.current = true
    } else if (dataPoints.length <= 50000) {
      performanceWarningShownRef.current = false
    }
  }, [dataPoints.length])

  // 解析 CSV 文件
  const handleFileUpload = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // 优化：使用更高效的方式处理数据，移除 originalRow 以减少内存占用
          const points = []
          let minTime = Infinity
          let maxTime = -Infinity
          
          for (let index = 0; index < results.data.length; index++) {
            const row = results.data[index]
            if (!row.longitude || !row.latitude) continue
            
            const dataTime = parseInt(row.dataTime) || 0
            if (dataTime > 0) {
              if (dataTime < minTime) minTime = dataTime
              if (dataTime > maxTime) maxTime = dataTime
            }
            
            points.push({
              id: `${file.name}-${Date.now()}-${index}`,
              fileName: file.name,
              dataTime,
              locType: parseInt(row.locType) || 0,
              longitude: parseFloat(row.longitude),
              latitude: parseFloat(row.latitude),
              heading: parseFloat(row.heading) || 0,
              accuracy: parseFloat(row.accuracy) || 0,
              speed: parseFloat(row.speed) || 0,
              distance: parseFloat(row.distance) || 0,
              isBackForeground: parseInt(row.isBackForeground) || 0,
              stepType: parseInt(row.stepType) || 0,
              altitude: parseFloat(row.altitude) || 0
            })
          }
          
          if (points.length > 0) {
            // 显示导入信息
            if (minTime !== Infinity && maxTime !== Infinity) {
              const startDate = dayjs.unix(minTime).format('YYYY-MM-DD HH:mm:ss')
              const endDate = dayjs.unix(maxTime).format('YYYY-MM-DD HH:mm:ss')
              message.success(
                `成功导入 ${points.length.toLocaleString()} 个坐标点\n时间范围：${startDate} 至 ${endDate}`,
                5
              )
            } else {
              message.success(`成功导入 ${points.length.toLocaleString()} 个坐标点`)
            }

            // 优化：根据数据量动态调整批处理大小
            const batchSize = points.length > 100000 ? 20000 : points.length > 50000 ? 10000 : 5000
            const updateStateInBatches = async () => {
              for (let i = 0; i < points.length; i += batchSize) {
                const batch = points.slice(i, i + batchSize)
                setDataPoints(prev => [...prev, ...batch])

                // 每处理完一批后短暂让出控制权，避免阻塞UI
                if (i + batchSize < points.length) {
                  await new Promise(resolve => setTimeout(resolve, 0))
                }
              }
            }

            updateStateInBatches().then(() => {
              resolve(points)
            }).catch(error => {
              reject(error)
            })
          } else {
            message.warning('文件中没有有效的坐标点')
            resolve([])
          }
        },
        error: (error) => {
          message.error('文件解析失败: ' + error.message)
          reject(error)
        }
      })
    })
  }

  // 处理文件上传
  const handleUpload = async ({ fileList }) => {
    for (const file of fileList) {
      // 检查文件是否已经处理过，避免重复处理
      if (!processedFilesRef.current.has(file.uid)) {
        processedFilesRef.current.add(file.uid)
        await handleFileUpload(file.originFileObj)
      }
    }
  }

  // 删除选中的点
  const handleDeleteSelected = () => {
    if (selectedPoints.size === 0) {
      message.warning('请先选择要删除的点')
      return
    }
    
    setDataPoints(prev => prev.filter(point => !selectedPoints.has(point.id)))
    setSelectedPoints(new Set())
    message.success(`已删除 ${selectedPoints.size} 个坐标点`)
  }

  // 取消选择所有点
  const handleClearSelection = () => {
    if (selectedPoints.size === 0) {
      message.info('当前没有选中的点')
      return
    }
    setSelectedPoints(new Set())
    message.success('已取消选择')
  }

  // 处理时间范围选择，自动选中该时间段内的所有坐标点 - 优化版本
  const handleTimeRangeSelect = useCallback((dates) => {
    if (!dates || dates.length !== 2) {
      setTableFilters(prev => ({ ...prev, timeRange: null }))
      setSelectedPoints(new Set())
      return
    }

    const [start, end] = dates
    const startTime = start.unix()
    const endTime = end.unix()

    // 优化：使用单次遍历选中该时间段内的所有坐标点
    const pointIds = new Set()
    let count = 0
    
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i]
      if (point.dataTime >= startTime && point.dataTime <= endTime) {
        pointIds.add(point.id)
        count++
      }
    }

    if (count === 0) {
      message.warning('该时间段内没有坐标点')
      setTableFilters(prev => ({ ...prev, timeRange: dates }))
      setSelectedPoints(new Set())
      return
    }

    setSelectedPoints(pointIds)
    setTableFilters(prev => ({ ...prev, timeRange: dates }))
    message.success(`已选中 ${count.toLocaleString()} 个坐标点`)
  }, [dataPoints])

  // 导出 CSV
  const handleExport = () => {
    if (dataPoints.length === 0) {
      message.warning('没有可导出的数据')
      return
    }

    const csvData = dataPoints.map(point => ({
      dataTime: point.dataTime,
      locType: point.locType,
      longitude: point.longitude,
      latitude: point.latitude,
      heading: point.heading,
      accuracy: point.accuracy,
      speed: point.speed,
      distance: point.distance,
      isBackForeground: point.isBackForeground,
      stepType: point.stepType,
      altitude: point.altitude
    }))

    const csv = Papa.unparse(csvData, {
      columns: ['dataTime', 'locType', 'longitude', 'latitude', 'heading', 'accuracy', 'speed', 'distance', 'isBackForeground', 'stepType', 'altitude']
    })

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `exported_coordinates_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    message.success('导出成功')
  }

  // 清空所有数据
  const handleClearAll = () => {
    setDataPoints([])
    setSelectedPoints(new Set())
    message.success('已清空所有数据')
  }

  // 切换选择模式
  const handleToggleSelectMode = () => {
    setIsSelecting(!isSelecting)
    if (!isSelecting) {
      setSelectedPoints(new Set())
    }
  }

  // 处理点选择
  const handlePointSelect = useCallback((pointId, selected) => {
    setSelectedPoints(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(pointId)
      } else {
        newSet.delete(pointId)
      }
      return newSet
    })
  }, [])

  // 处理框选
  const handleBoxSelect = useCallback((selectedIds) => {
    if (isSelecting) {
      setSelectedPoints(prev => {
        const newSet = new Set(prev)
        selectedIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }, [isSelecting])

  // 从表格删除坐标点
  const handleDeleteFromTable = useCallback((pointId) => {
    setDataPoints(prev => prev.filter(point => point.id !== pointId))
    setSelectedPoints(prev => {
      const newSet = new Set(prev)
      newSet.delete(pointId)
      return newSet
    })
    message.success('已删除坐标点')
  }, [])

  // 计算数据的时间范围和统计信息 - 优化版本，支持大数据量
  const timeRange = useMemo(() => {
    if (dataPoints.length === 0) {
      return {
        min: null,
        max: null,
        defaultPicker: null,
        duration: null,
        durationText: null,
        pointCount: 0,
        avgInterval: null,
        avgIntervalText: null,
        days: 0
      }
    }
    
    // 优化：对于大数据量，使用采样计算统计信息
    const sampleSize = dataPoints.length > 100000 ? 10000 : dataPoints.length > 50000 ? 5000 : dataPoints.length
    const sampleStep = Math.max(1, Math.floor(dataPoints.length / sampleSize))
    
    let minTime = Infinity
    let maxTime = -Infinity
    let validTimeCount = 0
    
    // 遍历数据，同时计算最小最大值（单次遍历）
    for (let i = 0; i < dataPoints.length; i += sampleStep) {
      const point = dataPoints[i]
      if (point.dataTime > 0) {
        validTimeCount++
        if (point.dataTime < minTime) minTime = point.dataTime
        if (point.dataTime > maxTime) maxTime = point.dataTime
      }
    }
    
    if (minTime === Infinity || maxTime === -Infinity) {
      return {
        min: null,
        max: null,
        defaultPicker: null,
        duration: null,
        durationText: null,
        pointCount: 0,
        avgInterval: null,
        avgIntervalText: null,
        days: 0
      }
    }
    
    const minDayjs = dayjs.unix(minTime)
    const maxDayjs = dayjs.unix(maxTime)

    // 计算时长
    const duration = maxTime - minTime
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60
    let durationText = ''
    if (hours > 0) durationText += `${hours}时`
    if (minutes > 0) durationText += `${minutes}分`
    if (seconds > 0 || durationText === '') durationText += `${seconds}秒`

    // 计算天数
    const days = maxDayjs.diff(minDayjs, 'day') + 1

    // 优化：对于大数据量，使用采样计算平均间隔
    let avgInterval = null
    let avgIntervalText = ''
    if (dataPoints.length <= 50000) {
      // 小数据量：完整计算
      const times = dataPoints.map(p => p.dataTime).filter(t => t > 0).sort((a, b) => a - b)
      let totalInterval = 0
      let intervalCount = 0
      for (let i = 1; i < times.length; i++) {
        const interval = times[i] - times[i - 1]
        if (interval > 0 && interval < 3600) {
          totalInterval += interval
          intervalCount++
        }
      }
      avgInterval = intervalCount > 0 ? totalInterval / intervalCount : null
    } else {
      // 大数据量：采样计算
      const sampledTimes = []
      for (let i = 0; i < dataPoints.length; i += sampleStep) {
        const time = dataPoints[i].dataTime
        if (time > 0) sampledTimes.push(time)
      }
      sampledTimes.sort((a, b) => a - b)
      let totalInterval = 0
      let intervalCount = 0
      for (let i = 1; i < sampledTimes.length; i++) {
        const interval = sampledTimes[i] - sampledTimes[i - 1]
        if (interval > 0 && interval < 3600) {
          totalInterval += interval
          intervalCount++
        }
      }
      avgInterval = intervalCount > 0 ? totalInterval / intervalCount : null
    }
    
    if (avgInterval) {
      if (avgInterval >= 60) {
        avgIntervalText = `${Math.round(avgInterval / 60)}分`
      } else {
        avgIntervalText = `${Math.round(avgInterval)}秒`
      }
    }

    // 计算默认显示的时间（时间范围的中间值）
    const defaultTime = Math.floor((minTime + maxTime) / 2)

    return {
      min: minDayjs,
      max: maxDayjs,
      defaultPicker: dayjs.unix(defaultTime),
      duration,
      durationText,
      pointCount: validTimeCount * (dataPoints.length / Math.min(sampleSize, dataPoints.length)),
      avgInterval,
      avgIntervalText,
      days
    }
  }, [dataPoints])

  // 禁用日期函数 - 限制在数据时间范围内
  const disabledDate = useCallback((current) => {
    if (!timeRange.min || !timeRange.max) {
      return false
    }
    return current && (current.isBefore(timeRange.min, 'day') || current.isAfter(timeRange.max, 'day'))
  }, [timeRange])

  // 禁用时间函数 - 限制在数据时间范围内（简化版，主要限制日期）
  const disabledTime = useCallback((current, type) => {
    if (!timeRange.min || !timeRange.max || !current) {
      return {}
    }
    
    const isMinDay = current.isSame(timeRange.min, 'day')
    const isMaxDay = current.isSame(timeRange.max, 'day')
    
    return {
      disabledHours: () => {
        if (isMinDay && isMaxDay) {
          // 同一天，限制小时范围
          const minHour = timeRange.min.hour()
          const maxHour = timeRange.max.hour()
          return Array.from({ length: 24 }, (_, i) => i).filter(h => h < minHour || h > maxHour)
        } else if (isMinDay) {
          // 最小日期，限制最小小时
          const minHour = timeRange.min.hour()
          return Array.from({ length: minHour }, (_, i) => i)
        } else if (isMaxDay) {
          // 最大日期，限制最大小时
          const maxHour = timeRange.max.hour()
          return Array.from({ length: 24 }, (_, i) => i).filter(h => h > maxHour)
        }
        return []
      },
      disabledMinutes: (selectedHour) => {
        if (isMinDay && isMaxDay && selectedHour === timeRange.min.hour() && selectedHour === timeRange.max.hour()) {
          // 同一天同一小时，限制分钟范围
          const minMinute = timeRange.min.minute()
          const maxMinute = timeRange.max.minute()
          return Array.from({ length: 60 }, (_, i) => i).filter(m => m < minMinute || m > maxMinute)
        } else if (isMinDay && selectedHour === timeRange.min.hour()) {
          // 最小日期最小小时，限制最小分钟
          const minMinute = timeRange.min.minute()
          return Array.from({ length: minMinute }, (_, i) => i)
        } else if (isMaxDay && selectedHour === timeRange.max.hour()) {
          // 最大日期最大小时，限制最大分钟
          const maxMinute = timeRange.max.minute()
          return Array.from({ length: 60 }, (_, i) => i).filter(m => m > maxMinute)
        }
        return []
      },
      disabledSeconds: (selectedHour, selectedMinute) => {
        if (isMinDay && isMaxDay && 
            selectedHour === timeRange.min.hour() && selectedHour === timeRange.max.hour() &&
            selectedMinute === timeRange.min.minute() && selectedMinute === timeRange.max.minute()) {
          // 同一天同一小时同一分钟，限制秒范围
          const minSecond = timeRange.min.second()
          const maxSecond = timeRange.max.second()
          return Array.from({ length: 60 }, (_, i) => i).filter(s => s < minSecond || s > maxSecond)
        } else if (isMinDay && 
                   selectedHour === timeRange.min.hour() && 
                   selectedMinute === timeRange.min.minute()) {
          // 最小日期最小小时最小分钟，限制最小秒
          const minSecond = timeRange.min.second()
          return Array.from({ length: minSecond }, (_, i) => i)
        } else if (isMaxDay && 
                   selectedHour === timeRange.max.hour() && 
                   selectedMinute === timeRange.max.minute()) {
          // 最大日期最大小时最大分钟，限制最大秒
          const maxSecond = timeRange.max.second()
          return Array.from({ length: 60 }, (_, i) => i).filter(s => s > maxSecond)
        }
        return []
      }
    }
  }, [timeRange])

  // 筛选后的数据点 - 优化版本，支持大数据量
  const filteredDataPoints = useMemo(() => {
    // 优化：单次遍历应用所有筛选条件，避免多次遍历
    const filters = []
    
    // 时间范围筛选
    if (tableFilters.timeRange && tableFilters.timeRange.length === 2) {
      const [start, end] = tableFilters.timeRange
      const startTime = start.unix()
      const endTime = end.unix()
      filters.push(point => point.dataTime >= startTime && point.dataTime <= endTime)
    }

    // 经度筛选（范围）
    if (tableFilters.longitude.min || tableFilters.longitude.max) {
      const minLng = tableFilters.longitude.min ? parseFloat(tableFilters.longitude.min) : null
      const maxLng = tableFilters.longitude.max ? parseFloat(tableFilters.longitude.max) : null
      if (minLng !== null || maxLng !== null) {
        filters.push(point => {
          if (minLng !== null && maxLng !== null) {
            return point.longitude >= minLng && point.longitude <= maxLng
          } else if (minLng !== null) {
            return point.longitude >= minLng
          } else if (maxLng !== null) {
            return point.longitude <= maxLng
          }
          return true
        })
      }
    }

    // 纬度筛选（范围）
    if (tableFilters.latitude.min || tableFilters.latitude.max) {
      const minLat = tableFilters.latitude.min ? parseFloat(tableFilters.latitude.min) : null
      const maxLat = tableFilters.latitude.max ? parseFloat(tableFilters.latitude.max) : null
      if (minLat !== null || maxLat !== null) {
        filters.push(point => {
          if (minLat !== null && maxLat !== null) {
            return point.latitude >= minLat && point.latitude <= maxLat
          } else if (minLat !== null) {
            return point.latitude >= minLat
          } else if (maxLat !== null) {
            return point.latitude <= maxLat
          }
          return true
        })
      }
    }

    // 速度筛选（范围）
    if (tableFilters.speed.min || tableFilters.speed.max) {
      const minSpeed = tableFilters.speed.min ? parseFloat(tableFilters.speed.min) : null
      const maxSpeed = tableFilters.speed.max ? parseFloat(tableFilters.speed.max) : null
      if (minSpeed !== null || maxSpeed !== null) {
        filters.push(point => {
          if (minSpeed !== null && maxSpeed !== null) {
            return point.speed >= minSpeed && point.speed <= maxSpeed
          } else if (minSpeed !== null) {
            return point.speed >= minSpeed
          } else if (maxSpeed !== null) {
            return point.speed <= maxSpeed
          }
          return true
        })
      }
    }

    // 高度筛选（范围）
    if (tableFilters.altitude.min || tableFilters.altitude.max) {
      const minAltitude = tableFilters.altitude.min ? parseFloat(tableFilters.altitude.min) : null
      const maxAltitude = tableFilters.altitude.max ? parseFloat(tableFilters.altitude.max) : null
      if (minAltitude !== null || maxAltitude !== null) {
        filters.push(point => {
          if (minAltitude !== null && maxAltitude !== null) {
            return point.altitude >= minAltitude && point.altitude <= maxAltitude
          } else if (minAltitude !== null) {
            return point.altitude >= minAltitude
          } else if (maxAltitude !== null) {
            return point.altitude <= maxAltitude
          }
          return true
        })
      }
    }

    // 如果没有筛选条件，直接返回原数据（避免复制）
    if (filters.length === 0) {
      return dataPoints
    }

    // 单次遍历应用所有筛选条件
    const filtered = []
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i]
      if (filters.every(filter => filter(point))) {
        filtered.push(point)
      }
    }

    return filtered
  }, [dataPoints, tableFilters])

  // 检查是否有筛选条件
  const hasFilters = useMemo(() => {
    return !!(
      tableFilters.timeRange ||
      tableFilters.longitude.min ||
      tableFilters.longitude.max ||
      tableFilters.latitude.min ||
      tableFilters.latitude.max ||
      tableFilters.speed.min ||
      tableFilters.speed.max ||
      tableFilters.altitude.min ||
      tableFilters.altitude.max
    )
  }, [tableFilters])

  // 选中所有筛选后的点
  const handleSelectAllFiltered = useCallback(() => {
    if (filteredDataPoints.length === 0) {
      message.warning('没有可选择的点')
      return
    }
    const pointIds = new Set(filteredDataPoints.map(p => p.id))
    setSelectedPoints(pointIds)
    message.success(`已选中 ${filteredDataPoints.length} 个坐标点`)
  }, [filteredDataPoints])

  // 反选筛选后的点
  const handleInvertSelection = useCallback(() => {
    if (filteredDataPoints.length === 0) {
      message.warning('没有可选择的点')
      return
    }
    
    // 先计算当前在筛选后的点中已选中的数量
    const currentSelectedCount = filteredDataPoints.filter(p => selectedPoints.has(p.id)).length
    const newSelectedCount = filteredDataPoints.length - currentSelectedCount
    
    setSelectedPoints(prev => {
      const newSet = new Set(prev)
      // 遍历筛选后的点，切换选择状态
      filteredDataPoints.forEach(point => {
        if (newSet.has(point.id)) {
          newSet.delete(point.id)
        } else {
          newSet.add(point.id)
        }
      })
      return newSet
    })
    
    message.success(`已反选，当前选中 ${newSelectedCount} 个坐标点`)
  }, [filteredDataPoints, selectedPoints])

  // 优化：表格显示数据（大数据量时使用采样）
  const tableDisplayData = useMemo(() => {
    // 当筛选后的数据量很大时，使用采样显示以提高性能
    // 但保留完整数据用于选择和导出
    const MAX_TABLE_DISPLAY = 50000 // 表格最多显示5万条
    if (filteredDataPoints.length > MAX_TABLE_DISPLAY) {
      // 均匀采样
      const sampleStep = Math.ceil(filteredDataPoints.length / MAX_TABLE_DISPLAY)
      const sampled = []
      for (let i = 0; i < filteredDataPoints.length; i += sampleStep) {
        sampled.push(filteredDataPoints[i])
      }
      return sampled
    }
    return filteredDataPoints
  }, [filteredDataPoints])

  // 表格列定义
  const tableColumns = [
    {
      title: '时间',
      dataIndex: 'dataTime',
      key: 'dataTime',
      width: 180,
      sorter: (a, b) => a.dataTime - b.dataTime,
      render: (time) => new Date(time * 1000).toLocaleString('zh-CN')
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
      width: 120,
      sorter: (a, b) => a.longitude - b.longitude,
      render: (lng) => lng.toFixed(6)
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
      width: 120,
      sorter: (a, b) => a.latitude - b.latitude,
      render: (lat) => lat.toFixed(6)
    },
    {
      title: '速度 (m/s)',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      sorter: (a, b) => a.speed - b.speed,
      render: (speed) => speed.toFixed(2)
    },
    {
      title: '高度 (m)',
      dataIndex: 'altitude',
      key: 'altitude',
      width: 100,
      sorter: (a, b) => a.altitude - b.altitude,
      render: (altitude) => altitude.toFixed(2)
    },
    {
      title: '精度 (m)',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 100,
      sorter: (a, b) => a.accuracy - b.accuracy,
      render: (accuracy) => accuracy.toFixed(2)
    },
    {
      title: '文件',
      dataIndex: 'fileName',
      key: 'fileName',
      width: 150,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 40,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFromTable(record.id)}
          title="删除此行"
        />
      )
    }
  ]

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          StepLife Toolkit - 一生足迹坐标管理工具
        </Title>
      </Header>
      <Content className="app-content">
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 左侧地图区域 */}
          <div className="map-container" style={{ flex: `0 0 ${splitRatio}%`, minWidth: '200px' }}>
            <MapComponent
              ref={mapRef}
              dataPoints={dataPoints}
              selectedPoints={selectedPoints}
              isSelecting={isSelecting}
              isBoxSelectMode={isBoxSelectMode}
              onPointSelect={handlePointSelect}
              onBoxSelect={handleBoxSelect}
              pointColor={pointColor}
              selectedColor={selectedColor}
              pointSize={pointSize}
            />
          </div>

          {/* 可拖拽分隔线 */}
          <Splitter onResize={handleSplitResize} minLeft={200} minRight={300} />

          {/* 右侧配置和表格区域 */}
          <div style={{ flex: `0 0 ${100 - splitRatio}%`, minWidth: '300px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #d9d9d9', overflow: 'hidden', background: '#f0f2f5' }}>
            {/* 配置区域 */}
            <div style={{ padding: '12px', background: '#fff', borderBottom: '1px solid #d9d9d9', overflowY: 'auto', flex: '0 0 auto' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 文件操作卡片 */}
                <Card
                  size="small"
                  title="文件操作"
                  headStyle={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#595959',
                    padding: '8px 12px',
                    minHeight: 'auto'
                  }}
                  bodyStyle={{
                    padding: '12px'
                  }}
                >
                  <Space wrap>
                    <Upload
                      accept=".csv"
                      multiple
                      showUploadList={false}
                      beforeUpload={() => false}
                      onChange={handleUpload}
                    >
                      <Button type="primary" icon={<UploadOutlined />} size="small">
                        导入 CSV
                      </Button>
                    </Upload>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExport}
                      disabled={dataPoints.length === 0}
                      size="small"
                    >
                      导出
                    </Button>
                    <Button
                      danger
                      icon={<ClearOutlined />}
                      onClick={handleClearAll}
                      disabled={dataPoints.length === 0}
                      size="small"
                    >
                      清空
                    </Button>
                  </Space>
                </Card>

                {/* 选择操作卡片 */}
                <Card
                  size="small"
                  title="选择操作"
                  headStyle={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#595959',
                    padding: '8px 12px',
                    minHeight: 'auto'
                  }}
                  bodyStyle={{
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 模式切换区域 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: '#fafafa',
                      borderRadius: '6px',
                      border: '1px solid #f0f0f0'
                    }}>
                      <Button
                        type={isSelecting ? "primary" : "default"}
                        icon={<SelectOutlined />}
                        onClick={handleToggleSelectMode}
                        size="small"
                        style={{ flex: 1 }}
                      >
                        {isSelecting ? '退出选择' : '进入选择'}
                      </Button>

                      {isSelecting && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                          <Button
                            type={isBoxSelectMode ? "primary" : "default"}
                            onClick={() => setIsBoxSelectMode(!isBoxSelectMode)}
                            size="small"
                            style={{ flex: 1 }}
                          >
                            {isBoxSelectMode ? '退出框选' : '框选模式'}
                          </Button>
                          <span style={{
                            fontSize: '11px',
                            color: '#8c8c8c',
                            whiteSpace: 'nowrap',
                            minWidth: '80px'
                          }}>
                            {isBoxSelectMode ? '直接拖拽' : 'Shift+拖拽'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮区域 */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {/* 选择操作组 */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px'
                      }}>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleSelectAllFiltered}
                          disabled={filteredDataPoints.length === 0}
                          size="small"
                          style={{ width: '100%' }}
                        >
                          全选
                        </Button>

                        <Button
                          icon={<SwapOutlined />}
                          onClick={handleInvertSelection}
                          disabled={filteredDataPoints.length === 0}
                          size="small"
                          style={{ width: '100%' }}
                        >
                          反选
                        </Button>

                        <Button
                          icon={<CloseCircleOutlined />}
                          onClick={handleClearSelection}
                          disabled={selectedPoints.size === 0}
                          size="small"
                          style={{ width: '100%' }}
                        >
                          取消
                        </Button>
                      </div>

                      {/* 数据统计信息 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        <span>筛选: <strong>{filteredDataPoints.length.toLocaleString()}</strong></span>
                        <span>已选: <strong style={{ color: selectedPoints.size > 0 ? '#1890ff' : '#666' }}>{selectedPoints.size.toLocaleString()}</strong></span>
                      </div>

                      {/* 删除操作 */}
                      <Button
                        danger
                        icon={<DeleteRowOutlined />}
                        onClick={handleDeleteSelected}
                        disabled={selectedPoints.size === 0}
                        size="small"
                        style={{ width: '100%' }}
                      >
                        删除选中 ({selectedPoints.size.toLocaleString()})
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* 样式配置卡片 */}
                <Card
                  size="small"
                  title="样式配置"
                  headStyle={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#595959',
                    padding: '8px 12px',
                    minHeight: 'auto'
                  }}
                  bodyStyle={{
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'center', gap: '8px 12px' }}>
                    <span style={{ fontSize: '12px' }}>颜色</span>
                    {colorMode === 'preset' ? (
                      <Select
                        value={pointColor}
                        onChange={(value) => {
                          if (value === 'custom') {
                            setColorMode('custom')
                            setPointColor(customColor)
                            setSelectedColor(getContrastColor(customColor))
                          } else {
                            const preset = PRESET_COLORS.find(p => p.color === value) || PRESET_COLORS[0]
                            setPointColor(preset.color)
                            setSelectedColor(preset.selectedColor)
                          }
                        }}
                        size="small"
                        style={{ width: '100%' }}
                      >
                        {PRESET_COLORS.map(preset => (
                          <Option
                            key={preset.color || 'custom'}
                            value={preset.color || 'custom'}
                          >
                            <Space>
                              {preset.color && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 12,
                                    height: 12,
                                    backgroundColor: preset.color,
                                    borderRadius: '50%',
                                    border: '1px solid #d9d9d9'
                                  }}
                                />
                              )}
                              {preset.name}
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      <ColorPicker
                        value={pointColor}
                        onChange={(color) => {
                          const hexColor = color.toHexString()
                          setPointColor(hexColor)
                          setCustomColor(hexColor)
                          setSelectedColor(getContrastColor(hexColor))
                        }}
                        size="small"
                        showText
                      />
                    )}
                    <span style={{ fontSize: '12px' }}>大小</span>
                    <Select
                      value={pointSize}
                      onChange={setPointSize}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      <Option value="1">1</Option>
                      <Option value="2">2</Option>
                      <Option value="3">3</Option>
                      <Option value="4">4</Option>
                      <Option value="5">5</Option>
                    </Select>
                  </div>
                </Card>

                {/* 数据概览卡片 */}
                <Card
                  size="small"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>数据概览</span>
                      <Button
                        type="text"
                        size="small"
                        icon={overviewCollapsed ? <DownOutlined /> : <UpOutlined />}
                        onClick={() => setOverviewCollapsed(!overviewCollapsed)}
                        style={{ fontSize: '11px', color: '#8c8c8c' }}
                      />
                    </div>
                  }
                  headStyle={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#595959',
                    padding: '8px 12px',
                    minHeight: 'auto'
                  }}
                  bodyStyle={{
                    padding: overviewCollapsed ? '0px' : '12px'
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      transform: overviewCollapsed ? 'scaleY(0)' : 'scaleY(1)',
                      transformOrigin: 'top',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.2s ease-out',
                      opacity: overviewCollapsed ? 0 : 1,
                      height: overviewCollapsed ? '0px' : 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <DatabaseOutlined style={{
                        color: '#1890ff',
                        fontSize: '20px'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#1890ff'
                        }}>
                          {dataPoints.length.toLocaleString()} 个坐标点
                        </div>
                      </div>
                    </div>

                    {/* 时间范围信息 */}
                    {timeRange.min && timeRange.max && (
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#f6ffed',
                        borderRadius: '6px',
                        border: '1px solid #d9f7be'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <ClockCircleOutlined style={{
                            color: '#52c41a',
                            fontSize: '14px'
                          }} />
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#52c41a',
                            fontFamily: 'monospace'
                          }}>
                            {timeRange.min.format('YYYY-MM-DD HH:mm')} ~ {timeRange.max.format('YYYY-MM-DD HH:mm')}
                          </div>
                        </div>

                        {/* 统计指标 */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                          gap: '6px',
                          fontSize: '9px',
                          color: '#666'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#52c41a' }}>
                              {timeRange.days}天
                            </div>
                            <div>跨度</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#52c41a' }}>
                              {timeRange.durationText}
                            </div>
                            <div>时长</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#52c41a' }}>
                              {timeRange.avgIntervalText || '--'}
                            </div>
                            <div>间隔</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

              </Space>
            </div>
            
            {/* 表格区域 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
                <Card 
                  size="small"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0, borderRadius: 0 }}
                  bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px' }}
                >
                  <Space direction="vertical" style={{ width: '100%', marginBottom: '12px' }} size="middle">
                    {/* 数据筛选器卡片 */}
                    <Card
                      size="small"
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>数据筛选器</span>
                          <Button
                            type="text"
                            size="small"
                            icon={filtersCollapsed ? <DownOutlined /> : <UpOutlined />}
                            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                            style={{ fontSize: '11px', color: '#8c8c8c' }}
                          />
                        </div>
                      }
                      headStyle={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#595959',
                        padding: '8px 12px',
                        minHeight: 'auto'
                      }}
                      bodyStyle={{
                        padding: filtersCollapsed ? '0px' : '12px'
                      }}
                    >
                      {/* 时间范围筛选 */}
                      <div
                        style={{
                          overflow: 'hidden',
                          transform: filtersCollapsed ? 'scaleY(0)' : 'scaleY(1)',
                          transformOrigin: 'top',
                          transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.2s ease-out',
                          opacity: filtersCollapsed ? 0 : 1,
                          height: filtersCollapsed ? '0px' : 'auto'
                        }}
                      >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '60px' }}>时间筛选：</span>
                        <RangePicker
                          size="small"
                          showTime
                          format="YYYY-MM-DD HH:mm:ss"
                          value={tableFilters.timeRange}
                          onChange={handleTimeRangeSelect}
                          placeholder={['开始', '结束']}
                          disabledDate={disabledDate}
                          disabledTime={disabledTime}
                          defaultPickerValue={timeRange.defaultPicker ? [timeRange.defaultPicker, timeRange.defaultPicker] : undefined}
                          style={{ flex: 1, maxWidth: '400px' }}
                        />
                        {tableFilters.timeRange && (
                          <span style={{ fontSize: '11px', color: '#1890ff', whiteSpace: 'nowrap' }}>
                            (已选中 {selectedPoints.size} 个点)
                          </span>
                        )}
                      </div>

                        {/* 数值范围筛选 */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '8px',
                          padding: '8px',
                          backgroundColor: '#fafafa',
                          borderRadius: '4px',
                          border: '1px solid #f0f0f0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '50px', flexShrink: 0 }}>经度：</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最小"
                              value={tableFilters.longitude.min}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                longitude: { ...prev.longitude, min: e.target.value }
                              }))}
                            />
                            <span style={{ fontSize: '11px', color: '#8c8c8c', margin: '0 2px', flexShrink: 0 }}>~</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最大"
                              value={tableFilters.longitude.max}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                longitude: { ...prev.longitude, max: e.target.value }
                              }))}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '50px', flexShrink: 0 }}>纬度：</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最小"
                              value={tableFilters.latitude.min}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                latitude: { ...prev.latitude, min: e.target.value }
                              }))}
                            />
                            <span style={{ fontSize: '11px', color: '#8c8c8c', margin: '0 2px', flexShrink: 0 }}>~</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最大"
                              value={tableFilters.latitude.max}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                latitude: { ...prev.latitude, max: e.target.value }
                              }))}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '50px', flexShrink: 0 }}>速度：</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最小"
                              value={tableFilters.speed.min}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                speed: { ...prev.speed, min: e.target.value }
                              }))}
                            />
                            <span style={{ fontSize: '11px', color: '#8c8c8c', margin: '0 2px', flexShrink: 0 }}>~</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最大"
                              value={tableFilters.speed.max}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                speed: { ...prev.speed, max: e.target.value }
                              }))}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '50px', flexShrink: 0 }}>高度：</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最小"
                              value={tableFilters.altitude.min}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                altitude: { ...prev.altitude, min: e.target.value }
                              }))}
                            />
                            <span style={{ fontSize: '11px', color: '#8c8c8c', margin: '0 2px', flexShrink: 0 }}>~</span>
                            <Input
                              size="small"
                              style={{ flex: 1 }}
                              placeholder="最大"
                              value={tableFilters.altitude.max}
                              onChange={(e) => setTableFilters(prev => ({
                                ...prev,
                                altitude: { ...prev.altitude, max: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        {/* 清除筛选按钮 - 在折叠内容中 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                          <Button
                            size="small"
                            onClick={() => setTableFilters({
                              timeRange: null,
                              longitude: { min: '', max: '' },
                              latitude: { min: '', max: '' },
                              speed: { min: '', max: '' },
                              altitude: { min: '', max: '' }
                            })}
                          >
                            清除筛选
                          </Button>
                        </div>
                      </div>
                    </Card>

                  </Space>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                      <Table
                        columns={tableColumns}
                        dataSource={tableDisplayData}
                        rowKey="id"
                        size="small"
                        pagination={{
                          pageSize: pageSize,
                          showSizeChanger: true,
                          showTotal: (total, range) => {
                            const actualTotal = filteredDataPoints.length
                            if (actualTotal > 50000) {
                              return `显示 ${range[0]}-${range[1]} 条（共 ${actualTotal.toLocaleString()} 条，已采样显示）`
                            }
                            return `共 ${actualTotal.toLocaleString()} 条`
                          },
                          pageSizeOptions: ['20', '30', '50', '100', '200'],
                          showQuickJumper: true,
                          position: ['bottomRight'],
                          onShowSizeChange: (current, size) => {
                            setPageSize(size)
                          }
                        }}
                        scroll={{
                          x: 1200,
                          scrollToFirstRowOnChange: true
                        }}
                        rowSelection={{
                          selectedRowKeys: Array.from(selectedPoints),
                          onChange: (selectedRowKeys) => {
                            setSelectedPoints(new Set(selectedRowKeys))
                          },
                          getCheckboxProps: () => ({
                            disabled: !isSelecting
                          }),
                          fixed: 'left'
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </div>
          </div>
        </div>
      </Content>
    </Layout>
  )
}

export default App

