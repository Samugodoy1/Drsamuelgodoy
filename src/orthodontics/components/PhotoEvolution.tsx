import React, { useState } from 'react';
import { Camera } from '../../icons';
import type { OrthoPhoto, PhotoStage } from '../types';
import { formatShortDate } from '../utils/format';

interface Props {
  photos: OrthoPhoto[];
}

const STAGE_LABEL: Record<PhotoStage, string> = {
  inicial: 'Inicial',
  intermediaria: 'Intermediária',
  atual: 'Atual',
  final: 'Final',
};

/** Evolução fotográfica — organizada automaticamente, com comparação lado a lado. */
export const PhotoEvolution: React.FC<Props> = ({ photos }) => {
  const [compare, setCompare] = useState(false);
  if (!photos || photos.length === 0) return null;

  const first = photos[0];
  const last = photos[photos.length - 1];

  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-slate-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Evolução fotográfica</p>
        </div>
        {photos.length >= 2 && (
          <button
            onClick={() => setCompare((v) => !v)}
            className="text-[12px] font-semibold text-slate-500 hover:text-slate-900"
          >
            {compare ? 'Ver linha do tempo' : 'Comparar início × atual'}
          </button>
        )}
      </div>

      {compare ? (
        <div className="grid grid-cols-2 gap-3">
          {[first, last].map((p, i) => (
            <figure key={p.id} className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={p.file_url} alt={STAGE_LABEL[p.stage]} className="w-full h-44 object-cover" />
              <figcaption className="px-3 py-2 text-[12px] font-semibold text-slate-600">
                {i === 0 ? 'Início' : 'Atual'} · {formatShortDate(p.taken_date)}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {photos.map((p) => (
            <figure key={p.id} className="shrink-0 w-32">
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img src={p.file_url} alt={STAGE_LABEL[p.stage]} className="w-full h-28 object-cover" />
              </div>
              <figcaption className="mt-1.5 text-[11px] font-semibold text-slate-500">
                {STAGE_LABEL[p.stage]}
                <span className="block text-[10px] text-slate-400">{formatShortDate(p.taken_date)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
};
