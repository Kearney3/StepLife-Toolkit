import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Layout, Upload, Button, Space, DatePicker, message, Card, Typography, Divider, Select, ColorPicker, Table, Input } from 'antd'
import { UploadOutlined, DeleteOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons'
import Papa from 'papaparse'
import dayjs from 'dayjs'
import MapComponent from './components/MapComponent'
import './App.css'

const { Header, Content } = Layout
const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

// 预设颜色样式
const PRESET_COLORS = [
  { name: '蓝色', color: '#1890ff', selectedColor: '#ff4d4f' },
  { name: '绿色', color: '#52c41a', selectedColor: '#ff4d4f' },
  { name: '橙色', color: '#fa8c16', selectedColor: '#ff4d4f' },
  { name: '紫色', color: '#722ed1', selectedColor: '#ff4d4f' },
  { name: '青色', color: '#13c2c2', selectedColor: '#ff4d4f' },
  { name: '红色', color: '#f5222d', selectedColor: '#ff4d4f' },
  { name: '粉色', color: '#eb2f96', selectedColor: '#ff4d4f' },
  { name: '自定义', color: null, selectedColor: '#ff4d4f' }
]

function App() {
  const [dataPoints, setDataPoints] = useState([])
  const [selectedPoints, setSelectedPoints] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [isBoxSelectMode, setIsBoxSelectMode] = useState(false)
  const [pointColor, setPointColor] = useState('#1890ff')
  const [selectedColor, setSelectedColor] = useState('#ff4d4f')
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
  const mapRef = useRef(null)

  // 解析 CSV 文件
  const handleFileUpload = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const points = results.data
            .filter(row => row.longitude && row.latitude)
            .map((row, index) => ({
              id: `${file.name}-${Date.now()}-${index}`,
              fileName: file.name,
              dataTime: parseInt(row.dataTime) || 0,
              locType: parseInt(row.locType) || 0,
              longitude: parseFloat(row.longitude),
              latitude: parseFloat(row.latitude),
              heading: parseFloat(row.heading) || 0,
              accuracy: parseFloat(row.accuracy) || 0,
              speed: parseFloat(row.speed) || 0,
              distance: parseFloat(row.distance) || 0,
              isBackForeground: parseInt(row.isBackForeground) || 0,
              stepType: parseInt(row.stepType) || 0,
              altitude: parseFloat(row.altitude) || 0,
              originalRow: row
            }))
          
          if (points.length > 0) {
            // 计算导入数据的时间范围
            const times = points.map(p => p.dataTime).filter(t => t > 0)
            if (times.length > 0) {
              const minTime = Math.min(...times)
              const maxTime = Math.max(...times)
              const startDate = dayjs.unix(minTime).format('YYYY-MM-DD HH:mm:ss')
              const endDate = dayjs.unix(maxTime).format('YYYY-MM-DD HH:mm:ss')
              message.success(
                `成功导入 ${points.length} 个坐标点\n时间范围：${startDate} 至 ${endDate}`,
                5
              )
            } else {
              message.success(`成功导入 ${points.length} 个坐标点`)
            }
          } else {
            message.warning('文件中没有有效的坐标点')
          }
          
          setDataPoints(prev => [...prev, ...points])
          resolve(points)
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
      await handleFileUpload(file.originFileObj)
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

  // 处理时间范围选择，自动选中该时间段内的所有坐标点
  const handleTimeRangeSelect = useCallback((dates) => {
    if (!dates || dates.length !== 2) {
      setTableFilters(prev => ({ ...prev, timeRange: null }))
      setSelectedPoints(new Set())
      return
    }

    const [start, end] = dates
    const startTime = start.unix()
    const endTime = end.unix()

    // 选中该时间段内的所有坐标点
    const pointsInRange = dataPoints.filter(point => 
      point.dataTime >= startTime && point.dataTime <= endTime
    )

    if (pointsInRange.length === 0) {
      message.warning('该时间段内没有坐标点')
      setTableFilters(prev => ({ ...prev, timeRange: dates }))
      setSelectedPoints(new Set())
      return
    }

    const pointIds = new Set(pointsInRange.map(p => p.id))
    setSelectedPoints(pointIds)
    setTableFilters(prev => ({ ...prev, timeRange: dates }))
    message.success(`已选中 ${pointsInRange.length} 个坐标点`)
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

  // 计算数据的时间范围
  const timeRange = useMemo(() => {
    if (dataPoints.length === 0) {
      return { min: null, max: null, defaultPicker: null }
    }
    const times = dataPoints.map(p => p.dataTime).filter(t => t > 0)
    if (times.length === 0) {
      return { min: null, max: null, defaultPicker: null }
    }
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    // 计算默认显示的时间（时间范围的中间值）
    const defaultTime = Math.floor((minTime + maxTime) / 2)
    return {
      min: dayjs.unix(minTime),
      max: dayjs.unix(maxTime),
      defaultPicker: dayjs.unix(defaultTime)
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

  // 筛选后的数据点
  const filteredDataPoints = useMemo(() => {
    let filtered = [...dataPoints]

    // 时间范围筛选
    if (tableFilters.timeRange && tableFilters.timeRange.length === 2) {
      const [start, end] = tableFilters.timeRange
      const startTime = start.unix()
      const endTime = end.unix()
      filtered = filtered.filter(point => 
        point.dataTime >= startTime && point.dataTime <= endTime
      )
    }

    // 经度筛选（范围）
    if (tableFilters.longitude.min || tableFilters.longitude.max) {
      const minLng = tableFilters.longitude.min ? parseFloat(tableFilters.longitude.min) : null
      const maxLng = tableFilters.longitude.max ? parseFloat(tableFilters.longitude.max) : null
      if (minLng !== null || maxLng !== null) {
        filtered = filtered.filter(point => {
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
        filtered = filtered.filter(point => {
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
        filtered = filtered.filter(point => {
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
        filtered = filtered.filter(point => {
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
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFromTable(record.id)}
        >
          删除
        </Button>
      )
    }
  ]

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          StepLife Toolkit - 坐标管理工具
        </Title>
      </Header>
      <Content className="app-content">
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 左侧地图区域 - 2/3 */}
          <div className="map-container" style={{ flex: '0 0 70%' }}>
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
          
          {/* 右侧配置和表格区域 - 1/3 */}
          <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #d9d9d9', overflow: 'hidden', background: '#f0f2f5' }}>
            {/* 配置区域 */}
            <div style={{ padding: '12px', background: '#fff', borderBottom: '1px solid #d9d9d9', overflowY: 'auto', flex: '0 0 auto' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* 文件操作区域 */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '8px' }}>文件操作</div>
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
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 选择操作区域 */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '8px' }}>选择操作</div>
                  <Space wrap>
                    <Button 
                      type={isSelecting ? "primary" : "default"}
                      onClick={handleToggleSelectMode}
                      size="small"
                    >
                      {isSelecting ? '退出选择' : '选择模式'}
                    </Button>
                    {isSelecting && (
                      <>
                        <Button 
                          type={isBoxSelectMode ? "primary" : "default"}
                          onClick={() => setIsBoxSelectMode(!isBoxSelectMode)}
                          size="small"
                        >
                          {isBoxSelectMode ? '退出框选' : '框选模式'}
                        </Button>
                        {!isBoxSelectMode && (
                          <span style={{ color: '#1890ff', fontSize: '11px' }}>
                            Shift+拖拽框选
                          </span>
                        )}
                        {isBoxSelectMode && (
                          <span style={{ color: '#1890ff', fontSize: '11px' }}>
                            直接拖拽框选
                          </span>
                        )}
                      </>
                    )}
                    <Button 
                      onClick={handleClearSelection}
                      disabled={selectedPoints.size === 0}
                      size="small"
                    >
                      取消选择
                    </Button>
                    <Button 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={handleDeleteSelected}
                      disabled={selectedPoints.size === 0}
                      size="small"
                    >
                      删除选中 ({selectedPoints.size})
                    </Button>
                  </Space>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 样式配置区域 */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '8px' }}>样式配置</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'center', gap: '8px 12px' }}>
                    <span style={{ fontSize: '12px' }}>颜色</span>
                    {colorMode === 'preset' ? (
                      <Select
                        value={pointColor}
                        onChange={(value) => {
                          if (value === 'custom') {
                            setColorMode('custom')
                            setPointColor(customColor)
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
                          setPointColor(color.toHexString())
                          setCustomColor(color.toHexString())
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
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 数据统计 */}
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#595959'
                }}>
                  <div>共 <strong style={{ color: '#262626' }}>{dataPoints.length.toLocaleString()}</strong> 个坐标点</div>
                  {selectedPoints.size > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      已选择 <strong style={{ color: '#1890ff' }}>{selectedPoints.size.toLocaleString()}</strong> 个
                    </div>
                  )}
                </div>
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
                    {/* 时间范围筛选 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '60px' }}>时间范围：</span>
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
                      {timeRange.min && timeRange.max && (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#595959', 
                          backgroundColor: '#f5f5f5',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap'
                        }}>
                          {dayjs(timeRange.min).format('YYYY-MM-DD HH:mm')} ～ {dayjs(timeRange.max).format('YYYY-MM-DD HH:mm')}
                        </span>
                      )}
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

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={handleSelectAllFiltered}
                        disabled={filteredDataPoints.length === 0}
                      >
                        选中全部 ({filteredDataPoints.length})
                      </Button>
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
                  </Space>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                      <Table
                        columns={tableColumns}
                        dataSource={filteredDataPoints}
                        rowKey="id"
                        size="small"
                        pagination={{
                          pageSize: pageSize,
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 条`,
                          pageSizeOptions: ['20', '30', '50', '100'],
                          showQuickJumper: true,
                          position: ['bottomRight'],
                          onShowSizeChange: (current, size) => {
                            setPageSize(size)
                          }
                        }}
                        scroll={{ 
                          scrollToFirstRowOnChange: true
                        }}
                        rowSelection={{
                          selectedRowKeys: Array.from(selectedPoints),
                          onChange: (selectedRowKeys) => {
                            setSelectedPoints(new Set(selectedRowKeys))
                          },
                          getCheckboxProps: () => ({
                            disabled: !isSelecting
                          })
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

