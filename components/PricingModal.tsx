import React from 'react';
import { XIcon, CheckIcon, CrownIcon } from './icons';
import { PRICING } from '../utils/constants';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'pro' | 'premium') => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upgrade to Pro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Free</h3>
            <div className="text-3xl font-bold text-white mb-4">$0<span className="text-sm text-gray-400">/month</span></div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                1 video per day
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Basic themes
              </li>
              <li className="flex items-center text-sm text-gray-400">
                <XIcon className="w-4 h-4 text-red-400 mr-2" />
                Watermark included
              </li>
            </ul>
            <button disabled className="w-full btn bg-gray-600 cursor-not-allowed">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-cyan-900/50 to-gray-800 rounded-xl p-6 border-2 border-cyan-400 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-cyan-400 text-black px-3 py-1 rounded-full text-xs font-bold">POPULAR</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
            <div className="text-3xl font-bold text-white mb-4">${PRICING.pro}<span className="text-sm text-gray-400">/month</span></div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Unlimited videos
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                All themes
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                No watermark
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Priority processing
              </li>
            </ul>
            <button 
              onClick={() => onUpgrade('pro')}
              className="w-full btn bg-cyan-600 hover:bg-cyan-500"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-gray-800 rounded-xl p-6 border border-purple-500">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
              Premium <CrownIcon className="w-5 h-5 text-yellow-400 ml-2" />
            </h3>
            <div className="text-3xl font-bold text-white mb-4">${PRICING.premium}<span className="text-sm text-gray-400">/month</span></div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Everything in Pro
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Custom branding
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                API access
              </li>
              <li className="flex items-center text-sm">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                Priority support
              </li>
            </ul>
            <button 
              onClick={() => onUpgrade('premium')}
              className="w-full btn bg-purple-600 hover:bg-purple-500"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};