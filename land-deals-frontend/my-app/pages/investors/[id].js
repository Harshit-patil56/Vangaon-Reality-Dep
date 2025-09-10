import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { investorsAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function InvestorDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [investor, setInvestor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestorDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await investorsAPI.getById(id);
      const data = response.data || {};
      
      if (!data.investor) {
        throw new Error('Investor not found');
      }
      
      console.log(`Found investor ${data.investor.investor_name} with ${data.projects?.length || 0} associated projects`);
      
      setInvestor(data.investor);
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching investor details:', error);
      toast.error('Failed to load investor details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setUser(getUser());
    if (id) {
      fetchInvestorDetails();
    }
  }, [id, fetchInvestorDetails]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#52c41a';
      case 'ongoing': return '#1890ff';
      case 'pending': return '#faad14';
      default: return '#d9d9d9';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
              <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Investor Details</h3>
            <p className="text-slate-600">Please wait while we prepare your data</p>
          </div>
        </div>
      </>
    );
  }

  if (!investor) {
    return (
      <>
        <Navbar user={user} />
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Investor not found</p>
          <button 
            onClick={() => router.push('/investors')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Investors
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <button
          onClick={() => router.push('/investors')}
          style={{
            marginBottom: '20px',
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Investors
        </button>

        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '30px',
          color: '#262626'
        }}>
          Investor Details
        </h1>

        {/* Personal Information */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: '8px',
            color: '#262626'
          }}>
            Personal Information
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <strong>Full Name:</strong> {investor.investor_name}
            </div>
            <div>
              <strong>Mobile:</strong> {investor.mobile || 'N/A'}
            </div>
            <div>
              <strong>Aadhaar Card:</strong> {investor.aadhar_card || 'N/A'}
            </div>
            <div>
              <strong>PAN Card:</strong> {investor.pan_card || 'N/A'}
            </div>
          </div>
        </div>

        {/* Associated Projects */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: '8px',
            color: '#262626'
          }}>
            Associated Projects ({projects.length})
          </h2>
          
          {projects.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '800px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Project Name
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Location
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Total Area
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Investment Amount
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Investment %
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      border: '1px solid #f0f0f0',
                      fontWeight: '600'
                    }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        <button
                          onClick={() => router.push(`/deals/${project.id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1890ff',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                            font: 'inherit'
                          }}
                        >
                          {project.project_name}
                        </button>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        {[project.village, project.taluka, project.district, project.state].filter(Boolean).join(', ')}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        {project.total_area} {project.area_unit}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        {project.investment_amount ? `₹${project.investment_amount.toLocaleString()}` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        {project.investment_percentage ? `${project.investment_percentage}%` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #f0f0f0' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: getStatusColor(project.status) + '20',
                          color: getStatusColor(project.status),
                          border: `1px solid ${getStatusColor(project.status)}`
                        }}>
                          {project.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No projects found for this investor.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
