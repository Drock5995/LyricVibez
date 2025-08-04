
import React from 'react';
import { CloseIcon, ExternalLinkIcon } from './icons';

interface IframeModalProps {
    url: string;
    title: string;
    onClose: () => void;
}

export const IframeModal: React.FC<IframeModalProps> = ({ url, title, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="glass-panel w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <div className="flex items-center gap-4">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-cyan-400 flex items-center gap-1">
                            Open in New Tab <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div className="flex-grow bg-gray-900 rounded-b-2xl p-1">
                    <iframe
                        src={url}
                        className="w-full h-full border-0"
                        title={title}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    ></iframe>
                </div>
                <footer className="text-center text-xs text-gray-500 p-2">
                    Note: Some sites may block being embedded. If content doesn't load, please use the "Open in New Tab" link above.
                </footer>
            </div>
        </div>
    );
};
