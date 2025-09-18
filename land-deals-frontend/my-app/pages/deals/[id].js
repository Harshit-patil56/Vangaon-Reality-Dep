import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { dealAPI, paymentsAPI } from '../../lib/api';
import { getUser, getToken } from '../../lib/auth';
import { hasPermission, PERMISSIONS, hasRestrictedAccess, canAccessDeal } from '../../lib/permissions';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function ViewDeal() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseAmountLoading, setPurchaseAmountLoading] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [sellingAmountLoading, setSellingAmountLoading] = useState(false);
  const [miscellaneousData, setMiscellaneousData] = useState(null);
  
  // State for percentage tracking
  const [investorShares, setInvestorShares] = useState({});
  const [ownerShares, setOwnerShares] = useState({});

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      setPaymentsLoading(true);
      try {
        const trackingResponse = await paymentsAPI.getPaymentTrackingData(id);
        if (trackingResponse?.data?.payments) {
          setPayments(trackingResponse.data.payments);
          return;
        }
      } catch {
        console.log('Payment tracking endpoint not available, falling back to regular payments');
      }
      
      const response = await paymentsAPI.list(id);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [id]);

  const fetchMiscellaneousData = useCallback(async () => {
    if (!id) return;
    
    try {
      const response = await paymentsAPI.getMiscellaneousSummary(id);
      setMiscellaneousData(response.data || {});
    } catch (error) {
      console.error('Failed to fetch miscellaneous data:', error);
      setMiscellaneousData({});
    }
  }, [id]);

  const fetchDeal = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dealAPI.getById(id);
      const data = response.data || {};

      let mergedDeal = {};
      if (data.deal) {
        mergedDeal = { ...data.deal };
        mergedDeal.buyers = data.buyers || data.deal.buyers || [];
        mergedDeal.expenses = data.expenses || data.deal.expenses || [];
        mergedDeal.documents = data.documents || data.deal.documents || [];
        // Use deal-specific owners and investors if available
        mergedDeal.owners = data.owners || data.deal.owners || [];
        mergedDeal.investors = data.investors || data.deal.investors || [];
      } else {
        mergedDeal = { ...data };
        mergedDeal.buyers = data.buyers || mergedDeal.buyers || [];
        mergedDeal.expenses = data.expenses || mergedDeal.expenses || [];
        mergedDeal.documents = data.documents || mergedDeal.documents || [];
        mergedDeal.owners = data.owners || mergedDeal.owners || [];
        mergedDeal.investors = data.investors || mergedDeal.investors || [];
      }

      // Check access permissions for restricted users
      const currentUser = getUser();
      if (hasRestrictedAccess(currentUser)) {
        if (!canAccessDeal(currentUser, mergedDeal)) {
          toast.error('Access denied. You can only view deals where you are assigned as an investor.');
          router.push('/dashboard');
          return;
        }
      }

      // Fetch payments immediately to calculate investment amounts
      let paymentsData = [];
      let paymentTrackingData = null;
      
      // Try to get payment tracking data first (preferred method)
      try {
        const trackingResponse = await paymentsAPI.getPaymentTrackingData(id);
        paymentTrackingData = trackingResponse.data;
        console.log('=== PAYMENT TRACKING DATA RECEIVED ===', paymentTrackingData);
      } catch {
        console.log('Payment tracking endpoint not available, will use manual calculation');
      }

      // Also get raw payments for fallback calculation
      try {
        const paymentsResponse = await paymentsAPI.list(id);
        paymentsData = paymentsResponse.data || [];
        setPayments(paymentsData);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        setPayments([]);
      }

      // Calculate investment amounts using payment tracking data or fallback to manual calculation
      console.log('=== INITIAL CALCULATION ON PAGE LOAD ===');
      console.log('Merged deal investors:', mergedDeal.investors?.length || 0);
      console.log('Payment tracking data available:', !!paymentTrackingData);
      console.log('Payments data:', paymentsData?.length || 0);
      
      let investorsWithAmounts = [];
      
      if (paymentTrackingData && paymentTrackingData.investors) {
        // Use backend calculated amounts (preferred method)
        console.log('Using payment tracking data for calculations');
        investorsWithAmounts = (mergedDeal.investors || []).map(investor => {
          const trackingInvestor = paymentTrackingData.investors.find(
            ti => ti.investor_id === investor.id || ti.investor_name === (investor.investor_name || investor.name)
          );
          
          if (trackingInvestor) {
            console.log(`Found tracking data for ${investor.investor_name || investor.name}:`, {
              total_paid: trackingInvestor.total_paid,
              investment_amount: trackingInvestor.investment_amount
            });
            
            return {
              ...investor,
              calculated_investment_amount: trackingInvestor.total_paid || 0,
              payment_count: trackingInvestor.owner_breakdown?.reduce((count, breakdown) => count + breakdown.payments.length, 0) || 0
            };
          } else {
            console.log(`No tracking data found for ${investor.investor_name || investor.name}`);
            return {
              ...investor,
              calculated_investment_amount: 0,
              payment_count: 0
            };
          }
        });
      } else {
        // Fallback to manual calculation
        console.log('Using manual calculation method');
        investorsWithAmounts = (mergedDeal.investors || []).map(investor => {
          console.log(`\n--- Processing investor on load: ${investor.investor_name || investor.name} (ID: ${investor.id}) ---`);
          
          const investorPayments = paymentsData.filter(payment => {
            console.log(`Checking payment on load:`, {
              payment_id: payment.id,
              amount: payment.amount,
              status: payment.status?.toLowerCase(),
              paid_by_id: payment.paid_by_id,
              paid_by_name: payment.paid_by_name || payment.paid_by,
              payment_type: payment.payment_type
            });
            
            // Try ID-based matching first (new system)
            if (payment.paid_by_id && investor.id) {
              const statusCheck = payment.status && (
                payment.status.toLowerCase() === 'completed' || 
                payment.status.toLowerCase() === 'success' ||
                payment.status.toLowerCase() === 'paid'
              );
              const idMatch = payment.paid_by_id === investor.id && statusCheck;
              console.log(`Load ID match: ${idMatch} (payment.paid_by_id: ${payment.paid_by_id} === investor.id: ${investor.id}, status: ${payment.status}, statusCheck: ${statusCheck})`);
              return idMatch;
            }
            // Fallback to name-based matching (backward compatibility)
            const investorName = investor.investor_name || investor.name;
            const paidByName = payment.paid_by_name || payment.paid_by;
            const statusCheck = payment.status && (
              payment.status.toLowerCase() === 'completed' || 
              payment.status.toLowerCase() === 'success' ||
              payment.status.toLowerCase() === 'paid'
            );
            const nameMatch = paidByName === investorName && statusCheck;
            console.log(`Load Name match: ${nameMatch} (payment name: "${paidByName}" === investor name: "${investorName}", status: ${payment.status}, statusCheck: ${statusCheck})`);
            return nameMatch;
          });
          
          console.log(`Found ${investorPayments.length} matching payments on load for investor ${investor.investor_name || investor.name}`);
          
          const calculatedAmount = investorPayments.reduce((total, payment) => {
            const amount = parseFloat(payment.amount) || 0;
            console.log(`Adding payment amount on load: ${amount}`);
            return total + amount;
          }, 0);

          console.log(`Total calculated amount on load: ${calculatedAmount}`);

          return {
            ...investor,
            calculated_investment_amount: calculatedAmount,
            payment_count: investorPayments.length
          };
        });
      }

      setDeal(mergedDeal);
      
      setPurchaseAmount(mergedDeal.purchase_amount || '');
      setSoldPrice(mergedDeal.sold_price || '');

      // Set deal-specific owners and investors with calculated amounts
      setOwners(mergedDeal.owners || []);
      setInvestors(investorsWithAmounts);

      // Initialize investor shares state from existing data
      const initialInvestorShares = {};
      investorsWithAmounts.forEach(investor => {
        if (investor.id) {
          // Use percentage_share to match the buying section logic
          initialInvestorShares[investor.id] = investor.percentage_share || '';
        }
      });
      setInvestorShares(initialInvestorShares);

      // Initialize owner shares state from existing data
      const initialOwnerShares = {};
      (mergedDeal.owners || []).forEach(owner => {
        if (owner.id) {
          initialOwnerShares[owner.id] = owner.percentage_share || '';
        }
      });
      setOwnerShares(initialOwnerShares);

      try {
        const docResponse = await dealAPI.getDocumentStructure(id);
        setDocuments(docResponse.data.documents || mergedDeal.documents || []);
      } catch {
        setDocuments(mergedDeal.documents || []);
      }

    } catch (error) {
      console.error('Failed to fetch deal:', error);
      toast.error('Failed to load deal details');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const updatePurchaseAmount = useCallback(async (newAmount) => {
    if (!id) return;
    
    try {
      setPurchaseAmountLoading(true);
      await dealAPI.updatePurchaseAmount(id, newAmount);
      
      setPurchaseAmount(newAmount);
      
      setDeal(prevDeal => ({
        ...prevDeal,
        purchase_amount: newAmount
      }));
      
      toast.success('Purchase amount updated successfully');
      
    } catch (error) {
      console.error('Failed to update purchase amount:', error);
      toast.error('Failed to update purchase amount');
      
      if (deal?.purchase_amount !== undefined) {
        setPurchaseAmount(deal.purchase_amount || '');
      }
    } finally {
      setPurchaseAmountLoading(false);
    }
  }, [id, deal?.purchase_amount]);

  const updateSellingAmount = useCallback(async (askingPrice, soldPrice) => {
    if (!id) return;
    
    try {
      setSellingAmountLoading(true);
      
      const sellingData = {};
      if (soldPrice !== undefined) sellingData.sold_price = soldPrice;
      
      await dealAPI.updateSellingAmount(id, sellingData);
      
      if (soldPrice !== undefined) setSoldPrice(soldPrice);
      
      setDeal(prevDeal => ({
        ...prevDeal,
        sold_price: soldPrice !== undefined ? soldPrice : prevDeal?.sold_price
      }));
      
      toast.success('Selling amount updated successfully');
      
    } catch (error) {
      console.error('Failed to update selling amount:', error);
      toast.error('Failed to update selling amount');
      
      if (deal?.sold_price !== undefined) {
        setSoldPrice(deal.sold_price || '');
      }
    } finally {
      setSellingAmountLoading(false);
    }
  }, [id, deal?.sold_price]);

  // Function to update investor amounts based on payments - similar to updatePurchaseAmount
  const updateInvestorAmounts = useCallback(() => {
    if (!investors || !payments || investors.length === 0) return;

    console.log('=== DEBUGGING INVESTOR PAYMENTS ===');
    console.log('Investors:', investors);
    console.log('Payments:', payments);

    try {
      const updatedInvestors = investors.map(investor => {
        console.log(`\n--- Processing investor: ${investor.investor_name || investor.name} (ID: ${investor.id}) ---`);
        
        // Calculate total amount invested by this investor using ID
        const investorPayments = payments.filter(payment => {
          console.log(`Checking payment:`, {
            payment_id: payment.id,
            amount: payment.amount,
            status: payment.status?.toLowerCase(),
            paid_by_id: payment.paid_by_id,
            paid_by_name: payment.paid_by_name || payment.paid_by,
            payment_type: payment.payment_type,
            receiver_id: payment.receiver_id
          });
          
          // Try ID-based matching first (new system)
          if (payment.paid_by_id && investor.id) {
            const statusCheck = payment.status && (
              payment.status.toLowerCase() === 'completed' || 
              payment.status.toLowerCase() === 'success' ||
              payment.status.toLowerCase() === 'paid'
            );
            const idMatch = payment.paid_by_id === investor.id && statusCheck;
            console.log(`ID match: ${idMatch} (payment.paid_by_id: ${payment.paid_by_id} === investor.id: ${investor.id}, status: ${payment.status}, statusCheck: ${statusCheck})`);
            return idMatch;
          }
          // Fallback to name-based matching (backward compatibility)
          const investorName = investor.investor_name || investor.name;
          const paidByName = payment.paid_by_name || payment.paid_by;
          const statusCheck = payment.status && (
            payment.status.toLowerCase() === 'completed' || 
            payment.status.toLowerCase() === 'success' ||
            payment.status.toLowerCase() === 'paid'
          );
          const nameMatch = paidByName === investorName && statusCheck;
          console.log(`Name match: ${nameMatch} (payment name: "${paidByName}" === investor name: "${investorName}", status: ${payment.status}, statusCheck: ${statusCheck})`);
          return nameMatch;
        });
        
        console.log(`Found ${investorPayments.length} matching payments for investor ${investor.investor_name || investor.name}`);
        
        const calculatedAmount = investorPayments.reduce((total, payment) => {
          const amount = parseFloat(payment.amount) || 0;
          console.log(`Adding payment amount: ${amount}`);
          return total + amount;
        }, 0);

        console.log(`Total calculated amount: ${calculatedAmount}`);

        return {
          ...investor,
          calculated_investment_amount: calculatedAmount,
          payment_count: investorPayments.length
        };
      });

      // Only update if there are actual changes
      const hasChanges = updatedInvestors.some((investor, index) => 
        investor.calculated_investment_amount !== investors[index]?.calculated_investment_amount ||
        investor.payment_count !== investors[index]?.payment_count
      );
      
      if (hasChanges) {
        console.log('Updating investors with new amounts');
        setInvestors(updatedInvestors);
      } else {
        console.log('No changes detected in investor amounts');
      }
    } catch (error) {
      console.error('Error updating investor amounts:', error);
    }
  }, [investors, payments]);

  // Recalculate investor amounts when payments change (for updates after initial load)
  useEffect(() => {
    console.log('=== INVESTMENT CALCULATION useEffect TRIGGERED ===');
    console.log('Investors:', investors?.length || 0);
    console.log('Payments:', payments?.length || 0);
    console.log('Loading:', loading);
    
    // Only run this if we already have data loaded (not on initial load)
    if (investors && investors.length > 0 && payments && payments.length > 0 && !loading) {
      console.log('All conditions met, calling updateInvestorAmounts');
      updateInvestorAmounts();
    } else {
      console.log('Conditions not met for investment calculation');
    }
  }, [investors, payments, updateInvestorAmounts, loading]);

  useEffect(() => {
    setUser(getUser());
    if (id) {
      fetchDeal();
      fetchMiscellaneousData();
    }
  }, [id, fetchDeal, fetchMiscellaneousData]);
  useEffect(() => {
    if (router.query.section) {
      setActiveSection(router.query.section);
    }
  }, [router.query.section, id]);

  // Function to handle section change with URL update
  const handleSectionChange = useCallback((sectionId) => {
    setActiveSection(sectionId);
    router.push(`/deals/${id}?section=${sectionId}`, undefined, { shallow: true });
  }, [router, id]);

  // Initialize section from URL on component mount
  useEffect(() => {
    if (router.isReady && id && user) {
      const urlSection = router.query.section;
      const allowedSections = ['project', 'payments', 'profitloss'];
      
      // Add restricted sections only if user has permissions
      if (hasPermission(user, PERMISSIONS.DEALS_EDIT)) {
        allowedSections.push('land', 'selling');
      }
      
      if (urlSection && allowedSections.includes(urlSection)) {
        setActiveSection(urlSection);
      } else if (!urlSection) {
        // Set default section and update URL
        router.replace(`/deals/${id}?section=project`, undefined, { shallow: true });
      } else if (urlSection && !allowedSections.includes(urlSection)) {
        // Redirect to project section if trying to access restricted section
        router.replace(`/deals/${id}?section=project`, undefined, { shallow: true });
        toast.error('You do not have permission to access that section');
      }
    }
  }, [router.isReady, router.query.section, router, id, user]);

  useEffect(() => {
    const handler = () => {
      if (id) fetchDeal();
    };
    const paymentsHandler = () => {
      if (id) {
        // When payments are updated externally, refetch payments and recalculate amounts
        fetchPayments().then(() => {
          // Trigger recalculation after payments are updated
          if (investors && investors.length > 0) {
            updateInvestorAmounts();
          }
        });
      }
    };
    window.addEventListener('docsChanged', handler);
    window.addEventListener('paymentsChanged', paymentsHandler);
    return () => {
      window.removeEventListener('docsChanged', handler);
      window.removeEventListener('paymentsChanged', paymentsHandler);
    };
  }, [id, fetchDeal, fetchPayments, updateInvestorAmounts, investors]);

  // Extract documents - only keep 7/12 extract and additional docs
  const getExtractDocuments = () => {
    return documents.filter(doc => doc.document_type === 'extract');
  };

  const getAdditionalDocuments = () => {
    return documents.filter(doc => 
      doc.document_type && 
      doc.document_type !== 'extract' && 
      doc.document_type !== 'payment_proof'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Deal Details...</h3>
          <p className="text-slate-600">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Deal Not Found</h3>
          <p className="text-slate-600 mb-4">The requested deal could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get filtered documents for our simplified document system
  const extractDocuments = getExtractDocuments();
  const additionalDocuments = getAdditionalDocuments();
  
  const sections = [
    { id: 'project', name: 'PROJECT DETAILS' },
    ...(hasPermission(user, PERMISSIONS.DEALS_EDIT) ? [{ id: 'land', name: 'BUYING' }] : []),
    { id: 'payments', name: 'PAYMENTS' },
    ...(hasPermission(user, PERMISSIONS.DEALS_EDIT) ? [{ id: 'selling', name: 'SELLING' }] : []),
    { id: 'profitloss', name: 'PROFIT & LOSS' }
  ];

  return (
    <div>
      <style jsx>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        /* Print Styles */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
          }
          
          /* Hide non-essential elements */
          .print-hide {
            display: none !important;
          }
          
          /* Show only project content when printing */
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }
          
          /* Print header styling */
          .print-header {
            display: block !important;
            text-align: center !important;
            margin-bottom: 30px !important;
            padding-bottom: 20px !important;
            border-bottom: 2px solid black !important;
          }
          
          .print-title {
            font-size: 18pt !important;
            font-weight: bold !important;
            color: black !important;
            margin-bottom: 10px !important;
          }
          
          .print-subtitle {
            font-size: 14pt !important;
            color: black !important;
            margin-bottom: 5px !important;
          }
          
          /* Project information styling */
          .print-section {
            page-break-inside: avoid !important;
            margin-bottom: 25px !important;
          }
          
          .print-section-title {
            font-size: 16pt !important;
            font-weight: bold !important;
            color: black !important;
            margin-bottom: 15px !important;
            padding-bottom: 8px !important;
            border-bottom: 1px solid black !important;
          }
          
          .print-subsection-title {
            font-size: 14pt !important;
            font-weight: bold !important;
            color: black !important;
            margin: 20px 0 10px 0 !important;
          }
          
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }
          
          .print-item {
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
          }
          
          .print-label {
            font-weight: bold !important;
            color: black !important;
            margin-bottom: 2px !important;
            font-size: 11pt !important;
          }
          
          .print-value {
            color: black !important;
            font-size: 11pt !important;
            margin-left: 10px !important;
          }
          
          /* Table styling for person details */
          .print-person-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
            padding: 10px !important;
            border: 1px solid black !important;
          }
          
          /* Page breaks */
          .print-page-break {
            page-break-before: always !important;
          }
          
          /* Remove all background colors and shadows */
          * {
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Ensure black text */
          h1, h2, h3, h4, h5, h6, p, div, span, td, th {
            color: black !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50">
        {/* Navigation */}
        <div className="bg-white border-b border-slate-200 w-full print-hide">
          <Navbar user={user} onLogout={() => router.push('/login')} />
        </div>

        {/* Print Header - Only visible when printing */}
        <div className="print-header" style={{ display: 'none' }}>
          <div className="print-title">{deal.project_name}</div>
          <div className="print-subtitle">Project Details Report</div>
          <div style={{ fontSize: '12pt', color: 'black' }}>
            Generated on: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Header */}
        <div className="w-full print-hide">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mobile-header-stack">
              <div className="flex items-center justify-between w-full mobile-header-content">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-900">{deal.project_name}</h1>
                  <p className="text-slate-600 mt-1">Deal Details - {deal.survey_number}</p>
                </div>
                <div className="flex items-center space-x-3 mobile-button-group">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    deal.status === 'open' 
                      ? 'bg-green-100 text-green-800' 
                      : deal.status === 'commission'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {deal.status?.charAt(0).toUpperCase() + deal.status?.slice(1)}
                  </span>
                  {activeSection === 'project' && (
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm3-5h2v-2h-2v2z" />
                      </svg>
                      <span>Print</span>
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
                  >
                    ← Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-slate-200 print-hide">
          <div className="px-6">
            <nav className="flex space-x-8 justify-center mobile-nav-tabs">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeSection === section.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 mobile-content-padding">
          {activeSection === 'project' && (
            <ProjectDetailsSection deal={deal} owners={owners} investors={investors} loading={loading} payments={payments} miscellaneousData={miscellaneousData} />
          )}
          
          {activeSection === 'land' && (
            <LandDocumentsSection 
              documents={extractDocuments} 
              generalDocuments={additionalDocuments}
              purchaseAmount={deal.purchase_amount}
              onPurchaseAmountChange={updatePurchaseAmount}
              purchaseAmountLoading={purchaseAmountLoading}
              owners={owners}
              investors={investors}
            />
          )}
          
          {activeSection === 'payments' && (
            <PaymentsSection 
              payments={payments} 
              loading={paymentsLoading}
              dealId={id}
              deal={deal}
              onPaymentUpdate={fetchPayments}
              investors={investors}
              owners={owners}
            />
          )}
          
          {activeSection === 'selling' && (
            <SellingSection 
              deal={deal}
              soldPrice={soldPrice}
              onSellingAmountChange={updateSellingAmount}
              sellingAmountLoading={sellingAmountLoading}
              onUpdate={fetchDeal}
            />
          )}
          
          {activeSection === 'profitloss' && (
            <ProfitLossSection 
              deal={deal}
              payments={payments}
              investors={investors}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Project Details Section Component
function ProjectDetailsSection({ deal, owners, investors, loading, payments = [], miscellaneousData }) {
  
  console.log('=== ProjectDetailsSection DEBUG ===');
  console.log('Payments received:', payments);
  console.log('Investors received:', investors);
  console.log('Loading state:', loading);
  
  // Additional debugging for payment structure
  if (payments && payments.length > 0) {
    console.log('Sample payment structure:', payments[0]);
    payments.forEach((payment, index) => {
      console.log(`Payment ${index + 1}:`, {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        paid_by: payment.paid_by,
        paid_by_id: payment.paid_by_id,
        paid_by_name: payment.paid_by_name,
        payment_type: payment.payment_type
      });
    });
  }
  
  // Format amount for display
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total invested amount for an investor based on completed payments
  const calculateInvestorAmount = (investor, payments) => {
    if (!payments || !investor) return { amount: 0, count: 0 };
    
    const investorId = investor.id?.toString();
    const investorName = investor.investor_name || investor.name;
    
    console.log(`\n=== Calculating for investor: ${investorName} (ID: ${investorId}) ===`);
    console.log('Total payments to check:', payments.length);
    
    // Use robust matching logic similar to PaymentsSection and other components
    const investorPayments = payments.filter(payment => {
      const paymentStatus = payment.status === 'completed' || payment.status === 'success';
      if (!paymentStatus) {
        console.log(`Payment ${payment.id} skipped - status: ${payment.status}`);
        return false;
      }
      
      console.log(`Checking payment ${payment.id}:`, {
        paid_by_id: payment.paid_by_id,
        paid_by: payment.paid_by,
        paid_by_name: payment.paid_by_name,
        amount: payment.amount,
        status: payment.status
      });
      
      // Primary ID-based matching (most reliable)
      if (payment.paid_by_id?.toString() === investorId) {
        console.log(`✓ Matched on paid_by_id: ${payment.paid_by_id} === ${investorId}`);
        return true;
      }
      
      // Secondary ID matching (legacy field) - direct comparison
      if (payment.paid_by?.toString() === investorId) {
        console.log(`✓ Matched on paid_by: ${payment.paid_by} === ${investorId}`);
        return true;
      }
      
      // Parse "investor_ID" format from paid_by field
      if (payment.paid_by && typeof payment.paid_by === 'string' && payment.paid_by.includes('_')) {
        const [type, id] = payment.paid_by.split('_');
        if (type === 'investor' && id === investorId) {
          console.log(`✓ Matched on parsed paid_by: "${payment.paid_by}" -> investor ID ${id} === ${investorId}`);
          return true;
        }
      }
      
      // Exact name matching
      if (payment.paid_by_name === investorName) {
        console.log(`✓ Matched on exact paid_by_name: "${payment.paid_by_name}" === "${investorName}"`);
        return true;
      }
      
      // Flexible name matching (case insensitive, trim whitespace)
      const paymentName = (payment.paid_by_name || '').toLowerCase().trim();
      const investorNameLower = (investorName || '').toLowerCase().trim();
      
      if (paymentName && investorNameLower && paymentName === investorNameLower) {
        console.log(`✓ Matched on normalized names: "${paymentName}" === "${investorNameLower}"`);
        return true;
      }
      
      // Partial name matching
      if (paymentName && investorNameLower && 
          (paymentName.includes(investorNameLower) || investorNameLower.includes(paymentName))) {
        console.log(`✓ Matched on partial names: "${paymentName}" includes "${investorNameLower}"`);
        return true;
      }
      
      console.log(`✗ No match found for payment ${payment.id}`);
      return false;
    });

    const totalAmount = investorPayments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount) || 0;
      console.log(`Adding payment ${payment.id}: ₹${amount}`);
      return sum + amount;
    }, 0);
    
    console.log(`Total for ${investorName}: ₹${totalAmount} from ${investorPayments.length} payments`);
    return { amount: totalAmount, count: investorPayments.length };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-5 bg-slate-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unified Project Information */}
      <div className="bg-slate-50 rounded-lg p-6 print-section">
        <h2 className="text-xl font-semibold text-slate-900 mb-6 print-section-title">Project Information</h2>
        
        {/* Basic Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 print-grid">
          <InfoItem label="Project Name" value={deal.project_name} />
          <InfoItem label="Survey Number" value={deal.survey_number} />
          <InfoItem label="Purchase Date" value={deal.purchase_date ? new Date(deal.purchase_date).toLocaleDateString('en-GB') : 'Not specified'} />
          <InfoItem label="Taluka" value={deal.taluka} />
          <InfoItem label="Village" value={deal.village} />
          <InfoItem label="Total Area" value={`${parseFloat(deal.total_area)} ${deal.area_unit}`} />
          <InfoItem label="Status" value={deal.status} />
          {deal.purchase_amount && (
            <InfoItem 
              label="Purchase Amount" 
              value={formatAmount(deal.purchase_amount)} 
            />
          )}
          {deal.asking_price && (
            <InfoItem 
              label="Asking Price" 
              value={formatAmount(deal.asking_price)} 
            />
          )}
          {deal.sold_price && (
            <InfoItem 
              label="Sold Price" 
              value={formatAmount(deal.sold_price)} 
            />
          )}
        </div>

        {/* Owners Section */}
        <div className="border-t border-slate-200 pt-6 mb-6 print-section">
          <h3 className="text-lg font-medium text-slate-900 mb-4 print-subsection-title">Owners</h3>
          {owners.length > 0 ? (
            <div className="space-y-8">
              {owners.map((owner, index) => (
                <div key={owner.id || index} className="print-section">
                  <h4 className="text-md font-medium text-slate-700 mb-4">Owner {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print-person-grid">
                    <InfoItem label="Full Name" value={owner.name || owner.owner_name || 'Not provided'} />
                    <InfoItem label="Mobile Number" value={owner.mobile || 'Not provided'} />
                    <InfoItem label="Aadhaar Card" value={owner.aadhar_card || owner.aadhaar || 'Not provided'} />
                    <InfoItem label="PAN Card" value={owner.pan_card || owner.pan || 'Not provided'} />
                    {owner.percentage_share && (
                      <InfoItem label="Ownership Share" value={`${Math.round(owner.percentage_share)}%`} />
                    )}
                    <InfoItem 
                      label="Miscellaneous Amount" 
                      value={(() => {
                        if (!miscellaneousData?.owners) return 'No miscellaneous payments';
                        
                        const miscOwner = miscellaneousData.owners.find(
                          misc => misc.owner_id === owner.id || 
                                  misc.owner_name === (owner.name || owner.owner_name)
                        );
                        
                        return miscOwner?.total_miscellaneous > 0 
                          ? `${formatAmount(miscOwner.total_miscellaneous)} (${miscOwner.payment_count} payments)`
                          : 'No miscellaneous payments';
                      })()}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">No owners found for this deal</p>
            </div>
          )}
        </div>

        {/* Investors Section */}
        <div className="border-t border-slate-200 pt-6 print-section">
          <h3 className="text-lg font-medium text-slate-900 mb-4 print-subsection-title">Investors</h3>
          {investors.length > 0 ? (
            <div className="space-y-8">
              {investors.map((investor, index) => (
                <div key={investor.id || index} className="print-section">
                  <h4 className="text-md font-medium text-slate-700 mb-4">Investor {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print-person-grid">
                    <InfoItem label="Full Name" value={investor.investor_name || investor.name || 'Not provided'} />
                    <InfoItem label="Mobile Number" value={investor.mobile || 'Not provided'} />
                    <InfoItem label="Aadhaar Card" value={investor.aadhar_card || investor.aadhaar || 'Not provided'} />
                    <InfoItem label="PAN Card" value={investor.pan_card || investor.pan || 'Not provided'} />
                    {investor.percentage_share && (
                      <InfoItem label="Investment Percentage" value={`${Math.round(investor.percentage_share)}%`} />
                    )}
                    <InfoItem 
                      label="Total Invested" 
                      value={(() => {
                        const investment = calculateInvestorAmount(investor, payments);
                        
                        return investment.amount > 0 
                          ? `${formatAmount(investment.amount)} (${investment.count} installments)`
                          : `No completed payments`;
                      })()}
                    />
                    <InfoItem 
                      label="Miscellaneous Amount" 
                      value={(() => {
                        if (!miscellaneousData?.investors) return 'No miscellaneous payments';
                        
                        const miscInvestor = miscellaneousData.investors.find(
                          misc => misc.investor_id === investor.id || 
                                  misc.investor_name === (investor.investor_name || investor.name)
                        );
                        
                        return miscInvestor?.total_miscellaneous > 0 
                          ? `${formatAmount(miscInvestor.total_miscellaneous)} (${miscInvestor.payment_count} payments)`
                          : 'No miscellaneous payments';
                      })()}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">No investors found for this deal</p>
            </div>
          )}
        </div>

        {/* Buyers Section */}
        <div className="border-t border-slate-200 pt-6 print-section">
          <h3 className="text-lg font-medium text-slate-900 mb-4 print-subsection-title">Buyers</h3>
          {deal.buyers && deal.buyers.length > 0 ? (
            <div className="space-y-8">
              {deal.buyers.map((buyer, index) => (
                <div key={buyer.id || index} className="print-section">
                  <h4 className="text-md font-medium text-slate-700 mb-4">Buyer {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print-person-grid">
                    <InfoItem label="Full Name" value={buyer.name || 'Not provided'} />
                    <InfoItem label="Mobile Number" value={buyer.mobile || 'Not provided'} />
                    <InfoItem label="Aadhaar Card" value={buyer.aadhar_card || 'Not provided'} />
                    <InfoItem label="PAN Card" value={buyer.pan_card || 'Not provided'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">No buyers found for this deal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Purchasing Section Component
function LandDocumentsSection({ documents, generalDocuments, purchaseAmount = '', onPurchaseAmountChange, purchaseAmountLoading = false, owners = [], investors = [] }) {
  const router = useRouter();
  const { id } = router.query;
  const [localPurchaseAmount, setLocalPurchaseAmount] = useState(purchaseAmount);
  const [isEditing, setIsEditing] = useState(false);
  const [ownerShares, setOwnerShares] = useState({});
  const [investorShares, setInvestorShares] = useState({});

  useEffect(() => {
    setLocalPurchaseAmount(purchaseAmount);
  }, [purchaseAmount]);

  // Initialize owner shares - sync with latest data from props
  useEffect(() => {
    if (owners && owners.length > 0) {
      const initialShares = {};
      owners.forEach((owner, index) => {
        const ownerId = owner.id || index;
        // If only one owner, automatically set to 100%
        if (owners.length === 1) {
          initialShares[ownerId] = '100';
        } else {
          initialShares[ownerId] = owner.percentage_share || '';
        }
      });
      setOwnerShares(initialShares);
    }
  }, [owners]);

  // Initialize investor shares - sync with latest data from props
  useEffect(() => {
    if (investors && investors.length > 0) {
      const initialShares = {};
      investors.forEach((investor, index) => {
        const investorId = investor.id || index;
        // If only one investor, automatically set to 100%
        if (investors.length === 1) {
          initialShares[investorId] = '100';
        } else {
          // Only use percentage_share if it's a valid positive number for this specific deal
          // This prevents cross-deal contamination and ensures clean defaults
          const percentageValue = investor.percentage_share;
          if (percentageValue && !isNaN(parseFloat(percentageValue)) && parseFloat(percentageValue) > 0) {
            initialShares[investorId] = String(percentageValue);
          } else {
            // Default to empty string for proper 0 amount display
            initialShares[investorId] = '';
          }
        }
      });
      setInvestorShares(initialShares);
      console.log('Initialized investor shares in buying section:', initialShares);
      console.log('Investors data:', investors);
    }
  }, [investors]);

  // Calculate investment amount for an owner based on their percentage
  const calculateInvestmentAmount = (percentage) => {
    // Return 0 for any invalid input to ensure clean default display
    if (!percentage || percentage === '' || !purchaseAmount || purchaseAmount === '') return 0;
    
    const numericPercentage = parseFloat(percentage);
    if (isNaN(numericPercentage) || numericPercentage < 0) return 0;
    
    // Clean the purchase amount - remove commas and any non-digit characters except decimal
    let cleanPurchaseAmount = purchaseAmount.toString().replace(/[^\d.]/g, '');
    const numericPurchaseAmount = parseFloat(cleanPurchaseAmount);
    
    if (isNaN(numericPurchaseAmount) || numericPurchaseAmount <= 0) return 0;
    
    const calculatedAmount = (numericPurchaseAmount * numericPercentage) / 100;
    
    // Return 0 for any invalid calculation result
    return isNaN(calculatedAmount) || calculatedAmount < 0 ? 0 : calculatedAmount;
  };

  // Handle percentage change for owners
  const handleOwnerPercentageChange = (ownerId, value) => {
    // If only one owner, keep it at 100%
    if (owners.length === 1) {
      return;
    }
    
    // Allow empty input and whole numbers only (no decimal points)
    if (value === '' || /^\d*$/.test(value)) {
      // Check if the value exceeds 100
      const numericValue = parseFloat(value);
      if (value !== '' && numericValue > 100) {
        return; // Don't update if value exceeds 100
      }
      
      setOwnerShares(prev => ({
        ...prev,
        [ownerId]: value
      }));
    }
  };

  // Handle percentage change for investors
  const handleInvestorPercentageChange = (investorId, value) => {
    // If only one investor, keep it at 100%
    if (investors.length === 1) {
      return;
    }
    
    // Allow empty input and whole numbers only (no decimal points)
    if (value === '' || /^\d*$/.test(value)) {
      // Check if the value exceeds 100
      const numericValue = parseFloat(value);
      if (value !== '' && numericValue > 100) {
        return; // Don't update if value exceeds 100
      }
      
      setInvestorShares(prev => ({
        ...prev,
        [investorId]: value
      }));
    }
  };

  // Save owner shares to backend
  const saveOwnerShares = async () => {
    try {
      const ownerData = owners.map((owner, index) => {
        const ownerId = owner.id || index;
        const percentage = parseFloat(ownerShares[ownerId]) || 0;
        const amount = calculateInvestmentAmount(ownerShares[ownerId]);
        
        return {
          id: owner.id,
          percentage_share: Math.round(percentage),
          investment_amount: Math.round(amount)
        };
      });

      console.log('Saving owner shares:', ownerData);

      // Get auth token from cookies (not localStorage)
      const token = getToken();
      console.log('Found token:', token ? 'Yes (hidden for security)' : 'No');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use environment variable for backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const requestUrl = `${backendUrl}/api/deals/${id}/owner-shares`;
      console.log('Request URL:', requestUrl);
      console.log('Request headers (token hidden):', { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined });

      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ owners: ownerData }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Read response text first, then try to parse as JSON
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        responseData = { error: `Invalid JSON response: ${responseText}` };
      }

      if (response.ok) {
        alert('Owner shares saved successfully!');
        // Refresh the deal data to show updated values
        window.location.reload();
        return;
      } else {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to save data.');
        } else {
          throw new Error(`HTTP ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Full error details:', error);
      console.error('Error stack:', error.stack);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Network error: Cannot connect to backend. Please check your backend connection.');
      } else if (error.message.includes('Authentication required')) {
        alert('Authentication required. Please log in first to save owner shares.');
      } else {
        alert(`Failed to save owner shares: ${error.message}`);
      }
    }
  };

  // Save investor shares to backend
  const saveInvestorShares = async () => {
    try {
      const investorData = investors.map((investor, index) => {
        const investorId = investor.id || index;
        const percentage = parseFloat(investorShares[investorId]) || 0;
        const amount = calculateInvestmentAmount(investorShares[investorId]);
        
        return {
          id: investor.id,
          percentage_share: Math.round(percentage),
          investment_amount: Math.round(amount)
        };
      });

      console.log('Saving investor shares:', investorData);

      // Get auth token from cookies (not localStorage)
      const token = getToken();
      console.log('Found token:', token ? 'Yes (hidden for security)' : 'No');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use environment variable for backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const requestUrl = `${backendUrl}/api/deals/${id}/investor-shares`;
      console.log('Request URL:', requestUrl);
      console.log('Request headers (token hidden):', { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined });

      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ investors: investorData }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Read response text first, then try to parse as JSON
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        responseData = { error: `Invalid JSON response: ${responseText}` };
      }

      if (response.ok) {
        alert('Investor shares saved successfully!');
        // Refresh the deal data to show updated values
        window.location.reload();
        return;
      } else {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to save data.');
        } else {
          throw new Error(`HTTP ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Full error details:', error);
      console.error('Error stack:', error.stack);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Network error: Cannot connect to backend. Please check your backend connection.');
      } else if (error.message.includes('Authentication required')) {
        alert('Authentication required. Please log in first to save investor shares.');
      } else {
        alert(`Failed to save investor shares: ${error.message}`);
      }
    }
  };

  // Delete owner function
  const deleteOwner = async (ownerId) => {
    if (!ownerId) {
      alert('Owner ID is required');
      return;
    }

    if (!confirm('Are you sure you want to delete this owner? This action cannot be undone.')) {
      return;
    }

    try {
      // Get auth token from cookies
      const token = getToken();
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const requestUrl = `${backendUrl}/api/owners/${ownerId}`;

      const response = await fetch(requestUrl, {
        method: 'DELETE',
        headers: headers,
      });

      if (response.ok) {
        alert('Owner deleted successfully!');
        // Refresh the deal data to show updated values
        window.location.reload();
      } else {
        const responseData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting owner:', error);
      alert(`Failed to delete owner: ${error.message}`);
    }
  };

  // Delete investor function
  const deleteInvestor = async (investorId) => {
    if (!investorId) {
      alert('Investor ID is required');
      return;
    }

    if (!confirm('Are you sure you want to delete this investor? This action cannot be undone.')) {
      return;
    }

    try {
      // Get auth token from cookies
      const token = getToken();
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const requestUrl = `${backendUrl}/api/investors/${investorId}`;

      const response = await fetch(requestUrl, {
        method: 'DELETE',
        headers: headers,
      });

      if (response.ok) {
        alert('Investor deleted successfully!');
        // Refresh the deal data to show updated values
        window.location.reload();
      } else {
        const responseData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting investor:', error);
      alert(`Failed to delete investor: ${error.message}`);
    }
  };

  const handleSavePurchaseAmount = async () => {
    if (localPurchaseAmount && isNaN(Number(localPurchaseAmount))) {
      toast.error('Please enter a valid number');
      return;
    }

    if (localPurchaseAmount && Number(localPurchaseAmount) < 0) {
      toast.error('Purchase amount cannot be negative');
      return;
    }

    try {
      await onPurchaseAmountChange(localPurchaseAmount || null);
      setIsEditing(false);
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleCancel = () => {
    setLocalPurchaseAmount(purchaseAmount);
    setIsEditing(false);
  };

  const landDocTypes = {
    extract: '7/12 Extract'
  };

  return (
    <div className="space-y-6">
      {/* Purchase Amount Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-6">Purchase Amount</h2>
        <div className="flex items-center space-x-4">
          {!isEditing ? (
            <>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">Purchase Amount</div>
                <div className="text-lg font-semibold text-black">
                  {purchaseAmount ? 
                    new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Number(purchaseAmount)) 
                    : 'Not set'
                  }
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
                disabled={purchaseAmountLoading}
              >
                {purchaseAmount ? 'Edit' : 'Set Amount'}
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center space-x-3">
              <div className="flex-1">
                <label htmlFor="purchase-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Amount (INR)
                </label>
                <input
                  id="purchase-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={localPurchaseAmount}
                  onChange={(e) => setLocalPurchaseAmount(e.target.value)}
                  placeholder="Enter purchase amount"
                  style={{ appearance: 'textfield' }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  disabled={purchaseAmountLoading}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSavePurchaseAmount}
                  disabled={purchaseAmountLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                >
                  {purchaseAmountLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={purchaseAmountLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Owner Information Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black">Owner Information</h2>
          <button
            onClick={() => router.push(`/owners/new?returnTo=/deals/${id}&section=land`)}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm font-medium"
          >
            + Add Owner
          </button>
        </div>

        <div className="bg-white rounded p-4 border border-gray-200">
          {owners && owners.length > 0 ? (
            <div className="space-y-3">
              {owners.map((owner, index) => {
                const ownerId = owner.id || index;
                const currentPercentage = ownerShares[ownerId] || '';
                const calculatedAmount = calculateInvestmentAmount(currentPercentage);
                
                return (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">
                          {(owner.owner_name || owner.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">
                          {owner.owner_name || owner.name || 'Unknown Owner'}
                        </div>
                        {owner.contact && (
                          <div className="text-xs text-gray-500">{owner.contact}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Percentage Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="0"
                          value={currentPercentage}
                          onChange={(e) => handleOwnerPercentageChange(ownerId, e.target.value)}
                          className={`w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center ${
                            owners.length === 1 ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          max="100"
                          disabled={owners.length === 1}
                          title={owners.length === 1 ? 'Single owner automatically gets 100%' : 'Enter percentage share'}
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                      
                      {/* Calculated Amount Display */}
                      <div className="text-right min-w-[100px]">
                        <div className="text-sm font-medium text-black">
                          {calculatedAmount > 0 ? 
                            `₹${new Intl.NumberFormat('en-IN').format(Math.round(calculatedAmount))}` 
                            : '₹0'
                          }
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteOwner(owner.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete Owner"
                        disabled={!owner.id}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Total Summary */}
              {owners.length > 1 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Total:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-black">
                        {Math.round(Object.values(ownerShares).reduce((sum, percentage) => {
                          return sum + (parseFloat(percentage) || 0);
                        }, 0))}%
                      </span>
                      <span className="font-medium text-black min-w-[100px] text-right">
                        ₹{new Intl.NumberFormat('en-IN').format(
                          Math.round(Object.values(ownerShares).reduce((sum, percentage) => {
                            return sum + calculateInvestmentAmount(percentage);
                          }, 0))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Save Button */}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <div className="flex justify-end">
                  <button
                    onClick={saveOwnerShares}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    Save Owner Shares
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-gray-500">No owner information available</div>
            </div>
          )}
        </div>
      </div>

      {/* Investor Information Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black">Investor Information</h2>
          <button
            onClick={() => router.push(`/investors/new?returnTo=/deals/${id}&section=land`)}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm font-medium"
          >
            + Add Investor
          </button>
        </div>

        <div className="bg-white rounded p-4 border border-gray-200">
          {investors && investors.length > 0 ? (
            <div className="space-y-3">
              {investors.map((investor, index) => {
                const investorId = investor.id || index;
                const currentPercentage = investorShares[investorId] || '';
                const calculatedAmount = calculateInvestmentAmount(currentPercentage);
                
                return (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">
                          {(investor.investor_name || investor.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">
                          {investor.investor_name || investor.name || 'Unknown Investor'}
                        </div>
                        {investor.mobile && (
                          <div className="text-xs text-gray-500">{investor.mobile}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Percentage Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="0"
                          value={currentPercentage}
                          onChange={(e) => handleInvestorPercentageChange(investorId, e.target.value)}
                          className={`w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center ${
                            investors.length === 1 ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          max="100"
                          disabled={investors.length === 1}
                          title={investors.length === 1 ? 'Single investor automatically gets 100%' : 'Enter percentage share'}
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                      
                      {/* Calculated Amount Display */}
                      <div className="text-right min-w-[100px]">
                        <div className="text-sm font-medium text-black">
                          {calculatedAmount > 0 ? 
                            `₹${new Intl.NumberFormat('en-IN').format(Math.round(calculatedAmount))}` 
                            : '₹0'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {currentPercentage && currentPercentage !== '' ? 'Calculated' : 'Not saved'}
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteInvestor(investor.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete Investor"
                        disabled={!investor.id}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Total Summary */}
              {investors.length > 1 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Total:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-black">
                        {Math.round(Object.values(investorShares).reduce((sum, percentage) => {
                          return sum + (parseFloat(percentage) || 0);
                        }, 0))}%
                      </span>
                      <span className="font-medium text-black min-w-[100px] text-right">
                        ₹{new Intl.NumberFormat('en-IN').format(
                          Math.round(Object.values(investorShares).reduce((sum, percentage) => {
                            return sum + calculateInvestmentAmount(percentage);
                          }, 0))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Save Button */}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <div className="flex justify-end">
                  <button
                    onClick={saveInvestorShares}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Save Investor Shares
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-gray-500">No investor information available</div>
            </div>
          )}
        </div>
      </div>

      {/* Buying Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-6">Land Documents</h2>
        
        {/* Standard Land Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(landDocTypes).map(([docType, displayName]) => {
            const docsOfType = documents.filter(doc => doc.document_type === docType);
            return (
              <DocumentCard
                key={docType}
                title={displayName}
                documents={docsOfType}
                emptyText={`No ${displayName.toLowerCase()} uploaded`}
                documentTypeSlug={docType}
              />
            );
          })}
        </div>

        {/* Additional/General Documents */}
        {generalDocuments && generalDocuments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-black mb-4">Additional Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalDocuments.map((doc, index) => (
                <DocumentItem key={index} document={doc} />
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && (!generalDocuments || generalDocuments.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">No land documents found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility Components
function InfoItem({ label, value }) {
  return (
    <div className="print-item">
      <label className="block text-sm font-medium text-gray-700 mb-1 print-label">{label}</label>
      <div className="p-3 bg-white border border-gray-200 rounded text-black print-value">
        {value || 'Not specified'}
      </div>
    </div>
  );
}

function DocumentCard({ title, documents, emptyText, documentTypeSlug }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-black mb-3">{title}</h4>
      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <DocumentItem key={index} document={doc} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-sm">{emptyText}</p>
          <div className="mt-3">
            <InlineUpload documentType={title} documentTypeSlug={documentTypeSlug} />
          </div>
        </div>
      )}
    </div>
  );
}

function InlineUpload({ documentType, documentTypeSlug }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { id: dealId } = router.query;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!dealId) {
      toast.error('Deal ID is missing');
      return;
    }
    
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const slug = documentTypeSlug || documentType.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      formData.append('document_type', slug);
      
      await dealAPI.uploadLandDocuments(dealId, formData);
      
      toast.success('Document uploaded');
      window.dispatchEvent(new Event('docsChanged'));
    } catch (error) {
      console.error('Upload failed', error);
      
      if (error.response?.status === 500) {
        toast.error(`Server error: ${error.response?.data?.error || 'Internal server error'}`);
      } else if (error.response?.status === 400) {
        toast.error(`Upload error: ${error.response?.data?.error || 'Bad request'}`);
      } else if (error.response?.status === 404) {
        toast.error('Deal not found');
      } else {
        toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  return (
    <div className="flex items-center justify-center">
      <input ref={fileRef} type="file" onChange={handleFile} className="hidden" id={`inline-upload-${documentType}`} />
      <label htmlFor={`inline-upload-${documentType}`} className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
        {uploading ? 'Uploading...' : 'Upload'}
      </label>
    </div>
  );
}

function DocumentItem({ document: doc }) {
  const router = useRouter();
  const { id: dealId } = router.query;
  const [replacing, setReplacing] = useState(false);
  const fileRef = useRef();
  const displayName = doc.original_name || doc.file_name || doc.document_name || 'Document';

  const handleReplace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', doc.document_type || '');

      if (!dealId) throw new Error('Missing deal id');

      await dealAPI.uploadLandDocuments(dealId, formData);

      toast.success('Document replaced');
      window.dispatchEvent(new Event('docsChanged'));
    } catch (error) {
      console.error('Replace failed', error);
      toast.error('Replace failed');
    } finally {
      setReplacing(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  const handleRemove = async () => {
    try {
      if (doc.id) {
        await dealAPI.deleteLandDocument(dealId, doc.id);
        toast.success('Document removed');
        window.dispatchEvent(new Event('docsChanged'));
        return;
      }

      toast('Remove not available for this document; try Replace', { icon: 'ℹ️' });
    } catch (error) {
      console.error('Remove failed', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.message;
        
        if (status === 404) {
          toast.error('Document not found');
        } else if (status === 403) {
          toast.error('Not authorized to delete this document');
        } else if (status === 500) {
          toast.error('Server error occurred while deleting document');
        } else {
          toast.error(`Failed to remove document: ${message}`);
        }
      } else if (error.request) {
        toast.error('Network error - please check your connection');
      } else {
        toast.error('Failed to remove document');
      }
    }
  };

  const handleView = () => {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const base = rawApi.replace(/\/api\/?$/, '') || 'http://localhost:5000';
    const fileUrl = `${base}/uploads/${doc.file_path}`;
    window.open(fileUrl, '_blank');
  };

  const handleDownload = () => {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const base = rawApi.replace(/\/api\/?$/, '') || 'http://localhost:5000';
    const fileUrl = doc.file_url || `${base}/uploads/${doc.file_path}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = doc.original_name || doc.file_name || doc.document_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 bg-white rounded border border-gray-200">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded px-3 py-1 min-w-0">
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-gray-700 truncate" title={displayName}>
            {displayName}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center space-x-2">
        <button
          onClick={handleView}
          className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
          title="View Document"
        >
          View
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1 text-xs bg-white border border-gray-800 text-gray-800 rounded hover:bg-gray-50"
          title="Download Document"
        >
          Download
        </button>
        <input ref={fileRef} type="file" onChange={handleReplace} className="hidden" id={`replace-${doc.id || doc.file_name}`} />
        <label htmlFor={`replace-${doc.id || doc.file_name}`} className="px-3 py-1 text-xs bg-yellow-500 text-white rounded cursor-pointer hover:bg-yellow-600" title="Replace Document">
          {replacing ? 'Replacing...' : 'Replace'}
        </label>
        <button onClick={handleRemove} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Remove Document">Remove</button>
      </div>
    </div>
  );
}

// Payments Section Component
function PaymentsSection({ payments, loading, dealId, deal, onPaymentUpdate, investors, owners }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterInvestor, setFilterInvestor] = useState('all');

  // Chart view state
  const [chartError, setChartError] = useState(null);
  
  // View state - can be 'table', 'chart', or 'profitloss'
  const [currentView, setCurrentView] = useState('table');

  // Print function for payments table
  // Enhanced professional PDF download function
  const handleDownloadPDF = async () => {
    try {
      // Get filtered and sorted payments (same as print function)
      const sortedPayments = getFilteredAndSortedPayments;
      
      // Calculate total amount and status breakdown
      const totalAmount = sortedPayments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);
      
      // Calculate status breakdown
      const statusBreakdown = sortedPayments.reduce((acc, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        const status = payment.status || 'pending';
        
        if (!acc[status]) {
          acc[status] = { count: 0, amount: 0 };
        }
        acc[status].count += 1;
        acc[status].amount += amount;
        
        return acc;
      }, {});
      
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table layout
      
      // Set up the PDF header
      doc.setFontSize(20);
      doc.setTextColor(51, 51, 51);
      doc.text('Payments Report', 20, 20);
      
      // Add deal information
      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      const reportDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated on: ${reportDate}`, 220, 20);
      
      // Deal details
      const dealInfo = [
        `Deal Name: ${deal?.project_name || 'N/A'}`,
        `Survey No: ${deal?.survey_number || 'N/A'}`,
        `Total Payments: ${sortedPayments.length}`,
        `Total Amount: ${formatAmount(totalAmount)}`
      ];
      
      let yPos = 35;
      dealInfo.forEach((info, index) => {
        doc.text(info, 20 + (index % 2) * 140, yPos + Math.floor(index / 2) * 7);
      });
      
      yPos += 20;
      
      // Add status breakdown
      doc.setFontSize(11);
      doc.setTextColor(68, 68, 68);
      const statusInfo = [
        `Completed: ${statusBreakdown.completed?.count || 0} (${formatAmount(statusBreakdown.completed?.amount || 0)})`,
        `Pending: ${statusBreakdown.pending?.count || 0} (${formatAmount(statusBreakdown.pending?.amount || 0)})`,
        `Cancelled: ${statusBreakdown.cancelled?.count || 0} (${formatAmount(statusBreakdown.cancelled?.amount || 0)})`,
        `Overdue: ${statusBreakdown.overdue?.count || 0} (${formatAmount(statusBreakdown.overdue?.amount || 0)})`
      ];
      
      statusInfo.forEach((info, index) => {
        doc.text(info, 20 + (index % 2) * 140, yPos + Math.floor(index / 2) * 7);
      });
      
      yPos += 25;
      
      // Table headers
      const headers = ['Receiver', 'Payer', 'Mode', 'Transaction ID', 'Type', 'Status', 'Date', 'Amount'];
      const colWidths = [35, 35, 25, 30, 25, 20, 25, 25];
      let xPos = 20;
      
      // Draw header background
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos - 5, 260, 10, 'F');
      
      // Draw header text
      doc.setFontSize(10);
      doc.setTextColor(68, 68, 68);
      doc.setFont(undefined, 'bold');
      
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, yPos);
        xPos += colWidths[index];
      });
      
      yPos += 10;
      
      // Table content
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      sortedPayments.forEach((payment, index) => {
        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(249, 249, 249);
          doc.rect(20, yPos - 4, 260, 8, 'F');
        }
        
        xPos = 20;
        doc.setTextColor(51, 51, 51);
        
        const rowData = [
          getPaymentDisplayName(payment, 'paid_to'),
          getPaymentDisplayName(payment, 'paid_by'),
          payment.payment_mode || payment.payment_method || 'N/A',
          payment.reference || payment.transaction_id || 'N/A',
          getPaymentTypeDisplayName(payment.payment_type),
          payment.status || 'N/A',
          formatDate(payment.payment_date),
          formatAmount(payment.amount)
        ];
        
        rowData.forEach((data, colIndex) => {
          // Truncate long text to fit in columns
          const maxWidth = colWidths[colIndex] - 4;
          let text = data.toString();
          if (doc.getTextWidth(text) > maxWidth) {
            while (doc.getTextWidth(text + '...') > maxWidth && text.length > 0) {
              text = text.slice(0, -1);
            }
            text += '...';
          }
          
          doc.text(text, xPos + 2, yPos);
          xPos += colWidths[colIndex];
        });
        
        yPos += 8;
        
        // Add new page if needed
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      // Add total row
      yPos += 5;
      doc.setFillColor(227, 242, 253);
      doc.rect(20, yPos - 4, 260, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Total Amount:', 180, yPos);
      doc.text(formatAmount(totalAmount), 225, yPos);
      
      // Save the PDF
      const fileName = `payments_report_${deal?.project_name || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrintPayments = () => {
    const printWindow = window.open('', '_blank');
    
    // Get filtered and sorted payments
    const sortedPayments = getFilteredAndSortedPayments;
    
    // Calculate total amount and status breakdown
    const totalAmount = sortedPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
    
    // Calculate status breakdown
    const statusBreakdown = sortedPayments.reduce((acc, payment) => {
      const amount = parseFloat(payment.amount) || 0;
      const status = payment.status || 'pending';
      
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count += 1;
      acc[status].amount += amount;
      
      return acc;
    }, {});
    
    // Format amount for display
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    };
    
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return 'N/A';
      }
    };
    
    // Generate table rows with bank information
    const tableRows = sortedPayments.map(payment => {
      // Format receiver info with bank details
      const receiverInfo = getPaymentDisplayName(payment, 'paid_to');
      const receiverBankInfo = [];
      if (payment.receiver_bank_name) receiverBankInfo.push(`Bank: ${payment.receiver_bank_name}`);
      if (payment.receiver_bank_account_no) receiverBankInfo.push(`A/c: ${payment.receiver_bank_account_no}`);
      const receiverDetails = receiverBankInfo.length > 0 
        ? `${receiverInfo}<br><small style="color: #666; font-size: 11px;">${receiverBankInfo.join('<br>')}</small>`
        : receiverInfo;

      // Format payer info with bank details
      const payerInfo = getPaymentDisplayName(payment, 'paid_by');
      const payerBankInfo = [];
      if (payment.payer_bank_name) payerBankInfo.push(`Bank: ${payment.payer_bank_name}`);
      if (payment.payer_bank_account_no) payerBankInfo.push(`A/c: ${payment.payer_bank_account_no}`);
      const payerDetails = payerBankInfo.length > 0 
        ? `${payerInfo}<br><small style="color: #666; font-size: 11px;">${payerBankInfo.join('<br>')}</small>`
        : payerInfo;

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; vertical-align: top;">${receiverDetails}</td>
          <td style="padding: 8px; border: 1px solid #ccc; vertical-align: top;">${payerDetails}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${payment.payment_mode || payment.payment_method || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${payment.reference || payment.transaction_id || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${getPaymentTypeDisplayName(payment.payment_type)}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${payment.status || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${formatDate(payment.payment_date)}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">${formatAmount(payment.amount)}</td>
        </tr>
      `;
    }).join('');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payments Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              border: 2px solid #333;
            }
            th { 
              background-color: #f8f9fa; 
              padding: 10px; 
              text-align: left; 
              font-weight: bold;
              border: 1px solid #333;
            }
            td { 
              padding: 8px; 
              border: 1px solid #ccc;
              vertical-align: top;
              line-height: 1.4;
            }
            td small {
              font-size: 11px;
              color: #666;
              display: block;
              margin-top: 4px;
              line-height: 1.2;
            }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .print-info { 
              margin-bottom: 20px; 
              font-size: 14px; 
              color: #666; 
            }
            .total-row {
              background-color: #e3f2fd !important;
              font-weight: bold;
              border-top: 2px solid #333;
            }
            @media print {
              body { margin: 0; }
              .print-info { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="color: #333; margin: 0;">Payments Report</h1>
            <span style="font-size: 14px; color: #666;"><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          <div class="print-info">
            <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-bottom: 10px;">
              <span><strong>Deal Name:</strong> ${deal?.project_name || 'N/A'}</span>
              <span><strong>Survey No:</strong> ${deal?.survey_number || 'N/A'}</span>
              <span><strong>Total Payments:</strong> ${sortedPayments.length}</span>
              <span><strong>Total Amount:</strong> ${formatAmount(totalAmount)}</span>
            </div>
            <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <span><strong>Completed:</strong> ${statusBreakdown.completed?.count || 0} (${formatAmount(statusBreakdown.completed?.amount || 0)})</span>
              <span><strong>Pending:</strong> ${statusBreakdown.pending?.count || 0} (${formatAmount(statusBreakdown.pending?.amount || 0)})</span>
              <span><strong>Cancelled:</strong> ${statusBreakdown.cancelled?.count || 0} (${formatAmount(statusBreakdown.cancelled?.amount || 0)})</span>
              <span><strong>Overdue:</strong> ${statusBreakdown.overdue?.count || 0} (${formatAmount(statusBreakdown.overdue?.amount || 0)})</span>
              <span><strong>Failed:</strong> ${statusBreakdown.failed?.count || 0} (${formatAmount(statusBreakdown.failed?.amount || 0)})</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Receiver</th>
                <th>Payer</th>
                <th>Payment Mode</th>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td colspan="7" style="padding: 10px; border: 1px solid #333; text-align: right; font-weight: bold;">Total Amount:</td>
                <td style="padding: 10px; border: 1px solid #333; text-align: right; font-weight: bold;">${formatAmount(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Calculate payment statistics for this deal (using original payments, not filtered)
  const paymentStats = React.useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        total: 0,
        pending: 0,
        completed: 0,
        overdue: 0,
        totalAmount: 0,
        pendingAmount: 0,
        completedAmount: 0
      };
    }

    return payments.reduce((acc, payment) => {
      const amount = parseFloat(payment.amount) || 0;
      acc.total += 1;
      acc.totalAmount += amount;

      // Check if payment is overdue
      const isOverdue = payment.status === 'pending' && 
        payment.due_date && 
        new Date(payment.due_date) < new Date();

      if (isOverdue) {
        acc.overdue += 1;
      } else if (payment.status === 'pending') {
        acc.pending += 1;
        acc.pendingAmount += amount;
      } else if (payment.status === 'completed') {
        acc.completed += 1;
        acc.completedAmount += amount;
      }

      return acc;
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    });
  }, [payments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Function to get display name from payment data
  const getPaymentDisplayName = useCallback((payment, field) => {
    // Check if we have the new name fields first
    if (field === 'paid_by' && payment.paid_by_name) {
      return payment.paid_by_name;
    }
    if (field === 'paid_to' && payment.paid_to_name) {
      return payment.paid_to_name;
    }
    
    // Fallback to original field but clean up ID format
    const value = payment[field];
    if (!value) return 'N/A';
    
    // Debug logging for troubleshooting
    console.log(`Debug getPaymentDisplayName: field=${field}, value=${value}, type=${typeof value}`);
    console.log('Available investors:', investors?.map(inv => ({ id: inv.id, name: inv.investor_name || inv.name })));
    console.log('Available owners:', owners?.map(own => ({ id: own.id, name: own.name || own.owner_name })));
    
    // If it's in ID format (e.g., "investor_123"), extract the name from deal data
    if (value && value.includes && value.includes('_')) {
      const [type, id] = value.split('_');
      const numericId = parseInt(id);
      console.log(`Parsing ID format: type=${type}, id=${id}, numericId=${numericId}`);
      
      if (type === 'investor' && Array.isArray(investors)) {
        const investor = investors.find(inv => inv.id === numericId);
        console.log(`Found investor:`, investor);
        return investor ? (investor.investor_name || investor.name) : value;
      }
      
      if (type === 'owner' && Array.isArray(owners)) {
        const owner = owners.find(own => own.id === numericId);
        console.log(`Found owner:`, owner);
        return owner ? (owner.name || owner.owner_name) : value;
      }
      
      // Check for buyer type as well (in case buyers are stored differently)
      if (type === 'buyer' && deal?.buyers) {
        const buyer = deal.buyers.find(buy => buy.id === numericId);
        console.log(`Found buyer:`, buyer);
        return buyer ? buyer.name : value;
      }
    }
    
    // If value is just a numeric ID, try to match it directly
    if (value && !isNaN(value)) {
      const numericId = parseInt(value);
      
      // Try investors first
      if (investors) {
        const investor = investors.find(inv => inv.id === numericId);
        if (investor) {
          console.log(`Found investor by direct ID:`, investor);
          return investor.investor_name || investor.name;
        }
      }
      
      // Try owners
      if (owners) {
        const owner = owners.find(own => own.id === numericId);
        if (owner) {
          console.log(`Found owner by direct ID:`, owner);
          return owner.name || owner.owner_name;
        }
      }
      
      // Try buyers from deal
      if (deal?.buyers) {
        const buyer = deal.buyers.find(buy => buy.id === numericId);
        if (buyer) {
          console.log(`Found buyer by direct ID:`, buyer);
          return buyer.name;
        }
      }
    }
    
    console.log(`No match found, returning original value: ${value}`);
    return value;
  }, [investors, owners, deal]);

  // Enhanced filtering and sorting logic for deal-specific payments
  const getFilteredAndSortedPayments = React.useMemo(() => {
    if (!payments || payments.length === 0) return [];
    
    let filtered = payments.filter(payment => {
      // Enhanced search including resolved names and bank information
      const matchesSearch = !searchTerm || [
        // Basic payment fields
        payment.description,
        payment.reference,
        payment.transaction_id,
        payment.notes,
        payment.category,
        // Raw payment party fields
        payment.paid_to,
        payment.paid_by,
        // Resolved display names
        getPaymentDisplayName(payment, 'paid_to'),
        getPaymentDisplayName(payment, 'paid_by'),
        // Bank information
        payment.payer_bank_name,
        payment.payer_bank_account_no,
        payment.receiver_bank_name,
        payment.receiver_bank_account_no,
        // Payment mode and type
        payment.payment_mode,
        payment.payment_type,
        // Amount as string
        payment.amount?.toString()
      ].some(field => 
        field && field.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Enhanced status filtering with overdue detection
      let matchesStatus = filterStatus === 'all';
      if (filterStatus === 'overdue') {
        const isOverdue = payment.status === 'pending' && 
          payment.due_date && 
          new Date(payment.due_date) < new Date();
        matchesStatus = isOverdue;
      } else {
        matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
      }
      
      const matchesType = filterType === 'all' || payment.payment_type === filterType;
      
      // Date filtering
      let matchesDate = dateFilter === 'all';
      if (dateFilter !== 'all' && payment.payment_date) {
        const paymentDate = new Date(payment.payment_date);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = paymentDate.toDateString() === now.toDateString();
            break;
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = paymentDate >= weekAgo;
            break;
          case 'this_month':
            matchesDate = paymentDate.getMonth() === now.getMonth() && 
                         paymentDate.getFullYear() === now.getFullYear();
            break;
          case 'this_year':
            matchesDate = paymentDate.getFullYear() === now.getFullYear();
            break;
        }
      }
      
      // Investor filtering
      let matchesInvestor = filterInvestor === 'all';
      if (filterInvestor !== 'all') {
        // Check if payment involves the selected investor as payer or receiver
        const paidBy = payment.paid_by || '';
        const paidTo = payment.paid_to || '';
        const paidByName = getPaymentDisplayName(payment, 'paid_by');
        const paidToName = getPaymentDisplayName(payment, 'paid_to');
        
        // Find the investor by ID
        const selectedInvestor = investors?.find(inv => inv.id?.toString() === filterInvestor);
        const investorName = selectedInvestor?.investor_name || selectedInvestor?.name || '';
        
        // Check if payment involves this investor
        matchesInvestor = 
          paidBy.includes(`investor_${filterInvestor}`) || 
          paidTo.includes(`investor_${filterInvestor}`) ||
          (investorName && (paidByName.includes(investorName) || paidToName.includes(investorName)));
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate && matchesInvestor;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount_asc':
          return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
        case 'amount_desc':
          return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
        case 'date_asc':
          return new Date(a.payment_date || 0) - new Date(b.payment_date || 0);
        case 'date_desc':
          return new Date(b.payment_date || 0) - new Date(a.payment_date || 0);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return new Date(b.payment_date || 0) - new Date(a.payment_date || 0);
      }
    });

    return filtered;
  }, [payments, searchTerm, filterStatus, filterType, dateFilter, sortBy, filterInvestor, getPaymentDisplayName, investors]);

  const sortedPayments = getFilteredAndSortedPayments;

  // Chart data preparation function (after sortedPayments is defined)
  const prepareChartData = React.useMemo(() => {
    try {
      setChartError(null);
      
      // Use the existing sortedPayments variable
      const paymentsToAnalyze = sortedPayments || [];
      
      if (paymentsToAnalyze.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{
            data: [1],
            backgroundColor: ['#E5E7EB'],
            borderColor: ['#9CA3AF'],
            borderWidth: 1
          }]
        };
      }

      // Calculate status breakdown from filtered payments
      const statusBreakdown = paymentsToAnalyze.reduce((acc, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        let status = payment.status || 'pending';
        
        // Check for overdue status
        if (status === 'pending' && payment.due_date && new Date(payment.due_date) < new Date()) {
          status = 'overdue';
        }
        
        if (!acc[status]) {
          acc[status] = { count: 0, amount: 0 };
        }
        acc[status].count += 1;
        acc[status].amount += amount;
        
        return acc;
      }, {});

      // Prepare chart data with colors
      const statusColors = {
        completed: '#10B981', // green
        pending: '#F59E0B',   // yellow
        overdue: '#EF4444',   // red
        cancelled: '#6B7280', // gray
        failed: '#DC2626'     // dark red
      };

      const labels = Object.keys(statusBreakdown);
      const data = labels.map(status => statusBreakdown[status].amount);
      const backgroundColor = labels.map(status => statusColors[status] || '#9CA3AF');
      const borderColor = labels.map(status => statusColors[status] || '#6B7280');

      if (labels.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{
            data: [1],
            backgroundColor: ['#E5E7EB'],
            borderColor: ['#9CA3AF'],
            borderWidth: 1
          }]
        };
      }

      return {
        labels: labels.map(status => {
          const statusData = statusBreakdown[status];
          return `${status.charAt(0).toUpperCase() + status.slice(1)}: ${statusData.count} (₹${(statusData.amount || 0).toLocaleString('en-IN')})`;
        }),
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2,
          hoverBorderWidth: 3
        }]
      };
    } catch (error) {
      console.error('Error preparing chart data:', error);
      setChartError('Failed to prepare chart data');
      return {
        labels: ['Error'],
        datasets: [{
          data: [1],
          backgroundColor: ['#EF4444'],
          borderColor: ['#DC2626'],
          borderWidth: 1
        }]
      };
    }
  }, [sortedPayments]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Payment Status Breakdown',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: 20
      },
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${percentage}%`;
          }
        }
      }
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!hasPermission(user, PERMISSIONS.PAYMENTS_DELETE)) {
      toast.error('You do not have permission to delete payments');
      return;
    }

    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      await paymentsAPI.delete(dealId, paymentId);
      toast.success('Payment deleted successfully');
      onPaymentUpdate();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleCompletePayment = async (paymentId) => {
    if (!hasPermission(user, PERMISSIONS.PAYMENTS_EDIT)) {
      toast.error('You do not have permission to update payments');
      return;
    }

    if (!confirm('Are you sure you want to mark this payment as completed?')) {
      return;
    }

    try {
      await paymentsAPI.update(dealId, paymentId, { status: 'completed' });
      toast.success('Payment marked as completed');
      onPaymentUpdate();
    } catch (error) {
      console.error('Failed to complete payment:', error);
      toast.error('Failed to complete payment');
    }
  };

  const handleCancelPayment = async (paymentId) => {
    if (!hasPermission(user, PERMISSIONS.PAYMENTS_EDIT)) {
      toast.error('You do not have permission to update payments');
      return;
    }

    if (!confirm('Are you sure you want to cancel this payment?')) {
      return;
    }

    try {
      await paymentsAPI.update(dealId, paymentId, { status: 'cancelled' });
      toast.success('Payment cancelled successfully');
      onPaymentUpdate();
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      toast.error('Failed to cancel payment');
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getEnhancedStatusBadge = (payment) => {
    let status = payment.status || 'pending';
    let colorClass = 'bg-gray-100 text-gray-800';
    
    // Check if payment is overdue
    if (status === 'pending' && payment.due_date && new Date(payment.due_date) < new Date()) {
      status = 'overdue';
      colorClass = 'bg-red-100 text-red-800';
    } else {
      const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'failed': 'bg-red-100 text-red-800'
      };
      colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {status === 'overdue' && (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Helper function to get display name for payment type
  const getPaymentTypeDisplayName = (type) => {
    const typeLabels = {
      'land_purchase': 'Land Purchase',
      'investment_sale': 'Investment Sale',
      'documentation_legal': 'Documentation',
      'maintenance_taxes': 'Maintenance',
      'other': 'Other'
    };
    
    return typeLabels[type] || type?.charAt(0).toUpperCase() + type?.slice(1) || 'Unknown';
  };

  const getPaymentTypeBadge = (type) => {
    const typeColors = {
      'land_purchase': 'bg-blue-100 text-blue-800',
      'investment_sale': 'bg-purple-100 text-purple-800',
      'documentation_legal': 'bg-orange-100 text-orange-800',
      'maintenance_taxes': 'bg-gray-100 text-gray-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {getPaymentTypeDisplayName(type)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded border border-slate-200">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading payments...</h3>
          <p className="text-slate-600">Please wait while we fetch payment data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-600 mt-1">Manage deal payments and transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded">
            Total: {sortedPayments.length}
          </span>
          {hasPermission(user, PERMISSIONS.PAYMENTS_CREATE) && (
            <button
              onClick={() => router.push(`/payments/${dealId}/new`)}
              className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm font-medium"
            >
              + Add Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Amount</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(paymentStats.totalAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">All transactions</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completed</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(paymentStats.completedAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">{paymentStats.completed} payments</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(paymentStats.pendingAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">{paymentStats.pending} payments</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overdue</p>
              <p className="text-3xl font-bold text-slate-700 mt-2">{paymentStats.overdue}</p>
              <p className="text-xs text-slate-500 mt-1">Needs attention</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, description, bank info, amount, mode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white"
              >
                <option value="all">All Types</option>
                <option value="land_purchase">Land Purchase</option>
                <option value="investment_sale">Investment Sale</option>
                <option value="documentation_legal">Documentation/Legal</option>
                <option value="maintenance_taxes">Maintenance/Taxes</option>
                <option value="other">Other</option>
                <option value="advance">Advance</option>
                <option value="partial">Partial</option>
                <option value="final">Final</option>
                <option value="registration">Registration</option>
              </select>
            </div>

            {/* Investor Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Investor</label>
              <select
                value={filterInvestor}
                onChange={(e) => setFilterInvestor(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white"
              >
                <option value="all">All Investors</option>
                {investors && investors.length > 0 ? (
                  investors.map((investor) => (
                    <option key={investor.id} value={investor.id}>
                      {investor.investor_name || investor.name || `Investor ${investor.id}`}
                    </option>
                  ))
                ) : (
                  <option value="none" disabled>No investors found</option>
                )}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
            </div>
          </div>

          {/* Sort and Results Info */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-slate-200">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-slate-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-2 px-3 border-2 border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white"
              >
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amount_desc">Amount (High to Low)</option>
                <option value="amount_asc">Amount (Low to High)</option>
                <option value="status">Status</option>
              </select>
              
              <button
                onClick={handlePrintPayments}
                className="inline-flex items-center px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                title="Print Payments Table"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                title="Download Professional PDF Report"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
              
              <button
                onClick={() => setCurrentView('table')}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  currentView === 'table'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500'
                }`}
                title="Show Payments Table"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </button>
              
              <button
                onClick={() => {
                  setCurrentView('chart');
                  setChartError(null);
                }}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  currentView === 'chart'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500'
                }`}
                title="Show Status Chart"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Chart
              </button>
              
              <button
                onClick={() => setCurrentView('profitloss')}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  currentView === 'profitloss'
                    ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                }`}
                title="Show Profit & Loss Analysis"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Profit & Loss
              </button>
            </div>
            
            <div className="text-sm text-slate-600">
              Showing {sortedPayments.length} of {payments.length} payments
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Table/Chart/Profit&Loss Toggle */}
      {currentView === 'chart' ? (
        /* Chart View */
        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm">
          <div className="p-8">
            {chartError ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Chart Error</h3>
                <p className="text-slate-600 mb-4">{chartError}</p>
                <button
                  onClick={() => setCurrentView('table')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
                >
                  View Table
                </button>
              </div>
            ) : (
              <div>
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Payment Status Analysis</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Visual breakdown of payment statuses based on current filters
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    Based on {sortedPayments.length} payment{sortedPayments.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Chart Filters */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                      <label className="text-sm font-medium text-slate-700">Filter by Investor:</label>
                    </div>
                    
                    <select
                      value={filterInvestor}
                      onChange={(e) => setFilterInvestor(e.target.value)}
                      className="py-2 px-3 border-2 border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors bg-white min-w-[200px]"
                    >
                      <option value="all">All Investors</option>
                      {investors && investors.length > 0 ? (
                        investors.map((investor) => (
                          <option key={investor.id} value={investor.id}>
                            {investor.investor_name || investor.name || `Investor ${investor.id}`}
                          </option>
                        ))
                      ) : (
                        <option value="none" disabled>No investors found</option>
                      )}
                    </select>

                    {filterInvestor !== 'all' && (
                      <button
                        onClick={() => setFilterInvestor('all')}
                        className="inline-flex items-center px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Clear investor filter"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}

                    <div className="flex-1"></div>
                    
                    <div className="text-xs text-slate-500">
                      {filterInvestor !== 'all' ? (
                        `Showing payments for: ${investors?.find(inv => inv.id?.toString() === filterInvestor)?.investor_name || investors?.find(inv => inv.id?.toString() === filterInvestor)?.name || 'Selected Investor'}`
                      ) : (
                        'Showing all investor payments'
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="relative" style={{ height: '400px' }}>
                  {prepareChartData.labels.length === 1 && prepareChartData.labels[0] === 'No Data' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        <h4 className="text-lg font-medium text-slate-900 mb-2">No Chart Data</h4>
                        <p className="text-slate-600 mb-4">No payments match the current filters</p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setFilterType('all');
                            setDateFilter('all');
                            setFilterInvestor('all');
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Pie data={prepareChartData} options={chartOptions} />
                  )}
                </div>

                {/* Chart Summary Stats */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {prepareChartData.datasets[0].data.map((value, index) => {
                    if (prepareChartData.labels[index] === 'No Data' || prepareChartData.labels[index] === 'Error') return null;
                    
                    const label = prepareChartData.labels[index];
                    const statusName = label.split(':')[0];
                    const color = prepareChartData.datasets[0].backgroundColor[index];
                    const total = prepareChartData.datasets[0].data.reduce((sum, val) => sum + val, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    
                    return (
                      <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{statusName}</p>
                            <p className="text-xs text-slate-500">{percentage}% of total</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-lg font-semibold text-slate-900">
                            ₹{value.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Chart Features */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => {
                          // Export chart data to CSV
                          const csvData = prepareChartData.labels.map((label, index) => ({
                            Status: label.split(':')[0],
                            Amount: prepareChartData.datasets[0].data[index],
                            Details: label
                          }));
                          
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + "Status,Amount,Details\n"
                            + csvData.map(row => `${row.Status},${row.Amount},"${row.Details}"`).join("\n");
                          
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `payment-status-breakdown-${new Date().toISOString().split('T')[0]}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                      </button>
                      
                      <span className="text-sm text-slate-500">
                        Chart updates automatically with filter changes
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentView('table')}
                      className="inline-flex items-center px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      View Table
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : currentView === 'profitloss' ? (
        /* Real-time Profit & Loss Analysis */
        <ProfitLossSection 
          deal={deal}
          payments={payments}
          investors={investors}
        />
      ) : (
        /* Table View */
        sortedPayments.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm">
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No payments found</h3>
              <p className="text-slate-600 mb-6">Payments will appear here once added</p>
              {hasPermission(user, PERMISSIONS.PAYMENTS_CREATE) && (
                <button
                  onClick={() => router.push(`/payments/${dealId}/new`)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
                >
                  Add First Payment
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receiver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedPayments.map((payment) => {
                    // Debug log for payment structure
                    console.log('Payment data structure:', {
                      id: payment.id,
                      paid_to: payment.paid_to,
                      paid_by: payment.paid_by,
                      paid_to_name: payment.paid_to_name,
                      paid_by_name: payment.paid_by_name,
                      paid_to_id: payment.paid_to_id,
                      paid_by_id: payment.paid_by_id
                    });
                    
                    return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{getPaymentDisplayName(payment, 'paid_to')}</div>
                        {(payment.receiver_bank_name || payment.receiver_bank_account_no) && (
                          <div className="text-xs text-slate-500 mt-1">
                            {payment.receiver_bank_name && <div>Bank: {payment.receiver_bank_name}</div>}
                            {payment.receiver_bank_account_no && <div>A/c: {payment.receiver_bank_account_no}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{getPaymentDisplayName(payment, 'paid_by')}</div>
                        {(payment.payer_bank_name || payment.payer_bank_account_no) && (
                          <div className="text-xs text-slate-500 mt-1">
                            {payment.payer_bank_name && <div>Bank: {payment.payer_bank_name}</div>}
                            {payment.payer_bank_account_no && <div>A/c: {payment.payer_bank_account_no}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{payment.payment_mode || payment.payment_method || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{payment.reference || payment.transaction_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">{getPaymentTypeBadge(payment.payment_type)}</td>
                      <td className="px-6 py-4">{getEnhancedStatusBadge(payment)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{formatDate(payment.payment_date)}</div>
                        {payment.due_date && (
                          <div className="text-xs text-slate-500">Due: {formatDate(payment.due_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-semibold text-slate-900">{formatAmount(payment.amount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {/* Status Change Buttons */}
                          {payment.status !== 'completed' && payment.status !== 'cancelled' && hasPermission(user, PERMISSIONS.PAYMENTS_EDIT) ? (
                            <button
                              onClick={() => handleCompletePayment(payment.id)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Mark as Completed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          ) : (
                            <div className="p-2 w-8 h-8"></div>
                          )}
                          
                          {payment.status !== 'cancelled' && payment.status !== 'completed' && hasPermission(user, PERMISSIONS.PAYMENTS_EDIT) ? (
                            <button
                              onClick={() => handleCancelPayment(payment.id)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Cancel Payment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : (
                            <div className="p-2 w-8 h-8"></div>
                          )}
                          
                          {/* Existing Action Buttons */}
                          <button
                            onClick={() => router.push(`/payments/${dealId}/${payment.id}`)}
                            className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
                            title="View Payment"
                          >
                            View
                          </button>
                          {hasPermission(user, PERMISSIONS.PAYMENTS_EDIT) && (
                            <button
                              onClick={() => router.push(`/payments/${dealId}/${payment.id}/edit`)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                              title="Edit Payment"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission(user, PERMISSIONS.PAYMENTS_DELETE) && (
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                              title="Delete Payment"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  
                  {sortedPayments.length > 0 && (
                    <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                      <td className="px-6 py-4 text-center">
                        <div className="font-medium text-slate-900">TOTAL</div>
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-medium text-slate-900"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 text-lg font-bold">
                          {formatAmount(sortedPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0))}
                        </div>
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Selling Section Component
function SellingSection({ deal, soldPrice = '', onSellingAmountChange, sellingAmountLoading = false, onUpdate }) {
  const [isEditingSoldPrice, setIsEditingSoldPrice] = useState(false);
  const [localSoldPrice, setLocalSoldPrice] = useState(soldPrice);
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    mobile: '',
    aadhar_card: '',
    pan_card: ''
  });
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyers, setBuyers] = useState(deal?.buyers || []);

  useEffect(() => {
    setLocalSoldPrice(soldPrice);
  }, [soldPrice]);

  useEffect(() => {
    setBuyers(deal?.buyers || []);
  }, [deal?.buyers]);

  const handleSaveSoldPrice = async () => {
    if (localSoldPrice && isNaN(Number(localSoldPrice))) {
      toast.error('Please enter a valid number');
      return;
    }

    if (localSoldPrice && Number(localSoldPrice) < 0) {
      toast.error('Sold price cannot be negative');
      return;
    }

    try {
      await onSellingAmountChange(undefined, localSoldPrice || null);
      setIsEditingSoldPrice(false);
      
      // Don't call onUpdate() - the parent updateSellingAmount function already
      // updates both setSoldPrice() and deal state correctly. Calling onUpdate()
      // creates a race condition with server data fetch.
    } catch {
      // Reset local state on error
      setLocalSoldPrice(soldPrice);
      // Error handling is done in the parent component
    }
  };

  const handleCancelSoldPrice = () => {
    setLocalSoldPrice(soldPrice);
    setIsEditingSoldPrice(false);
  };

  const handleBuyerFormChange = (e) => {
    const { name, value } = e.target;
    setBuyerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBuyer = async () => {
    if (!buyerForm.name.trim()) {
      toast.error('Buyer name is required');
      return;
    }

    setBuyerLoading(true);
    try {
      await dealAPI.addBuyer(deal.id, buyerForm);
      toast.success('Buyer added successfully!');
      
      // Reset form
      setBuyerForm({
        name: '',
        mobile: '',
        aadhar_card: '',
        pan_card: ''
      });
      setShowAddBuyer(false);
      
      // Refresh deal data to show new buyer
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding buyer:', error);
      toast.error(error.response?.data?.error || 'Failed to add buyer');
    } finally {
      setBuyerLoading(false);
    }
  };

  const handleDeleteBuyer = async (buyerId) => {
    if (!window.confirm('Are you sure you want to delete this buyer?')) {
      return;
    }

    try {
      await dealAPI.deleteBuyer(deal.id, buyerId);
      toast.success('Buyer deleted successfully!');
      
      // Update local buyers state
      setBuyers(prevBuyers => prevBuyers.filter((buyer, index) => 
        buyer.id ? buyer.id !== buyerId : index !== buyerId
      ));
      
      // Refresh deal data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting buyer:', error);
      toast.error(error.response?.data?.error || 'Failed to delete buyer');
    }
  };

  const handleCancelAddBuyer = () => {
    setBuyerForm({
      name: '',
      mobile: '',
      aadhar_card: '',
      pan_card: ''
    });
    setShowAddBuyer(false);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Sold Price Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-black">Selling Amount</h2>
            <p className="text-sm text-gray-600 mt-1">Manage sold price</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {!isEditingSoldPrice ? (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Sold Price</div>
                  <div className="text-lg font-semibold text-black">
                    {soldPrice ? formatAmount(Number(soldPrice)) : 'Not set'}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingSoldPrice(true)}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
                  disabled={sellingAmountLoading}
                >
                  {soldPrice ? 'Edit' : 'Set Sold Price'}
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center space-x-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">Sold Price</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={localSoldPrice}
                      onChange={(e) => setLocalSoldPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Enter sold price"
                      style={{ appearance: 'textfield' }}
                      min="0"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveSoldPrice}
                    disabled={sellingAmountLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                  >
                    {sellingAmountLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelSoldPrice}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    disabled={sellingAmountLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buyer Information Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-black">Buyer Information</h2>
            <p className="text-sm text-gray-600 mt-1">Manage buyers for this deal</p>
          </div>
          {!showAddBuyer && (
            <button
              onClick={() => setShowAddBuyer(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              + Add Buyer
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Existing Buyers */}
          {buyers && buyers.length > 0 && (
            <div className="space-y-3 mb-4">
              {buyers.map((buyer, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {(buyer.name || 'B').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black">{buyer.name}</div>
                      <div className="text-xs text-gray-500 space-x-4">
                        {buyer.mobile && <span>Mobile: {buyer.mobile}</span>}
                        {buyer.aadhar_card && <span>Aadhaar: {buyer.aadhar_card}</span>}
                        {buyer.pan_card && <span>PAN: {buyer.pan_card}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBuyer(buyer.id || index)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Delete Buyer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No buyers message */}
          {(!buyers || buyers.length === 0) && !showAddBuyer && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-gray-500 text-sm">No buyers added yet</div>
            </div>
          )}

          {/* Add Buyer Form - Integrated in the same tile */}
          {showAddBuyer && (
            <div className={`${buyers && buyers.length > 0 ? 'border-t border-gray-200 pt-4' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">Add New Buyer</h4>
                <button
                  onClick={handleCancelAddBuyer}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Buyer Form - Same minimal UI as investors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={buyerForm.name}
                    onChange={handleBuyerFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter buyer name"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={buyerForm.mobile}
                    onChange={handleBuyerFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Card</label>
                  <input
                    type="text"
                    name="aadhar_card"
                    value={buyerForm.aadhar_card}
                    onChange={handleBuyerFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="XXXX XXXX XXXX"
                    pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                    maxLength="14"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">PAN Card</label>
                  <input
                    type="text"
                    name="pan_card"
                    value={buyerForm.pan_card}
                    onChange={handleBuyerFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABCDE1234F"
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    maxLength="10"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelAddBuyer}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                  disabled={buyerLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBuyer}
                  disabled={buyerLoading || !buyerForm.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {buyerLoading ? 'Adding...' : 'Add Buyer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Profit & Loss Analysis Section Component
function ProfitLossSection({ deal, payments, investors }) {
  const formatAmount = (amount) => {
    if (!amount || amount === 0) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  // Basic data from deal
  const landPurchaseAmount = parseFloat(deal?.purchase_amount || 0);
  const sellingPrice = deal?.sold_price ? parseFloat(deal.sold_price) : 0;

  // Calculate completed land purchase payments for an investor
  const calculateLandPurchasePayments = (investor) => {
    if (!payments || !investor) return { amount: 0, count: 0 };
    
    const investorId = investor.id?.toString();
    const investorName = investor.investor_name || investor.name;
    
    console.log(`\n=== Debug: Calculating LAND PURCHASE for investor: ${investorName} (ID: ${investorId}) ===`);
    
    // Filter for completed land_purchase payments only
    const landPurchasePayments = payments.filter(payment => {
      const isCompleted = payment.status === 'completed';
      const isLandPurchase = payment.payment_type === 'land_purchase';
      
      if (!isCompleted || !isLandPurchase) {
        return false;
      }
      
      // Match by investor ID
      if (payment.paid_by_id?.toString() === investorId) {
        console.log(`✅ Payment ${payment.id} matched by paid_by_id: ${payment.paid_by_id} === ${investorId}`);
        return true;
      }
      
      // Match by legacy paid_by field (direct ID)
      if (payment.paid_by?.toString() === investorId) {
        console.log(`✅ Payment ${payment.id} matched by paid_by: ${payment.paid_by} === ${investorId}`);
        return true;
      }
      
      // Match by legacy paid_by field (investor_ID format)
      if (payment.paid_by && typeof payment.paid_by === 'string' && payment.paid_by.includes('_')) {
        const [type, id] = payment.paid_by.split('_');
        if (type === 'investor' && id === investorId) {
          console.log(`✅ Payment ${payment.id} matched by parsed paid_by: "${payment.paid_by}" -> investor ID ${id} === ${investorId}`);
          return true;
        }
      }
      
      // Match by investor name
      if (payment.paid_by_name === investorName) {
        console.log(`✅ Payment ${payment.id} matched by paid_by_name: ${payment.paid_by_name} === ${investorName}`);
        return true;
      }
      
      return false;
    });

    const totalAmount = landPurchasePayments.reduce((sum, payment) => {
      console.log(`Adding land purchase payment ${payment.id}: ₹${payment.amount}`);
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
    
    console.log(`Final land purchase result for ${investorName}: ₹${totalAmount} from ${landPurchasePayments.length} payments`);
    return { amount: totalAmount, count: landPurchasePayments.length };
  };

  // Calculate completed miscellaneous payments for an investor
  const calculateMiscellaneousPayments = (investor) => {
    if (!payments || !investor) return { amount: 0, count: 0 };
    
    const investorId = investor.id?.toString();
    const investorName = investor.investor_name || investor.name;
    
    console.log(`\n=== Debug: Calculating MISCELLANEOUS for investor: ${investorName} (ID: ${investorId}) ===`);
    
    // Filter for completed non-land_purchase payments only
    const miscellaneousPayments = payments.filter(payment => {
      const isCompleted = payment.status === 'completed';
      const isMiscellaneous = payment.payment_type !== 'land_purchase';
      
      if (!isCompleted || !isMiscellaneous) {
        return false;
      }
      
      // Use same matching logic as land purchase
      if (payment.paid_by_id?.toString() === investorId) {
        console.log(`✅ Misc payment ${payment.id} matched by paid_by_id: ${payment.paid_by_id} === ${investorId}`);
        return true;
      }
      
      if (payment.paid_by?.toString() === investorId) {
        console.log(`✅ Misc payment ${payment.id} matched by paid_by: ${payment.paid_by} === ${investorId}`);
        return true;
      }
      
      if (payment.paid_by && typeof payment.paid_by === 'string' && payment.paid_by.includes('_')) {
        const [type, id] = payment.paid_by.split('_');
        if (type === 'investor' && id === investorId) {
          console.log(`✅ Misc payment ${payment.id} matched by parsed paid_by: "${payment.paid_by}" -> investor ID ${id} === ${investorId}`);
          return true;
        }
      }
      
      if (payment.paid_by_name === investorName) {
        console.log(`✅ Misc payment ${payment.id} matched by paid_by_name: ${payment.paid_by_name} === ${investorName}`);
        return true;
      }
      
      return false;
    });

    const totalAmount = miscellaneousPayments.reduce((sum, payment) => {
      console.log(`Adding miscellaneous payment ${payment.id}: ₹${payment.amount} (type: ${payment.payment_type})`);
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
    
    console.log(`Final miscellaneous result for ${investorName}: ₹${totalAmount} from ${miscellaneousPayments.length} payments`);
    return { amount: totalAmount, count: miscellaneousPayments.length };
  };

  // Calculate total miscellaneous expenses for all completed payments
  const calculateTotalMiscellaneous = () => {
    if (!payments) return 0;
    
    return payments
      .filter(payment => 
        payment.status === 'completed' && 
        payment.payment_type !== 'land_purchase'
      )
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  };

  // Calculate investor data with corrected logic
  const totalMiscellaneous = calculateTotalMiscellaneous();
  
  // Step 1: Subtract total miscellaneous from sale value first
  const saleAfterMiscellaneous = sellingPrice - totalMiscellaneous;
  
  // Step 2: Calculate remaining amount to be distributed according to shares
  const remainingForDistribution = saleAfterMiscellaneous;
  
  console.log('\n=== Overall Deal Calculation ===');
  console.log(`- Purchase Price: ₹${landPurchaseAmount}`);
  console.log(`- Selling Price: ₹${sellingPrice}`);
  console.log(`- Total Miscellaneous (paperwork): ₹${totalMiscellaneous}`);
  console.log(`- Sale after miscellaneous: ₹${sellingPrice} - ₹${totalMiscellaneous} = ₹${saleAfterMiscellaneous}`);
  console.log(`- Remaining for distribution: ₹${remainingForDistribution}`);
  
  const investorData = investors && investors.length > 0 ? investors.map(investor => {
    console.log('\n=== Investor Data Debug ===');
    console.log('Investor:', investor);
    console.log('Payments available:', payments ? payments.length : 0);
    
    const landPurchaseData = calculateLandPurchasePayments(investor);
    const miscellaneousData = calculateMiscellaneousPayments(investor);
    const sharePercentage = parseFloat(investor.percentage_share || investor.investment_percentage || investor.share_percentage || 0);
    
    // Step 3: Calculate investor's share from remaining amount
    const shareFromRemaining = (remainingForDistribution * sharePercentage) / 100;
    
    // Step 4: Final return = miscellaneous refund + share from remaining
    const finalReturn = miscellaneousData.amount + shareFromRemaining;
    
    // Step 5: Profit or Loss = final return - investor investment
    const profitOrLoss = finalReturn - landPurchaseData.amount;
    
    console.log(`Investor ${investor.investor_name || investor.name}:`);
    console.log(`- Land investment: ₹${landPurchaseData.amount}`);
    console.log(`- Miscellaneous (paperwork): ₹${miscellaneousData.amount}`);
    console.log(`- Share percentage: ${sharePercentage}%`);
    console.log(`- Share from remaining: ₹${remainingForDistribution} × ${sharePercentage}% = ₹${shareFromRemaining}`);
    console.log(`- Final return: ₹${miscellaneousData.amount} + ₹${shareFromRemaining} = ₹${finalReturn}`);
    console.log(`- Profit/Loss: ₹${finalReturn} - ₹${landPurchaseData.amount} = ₹${profitOrLoss}`);
    
    // Determine status
    let status = 'BREAK EVEN';
    if (profitOrLoss > 0) {
      status = 'PROFIT';
      console.log(`- Status: ${status} of ₹${profitOrLoss}`);
    } else if (profitOrLoss < 0) {
      status = 'LOSS';
      console.log(`- Status: ${status} of ₹${Math.abs(profitOrLoss)}`);
    } else {
      console.log(`- Status: ${status}`);
    }
    
    return {
      id: investor.id,
      name: investor.investor_name || investor.name || `Investor ${investor.id}`,
      contribution: landPurchaseData.amount,
      miscellaneous: miscellaneousData.amount,
      totalInvestment: landPurchaseData.amount,
      sharePercentage: sharePercentage,
      shareFromRemaining: shareFromRemaining,
      totalReturn: finalReturn,
      individualProfitLoss: profitOrLoss,
      status: status,
      paymentCount: landPurchaseData.count,
      miscellaneousCount: miscellaneousData.count,
      hasInvestment: landPurchaseData.amount > 0 || sharePercentage > 0 || miscellaneousData.amount > 0
    };
  }).filter(investor => investor.hasInvestment) : [];

  // Calculate total profit/loss from all investors plus miscellaneous considerations
  const investorTotalProfitLoss = investorData.reduce((sum, investor) => sum + investor.individualProfitLoss, 0);
  // Calculate overall deal profit/loss including miscellaneous
  const totalProfitLoss = sellingPrice - (landPurchaseAmount + totalMiscellaneous);
  
  console.log('\n=== Total P&L Calculation ===');
  console.log('Individual investor P&L values:');
  investorData.forEach(investor => {
    console.log(`- ${investor.name}: ₹${investor.individualProfitLoss}`);
  });
  console.log(`- Investor Total P&L: ₹${investorTotalProfitLoss}`);
  console.log(`- Total Miscellaneous: ₹${totalMiscellaneous}`);
  console.log(`- Overall Deal P&L: ₹${sellingPrice} - (₹${landPurchaseAmount} + ₹${totalMiscellaneous}) = ₹${totalProfitLoss}`);
  console.log(`- FINAL TOTAL P&L (including misc): ₹${totalProfitLoss}`);
  console.log('============================\n');
  
  // Calculate totals for display
  const totalInvestedAmount = investorData.reduce((sum, investor) => sum + investor.contribution, 0);
  const totalReturnAmount = investorData.reduce((sum, investor) => sum + investor.totalReturn, 0);
  
  // Calculate straightforward land profit/loss for the Land Purchase Amount row
  const landProfitLoss = sellingPrice - (landPurchaseAmount + totalMiscellaneous);
  
  console.log('\n=== Land Profit/Loss Calculation ===');
  console.log(`- Selling Price: ₹${sellingPrice}`);
  console.log(`- Land Purchase: ₹${landPurchaseAmount}`);
  console.log(`- Total Miscellaneous: ₹${totalMiscellaneous}`);
  console.log(`- Total Cost: ₹${landPurchaseAmount + totalMiscellaneous}`);
  console.log(`- Land Profit/Loss: ₹${sellingPrice} - ₹${landPurchaseAmount + totalMiscellaneous} = ₹${landProfitLoss}`);
  console.log(`- Status: ${landProfitLoss >= 0 ? 'PROFIT' : 'LOSS'} of ₹${Math.abs(landProfitLoss)}`);
  console.log('=====================================\n');
  
  // Print function for P&L Analysis
  const printPLAnalysis = () => {
    const printWindow = window.open('', '_blank');
    
    let tableRows = '';
    
    // Add Land Purchase Amount row
    tableRows += `
      <tr>
        <td>Land Purchase Amount</td>
        <td style="text-align: right;">₹${landPurchaseAmount.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${totalMiscellaneous.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${sellingPrice.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">${landProfitLoss >= 0 ? '+' : '-'}₹${Math.abs(landProfitLoss).toLocaleString('en-IN')}</td>
      </tr>`;
    
    // Add individual investor rows
    investorData.forEach(investor => {
      tableRows += `
        <tr>
          <td>${investor.name}</td>
          <td style="text-align: right;">₹${investor.contribution.toLocaleString('en-IN')}</td>
          <td style="text-align: right;">₹${investor.miscellaneous.toLocaleString('en-IN')}</td>
          <td style="text-align: right;">₹${investor.totalReturn.toLocaleString('en-IN')}</td>
          <td style="text-align: right;">${investor.individualProfitLoss >= 0 ? '+' : '-'}₹${Math.abs(investor.individualProfitLoss).toLocaleString('en-IN')}</td>
        </tr>`;
    });
    
    // Add total row
    tableRows += `
      <tr style="font-weight: bold; border-top: 2px solid #000;">
        <td>TOTAL</td>
        <td style="text-align: right;">₹${totalInvestedAmount.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${totalMiscellaneous.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${totalReturnAmount.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">${totalProfitLoss >= 0 ? '+' : '-'}₹${Math.abs(totalProfitLoss).toLocaleString('en-IN')}</td>
      </tr>`;
    
    const printContent = `
      <html>
        <head>
          <title>Profit & Loss Analysis - Deal ${deal?.id || id || 'Unknown'}</title>
          <style>
            body { font-family: 'Courier New', monospace; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 8px 12px; border: 1px solid #000; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .deal-info { margin-bottom: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Profit & Loss Analysis</h1>
          <div class="deal-info">
            <strong>Deal ID:</strong> ${deal?.id || id || 'N/A'}<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Land Purchase</th>
                <th>Miscellaneous</th>
                <th>Total Return</th>
                <th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>`;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Profit & Loss Analysis</h2>
              <p className="text-sm text-slate-600 mt-1">Complete financial breakdown for this deal</p>
            </div>
            <button
              onClick={printPLAnalysis}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Analysis</span>
            </button>
          </div>
        </div>

        {/* P&L Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Land Purchase</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Miscellaneous</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Selling Price / Share</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Profit/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Land Purchase Amount Row - Separated Section */}
              <tr className="bg-blue-25 hover:bg-blue-50 border-b-4 border-slate-300">
                <td className="px-6 py-4">
                  <div className="font-bold text-blue-900 text-lg">Land Purchase Amount</div>
                  <div className="text-sm text-slate-600">Purchase amount from buying section</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-lg font-semibold text-blue-800">
                    {formatAmount(landPurchaseAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-lg font-semibold text-orange-700">
                    {formatAmount(totalMiscellaneous)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-lg font-semibold text-green-700">
                    {formatAmount(sellingPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`text-lg font-bold ${
                    landProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {landProfitLoss >= 0 ? '+' : ''}{formatAmount(Math.abs(landProfitLoss))}
                  </div>
                </td>
              </tr>

              {/* Spacing Row for Visual Separation */}
              <tr className="bg-slate-100">
                <td className="px-6 py-2">
                  <div className="text-sm font-medium text-slate-600">
                    Individual Investor Breakdown
                  </div>
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="text-sm font-medium text-slate-600">
                    Invested Amount
                  </div>
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="text-sm font-medium text-slate-600">
                    Miscellaneous
                  </div>
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="text-sm font-medium text-slate-600">
                    Total Return
                  </div>
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="text-sm font-medium text-slate-600">
                    Profit/Loss
                  </div>
                </td>
              </tr>

              {/* Individual Investor Rows */}
              {investorData.length > 0 ? investorData.map((investor, index) => (
                <tr key={investor.id} className={index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-25 hover:bg-slate-50'}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{investor.name}</div>
                    <div className="text-sm text-slate-500">
                      {investor.sharePercentage.toFixed(2)}% share • {investor.paymentCount} completed land purchase payment(s)
                      {investor.contribution === 0 && investor.sharePercentage > 0 && (
                        <span className="text-orange-600"> • No payments yet</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-lg font-semibold ${
                      investor.contribution > 0 ? 'text-slate-800' : 'text-gray-400'
                    }`}>
                      {formatAmount(investor.contribution)}
                    </div>
                    {investor.contribution === 0 && investor.sharePercentage > 0 && (
                      <div className="text-xs text-gray-500 mt-1">No completed land purchase payments</div>
                    )}
                    {investor.paymentCount > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        From {investor.paymentCount} completed payment(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-lg font-semibold ${
                      investor.miscellaneous > 0 ? 'text-orange-700' : 'text-gray-400'
                    }`}>
                      {formatAmount(investor.miscellaneous)}
                    </div>
                    {investor.miscellaneousCount > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {investor.miscellaneousCount} misc payment(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-lg font-semibold ${
                      investor.totalReturn < investor.contribution ? 'text-red-600' : 'text-green-700'
                    }`}>
                      {formatAmount(investor.totalReturn)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Misc Refund: {formatAmount(investor.miscellaneous)} + Share: {formatAmount(investor.shareFromRemaining)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-lg font-bold ${
                      investor.individualProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {investor.individualProfitLoss >= 0 ? '+' : ''}{formatAmount(Math.abs(investor.individualProfitLoss))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Return: {formatAmount(investor.totalReturn)} - Land Investment: {formatAmount(investor.contribution)}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm">No investors with completed land purchase payments found</p>
                      <p className="text-xs text-gray-400 mt-1">Investors will appear here once they make completed land purchase payments</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 text-lg">TOTAL</div>
                  <div className="text-sm text-slate-600">Overall deal summary</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-xl font-bold text-slate-900">
                    {formatAmount(landPurchaseAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-xl font-bold text-orange-700">
                    {formatAmount(totalMiscellaneous)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`text-xl font-bold ${
                    totalReturnAmount < totalInvestedAmount ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatAmount(totalReturnAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`text-xl font-bold ${
                    totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalProfitLoss >= 0 ? '+' : ''}{formatAmount(Math.abs(totalProfitLoss))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Cards */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Land Purchase</div>
              <div className="text-xl font-bold text-blue-600">{formatAmount(landPurchaseAmount)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Miscellaneous</div>
              <div className="text-xl font-bold text-orange-600">{formatAmount(totalMiscellaneous)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Selling Price</div>
              <div className="text-xl font-bold text-green-600">{formatAmount(sellingPrice)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Net Profit/Loss</div>
              <div className={`text-xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(Math.abs(totalProfitLoss))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">ROI</div>
              <div className={`text-xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {landPurchaseAmount > 0 ? ((totalProfitLoss / landPurchaseAmount) * 100).toFixed(2) : '0.00'}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive CSS */}
      <style jsx>{`
        @media (max-width: 767px) {
          /* Navigation tabs - horizontal scrolling */
          .mobile-nav-tabs {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .mobile-nav-tabs::-webkit-scrollbar {
            display: none;
          }
          
          .mobile-nav-tabs button {
            flex-shrink: 0;
            white-space: nowrap;
            min-width: 100px;
          }
          
          /* Header responsive */
          .mobile-header-content {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          
          .mobile-button-group {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          /* Content padding adjustments */
          .mobile-content-padding {
            padding: 1rem 0.75rem;
          }
          
          /* Grid layouts to single column */
          .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3,
          .grid.md\\:grid-cols-2.lg\\:grid-cols-3,
          .grid.lg\\:grid-cols-3,
          .grid.md\\:grid-cols-2,
          .grid.grid-cols-3,
          .grid.grid-cols-2 {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          /* Flex layouts - stack on mobile */
          .flex.items-center.space-x-4 {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          
          .flex.items-center.space-x-3 {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          
          .flex.items-center.justify-between {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          
          .flex.space-x-2 {
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          
          /* Tables responsive */
          .overflow-x-auto {
            margin: 0 -0.75rem;
            padding: 0 0.75rem;
          }
          
          table {
            font-size: 12px;
            min-width: 600px;
          }
          
          th, td {
            padding: 0.375rem !important;
            font-size: 12px !important;
          }
          
          /* Owner/Investor cards mobile layout */
          .flex.items-center.gap-3 {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .min-w-\\[100px\\] {
            min-width: auto !important;
          }
          
          /* Typography scaling */
          .text-3xl {
            font-size: 1.5rem !important;
          }
          
          .text-xl {
            font-size: 1.25rem !important;
          }
          
          .text-lg {
            font-size: 1.125rem !important;
          }
          
          /* Forms and inputs */
          input, select, textarea {
            font-size: 16px !important;
          }
          
          /* Button improvements */
          button {
            min-height: 44px;
          }
          
          /* Spacing adjustments */
          .p-6 {
            padding: 1rem !important;
          }
          
          .px-6 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          
          .py-8 {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
          
          /* Section spacing */
          .space-y-6 > * + * {
            margin-top: 1rem !important;
          }
          
          .mb-6 {
            margin-bottom: 1rem !important;
          }
          
          /* Text wrapping */
          .text-sm,
          .text-xs,
          p,
          span {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        }
      `}</style>
    </div>
  );
}
