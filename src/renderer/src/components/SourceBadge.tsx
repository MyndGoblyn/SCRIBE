import type { ReactElement } from 'react';
import type { FeatSource } from '../../../shared/contracts';
import { formatFeatSourceLabel, getSourceBadgeTone } from '../features/buildForgeModel';

export function SourceBadge({ source }: { source: FeatSource }): ReactElement {
  return <span className={`source-badge ${getSourceBadgeTone(source)}`}>{formatFeatSourceLabel(source)}</span>;
}
