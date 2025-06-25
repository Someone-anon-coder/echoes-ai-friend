
import React, { useState } from 'react';
import { CreditPackage } from './ShopView'; // Assuming CreditPackage is exported from ShopView

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPurchase: (creditsToAward: number) => void;
  item: { credits: number, name: string } | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirmPurchase, item }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handlePayment = () => {
    setPaymentError(null);
    // Basic validation (mock)
    if (!cardNumber.match(/^\d{16}$/) || !expiry.match(/^\d{2}\/\d{2}$/) || !cvv.match(/^\d{3}$/)) {
      setPaymentError("Please enter valid card details (Card: 16 digits, Expiry: MM/YY, CVV: 3 digits). This is a mock form.");
      return;
    }
    
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmPurchase(item.credits);
      onClose(); // Close modal on success
      // Reset fields for next time
      setCardNumber('');
      setExpiry('');
      setCvv('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100 opacity-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Confirm Purchase</h2>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Item: <span className="font-bold">{item.name}</span></p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">Credits: {item.credits}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This is a mock payment form. Do not enter real card details.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Card Number (mock)</label>
            <input 
              type="text" 
              id="cardNumber" 
              value={cardNumber} 
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
              disabled={isProcessing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry (MM/YY)</label>
              <input 
                type="text" 
                id="expiry" 
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CVV (mock)</label>
              <input 
                type="text" 
                id="cvv" 
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {paymentError && (
          <p className="text-red-500 text-sm mt-4">{paymentError}</p>
        )}

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="mt-8 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : 'Confirm Purchase (Mock)'}
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
