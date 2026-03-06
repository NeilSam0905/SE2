import React, { useState } from 'react';
import { supabase } from './lib/supabaseClient';

export default function OrderViewer() {
  const [orderId, setOrderId] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  
  // States for calculations
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // States for Payment Method
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  
  // States for UI Feedback
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const calculateTotals = (items, applyDiscount) => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
    const calculatedTax = calculatedSubtotal * 0.10; 
    const calculatedDiscount = applyDiscount ? (calculatedSubtotal * 0.20) : 0;

    setSubtotal(calculatedSubtotal);
    setTax(calculatedTax);
    setDiscountAmount(calculatedDiscount);
  };

  const fetchOrderContents = async () => {
    setError(null);
    setSuccessMessage('');
    setOrderItems([]);
    setSubtotal(0);
    setTax(0);
    setDiscountAmount(0);
    setIsDiscountApplied(false);
    setPaymentMethod(''); 
    setTransactionRef('');

    if (!orderId) {
      setError("Please enter an Order ID");
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('order_items')
        .select('productID, quantity, price')
        .eq('orderID', orderId);

      if (fetchError) throw fetchError;

      if (data.length === 0) {
        setError(`No items found for Order ID ${orderId}`);
        return;
      }

      const itemsWithTotals = data.map(item => ({
        ...item,
        itemTotal: item.price * item.quantity
      }));

      setOrderItems(itemsWithTotals);
      calculateTotals(itemsWithTotals, false); 

    } catch (err) {
      console.error("Error:", err.message);
      setError("Failed to fetch order.");
    }
  };

  const toggleDiscount = () => {
    const newDiscountState = !isDiscountApplied;
    setIsDiscountApplied(newDiscountState);
    calculateTotals(orderItems, newDiscountState);
  };

  const totalAmount = subtotal + tax - discountAmount;

  // NEW: The core function to process the payment
  const handlePayment = async () => {
    setError(null);
    setSuccessMessage('');

    // 1. Validation Checks
    if (!paymentMethod) {
      setError("Please select a payment method before paying.");
      return;
    }
    if (paymentMethod === 'GCash' && !transactionRef.trim()) {
      setError("Please enter the GCash reference number.");
      return;
    }

    try {
      // 2. Insert into the 'payments' table
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          orderID: orderId,
          subtotal: subtotal,
          tax: tax,
          discount: discountAmount,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          transactionRef: transactionRef || null, 
          paymentTimestamp: new Date().toISOString()
        }]);

      if (paymentError) throw paymentError;

      // 3. Update the 'orders' table paymentstatus to 'Paid'
      const { error: orderError } = await supabase
        .from('orders')
        .update({ paymentstatus: 'Paid' })
        .eq('orderID', orderId);

      if (orderError) throw orderError;

      // 4. Success UI Update
      setSuccessMessage(`Payment successful! Order ${orderId} is now marked as Paid.`);
      setOrderItems([]); // Clear the table to prepare for the next customer
      setOrderId('');

    } catch (err) {
      console.error("Payment error:", err.message);
      setError(`Failed to process payment: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>View Order Contents & Checkout</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="number" 
          value={orderId} 
          onChange={(e) => setOrderId(e.target.value)} 
          placeholder="Enter Order ID"
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button onClick={fetchOrderContents} style={{ padding: '8px 16px' }}>
          Fetch Order
        </button>
      </div>

      {/* Success and Error Messages */}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{successMessage}</p>}

      {orderItems.length > 0 && (
        <div style={{ maxWidth: '500px' }}>
          {/* Order Items Table */}
          <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '20px' }}>
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Item Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.productID}</td>
                  <td>₱{item.price}</td>
                  <td>{item.quantity}</td>
                  <td><strong>₱{item.itemTotal}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Discount Button */}
          <div style={{ marginBottom: '20px', textAlign: 'right' }}>
            <button 
              onClick={toggleDiscount} 
              style={{ 
                padding: '8px 16px', 
                backgroundColor: isDiscountApplied ? '#ffcccc' : '#ccffcc',
                border: '1px solid #ccc',
                cursor: 'pointer'
              }}
            >
              {isDiscountApplied ? "Remove PWD/Senior Discount" : "Apply 20% PWD/Senior Discount"}
            </button>
          </div>

          {/* Totals Summary */}
          <div style={{ textAlign: 'right', fontSize: '1.1em', marginBottom: '20px' }}>
            <p><strong>Subtotal:</strong> ₱{subtotal.toFixed(2)}</p>
            <p><strong>Tax (10%):</strong> ₱{tax.toFixed(2)}</p>
            {isDiscountApplied && (
              <p style={{ color: 'red' }}><strong>Discount (20%):</strong> -₱{discountAmount.toFixed(2)}</p>
            )}
            <hr />
            <p style={{ fontSize: '1.3em', fontWeight: 'bold' }}>
              Total Amount: ₱{totalAmount.toFixed(2)}
            </p>
          </div>

          {/* Payment Method Section */}
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
            <h3>Select Payment Method</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button 
                onClick={() => {
                  setPaymentMethod('Cash');
                  setTransactionRef(''); 
                }}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: paymentMethod === 'Cash' ? '#4CAF50' : '#e0e0e0',
                  color: paymentMethod === 'Cash' ? 'white' : 'black',
                  border: 'none', cursor: 'pointer', borderRadius: '4px'
                }}
              >
                Cash
              </button>
              
              <button 
                onClick={() => setPaymentMethod('GCash')}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: paymentMethod === 'GCash' ? '#0052FF' : '#e0e0e0', 
                  color: paymentMethod === 'GCash' ? 'white' : 'black',
                  border: 'none', cursor: 'pointer', borderRadius: '4px'
                }}
              >
                GCash
              </button>
            </div>

            {paymentMethod === 'GCash' && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  <strong>GCash Reference No.</strong>
                </label>
                <input 
                  type="text" 
                  value={transactionRef} 
                  onChange={(e) => setTransactionRef(e.target.value)} 
                  placeholder="e.g. Ref-123456789"
                  style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          {/* NEW: Final Pay Button */}
          <button 
            onClick={handlePayment}
            style={{ 
              width: '100%', 
              padding: '15px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              fontSize: '1.2em', 
              fontWeight: 'bold', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Confirm & Pay ₱{totalAmount.toFixed(2)}
          </button>

        </div>
      )}
    </div>
  );
}