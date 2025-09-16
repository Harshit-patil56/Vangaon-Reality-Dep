/**
 * Node.js script to create 20 test investors via API
 * Make sure your backend is running before executing this script
 * 
 * Usage: node create_test_investors.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Adjust if your backend runs on different port
const API_ENDPOINT = `${API_BASE_URL}/api/investors`;

// You'll need to add your authentication token here
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

// Test investors data
const testInvestors = [
    {
        investor_name: 'Rahul Sharma',
        investment_amount: 250000.00,
        investment_percentage: 15.5,
        mobile: '+91-9876543210',
        email: 'rahul.sharma@email.com',
        aadhar_card: '1234 5678 9012',
        pan_card: 'ABCDE1234F',
        address: 'A-123, Sector 15, Noida, Uttar Pradesh - 201301',
        deal_id: 1
    },
    {
        investor_name: 'Priya Patel',
        investment_amount: 180000.00,
        investment_percentage: 12.3,
        mobile: '+91-8765432109',
        email: 'priya.patel@email.com',
        aadhar_card: '2345 6789 0123',
        pan_card: 'BCDEF2345G',
        address: 'B-456, Baner, Pune, Maharashtra - 411045',
        deal_id: 1
    },
    {
        investor_name: 'Amit Kumar',
        investment_amount: 350000.00,
        investment_percentage: 20.0,
        mobile: '+91-7654321098',
        email: 'amit.kumar@email.com',
        aadhar_card: '3456 7890 1234',
        pan_card: 'CDEFG3456H',
        address: 'C-789, Electronic City, Bangalore, Karnataka - 560100',
        deal_id: 1
    },
    {
        investor_name: 'Sneha Singh',
        investment_amount: 120000.00,
        investment_percentage: 8.7,
        mobile: '+91-6543210987',
        email: 'sneha.singh@email.com',
        aadhar_card: '4567 8901 2345',
        pan_card: 'DEFGH4567I',
        address: 'D-012, Salt Lake, Kolkata, West Bengal - 700091',
        deal_id: 1
    },
    {
        investor_name: 'Vikram Reddy',
        investment_amount: 450000.00,
        investment_percentage: 25.0,
        mobile: '+91-5432109876',
        email: 'vikram.reddy@email.com',
        aadhar_card: '5678 9012 3456',
        pan_card: 'EFGHI5678J',
        address: 'E-345, Hitech City, Hyderabad, Telangana - 500081',
        deal_id: 1
    },
    {
        investor_name: 'Anita Gupta',
        investment_amount: 90000.00,
        investment_percentage: 6.2,
        mobile: '+91-4321098765',
        email: 'anita.gupta@email.com',
        aadhar_card: '6789 0123 4567',
        pan_card: 'FGHIJ6789K',
        address: 'F-678, Malviya Nagar, Jaipur, Rajasthan - 302017',
        deal_id: 1
    },
    {
        investor_name: 'Rajesh Agarwal',
        investment_amount: 275000.00,
        investment_percentage: 16.8,
        mobile: '+91-3210987654',
        email: 'rajesh.agarwal@email.com',
        aadhar_card: '7890 1234 5678',
        pan_card: 'GHIJK7890L',
        address: 'G-901, Andheri West, Mumbai, Maharashtra - 400058',
        deal_id: 1
    },
    {
        investor_name: 'Kavya Nair',
        investment_amount: 195000.00,
        investment_percentage: 13.4,
        mobile: '+91-2109876543',
        email: 'kavya.nair@email.com',
        aadhar_card: '8901 2345 6789',
        pan_card: 'HIJKL8901M',
        address: 'H-234, Kochi, Kerala - 682001',
        deal_id: 1
    },
    {
        investor_name: 'Suresh Yadav',
        investment_amount: 320000.00,
        investment_percentage: 18.9,
        mobile: '+91-1098765432',
        email: 'suresh.yadav@email.com',
        aadhar_card: '9012 3456 7890',
        pan_card: 'IJKLM9012N',
        address: 'I-567, Sector 62, Gurgaon, Haryana - 122102',
        deal_id: 1
    },
    {
        investor_name: 'Meera Joshi',
        investment_amount: 85000.00,
        investment_percentage: 5.8,
        mobile: '+91-9876543211',
        email: 'meera.joshi@email.com',
        aadhar_card: '0123 4567 8901',
        pan_card: 'JKLMN0123O',
        address: 'J-890, Banjara Hills, Hyderabad, Telangana - 500034',
        deal_id: 1
    },
    {
        investor_name: 'Karan Verma',
        investment_amount: 410000.00,
        investment_percentage: 22.7,
        mobile: '+91-8765432110',
        email: 'karan.verma@email.com',
        aadhar_card: '1234 5678 9013',
        pan_card: 'KLMNO1234P',
        address: 'K-123, CP, New Delhi - 110001',
        deal_id: 1
    },
    {
        investor_name: 'Pooja Mishra',
        investment_amount: 165000.00,
        investment_percentage: 11.2,
        mobile: '+91-7654321099',
        email: 'pooja.mishra@email.com',
        aadhar_card: '2345 6789 0124',
        pan_card: 'LMNOP2345Q',
        address: 'L-456, Gomti Nagar, Lucknow, Uttar Pradesh - 226010',
        deal_id: 1
    },
    {
        investor_name: 'Arjun Kapoor',
        investment_amount: 290000.00,
        investment_percentage: 17.3,
        mobile: '+91-6543210988',
        email: 'arjun.kapoor@email.com',
        aadhar_card: '3456 7890 1235',
        pan_card: 'MNOPQ3456R',
        address: 'M-789, Juhu, Mumbai, Maharashtra - 400049',
        deal_id: 1
    },
    {
        investor_name: 'Divya Rathi',
        investment_amount: 135000.00,
        investment_percentage: 9.4,
        mobile: '+91-5432109877',
        email: 'divya.rathi@email.com',
        aadhar_card: '4567 8901 2346',
        pan_card: 'NOPQR4567S',
        address: 'N-012, Anna Nagar, Chennai, Tamil Nadu - 600040',
        deal_id: 1
    },
    {
        investor_name: 'Rohit Khanna',
        investment_amount: 380000.00,
        investment_percentage: 21.6,
        mobile: '+91-4321098766',
        email: 'rohit.khanna@email.com',
        aadhar_card: '5678 9012 3457',
        pan_card: 'OPQRS5678T',
        address: 'O-345, Vasant Kunj, New Delhi - 110070',
        deal_id: 1
    },
    {
        investor_name: 'Sonal Shah',
        investment_amount: 110000.00,
        investment_percentage: 7.9,
        mobile: '+91-3210987655',
        email: 'sonal.shah@email.com',
        aadhar_card: '6789 0123 4568',
        pan_card: 'PQRST6789U',
        address: 'P-678, Satellite, Ahmedabad, Gujarat - 380015',
        deal_id: 1
    },
    {
        investor_name: 'Varun Malhotra',
        investment_amount: 335000.00,
        investment_percentage: 19.8,
        mobile: '+91-2109876544',
        email: 'varun.malhotra@email.com',
        aadhar_card: '7890 1234 5679',
        pan_card: 'QRSTU7890V',
        address: 'Q-901, Cyber City, Gurgaon, Haryana - 122002',
        deal_id: 1
    },
    {
        investor_name: 'Ritu Bansal',
        investment_amount: 155000.00,
        investment_percentage: 10.7,
        mobile: '+91-1098765433',
        email: 'ritu.bansal@email.com',
        aadhar_card: '8901 2345 6790',
        pan_card: 'RSTUV8901W',
        address: 'R-234, Model Town, Chandigarh - 160022',
        deal_id: 1
    },
    {
        investor_name: 'Deepak Agarwal',
        investment_amount: 425000.00,
        investment_percentage: 24.1,
        mobile: '+91-9876543212',
        email: 'deepak.agarwal@email.com',
        aadhar_card: '9012 3456 7801',
        pan_card: 'STUVW9012X',
        address: 'S-567, Koramangala, Bangalore, Karnataka - 560034',
        deal_id: 1
    },
    {
        investor_name: 'Nisha Gupta',
        investment_amount: 75000.00,
        investment_percentage: 4.8,
        mobile: '+91-8765432111',
        email: 'nisha.gupta@email.com',
        aadhar_card: '0123 4567 8902',
        pan_card: 'TUVWX0123Y',
        address: 'T-890, Bahu Plaza, Jammu, Jammu and Kashmir - 180012',
        deal_id: 1
    }
];

async function createTestInvestors() {
    console.log('🚀 Starting to create 20 test investors...');
    console.log('=' * 50);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Headers for API requests
    const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${AUTH_TOKEN}` // Uncomment and add your token
    };
    
    for (let i = 0; i < testInvestors.length; i++) {
        const investor = testInvestors[i];
        
        try {
            console.log(`Creating investor ${i + 1}/20: ${investor.investor_name}`);
            
            const response = await axios.post(API_ENDPOINT, investor, { headers });
            
            if (response.status === 200 || response.status === 201) {
                successCount++;
                console.log(`✅ Successfully created: ${investor.investor_name}`);
            } else {
                failureCount++;
                console.log(`❌ Failed to create: ${investor.investor_name} - Status: ${response.status}`);
            }
            
            // Add a small delay between requests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            failureCount++;
            console.log(`❌ Error creating ${investor.investor_name}:`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Error: ${error.response.data.error || error.response.data}`);
            } else {
                console.log(`   Error: ${error.message}`);
            }
        }
    }
    
    console.log('=' * 50);
    console.log(`📊 Summary: ${successCount} created, ${failureCount} failed`);
    
    if (successCount > 0) {
        console.log('🎉 Test investors created successfully!');
        console.log('💡 You can now test pagination, search, and other features.');
    }
    
    if (failureCount > 0) {
        console.log('⚠️  Some investors failed to create. Check the errors above.');
        console.log('💡 Make sure your backend is running and authentication is properly configured.');
    }
}

// Check if we're running this file directly
if (require.main === module) {
    console.log('🔧 Test Investors Creator');
    console.log('=' * 50);
    
    if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
        console.log('⚠️  Warning: Please update the AUTH_TOKEN in this script with your actual authentication token.');
        console.log('   You can find this token by:');
        console.log('   1. Logging into your application');
        console.log('   2. Opening browser dev tools (F12)');
        console.log('   3. Going to Application/Storage tab');
        console.log('   4. Finding the auth token in localStorage or sessionStorage');
        console.log('');
        console.log('   Or you can modify the backend to accept requests without authentication for testing.');
        console.log('');
    }
    
    createTestInvestors().catch(console.error);
}

module.exports = { createTestInvestors, testInvestors };