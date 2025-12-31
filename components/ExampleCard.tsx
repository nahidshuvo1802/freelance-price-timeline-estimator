
import React from 'react';
import { ProjectExample } from '../types';
import { Trash2, Briefcase, FileText, Paperclip, ExternalLink } from 'lucide-react';

interface ExampleCardProps {
  example: ProjectExample;
  onDelete: (id: string) => void;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ example, onDelete }) => {
  const openAttachment = () => {
    if (!example.attachment) return;
    
    const byteCharacters = atob(example.attachment.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: example.attachment.mimeType});
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rotate-45 translate-x-8 -translate-y-8 group-hover:bg-orange-100 transition-colors" />
      
      <button 
        onClick={() => onDelete(example.id)}
        className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
      >
        <Trash2 size={16} />
      </button>

      <div className="flex items-center gap-3 mb-3 text-orange-600">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Briefcase size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-slate-900 leading-tight truncate">{example.title}</h4>
          {example.attachment && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <Paperclip size={10} className="text-orange-400" />
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">Saved in Cloud</span>
              </div>
              <button 
                onClick={openAttachment}
                className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 hover:underline bg-blue-50 px-1.5 py-0.5 rounded"
              >
                <ExternalLink size={8} /> View File
              </button>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium leading-relaxed">
        {example.requirements}
      </p>

      <div className="flex gap-3">
        <div className="flex-1 text-[10px] font-black uppercase text-orange-700 bg-orange-50/50 px-3 py-1.5 rounded-lg border border-orange-100/50 text-center">
          {example.budget}
        </div>
        <div className="flex-1 text-[10px] font-black uppercase text-blue-700 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 text-center">
          {example.timeline}
        </div>
      </div>
    </div>
  );
};
