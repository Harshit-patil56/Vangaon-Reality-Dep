import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ownersAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function OwnerInfoPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [owner, setOwner] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOwnerData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await ownersAPI.getById(id);
      const data = response.data || {};
      
      if (!data.owner) {
        throw new Error('Owner not found');
      }
      
      console.log(`Found owner ${data.owner.name} with ${data.projects?.length || 0} associated projects`);
      
      if (data.projects?.length > 0) {
        console.log('Associated projects:', data.projects.map(p => ({ id: p.id, name: p.project_name })));
      } else {
        console.log('No projects found for this owner. Full response:', data);
      }
      
      setOwner(data.owner);
      setDeals(data.projects || []);

    } catch (error) {
      console.error('Failed to fetch owner:', error);
      toast.error('Failed to load owner details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setUser(getUser());
    if (id) {
      fetchOwnerData();
    }
  }, [id, fetchOwnerData]);

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
              <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Owner Details</h3>
            <p className="text-slate-600">Please wait while we prepare your data</p>
          </div>
        </div>
      </>
    );
  }

  if (!owner) {
    return (
      <>
        <Navbar user={user} />
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Owner not found</p>
          <button 
            onClick={() => router.push('/owners')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Owners
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
          onClick={() => router.push('/owners')}
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
          ← Back to Owners
        </button>

        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '30px',
          color: '#262626'
        }}>
          {owner.name}
        </h1>

        {/* Owner Details Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#262626'
          }}>
            Owner Information
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <div>
              <span style={{ fontWeight: '500', color: '#595959' }}>Mobile:</span>
              <p style={{ margin: '4px 0 0 0', color: '#262626' }}>{owner.mobile || 'Not provided'}</p>
            </div>
            <div>
              <span style={{ fontWeight: '500', color: '#595959' }}>Aadhaar Card:</span>
              <p style={{ margin: '4px 0 0 0', color: '#262626' }}>{owner.aadhar_card || owner.aadhaar || 'Not provided'}</p>
            </div>
            <div>
              <span style={{ fontWeight: '500', color: '#595959' }}>PAN Card:</span>
              <p style={{ margin: '4px 0 0 0', color: '#262626' }}>{owner.pan_card || owner.pan || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Associated Projects */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#262626'
          }}>
            Associated Projects ({deals.length})
          </h2>
          
          {deals.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Project Name</th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Survey Number</th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Location</th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Area</th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Status</th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: '600',
                      color: '#262626'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal, index) => (
                    <tr key={deal.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', color: '#262626' }}>
                        {deal.project_name || `Project ${index + 1}`}
                      </td>
                      <td style={{ padding: '12px', color: '#595959' }}>
                        {deal.survey_number || 'Not specified'}
                      </td>
                      <td style={{ padding: '12px', color: '#595959' }}>
                        {[deal.village, deal.taluka, deal.district, deal.state]
                          .filter(Boolean).join(', ') || 'Not specified'}
                      </td>
                      <td style={{ padding: '12px', color: '#595959' }}>
                        {deal.total_area ? `${deal.total_area} ${deal.area_unit || ''}` : 'Not specified'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: deal.status === 'active' ? '#f6ffed' : 
                                         deal.status === 'completed' ? '#e6f7ff' : '#f5f5f5',
                          color: deal.status === 'active' ? '#52c41a' : 
                                 deal.status === 'completed' ? '#1890ff' : '#595959'
                        }}>
                          {deal.status || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => router.push(`/deals/${deal.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
              <p>No associated projects found for this owner.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
