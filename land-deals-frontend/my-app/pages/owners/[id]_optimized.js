// Optimized Owner Detail Page - Fast Loading Version
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { dealAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function OwnerInfoPageOptimized() {
  const router = useRouter();
  const { id } = router.query; // owner ID
  const [user, setUser] = useState(null);
  const [owner, setOwner] = useState(null);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOwnerDataOptimized = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // OPTIMIZATION 1: Try direct owner lookup first (if backend supports it)
      try {
        const directOwnerResponse = await dealAPI.getOwnerById(id);
        if (directOwnerResponse.data) {
          setOwner(directOwnerResponse.data.owner);
          setDeal(directOwnerResponse.data.deal);
          setLoading(false);
          return; // Exit early - no need to search all deals
        }
      } catch (error) {
        // If direct lookup fails, fall back to search method
        console.log('Direct owner lookup not available, using search method');
      }

      // OPTIMIZATION 2: Use search endpoint instead of fetching all deals
      try {
        const searchResponse = await dealAPI.searchOwner(id);
        if (searchResponse.data) {
          setOwner(searchResponse.data.owner);
          setDeal(searchResponse.data.deal);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Search endpoint not available, using legacy method');
      }

      // FALLBACK: Legacy method but with optimizations
      const dealsResponse = await dealAPI.getAll();
      const deals = dealsResponse.data || [];
      
      // OPTIMIZATION 3: Use Promise.allSettled for parallel requests (if small dataset)
      if (deals.length <= 50) {
        const dealPromises = deals.map(dealData => 
          dealAPI.getById(dealData.id).catch(error => ({ error, dealId: dealData.id }))
        );
        
        const results = await Promise.allSettled(dealPromises);
        
        for (let i = 0; i < results.length; i++) {
          if (results[i].status === 'fulfilled' && !results[i].value.error) {
            const data = results[i].value.data || {};
            const { foundOwner, ownerDeal } = processDealData(data, id);
            
            if (foundOwner) {
              setOwner(foundOwner);
              setDeal(ownerDeal);
              setLoading(false);
              return;
            }
          }
        }
      } else {
        // OPTIMIZATION 4: For large datasets, search sequentially but with early exit
        for (const dealData of deals) {
          try {
            const response = await dealAPI.getById(dealData.id);
            const { foundOwner, ownerDeal } = processDealData(response.data, id);
            
            if (foundOwner) {
              setOwner(foundOwner);
              setDeal(ownerDeal);
              setLoading(false);
              return; // Early exit
            }
          } catch (dealError) {
            console.warn('Error fetching deal:', dealData.id, dealError);
          }
        }
      }

      // If no owner found
      toast.error('Owner not found');
      router.push('/owners');
      
    } catch (error) {
      console.error('Failed to fetch owner:', error);
      toast.error('Failed to fetch owner details');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Helper function to process deal data
  const processDealData = (data, ownerId) => {
    let mergedDeal = {};
    if (data.deal) {
      mergedDeal = { ...data.deal };
      mergedDeal.owners = data.owners || data.deal.owners || [];
    } else {
      mergedDeal = { ...data };
      mergedDeal.owners = data.owners || mergedDeal.owners || [];
    }

    // Normalize owner objects
    if (mergedDeal && Array.isArray(mergedDeal.owners)) {
      mergedDeal.owners = mergedDeal.owners.map(o => ({
        ...o,
        id: o.id || o.owner_id || o.ownerId || o._id || null,
        owner_id: o.owner_id || o.id || o.ownerId || o._id || null
      }));
    }

    // Check if this deal contains our owner
    const targetOwnerIndex = mergedDeal.owners.findIndex(o => 
      String(o.id) === String(ownerId) || String(o.owner_id) === String(ownerId)
    );
    
    if (targetOwnerIndex !== -1) {
      return {
        foundOwner: mergedDeal.owners[targetOwnerIndex],
        ownerDeal: mergedDeal
      };
    }
    
    return { foundOwner: null, ownerDeal: null };
  };

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchOwnerDataOptimized();
  }, [fetchOwnerDataOptimized, router]);

  // Rest of the component remains the same...
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar user={user} />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading owner details...</div>
        </div>
      </div>
    );
  }

  // Add the rest of your JSX here...
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Owner Details</h1>
        {owner && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">{owner.owner_name}</h2>
            <p><strong>Mobile:</strong> {owner.mobile}</p>
            <p><strong>Email:</strong> {owner.email}</p>
            <p><strong>Address:</strong> {owner.address}</p>
            {deal && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Associated Deal</h3>
                <p><strong>Project:</strong> {deal.project_name}</p>
                <p><strong>Location:</strong> {deal.location}</p>
                <p><strong>Status:</strong> {deal.status}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
