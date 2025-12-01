import React from 'react';

export const Badge: React.FC<{ status: 'Present' | 'Late' | 'Absent' }> = ({ status }) => {
  const colors = {
    Present: 'bg-green-500/10 text-green-400 border-green-500/20',
    Late: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Absent: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}>
      {status}
    </span>
  );
};