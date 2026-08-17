import { Card, Row, Col, Statistic } from 'antd'
import { UsersOutlined, ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

function AdminOverview() {
  return (
    <div dir="rtl">
      <h2 style={{ marginBottom: 32 }}>סקירה כללית</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="משתמשים פעילים"
              value={24}
              prefix={<UsersOutlined />}
              valueStyle={{ color: '#0c69ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="פרויקטים פעילים"
              value={8}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#0c69ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="משימות סיימות"
              value={156}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="משימות בביצוע"
              value={42}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
        <Col xs={24} lg={12}>
          <Card title="פעילות אחרונה" style={{ height: 300 }}>
            <div style={{ color: '#999', textAlign: 'center', paddingTop: 100 }}>
              דיוק - פעילות תוצג כאן
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="סטטוס פרויקטים" style={{ height: 300 }}>
            <div style={{ color: '#999', textAlign: 'center', paddingTop: 100 }}>
              דיוק - סטטוסים יוצגו כאן
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminOverview
