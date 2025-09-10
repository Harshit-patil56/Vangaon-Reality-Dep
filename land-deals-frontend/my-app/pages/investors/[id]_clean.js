import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { investorsAPI } from '../../lib/api';
import Layout from '../../components/Layout';
import { Card, Typography, Button, Descriptions, Table, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function InvestorDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [investor, setInvestor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchInvestorDetails();
    }
  }, [id]);

  const fetchInvestorDetails = async () => {
    try {
      setLoading(true);
      const response = await investorsAPI.getById(id);
      setInvestor(response.investor);
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Error fetching investor details:', error);
      setError('Failed to load investor details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'ongoing': return 'processing';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const projectsColumns = [
    {
      title: 'Project Name',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => router.push(`/deals/${record.id}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <span>
          {[record.village, record.taluka, record.district, record.state]
            .filter(Boolean)
            .join(', ')}
        </span>
      ),
    },
    {
      title: 'Total Area',
      key: 'area',
      render: (_, record) => (
        <span>
          {record.total_area} {record.area_unit}
        </span>
      ),
    },
    {
      title: 'Investment Amount',
      dataIndex: 'investment_amount',
      key: 'investment_amount',
      render: (amount) => amount ? `₹${amount.toLocaleString()}` : 'N/A',
    },
    {
      title: 'Investment %',
      dataIndex: 'investment_percentage',
      key: 'investment_percentage',
      render: (percentage) => percentage ? `${percentage}%` : 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || 'Unknown'}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading investor details...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p style={{ color: 'red' }}>{error}</p>
          <Button onClick={() => router.push('/investors')}>
            Back to Investors
          </Button>
        </div>
      </Layout>
    );
  }

  if (!investor) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Investor not found</p>
          <Button onClick={() => router.push('/investors')}>
            Back to Investors
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/investors')}
          style={{ marginBottom: '20px' }}
        >
          Back to Investors
        </Button>

        <Title level={2}>Investor Details</Title>

        <Card
          title="Personal Information"
          style={{ marginBottom: '20px' }}
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Full Name" span={1}>
              {investor.investor_name}
            </Descriptions.Item>
            <Descriptions.Item label="Mobile" span={1}>
              {investor.mobile || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Aadhaar Card" span={1}>
              {investor.aadhar_card || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="PAN Card" span={1}>
              {investor.pan_card || 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Associated Projects">
          {projects.length > 0 ? (
            <Table
              columns={projectsColumns}
              dataSource={projects}
              rowKey="id"
              pagination={false}
              scroll={{ x: 800 }}
            />
          ) : (
            <Paragraph>No projects found for this investor.</Paragraph>
          )}
        </Card>
      </div>
    </Layout>
  );
}
